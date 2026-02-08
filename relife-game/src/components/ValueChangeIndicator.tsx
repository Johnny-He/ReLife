import type { ValueChange } from '../hooks/useValueChange'

interface ValueChangeIndicatorProps {
  changes: ValueChange[]
  isMoney?: boolean
}

/**
 * 顯示數值變化的浮動動畫
 */
export const ValueChangeIndicator = ({ changes, isMoney = false }: ValueChangeIndicatorProps) => {
  return (
    <>
      {changes.map((change) => (
        <span
          key={change.id}
          className={`
            absolute left-1/2 -translate-x-1/2
            font-bold text-lg pointer-events-none
            animate-float-up
            ${change.value > 0 ? 'text-green-400' : 'text-red-400'}
          `}
          style={{ top: '-8px' }}
        >
          {change.value > 0 ? '+' : ''}
          {isMoney ? `$${change.value.toLocaleString()}` : change.value}
        </span>
      ))}
    </>
  )
}
