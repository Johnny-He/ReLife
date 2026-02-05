import { useEffect, useCallback, useRef } from 'react'
import { ref, onValue, off, update } from 'firebase/database'
import { database } from '../firebase/config'
import { useGameStore } from '../store/gameStore'
import { useRoomStore } from '../store/roomStore'
import type { GameState } from '../types'

/**
 * 處理線上模式的遊戲狀態同步
 * - 監聽 Firebase 的遊戲狀態變化
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
    const stateToSync: GameState = {
      playerCount: state.playerCount,
      maxTurns: state.maxTurns,
      players: state.players,
      currentPlayerIndex: state.currentPlayerIndex,
      turn: state.turn,
      phase: state.phase,
      deck: state.deck,
      discardPile: state.discardPile,
      currentEvent: state.currentEvent,
      eventLog: state.eventLog,
      selectedCardIndex: state.selectedCardIndex,
      showEventModal: state.showEventModal,
    }

    // 避免重複同步相同狀態
    const stateString = JSON.stringify(stateToSync)
    if (stateString === lastSyncedState.current) return
    lastSyncedState.current = stateString

    const roomRef = ref(database, `rooms/${roomId}`)
    await update(roomRef, { gameState: stateToSync })
  }, [roomId])

  // 監聽 Firebase 遊戲狀態變化
  useEffect(() => {
    if (!isOnlineGame) return

    const roomRef = ref(database, `rooms/${roomId}`)

    const handleValueChange = (snapshot: any) => {
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
      useGameStore.setState({
        playerCount: firebaseGameState.playerCount,
        maxTurns: firebaseGameState.maxTurns,
        players: firebaseGameState.players,
        currentPlayerIndex: firebaseGameState.currentPlayerIndex,
        turn: firebaseGameState.turn,
        phase: firebaseGameState.phase,
        deck: firebaseGameState.deck,
        discardPile: firebaseGameState.discardPile,
        currentEvent: firebaseGameState.currentEvent,
        eventLog: firebaseGameState.eventLog,
        selectedCardIndex: firebaseGameState.selectedCardIndex,
        showEventModal: firebaseGameState.showEventModal,
      })

      // 延遲重置 flag，確保狀態更新完成
      setTimeout(() => {
        isUpdatingFromFirebase.current = false
      }, 100)
    }

    onValue(roomRef, handleValueChange)

    return () => {
      off(roomRef)
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
