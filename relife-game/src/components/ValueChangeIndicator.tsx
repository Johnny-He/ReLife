import { useState, useEffect, useRef } from 'react'

interface ValueChange {
  id: number
  value: number
  timestamp: number
}

/**
 * Hook 用於追蹤數值變化並產生動畫資料
 */
export const useValueChange = (currentValue: number) => {
  const [changes, setChanges] = useState<ValueChange[]>([])
  const prevValueRef = useRef<number>(currentValue)
  const isFirstRender = useRef(true)
  const idCounter = useRef(0)

  useEffect(() => {
    // 跳過首次渲染
    if (isFirstRender.current) {
      isFirstRender.current = false
      prevValueRef.current = currentValue
      return
    }

    const diff = currentValue - prevValueRef.current
    if (diff !== 0) {
      const newChange: ValueChange = {
        id: idCounter.current++,
        value: diff,
        timestamp: Date.now(),
      }
      setChanges(prev => [...prev, newChange])

      // 動畫結束後移除（1秒）
      setTimeout(() => {
        setChanges(prev => prev.filter(c => c.id !== newChange.id))
      }, 1000)
    }

    prevValueRef.current = currentValue
  }, [currentValue])

  return changes
}

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
