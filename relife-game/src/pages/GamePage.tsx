import { useGameStore } from '../store/gameStore'
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

  const currentPlayer = players[currentPlayerIndex]
  const otherPlayers = players.filter((_, i) => i !== currentPlayerIndex)

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
          <img src="/logo.png" alt="ReLife" className="h-8" />
          <div className="text-white">
            <span className="text-yellow-400 font-bold">第 {turn} 回合</span>
            <span className="text-gray-400 mx-2">|</span>
            <span>{phaseNames[phase] || phase}</span>
          </div>
        </div>
        <div className="text-gray-400 text-sm">
          牌庫剩餘: {useGameStore.getState().deck.length} 張
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 左側：其他玩家 */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-gray-400 text-sm font-bold">其他玩家</h2>
          {otherPlayers.map((player) => (
            <PlayerPanel
              key={player.id}
              player={player}
              isCurrentPlayer={false}
              isCompact
            />
          ))}
        </div>

        {/* 中間：主遊戲區域 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 當前玩家資訊 */}
          <PlayerPanel
            player={currentPlayer}
            isCurrentPlayer={true}
          />

          {/* 行動控制 */}
          <ActionBar />

          {/* 手牌區域 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold mb-3">
              {currentPlayer.name} 的手牌
            </h3>
            <CardHand
              cards={currentPlayer.hand}
              canPlay={phase === 'action'}
            />
          </div>
        </div>

        {/* 右側：職業板 */}
        <div className="lg:col-span-1">
          <JobBoard />

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
