import type { Card } from '../types'

interface CardDisplayProps {
  card: Card
  isSelected?: boolean
  onClick?: () => void
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
}

export const CardDisplay = ({
  card,
  isSelected = false,
  onClick,
  disabled = false,
  size = 'medium',
}: CardDisplayProps) => {
  const typeColors: Record<Card['type'], { bg: string; border: string; text: string }> = {
    study: { bg: 'bg-blue-900', border: 'border-blue-500', text: 'text-blue-300' },
    work: { bg: 'bg-green-900', border: 'border-green-500', text: 'text-green-300' },
    explore: { bg: 'bg-yellow-900', border: 'border-yellow-500', text: 'text-yellow-300' },
    function: { bg: 'bg-purple-900', border: 'border-purple-500', text: 'text-purple-300' },
  }

  const typeNames: Record<Card['type'], string> = {
    study: '學力',
    work: '工作',
    explore: '探險',
    function: '功能',
  }

  const sizeClasses = {
    small: 'w-20 h-28 text-xs',
    medium: 'w-28 h-40 text-sm',
    large: 'w-36 h-52 text-base',
  }

  const colors = typeColors[card.type]

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`
        ${sizeClasses[size]}
        ${colors.bg}
        ${isSelected ? 'border-yellow-400 border-4 -translate-y-4 scale-110 shadow-lg shadow-yellow-400/30' : `${colors.border} border-2`}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-3 hover:scale-110 hover:shadow-xl hover:shadow-black/50'}
        rounded-lg p-2 flex flex-col transition-[transform,box-shadow,border-color] duration-200 ease-out
      `}
    >
      {/* 卡牌類型 */}
      <div className={`${colors.text} text-xs mb-1`}>
        {typeNames[card.type]}
      </div>

      {/* 卡牌名稱 */}
      <div className="text-white font-bold flex-grow flex items-center justify-center text-center">
        {card.name}
      </div>

      {/* 描述 */}
      <div className="text-gray-300 text-xs mt-1 text-center">
        {card.description}
      </div>

      {/* 費用 */}
      {card.cost && (
        <div className="mt-1 text-yellow-400 text-xs text-center">
          ${card.cost}
        </div>
      )}
    </div>
  )
}

// 卡牌背面
export const CardBack = ({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) => {
  const sizeClasses = {
    small: 'w-20 h-28',
    medium: 'w-28 h-40',
    large: 'w-36 h-52',
  }

  return (
    <div
      className={`
        ${sizeClasses[size]}
        bg-gradient-to-br from-gray-700 to-gray-900
        border-2 border-gray-500
        rounded-lg
        flex items-center justify-center
      `}
    >
      <div className="text-gray-400 text-2xl font-bold">?</div>
    </div>
  )
}
