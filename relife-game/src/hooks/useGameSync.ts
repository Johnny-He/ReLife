import { useEffect, useCallback, useRef } from 'react'
import { ref, onValue, update, type DataSnapshot } from 'firebase/database'
import { database } from '../firebase/config'
import { useGameStore } from '../store/gameStore'
import { useRoomStore } from '../store/roomStore'
import type { GameState, Card } from '../types'

// 需要同步的 UI 狀態（影響多人遊戲流程的）
interface SyncedUIState {
  pendingFunctionCard: {
    card: Card
    cardIndex: number
    sourcePlayerIndex: number
    targetPlayerId?: string
    respondingPlayerIndex: number
    passedPlayerIndices: number[]
    invalidChain?: { playerIndex: number; card: Card }[]
  } | null
  pendingTargetPlayer: {
    action: string
    cardIndex: number
  } | null
  pendingDiscard: {
    playerIndex: number
    discardCount: number
    selectedCardIndices: number[]
  } | null
}

// 清理資料，移除 undefined（Firebase 不接受 undefined）
const cleanForFirebase = <T>(obj: T): T => {
  if (obj === undefined) return null as T
  if (obj === null) return obj
  if (Array.isArray(obj)) {
    return obj.filter(item => item !== undefined).map(cleanForFirebase) as T
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirebase(value)
      }
    }
    return cleaned as T
  }
  return obj
}

/**
 * 處理線上模式的遊戲狀態同步
 * - 監聯 Firebase 的遊戲狀態變化
 * - 當本地狀態改變時同步到 Firebase
 */
export const useGameSync = () => {
  const { roomId, playerId, room } = useRoomStore()
  const isUpdatingFromFirebase = useRef(false)
  const lastSyncedState = useRef<string>('')

  // 判斷當前是否為線上模式且遊戲進行中
  const isOnlineGame = roomId && room?.status === 'playing'

  // 同步本地狀態到 Firebase
  const syncToFirebase = useCallback(async () => {
    if (!roomId || isUpdatingFromFirebase.current) return

    const state = useGameStore.getState()
    const stateToSync: GameState & SyncedUIState = {
      playerCount: state.playerCount ?? 4,
      maxTurns: state.maxTurns ?? 10,
      players: state.players || [],
      currentPlayerIndex: state.currentPlayerIndex ?? 0,
      turn: state.turn ?? 1,
      phase: state.phase || 'setup',
      deck: state.deck || [],
      discardPile: state.discardPile || [],
      currentEvent: state.currentEvent ?? null,
      eventLog: state.eventLog || [],
      actionLog: state.actionLog || [],
      selectedCardIndex: state.selectedCardIndex ?? null,
      // showEventModal 不同步，讓每個玩家自己管理彈窗顯示
      showEventModal: false,  // 不同步這個欄位
      // 同步反應卡狀態（影響多人遊戲流程）
      pendingFunctionCard: state.pendingFunctionCard ?? null,
      // 同步目標選擇狀態（偷竊、搶劫、陷害、空降）
      pendingTargetPlayer: state.pendingTargetPlayer ?? null,
      // 同步棄牌狀態
      pendingDiscard: state.pendingDiscard ?? null,
    }

    // 避免重複同步相同狀態
    const stateString = JSON.stringify(stateToSync)
    if (stateString === lastSyncedState.current) return
    lastSyncedState.current = stateString

    const roomRef = ref(database, `rooms/${roomId}`)
    await update(roomRef, { gameState: cleanForFirebase(stateToSync) })
  }, [roomId])

  // 監聽 Firebase 遊戲狀態變化
  useEffect(() => {
    if (!isOnlineGame) return

    const roomRef = ref(database, `rooms/${roomId}`)

    const handleValueChange = (snapshot: DataSnapshot) => {
      if (!snapshot.exists()) return

      const data = snapshot.val()
      const firebaseGameState = data.gameState as GameState | null

      if (!firebaseGameState) return

      // 比較是否需要更新本地狀態
      const stateString = JSON.stringify(firebaseGameState)

      if (stateString === lastSyncedState.current) return

      // 標記正在從 Firebase 更新，避免觸發同步回去
      isUpdatingFromFirebase.current = true
      lastSyncedState.current = stateString

      // 更新本地 Zustand store
      // 注意：Firebase 會移除空陣列，所以需要加上 fallback
      const syncedState = firebaseGameState as GameState & SyncedUIState
      // 處理 pendingFunctionCard 內的 passedPlayerIndices 陣列
      const pendingFunctionCard = syncedState.pendingFunctionCard
        ? {
            ...syncedState.pendingFunctionCard,
            passedPlayerIndices: syncedState.pendingFunctionCard.passedPlayerIndices ?? [],
            invalidChain: syncedState.pendingFunctionCard.invalidChain ?? [],
          }
        : null
      useGameStore.setState({
        playerCount: firebaseGameState.playerCount ?? 4,
        maxTurns: firebaseGameState.maxTurns ?? 10,
        players: firebaseGameState.players ?? [],
        currentPlayerIndex: firebaseGameState.currentPlayerIndex ?? 0,
        turn: firebaseGameState.turn ?? 1,
        phase: firebaseGameState.phase ?? 'setup',
        deck: firebaseGameState.deck ?? [],
        discardPile: firebaseGameState.discardPile ?? [],
        currentEvent: firebaseGameState.currentEvent ?? null,
        eventLog: firebaseGameState.eventLog ?? [],
        actionLog: firebaseGameState.actionLog ?? [],
        selectedCardIndex: firebaseGameState.selectedCardIndex ?? null,
        // 只在「進入」事件階段時設 showEventModal: true（本地 phase 尚非 event）
        // 若本地已在 event 階段（echo 或已確認），不覆蓋，避免卡住自動推進
        ...(firebaseGameState.phase === 'event' && useGameStore.getState().phase !== 'event'
          ? { showEventModal: true }
          : {}),
        // 回合或當前玩家變動時清除本地 lastMessage，避免顯示過時訊息
        ...((firebaseGameState.currentPlayerIndex !== useGameStore.getState().currentPlayerIndex
          || firebaseGameState.turn !== useGameStore.getState().turn)
          ? { lastMessage: null }
          : {}),
        // 同步反應卡狀態（包含 passedPlayerIndices 的 fallback）
        pendingFunctionCard,
        // 同步目標選擇狀態
        pendingTargetPlayer: syncedState.pendingTargetPlayer ?? null,
        // 同步棄牌狀態
        pendingDiscard: syncedState.pendingDiscard
          ? {
              ...syncedState.pendingDiscard,
              selectedCardIndices: syncedState.pendingDiscard.selectedCardIndices ?? [],
            }
          : null,
      })

      // 使用 setTimeout 確保在 React 批次更新 + Zustand subscribe 觸發後才重置 flag
      // queueMicrotask 太早重置，subscribe callback 可能在 debounce 後仍拿到 false
      setTimeout(() => {
        isUpdatingFromFirebase.current = false
      }, 100)
    }

    // 保存 unsubscribe 函數，正確清理監聽器
    const unsubscribe = onValue(roomRef, handleValueChange)

    return () => {
      unsubscribe()
    }
  }, [isOnlineGame, roomId])

  // 取得當前玩家在遊戲中的 index
  const getMyPlayerIndex = useCallback((): number => {
    if (!room || !playerId) return -1

    const myRoomPlayer = room.players.find(p => p.id === playerId)
    if (!myRoomPlayer) return -1

    // 根據房間中的順序找到對應的遊戲玩家 index
    const roomPlayerIndex = room.players.findIndex(p => p.id === playerId)
    return roomPlayerIndex
  }, [room, playerId])

  // 判斷是否輪到我
  const isMyTurn = useCallback((): boolean => {
    if (!isOnlineGame) return true // 本地模式總是可以操作

    const myIndex = getMyPlayerIndex()
    const currentIndex = useGameStore.getState().currentPlayerIndex
    return myIndex === currentIndex
  }, [isOnlineGame, getMyPlayerIndex])

  return {
    isOnlineGame: !!isOnlineGame,
    syncToFirebase,
    isMyTurn,
    getMyPlayerIndex,
    playerId,
  }
}
