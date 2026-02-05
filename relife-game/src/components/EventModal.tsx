import type { GameEvent } from '../types'

interface EventModalProps {
  event: GameEvent
  onConfirm: () => void
}

export const EventModal = ({ event, onConfirm }: EventModalProps) => {
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
          <EffectPreview event={event} />
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

const EffectPreview = ({ event }: { event: GameEvent }) => {
  const { effect, target } = event

  // 目標描述
  let targetText = ''
  switch (target.type) {
    case 'all':
      targetText = '所有玩家'
      break
    case 'richest':
      targetText = `最有錢的 ${target.count} 人`
      break
    case 'poorest':
      targetText = `最窮的 ${target.count} 人`
      break
    case 'has_job':
      targetText = '有工作的玩家'
      break
    default:
      targetText = '指定玩家'
  }

  // 效果描述
  let effectText = ''
  switch (effect.type) {
    case 'money_change':
      effectText = `金錢 ${effect.value > 0 ? '+' : ''}$${effect.value}`
      break
    case 'stat_change':
      const statNames = { intelligence: '智力', stamina: '體力', charisma: '魅力' }
      effectText = `${statNames[effect.stat]} ${effect.value > 0 ? '+' : ''}${effect.value}`
      break
    case 'draw_cards':
      effectText = `抽 ${effect.count} 張牌`
      break
    case 'special':
      effectText = '特殊效果'
      break
  }

  return (
    <div className="text-sm">
      <span className="text-gray-400">影響範圍：</span>
      <span className="text-white ml-2">{targetText}</span>
      {effectText && effect.type !== 'special' && (
        <>
          <br />
          <span className="text-gray-400">效果：</span>
          <span className={`ml-2 ${effect.type === 'money_change' || effect.type === 'stat_change' ? (
            (effect.type === 'money_change' ? effect.value : effect.value) > 0 ? 'text-green-400' : 'text-red-400'
          ) : 'text-white'}`}>
            {effectText}
          </span>
        </>
      )}
    </div>
  )
}
