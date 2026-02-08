import type { GameEvent, Player } from '../types'
import { getRichestPlayers, getPoorestPlayers } from '../engine/calculator'

interface EventModalProps {
  event: GameEvent
  players: Player[]
  onConfirm: () => void
}

export const EventModal = ({ event, players, onConfirm }: EventModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 border-2 border-yellow-500 rounded-xl p-6 max-w-md mx-4 animate-bounce-in">
        {/* 標題 */}
        <div className="text-center mb-4">
          <div className="text-yellow-400 text-sm mb-1">回合事件</div>
          <h2 className="text-2xl font-bold text-white">{event.name}</h2>
        </div>

        {/* 描述 */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <p className="text-gray-200 text-center leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* 效果預覽 */}
        <div className="text-center mb-6">
          <EffectPreview event={event} players={players} />
        </div>

        {/* 確認按鈕 */}
        <button
          onClick={onConfirm}
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg transition-colors"
        >
          確認
        </button>
      </div>
    </div>
  )
}

const getTargetDescription = (event: GameEvent, players: Player[]): string | null => {
  const { effect, target } = event

  // 特殊事件：根據 handler 顯示具體條件
  if (effect.type === 'special') {
    switch (effect.handler) {
      case 'poverty_relief': {
        const poor = players.filter(p => p.money < 1500)
        if (poor.length === 0) return '沒有玩家符合條件'
        return `金錢少於 $1,500 的玩家（${poor.map(p => p.name).join('、')}）`
      }
      case 'tax': {
        const richest = getRichestPlayers(players, target.count || 1)
        return `最有錢的玩家（${richest.map(p => p.name).join('、')}）`
      }
      case 'poverty_relief_3000': {
        const poorest = getPoorestPlayers(players, 1)
        return `最窮的玩家（${poorest.map(p => p.name).join('、')}）`
      }
      default:
        return null // competition、game_end 等不需要特別標示
    }
  }

  // 一般事件：根據 target type 顯示
  switch (target.type) {
    case 'richest': {
      const richest = getRichestPlayers(players, target.count || 1)
      return `最有錢的玩家（${richest.map(p => p.name).join('、')}）`
    }
    case 'poorest': {
      const poorest = getPoorestPlayers(players, target.count || 1)
      return `最窮的玩家（${poorest.map(p => p.name).join('、')}）`
    }
    default:
      return null // all 不需要特別標示
  }
}

const EffectPreview = ({ event, players }: { event: GameEvent; players: Player[] }) => {
  const { effect } = event
  const targetDesc = getTargetDescription(event, players)

  // 效果描述
  let effectText = ''
  switch (effect.type) {
    case 'money_change':
      effectText = `金錢 ${effect.value > 0 ? '+' : ''}$${effect.value}`
      break
    case 'stat_change': {
      const statNames = { intelligence: '智力', stamina: '體力', charisma: '魅力' }
      effectText = `${statNames[effect.stat]} ${effect.value > 0 ? '+' : ''}${effect.value}`
      break
    }
    case 'draw_cards':
      effectText = `抽 ${effect.count} 張牌`
      break
  }

  return (
    <div className="text-sm space-y-1">
      {targetDesc && (
        <div className="text-yellow-300">{targetDesc}</div>
      )}
      {effectText && (
        <div>
          <span className="text-gray-400">效果：</span>
          <span className={`ml-2 ${effect.type === 'money_change' || effect.type === 'stat_change' ? (
            (effect.type === 'money_change' ? effect.value : effect.value) > 0 ? 'text-green-400' : 'text-red-400'
          ) : 'text-white'}`}>
            {effectText}
          </span>
        </div>
      )}
    </div>
  )
}
