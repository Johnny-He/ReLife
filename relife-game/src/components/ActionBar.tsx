import { useGameStore } from '../store/gameStore'
import { exploreLocations } from '../data/locations'

interface ActionBarProps {
  disabled?: boolean
}

export const ActionBar = ({ disabled = false }: ActionBarProps) => {
  const {
    phase,
    players,
    currentPlayerIndex,
    selectedCardIndex,
    pendingStatChoice,
    pendingExplore,
    pendingTargetPlayer,
    pendingFunctionCard,
    lastMessage,
    playSelectedCard,
    chooseStat,
    chooseExploreLocation,
    chooseTargetPlayer,
    useInvalidCard,
    passReaction,
    cancelPendingAction,
    endPlayerTurn,
    nextPhase,
  } = useGameStore()

  const actionNames: Record<string, string> = {
    steal: '偷竊',
    sabotage: '陷害',
  }

  // 反應卡回應 UI
  if (pendingFunctionCard) {
    const { card: functionCard, sourcePlayerIndex, respondingPlayerIndex } = pendingFunctionCard
    const sourcePlayer = players[sourcePlayerIndex]
    const respondingPlayer = players[respondingPlayerIndex]

    // 找出回應玩家手中的「無效」卡
    const invalidCardIndices = respondingPlayer.hand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.effect.type === 'special' && card.effect.handler === 'invalid')

    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-yellow-400 text-center mb-2">
          ⚡ {sourcePlayer.name} 想使用「{functionCard.name}」
        </div>
        <div className="text-white text-center mb-3">
          {respondingPlayer.name}，要使用「無效」卡嗎？
        </div>
        <div className="flex justify-center gap-3 flex-wrap">
          {invalidCardIndices.map(({ card, index }) => (
            <button
              key={index}
              onClick={() => useInvalidCard(index)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded"
            >
              使用「{card.name}」
            </button>
          ))}
          <button
            onClick={passReaction}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
          >
            跳過
          </button>
        </div>
      </div>
    )
  }

  // 屬性選擇 UI
  if (pendingStatChoice) {
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
                <span className="text-xs ml-1">({player.hand.length} 張牌)</span>
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
          <button
            onClick={nextPhase}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold"
          >
            繼續 →
          </button>
        )}

        {phase === 'draw' && (
          <button
            onClick={nextPhase}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold"
          >
            下一回合 →
          </button>
        )}
      </div>
    </div>
  )
}
