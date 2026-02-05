import type { Card } from '../types'
import { CardDisplay } from './CardDisplay'
import { useGameStore } from '../store/gameStore'

interface CardHandProps {
  cards: Card[]
  canPlay: boolean
}

export const CardHand = ({ cards, canPlay }: CardHandProps) => {
  const { selectedCardIndex, selectCard, canCurrentPlayerPlayCard } = useGameStore()

  if (cards.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        沒有手牌
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {cards.map((card, index) => {
        const check = canCurrentPlayerPlayCard(index)
        const isDisabled = !canPlay || !check.canPlay

        return (
          <div key={card.id} className="relative">
            <CardDisplay
              card={card}
              isSelected={selectedCardIndex === index}
              onClick={() => selectCard(selectedCardIndex === index ? null : index)}
              disabled={isDisabled}
              size="medium"
            />
            {isDisabled && check.reason && selectedCardIndex === index && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {check.reason}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
