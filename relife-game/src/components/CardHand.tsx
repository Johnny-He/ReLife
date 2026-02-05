import { useState } from 'react'
import type { Card } from '../types'
import { CardDisplay } from './CardDisplay'
import { useGameStore } from '../store/gameStore'

interface CardHandProps {
  cards: Card[]
  canPlay: boolean
}

export const CardHand = ({ cards, canPlay }: CardHandProps) => {
  const { selectedCardIndex, selectCard, canCurrentPlayerPlayCard } = useGameStore()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (cards.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        沒有手牌
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center py-4">
      {cards.map((card, index) => {
        const check = canCurrentPlayerPlayCard(index)
        const isDisabled = !canPlay || !check.canPlay
        const isHovered = hoveredIndex === index
        const isSelected = selectedCardIndex === index

        return (
          <div
            key={card.id}
            className="relative transition-all duration-200"
            style={{
              zIndex: isSelected ? 20 : isHovered ? 10 : 1,
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <CardDisplay
              card={card}
              isSelected={isSelected}
              onClick={() => selectCard(isSelected ? null : index)}
              disabled={isDisabled}
              size="medium"
            />
            {isDisabled && check.reason && isSelected && (
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-red-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-30">
                {check.reason}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
