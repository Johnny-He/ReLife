import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../store/gameStore'
import { useRoomStore } from '../store/roomStore'
import { exploreLocations } from '../data/locations'
import { jobs } from '../data/jobs'

interface ActionBarProps {
  disabled?: boolean
}

export const ActionBar = ({ disabled = false }: ActionBarProps) => {
  const { roomId, playerId, room } = useRoomStore()
  const isOnlineGame = !!(roomId && room?.status === 'playing')
  const {
    phase,
    players,
    currentPlayerIndex,
    selectedCardIndex,
    pendingStatChoice,
    pendingExplore,
    pendingTargetPlayer,
    pendingParachute,
    pendingFunctionCard,
    pendingDiscard,
    lastMessage,
  } = useGameStore(useShallow(s => ({
    phase: s.phase,
    players: s.players,
    currentPlayerIndex: s.currentPlayerIndex,
    selectedCardIndex: s.selectedCardIndex,
    pendingStatChoice: s.pendingStatChoice,
    pendingExplore: s.pendingExplore,
    pendingTargetPlayer: s.pendingTargetPlayer,
    pendingParachute: s.pendingParachute,
    pendingFunctionCard: s.pendingFunctionCard,
    pendingDiscard: s.pendingDiscard,
    lastMessage: s.lastMessage,
  })))
  const playSelectedCard = useGameStore(s => s.playSelectedCard)
  const chooseStat = useGameStore(s => s.chooseStat)
  const chooseExploreLocation = useGameStore(s => s.chooseExploreLocation)
  const chooseTargetPlayer = useGameStore(s => s.chooseTargetPlayer)
  const applyParachute = useGameStore(s => s.applyParachute)
  const applyInvalidCard = useGameStore(s => s.applyInvalidCard)
  const passReaction = useGameStore(s => s.passReaction)
  const cancelPendingAction = useGameStore(s => s.cancelPendingAction)
  const endPlayerTurn = useGameStore(s => s.endPlayerTurn)
  const confirmDiscard = useGameStore(s => s.confirmDiscard)

  const actionNames: Record<string, string> = {
    steal: '偷竊',
    sabotage: '陷害',
  }

  // 棄牌選擇 UI
  if (pendingDiscard) {
    const discardingPlayer = players?.[pendingDiscard.playerIndex]
    if (!discardingPlayer) {
      return (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-center">載入中...</div>
        </div>
      )
    }

    // AI 自動棄牌
    if (discardingPlayer.isAI) {
      return (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-center animate-pulse">
            🤖 {discardingPlayer.name} 正在選擇要丟棄的牌...
          </div>
        </div>
      )
    }

    // 線上模式：只有當事人能棄自己的牌
    if (isOnlineGame) {
      const myIndex = room?.players.findIndex(p => p.id === playerId) ?? -1
      if (myIndex !== pendingDiscard.playerIndex) {
        return (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-center animate-pulse">
              等待 {discardingPlayer.name} 選擇要丟棄的牌...
            </div>
          </div>
        )
      }
    }

    const { discardCount, selectedCardIndices } = pendingDiscard
    const canConfirm = selectedCardIndices.length === discardCount

    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-orange-400 text-center mb-2 font-bold">
          手牌超過上限！
        </div>
        <div className="text-white text-center mb-3">
          請選擇 {discardCount} 張要丟棄的牌（已選 {selectedCardIndices.length}/{discardCount}）
        </div>
        <div className="flex justify-center">
          <button
            onClick={confirmDiscard}
            disabled={!canConfirm}
            className={`px-6 py-2 rounded font-bold ${
              canConfirm
                ? 'bg-orange-600 hover:bg-orange-500 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            確認丟棄
          </button>
        </div>
      </div>
    )
  }

  // 反應卡回應 UI
  if (pendingFunctionCard) {
    const { card: functionCard, sourcePlayerIndex, respondingPlayerIndex, invalidChain } = pendingFunctionCard
    const sourcePlayer = players?.[sourcePlayerIndex]
    const respondingPlayer = players?.[respondingPlayerIndex]
    const chainLength = (invalidChain ?? []).length

    // 防護：玩家資料未準備好
    if (!sourcePlayer || !respondingPlayer) {
      return (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-center">載入中...</div>
        </div>
      )
    }

    // 檢查是否輪到自己回應（AI 回應時不顯示按鈕）
    const myIndex = room?.players.findIndex(p => p.id === playerId) ?? -1
    const isMyResponse = isOnlineGame
      ? myIndex === respondingPlayerIndex
      : !respondingPlayer?.isAI

    // 找出回應玩家手中的第一張「無效」卡（效果都一樣，只需要一張）
    const firstInvalidCardIndex = (respondingPlayer?.hand ?? [])
      .findIndex((card) => card.effect.type === 'special' && card.effect.handler === 'invalid')

    // 根據連鎖狀態顯示不同提示
    const lastInvalidator = chainLength > 0
      ? players?.[invalidChain![chainLength - 1].playerIndex]
      : null
    const headerText = chainLength === 0
      ? `⚡ ${sourcePlayer.name} 想使用「${functionCard.name}」`
      : `⚡ ${lastInvalidator?.name} 使用了「無效」！（連鎖 ${chainLength}）`
    const promptText = chainLength === 0
      ? `${respondingPlayer.name}，要使用「無效」卡嗎？`
      : `${respondingPlayer.name}，要反制嗎？`

    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-yellow-400 text-center mb-2">
          {headerText}
        </div>
        <div className="text-white text-center mb-3">
          {promptText}
        </div>
        {isMyResponse ? (
          <div className="flex justify-center gap-3 flex-wrap">
            <button
              onClick={() => applyInvalidCard(firstInvalidCardIndex)}
              disabled={firstInvalidCardIndex === -1}
              className={`px-4 py-2 rounded ${
                firstInvalidCardIndex !== -1
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              使用「無效」
            </button>
            <button
              onClick={passReaction}
              className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
            >
              跳過
            </button>
          </div>
        ) : (
          <div className="text-gray-400 text-center">
            等待 {respondingPlayer.name} 回應...
          </div>
        )}
      </div>
    )
  }

  // 判斷當前行動者是否為 AI
  const currentPlayer = players?.[currentPlayerIndex]
  const isCurrentAI = currentPlayer?.isAI === true

  // 線上模式：判斷是否是自己的行動
  const myIndex = isOnlineGame ? (room?.players.findIndex(p => p.id === playerId) ?? -1) : -1
  const isMyAction = !isOnlineGame || myIndex === currentPlayerIndex

  // 線上模式非當事人看到的等待訊息
  const waitingUI = (action: string) => (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="text-gray-400 text-center animate-pulse">
        等待 {currentPlayer?.name} {action}...
      </div>
    </div>
  )

  // 屬性選擇 UI
  if (pendingStatChoice) {
    if (isCurrentAI) return waitingUI('選擇屬性')
    if (!isMyAction) return waitingUI('選擇屬性')
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-white text-center mb-3">選擇要提升的屬性</div>
        <div className="flex justify-center gap-3 flex-wrap">
          <button
            onClick={() => chooseStat('intelligence')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
          >
            智力 +{pendingStatChoice.value}
          </button>
          <button
            onClick={() => chooseStat('stamina')}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded"
          >
            體力 +{pendingStatChoice.value}
          </button>
          <button
            onClick={() => chooseStat('charisma')}
            className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded"
          >
            魅力 +{pendingStatChoice.value}
          </button>
          <button
            onClick={cancelPendingAction}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  // 探險地點選擇 UI
  if (pendingExplore) {
    if (isCurrentAI) return waitingUI('選擇探險地點')
    if (!isMyAction) return waitingUI('選擇探險地點')
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-white text-center mb-3">選擇探險地點</div>
        <div className="flex justify-center gap-3 flex-wrap">
          {exploreLocations.map((location) => (
            <button
              key={location.id}
              onClick={() => chooseExploreLocation(location.id)}
              className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded"
            >
              {location.name}
            </button>
          ))}
          <button
            onClick={cancelPendingAction}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  // 目標玩家選擇 UI
  if (pendingTargetPlayer) {
    if (isCurrentAI) return waitingUI('選擇目標')
    if (!isMyAction) return waitingUI('選擇目標')
    const otherPlayers = players.filter((_, i) => i !== currentPlayerIndex)
    const actionName = actionNames[pendingTargetPlayer.action] || pendingTargetPlayer.action

    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-white text-center mb-3">
          選擇要{actionName}的玩家
        </div>
        <div className="flex justify-center gap-3 flex-wrap">
          {otherPlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => chooseTargetPlayer(player.id)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded"
            >
              {player.name}
              {pendingTargetPlayer.action === 'steal' && (
                <span className="text-xs ml-1">({player.hand?.length ?? 0} 張牌)</span>
              )}
            </button>
          ))}
          <button
            onClick={cancelPendingAction}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  // 空降職業選擇 UI
  if (pendingParachute) {
    if (isCurrentAI) return waitingUI('選擇職業')
    if (!isMyAction) return waitingUI('選擇職業')
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-white text-center mb-3">空降：選擇要就職的職業（無條件）</div>
        <div className="flex justify-center gap-2 flex-wrap">
          {jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => applyParachute(job.id)}
              className="bg-green-700 hover:bg-green-600 text-white px-3 py-2 rounded text-sm"
            >
              {job.levels[0].name}
              <span className="text-xs text-green-300 ml-1">${job.levels[0].salary[0].toLocaleString()}</span>
            </button>
          ))}
          <button
            onClick={cancelPendingAction}
            className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded text-sm"
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  // 線上模式但不是自己的回合
  if (disabled) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        {lastMessage && (
          <div className="text-yellow-400 text-center mb-3 text-sm">
            {lastMessage}
          </div>
        )}
        <div className="text-gray-500 text-center">
          等待其他玩家行動...
        </div>
      </div>
    )
  }

  // 一般行動 UI
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      {/* 訊息顯示 */}
      {lastMessage && (
        <div className="text-yellow-400 text-center mb-3 text-sm">
          {lastMessage}
        </div>
      )}

      {/* 行動按鈕 */}
      <div className="flex justify-center gap-3">
        {phase === 'action' && (
          <>
            <button
              onClick={playSelectedCard}
              disabled={selectedCardIndex === null}
              className={`px-4 py-2 rounded font-bold ${
                selectedCardIndex !== null
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              使用卡牌
            </button>
            <button
              onClick={endPlayerTurn}
              className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
            >
              結束回合
            </button>
          </>
        )}

        {phase === 'salary' && (
          <div className="text-gray-400">
            <span className="animate-pulse">發薪階段...</span>
          </div>
        )}

        {phase === 'draw' && (
          <div className="text-gray-400">
            <span className="animate-pulse">抽牌階段...</span>
          </div>
        )}
      </div>
    </div>
  )
}
