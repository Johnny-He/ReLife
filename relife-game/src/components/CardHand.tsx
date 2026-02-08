import { useState, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { Card } from '../types'
import { CardDisplay } from './CardDisplay'
import { useGameStore } from '../store/gameStore'

interface CardHandProps {
  cards: Card[]
  canPlay: boolean
}

export const CardHand = ({ cards, canPlay }: CardHandProps) => {
  const { selectedCardIndex, pendingDiscard } = useGameStore(useShallow(s => ({
    selectedCardIndex: s.selectedCardIndex,
    pendingDiscard: s.pendingDiscard,
  })))
  const selectCard = useGameStore(s => s.selectCard)
  const canCurrentPlayerPlayCard = useGameStore(s => s.canCurrentPlayerPlayCard)
  const toggleDiscardCard = useGameStore(s => s.toggleDiscardCard)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const isDiscardMode = !!pendingDiscard

  // 預先計算所有卡牌的可用性，避免在 render loop 中重複呼叫
  const cardChecks = useMemo(() => {
    if (isDiscardMode) return []
    return cards.map((_, i) => canCurrentPlayerPlayCard(i))
  }, [cards, canCurrentPlayerPlayCard, isDiscardMode])

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
        const isHovered = hoveredIndex === index

        // 棄牌模式
        if (isDiscardMode) {
          const isSelectedForDiscard = pendingDiscard!.selectedCardIndices.includes(index)
          const canSelectMore = pendingDiscard!.selectedCardIndices.length < pendingDiscard!.discardCount

          return (
            <div
              key={`${card.id}-${index}`}
              className="relative transition-all duration-200"
              style={{ zIndex: isSelectedForDiscard ? 20 : isHovered ? 10 : 1 }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <CardDisplay
                card={card}
                isSelected={isSelectedForDiscard}
                onClick={() => toggleDiscardCard(index)}
                disabled={!isSelectedForDiscard && !canSelectMore}
                size="medium"
              />
              {isSelectedForDiscard && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center z-30 font-bold">
                  ✗
                </div>
              )}
            </div>
          )
        }

        // 正常模式
        const check = cardChecks[index] ?? { canPlay: false }
        const isDisabled = !canPlay || !check.canPlay
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
