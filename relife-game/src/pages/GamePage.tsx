import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../store/gameStore'
import { useRoomStore } from '../store/roomStore'
import { useGameSync } from '../hooks/useGameSync'
import { useAIPlayer } from '../hooks/useAIPlayer'
import { PlayerPanel } from '../components/PlayerPanel'
import { CardHand } from '../components/CardHand'
import { EventModal } from '../components/EventModal'
import { ActionBar } from '../components/ActionBar'
import { JobBoard } from '../components/JobBoard'

export const GamePage = () => {
  const {
    players,
    currentPlayerIndex,
    turn,
    phase,
    currentEvent,
    showEventModal,
    promotionInfo,
    pendingDiscard,
  } = useGameStore(useShallow(s => ({
    players: s.players,
    currentPlayerIndex: s.currentPlayerIndex,
    turn: s.turn,
    phase: s.phase,
    currentEvent: s.currentEvent,
    showEventModal: s.showEventModal,
    promotionInfo: s.promotionInfo,
    pendingDiscard: s.pendingDiscard,
  })))
  const deckCount = useGameStore(s => s.deck?.length ?? 0)
  const actionLog = useGameStore(s => s.actionLog)
  // actions 不會變，單獨取出不影響 re-render
  const confirmEvent = useGameStore(s => s.confirmEvent)
  const nextPhase = useGameStore(s => s.nextPhase)
  const dismissPromotion = useGameStore(s => s.dismissPromotion)

  // 本地狀態：追蹤此玩家是否已關閉事件彈窗
  const [localEventDismissed, setLocalEventDismissed] = useState(false)
  const lastTurnRef = useRef(turn)

  const { room } = useRoomStore()
  const { isOnlineGame, syncToFirebase, isMyTurn, getMyPlayerIndex } = useGameSync()

  // AI 玩家自動行動（只在本地模式啟用）
  useAIPlayer(isOnlineGame)

  // 用 ref 保存最新的 syncToFirebase，避免 useEffect 依賴變化導致重複訂閱
  const syncRef = useRef(syncToFirebase)
  syncRef.current = syncToFirebase

  // 線上模式：監聯狀態變化並同步（debounce 避免密集觸發）
  useEffect(() => {
    if (!isOnlineGame) return

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const unsubscribe = useGameStore.subscribe(() => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        syncRef.current()
      }, 200)
    })

    return () => {
      unsubscribe()
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [isOnlineGame])

  // 當回合變化時，重置本地事件彈窗狀態
  useEffect(() => {
    if (turn !== lastTurnRef.current) {
      lastTurnRef.current = turn
      setLocalEventDismissed(false)
    }
  }, [turn])

  // 非互動階段自動進行（事件確認後、發薪、抽牌）
  useEffect(() => {
    // 事件階段：confirmEvent 已套用效果且關閉彈窗，自動推進到發薪
    if (phase === 'event' && !showEventModal) {
      const timer = setTimeout(() => {
        const s = useGameStore.getState()
        if (s.phase === 'event' && !s.showEventModal) {
          nextPhase()
        }
      }, 500)
      return () => clearTimeout(timer)
    }

    if (phase !== 'salary' && phase !== 'draw') return
    // 抽牌階段有待棄牌時不自動推進
    if (phase === 'draw' && pendingDiscard) return

    // 延遲一下讓玩家看到發生什麼，然後自動進入下一階段
    const timer = setTimeout(() => {
      const s = useGameStore.getState()
      if (s.phase === 'salary' || (s.phase === 'draw' && !s.pendingDiscard)) {
        nextPhase()
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [phase, showEventModal, nextPhase, pendingDiscard])

  // 事件彈窗不再自動關閉，由玩家手動點確認

  // 等待遊戲狀態載入（先檢查再存取 players）
  if (!players || players.length === 0 || phase === 'setup') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">載入遊戲中...</div>
      </div>
    )
  }

  const currentPlayer = players[currentPlayerIndex]

  // 找到「我」的 index：線上模式用 getMyPlayerIndex，本地模式找第一個人類玩家
  const myPlayerIndex = isOnlineGame
    ? getMyPlayerIndex()
    : players.findIndex(p => !p.isAI)
  const myPlayer = players[myPlayerIndex >= 0 ? myPlayerIndex : 0] || currentPlayer

  // 判斷是否有 AI 玩家（用於決定 UI 顯示邏輯）
  const hasAI = players.some(p => p.isAI)

  // 本地模式：如果有 AI，只有輪到人類玩家時才能操作
  const canAct = isOnlineGame
    ? isMyTurn()
    : (hasAI ? currentPlayerIndex === myPlayerIndex : true)

  // 顯示手牌：棄牌模式顯示需要棄牌的玩家手牌，否則顯示「我」的手牌
  const discardingPlayer = pendingDiscard ? players[pendingDiscard.playerIndex] : null
  // 線上模式：只有當事人看到自己的棄牌手牌，其他人看自己的手牌
  const isMyDiscard = pendingDiscard && (!isOnlineGame || pendingDiscard.playerIndex === myPlayerIndex)
  const displayHandPlayer = (isMyDiscard && !discardingPlayer?.isAI)
    ? discardingPlayer
    : (isOnlineGame || hasAI) ? myPlayer : currentPlayer

  // 再次確認 currentPlayer 存在
  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">載入遊戲中...</div>
      </div>
    )
  }

  const phaseNames: Record<string, string> = {
    event: '事件階段',
    salary: '發薪階段',
    action: '行動階段',
    draw: '抽牌階段',
    end_turn: '回合結束',
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* 頂部資訊列 */}
      <div className="bg-gray-800 rounded-lg p-3 mb-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <img src={import.meta.env.BASE_URL + "logo.png"} alt="ReLife" className="h-8" />
          <div className="text-white">
            <span className="text-yellow-400 font-bold">第 {turn} 回合</span>
            <span className="text-gray-400 mx-2">|</span>
            <span>{phaseNames[phase] || phase}</span>
          </div>
          <div className="text-green-400 text-sm bg-green-900/30 px-2 py-1 rounded">
            🏆 共 30 回合
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isOnlineGame && (
            <div className="text-blue-400 text-sm">
              🌐 線上模式
              {room && ` (房間: ${room.id})`}
            </div>
          )}
          <div className="text-gray-400 text-sm">
            牌庫剩餘: {deckCount} 張
          </div>
        </div>
      </div>

      {/* 回合指示（線上模式或有 AI 時顯示） */}
      {(isOnlineGame || hasAI) && (
        <div className={`rounded-lg p-3 mb-4 text-center ${canAct ? 'bg-green-900/50 border border-green-500' : 'bg-gray-800'}`}>
          {canAct ? (
            <span className="text-green-400 font-bold">🎮 輪到你了！</span>
          ) : (
            <span className="text-gray-400">
              等待 <span className="text-yellow-400 font-bold">{currentPlayer?.name}</span> {currentPlayer?.isAI ? '🤖' : ''} 行動...
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 左側：其他玩家 */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-gray-400 text-sm font-bold">
            {(isOnlineGame || hasAI) ? '其他玩家' : '其他玩家'}
          </h2>
          {players.map((player, index) => {
            const isMe = (isOnlineGame || hasAI) && index === myPlayerIndex
            const isCurrent = index === currentPlayerIndex

            // 線上模式或有 AI：跳過自己（顯示在中間）
            // 純本地模式：跳過當前玩家（顯示在中間）
            if (isOnlineGame || hasAI) {
              if (isMe) return null
            } else {
              if (isCurrent) return null
            }

            return (
              <div key={player.id} className="relative">
                {player.isAI && (
                  <div className="absolute -top-2 -left-2 bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full z-10">
                    🤖
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full z-10">
                    行動中
                  </div>
                )}
                <PlayerPanel
                  player={player}
                  isCurrentPlayer={isCurrent}
                  isCompact
                />
              </div>
            )
          })}
        </div>

        {/* 中間：主遊戲區域 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 玩家資訊：有 AI 或線上模式時顯示自己，純本地模式顯示當前玩家 */}
          <div className="relative">
            {(isOnlineGame || hasAI) && canAct && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full z-10">
                你的回合
              </div>
            )}
            {(isOnlineGame || hasAI) && !canAct && (
              <div className="absolute -top-2 -right-2 bg-gray-600 text-white text-xs px-2 py-0.5 rounded-full z-10">
                等待中
              </div>
            )}
            <PlayerPanel
              player={(isOnlineGame || hasAI) ? myPlayer : currentPlayer}
              isCurrentPlayer={(isOnlineGame || hasAI) ? canAct : true}
            />
          </div>

          {/* 行動控制 */}
          <ActionBar disabled={(isOnlineGame || hasAI) && !canAct} />

          {/* 手牌區域 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold mb-3">
              {isMyDiscard && !discardingPlayer?.isAI
                ? `${discardingPlayer?.name} 的手牌 — 請選擇要丟棄的牌`
                : (isOnlineGame || hasAI) ? `${myPlayer?.name} 的手牌（你）` : `${currentPlayer.name} 的手牌`
              }
            </h3>
            <CardHand
              cards={displayHandPlayer?.hand || []}
              canPlay={phase === 'action' && canAct}
              canDiscard={!!isMyDiscard}
            />
            {(isOnlineGame || hasAI) && !canAct && phase === 'action' && (
              <div className="text-gray-500 text-sm mt-2 text-center">
                等待電腦行動...
              </div>
            )}
          </div>
        </div>

        {/* 右側：職業板 */}
        <div className="lg:col-span-1">
          <JobBoard player={myPlayer} disabled={!canAct} />

          {/* 行動記錄 */}
          <div className="bg-gray-800 rounded-lg p-4 mt-4">
            <h3 className="text-white font-bold mb-2">行動記錄</h3>
            <div className="max-h-64 overflow-y-auto text-sm space-y-1">
              {(actionLog || []).slice(-20).reverse().map((log, i) => {
                const colorMap: Record<string, string> = {
                  event: 'text-yellow-400',
                  action: 'text-blue-300',
                  job: 'text-green-400',
                  system: 'text-gray-400',
                }
                return (
                  <div key={i} className={colorMap[log.type] || 'text-gray-400'}>
                    <span className="text-gray-500 mr-1">[{log.turn}]</span>
                    {log.type !== 'event' && <span className="font-semibold mr-1">{log.playerName}</span>}
                    {log.message}
                  </div>
                )
              })}
              {(actionLog || []).length === 0 && (
                <div className="text-gray-500">尚無記錄</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 事件彈窗 - 線上模式每個玩家獨立管理 */}
      {currentEvent && (
        // 本地模式：用 showEventModal
        // 線上模式：用 phase === 'event' && !localEventDismissed
        (isOnlineGame ? (phase === 'event' && !localEventDismissed) : showEventModal) && (
          <EventModal
            event={currentEvent}
            players={players}
            onConfirm={() => {
              if (isOnlineGame) {
                // 線上模式：先關閉本地彈窗，再觸發確認（效果只會套用一次）
                setLocalEventDismissed(true)
              }
              confirmEvent()
            }}
          />
        )
      )}

      {/* 升遷恭喜彈窗 */}
      {promotionInfo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 border-2 border-green-500 rounded-xl p-6 max-w-md mx-4 text-center animate-bounce-in">
            <div className="text-5xl mb-3">🎉</div>
            <div className="text-green-400 text-sm mb-1">恭喜升遷！</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {promotionInfo.playerName}
            </h2>
            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <div className="text-lg text-white font-bold">
                {promotionInfo.jobTitle}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                薪水: {promotionInfo.salaryRange}
              </div>
            </div>
            <button
              onClick={dismissPromotion}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              太棒了！
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
