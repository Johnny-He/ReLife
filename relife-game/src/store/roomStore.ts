import { create } from 'zustand'
import type { Room, RoomPlayer } from '../firebase'
import {
  createRoom,
  joinRoom,
  leaveRoom,
  setPlayerReady,
  setPlayerCharacter,
  startGame,
  updateGameState,
  subscribeToRoom,
  checkRoomExists,
} from '../firebase'
import { createInitialGameState, startEventPhase } from '../engine'
import type { GameState } from '../types'

// localStorage key
const STORAGE_KEY = 'relife_session'

interface SessionData {
  roomId: string
  playerId: string
  playerName: string
  timestamp: number
}

// 儲存連線資訊
const saveSession = (roomId: string, playerId: string, playerName: string) => {
  const data: SessionData = {
    roomId,
    playerId,
    playerName,
    timestamp: Date.now(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// 讀取連線資訊
const loadSession = (): SessionData | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const data = JSON.parse(stored) as SessionData

    // 檢查是否過期（24小時）
    const ONE_DAY = 24 * 60 * 60 * 1000
    if (Date.now() - data.timestamp > ONE_DAY) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return data
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

// 清除連線資訊
const clearSession = () => {
  localStorage.removeItem(STORAGE_KEY)
}

interface RoomStore {
  // 狀態
  roomId: string | null
  playerId: string | null
  room: Room | null
  isOnlineMode: boolean
  isReconnecting: boolean
  error: string | null

  // 房間操作
  createNewRoom: (hostName: string, characterId: string) => Promise<void>
  joinExistingRoom: (roomId: string, playerName: string, characterId: string) => Promise<boolean>
  leaveCurrentRoom: () => Promise<void>

  // 重連
  tryReconnect: () => Promise<boolean>
  hasStoredSession: () => boolean

  // 玩家操作
  toggleReady: () => Promise<void>
  changeCharacter: (characterId: string) => Promise<boolean>

  // 遊戲操作
  startOnlineGame: () => Promise<boolean>
  syncGameState: (gameState: GameState) => Promise<void>

  // 工具
  getCurrentPlayer: () => RoomPlayer | null
  isHost: () => boolean
  canStartGame: () => boolean
  resetRoom: () => void
}

export const useRoomStore = create<RoomStore>((set, get) => {
  let unsubscribe: (() => void) | null = null

  return {
    roomId: null,
    playerId: null,
    room: null,
    isOnlineMode: false,
    isReconnecting: false,
    error: null,

    createNewRoom: async (hostName, characterId) => {
      try {
        const { roomId, playerId } = await createRoom(hostName, characterId)

        // 儲存到 localStorage
        saveSession(roomId, playerId, hostName)

        // 訂閱房間變化
        unsubscribe = subscribeToRoom(roomId, (room) => {
          set({ room })
        })

        set({
          roomId,
          playerId,
          isOnlineMode: true,
          error: null,
        })
      } catch (err) {
        set({ error: '建立房間失敗' })
      }
    },

    joinExistingRoom: async (roomId, playerName, characterId) => {
      try {
        const result = await joinRoom(roomId, playerName, characterId)

        if (!result.success) {
          set({ error: result.error || '加入房間失敗' })
          return false
        }

        // 儲存到 localStorage
        saveSession(roomId, result.playerId!, playerName)

        // 訂閱房間變化
        unsubscribe = subscribeToRoom(roomId, (room) => {
          set({ room })
        })

        set({
          roomId,
          playerId: result.playerId!,
          isOnlineMode: true,
          error: null,
        })

        return true
      } catch (err) {
        set({ error: '加入房間失敗' })
        return false
      }
    },

    leaveCurrentRoom: async () => {
      const { roomId, playerId } = get()
      if (!roomId || !playerId) return

      // 取消訂閱
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }

      await leaveRoom(roomId, playerId)

      // 清除 localStorage
      clearSession()

      set({
        roomId: null,
        playerId: null,
        room: null,
        isOnlineMode: false,
        error: null,
      })
    },

    tryReconnect: async () => {
      const session = loadSession()
      if (!session) return false

      set({ isReconnecting: true, error: null })

      try {
        // 檢查房間是否還存在
        const exists = await checkRoomExists(session.roomId)
        if (!exists) {
          clearSession()
          set({ isReconnecting: false, error: '房間已不存在' })
          return false
        }

        // 訂閱房間並檢查玩家是否還在房間中
        return new Promise<boolean>((resolve) => {
          unsubscribe = subscribeToRoom(session.roomId, (room) => {
            if (!room) {
              clearSession()
              set({ isReconnecting: false, error: '房間已不存在' })
              resolve(false)
              return
            }

            // 檢查玩家是否還在房間中
            const playerInRoom = room.players.some(p => p.id === session.playerId)
            if (!playerInRoom) {
              clearSession()
              if (unsubscribe) {
                unsubscribe()
                unsubscribe = null
              }
              set({ isReconnecting: false, error: '你已不在此房間中' })
              resolve(false)
              return
            }

            // 重連成功
            set({
              roomId: session.roomId,
              playerId: session.playerId,
              room,
              isOnlineMode: true,
              isReconnecting: false,
              error: null,
            })
            resolve(true)
          })
        })
      } catch (err) {
        clearSession()
        set({ isReconnecting: false, error: '重連失敗' })
        return false
      }
    },

    hasStoredSession: () => {
      return loadSession() !== null
    },

    toggleReady: async () => {
      const { roomId, playerId, room } = get()
      if (!roomId || !playerId || !room) return

      const player = room.players.find(p => p.id === playerId)
      if (!player) return

      await setPlayerReady(roomId, playerId, !player.ready)
    },

    changeCharacter: async (characterId) => {
      const { roomId, playerId } = get()
      if (!roomId || !playerId) return false

      const result = await setPlayerCharacter(roomId, playerId, characterId)
      if (!result.success) {
        set({ error: result.error || '更換角色失敗' })
        return false
      }
      return true
    },

    startOnlineGame: async () => {
      const { roomId, playerId, room } = get()
      if (!roomId || !playerId || !room) return false

      // 建立初始遊戲狀態
      const playerNames = room.players.map(p => p.name)
      const characterIds = room.players.map(p => p.characterId)
      const gameState = createInitialGameState(playerNames, characterIds)
      const withEvent = startEventPhase(gameState)

      const result = await startGame(roomId, playerId, withEvent)
      if (!result.success) {
        set({ error: result.error || '開始遊戲失敗' })
        return false
      }

      return true
    },

    syncGameState: async (gameState) => {
      const { roomId } = get()
      if (!roomId) return

      await updateGameState(roomId, gameState)
    },

    getCurrentPlayer: () => {
      const { room, playerId } = get()
      if (!room || !playerId) return null
      return room.players.find(p => p.id === playerId) || null
    },

    isHost: () => {
      const { room, playerId } = get()
      if (!room || !playerId) return false
      return room.hostId === playerId
    },

    canStartGame: () => {
      const { room } = get()
      if (!room) return false
      return room.players.length >= 2 && room.players.every(p => p.ready)
    },

    resetRoom: () => {
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }

      // 清除 localStorage
      clearSession()

      set({
        roomId: null,
        playerId: null,
        room: null,
        isOnlineMode: false,
        isReconnecting: false,
        error: null,
      })
    },
  }
})
