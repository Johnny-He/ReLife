import { useState, useEffect, useRef } from 'react'

export interface ValueChange {
  id: number
  value: number
  timestamp: number
}

/**
 * Hook 用於追蹤數值變化並產生動畫資料
 */
export function useValueChange(currentValue: number) {
  const [changes, setChanges] = useState<ValueChange[]>([])
  const prevValueRef = useRef<number | null>(null)
  const [mountTime] = useState(() => Date.now())
  const idCounter = useRef(0)
  const timeoutIds = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  // 清理所有 timeout
  useEffect(() => {
    const ids = timeoutIds.current
    return () => {
      ids.forEach(id => clearTimeout(id))
      ids.clear()
    }
  }, [])

  useEffect(() => {
    // 遊戲開始後 1.5 秒內不顯示變化動畫（避免初始化時的假變化）
    const timeSinceMount = Date.now() - mountTime
    if (timeSinceMount < 1500) {
      prevValueRef.current = currentValue
      return
    }

    // 首次有效值，只記錄不顯示
    if (prevValueRef.current === null) {
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
      const timeoutId = setTimeout(() => {
        timeoutIds.current.delete(timeoutId)
        setChanges(prev => prev.filter(c => c.id !== newChange.id))
      }, 1000)
      timeoutIds.current.add(timeoutId)
    }

    prevValueRef.current = currentValue
  }, [currentValue, mountTime])

  return changes
}
