import type { Player } from '../types'
import { getJobDisplayName } from '../engine/jobSystem'
import { useValueChange, ValueChangeIndicator } from './ValueChangeIndicator'

interface PlayerPanelProps {
  player: Player
  isCurrentPlayer: boolean
  isCompact?: boolean
}

export const PlayerPanel = ({ player, isCurrentPlayer, isCompact = false }: PlayerPanelProps) => {
  // 防護：player 未定義時不渲染
  if (!player) return null

  const borderColor = isCurrentPlayer ? 'border-yellow-400' : 'border-gray-600'
  const bgColor = isCurrentPlayer ? 'bg-gray-800' : 'bg-gray-900'

  if (isCompact) {
    return (
      <div className={`${bgColor} ${borderColor} border-2 rounded-lg p-2 text-sm`}>
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold text-white">{player.name}</span>
          <MoneyDisplay value={player.money} size="small" />
        </div>
        <div className="flex gap-2 text-xs">
          <span className="text-blue-400">智{player.stats.intelligence}</span>
          <span className="text-red-400">體{player.stats.stamina}</span>
          <span className="text-pink-400">魅{player.stats.charisma}</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {getJobDisplayName(player)} | 手牌 {player.hand.length}
        </div>
      </div>
    )
  }

  return (
    <div className={`${bgColor} ${borderColor} border-2 rounded-lg p-4`}>
      {/* 頭部：名字和角色 */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-white">{player.name}</h3>
          <p className="text-sm text-gray-400">{player.character.name}</p>
        </div>
        {isCurrentPlayer && (
          <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded">
            當前回合
          </span>
        )}
      </div>

      {/* 金錢 */}
      <div className="mb-3">
        <MoneyDisplay value={player.money} size="large" />
      </div>

      {/* 屬性 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBadge label="智力" value={player.stats.intelligence} color="blue" />
        <StatBadge label="體力" value={player.stats.stamina} color="red" />
        <StatBadge label="魅力" value={player.stats.charisma} color="pink" />
      </div>

      {/* 職業 */}
      <div className="border-t border-gray-700 pt-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">職業</span>
          <span className="text-white">{getJobDisplayName(player)}</span>
        </div>
        {player.job && (
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">績效</span>
            <span className="text-green-400">{player.performance}/9</span>
          </div>
        )}
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-400">手牌</span>
          <span className="text-white">{player.hand.length}/10</span>
        </div>
      </div>
    </div>
  )
}

interface StatBadgeProps {
  label: string
  value: number
  color: 'blue' | 'red' | 'pink'
}

const StatBadge = ({ label, value, color }: StatBadgeProps) => {
  const changes = useValueChange(value)

  const colorClasses = {
    blue: 'bg-blue-900 text-blue-300',
    red: 'bg-red-900 text-red-300',
    pink: 'bg-pink-900 text-pink-300',
  }

  return (
    <div className={`${colorClasses[color]} rounded px-2 py-1 text-center relative`}>
      <div className="text-xs">{label}</div>
      <div className="text-lg font-bold">{value}</div>
      <ValueChangeIndicator changes={changes} />
    </div>
  )
}

interface MoneyDisplayProps {
  value: number
  size: 'small' | 'large'
}

const MoneyDisplay = ({ value, size }: MoneyDisplayProps) => {
  const changes = useValueChange(value)

  const sizeClasses = {
    small: 'text-yellow-400',
    large: 'text-yellow-400 text-2xl font-bold',
  }

  return (
    <span className={`${sizeClasses[size]} relative inline-block`}>
      ${value.toLocaleString()}
      <ValueChangeIndicator changes={changes} isMoney />
    </span>
  )
}
