import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { useRoomStore } from '../store/roomStore'
import { useGameSync } from '../hooks/useGameSync'
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
    confirmEvent,
  } = useGameStore()

  const { room } = useRoomStore()
  const { isOnlineGame, syncToFirebase, isMyTurn, getMyPlayerIndex } = useGameSync()

  // 線上模式：監聽狀態變化並同步
  useEffect(() => {
    if (!isOnlineGame) return

    // 訂閱 Zustand 狀態變化
    const unsubscribe = useGameStore.subscribe(() => {
      syncToFirebase()
    })

    return () => unsubscribe()
  }, [isOnlineGame, syncToFirebase])

  const currentPlayer = players[currentPlayerIndex]
  const myPlayerIndex = isOnlineGame ? getMyPlayerIndex() : currentPlayerIndex
  const myPlayer = players[myPlayerIndex] || currentPlayer
  const canAct = isMyTurn()

  // 在線上模式，顯示自己的手牌而不是當前玩家的手牌
  const displayHandPlayer = isOnlineGame ? myPlayer : currentPlayer

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
        </div>
        <div className="flex items-center gap-4">
          {isOnlineGame && (
            <div className="text-blue-400 text-sm">
              🌐 線上模式
              {room && ` (房間: ${room.id})`}
            </div>
          )}
          <div className="text-gray-400 text-sm">
            牌庫剩餘: {useGameStore.getState().deck.length} 張
          </div>
        </div>
      </div>

      {/* 線上模式：回合指示 */}
      {isOnlineGame && (
        <div className={`rounded-lg p-3 mb-4 text-center ${canAct ? 'bg-green-900/50 border border-green-500' : 'bg-gray-800'}`}>
          {canAct ? (
            <span className="text-green-400 font-bold">🎮 輪到你了！</span>
          ) : (
            <span className="text-gray-400">
              等待 <span className="text-yellow-400 font-bold">{currentPlayer?.name}</span> 行動...
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 左側：其他玩家 */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-gray-400 text-sm font-bold">
            {isOnlineGame ? '所有玩家' : '其他玩家'}
          </h2>
          {players.map((player, index) => {
            const isMe = isOnlineGame && index === myPlayerIndex
            const isCurrent = index === currentPlayerIndex

            // 本地模式跳過當前玩家（顯示在中間）
            if (!isOnlineGame && isCurrent) return null

            return (
              <div key={player.id} className="relative">
                {isMe && (
                  <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full z-10">
                    你
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
          {/* 當前行動玩家資訊 */}
          <div className="relative">
            {isOnlineGame && currentPlayerIndex === myPlayerIndex && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full z-10">
                你的回合
              </div>
            )}
            <PlayerPanel
              player={currentPlayer}
              isCurrentPlayer={true}
            />
          </div>

          {/* 行動控制 */}
          <ActionBar disabled={isOnlineGame && !canAct} />

          {/* 手牌區域 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold mb-3">
              {isOnlineGame ? `${myPlayer?.name} 的手牌（你）` : `${currentPlayer.name} 的手牌`}
            </h3>
            <CardHand
              cards={displayHandPlayer?.hand || []}
              canPlay={phase === 'action' && canAct}
            />
            {isOnlineGame && !canAct && phase === 'action' && (
              <div className="text-gray-500 text-sm mt-2 text-center">
                等待你的回合才能出牌
              </div>
            )}
          </div>
        </div>

        {/* 右側：職業板 */}
        <div className="lg:col-span-1">
          <JobBoard disabled={isOnlineGame && !canAct} />

          {/* 事件記錄 */}
          <div className="bg-gray-800 rounded-lg p-4 mt-4">
            <h3 className="text-white font-bold mb-2">事件記錄</h3>
            <div className="max-h-48 overflow-y-auto text-sm space-y-1">
              {useGameStore.getState().eventLog.slice(-10).map((log, i) => (
                <div key={i} className="text-gray-400">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 事件彈窗 */}
      {showEventModal && currentEvent && (
        <EventModal event={currentEvent} onConfirm={confirmEvent} />
      )}
    </div>
  )
}
