import { ref, set, get, onValue, update, remove } from 'firebase/database'
import { database } from './config'
import type { GameState } from '../types'

// 房間狀態
export interface RoomPlayer {
  id: string
  name: string
  characterId: string
  ready: boolean
}

export interface Room {
  id: string
  hostId: string
  players: RoomPlayer[]
  status: 'waiting' | 'playing' | 'finished'
  gameState: GameState | null
  createdAt: number
}

// 產生隨機房間碼（6位數字）
export const generateRoomCode = (): string => {
  return Math.random().toString().slice(2, 8)
}

// 產生玩家 ID
export const generatePlayerId = (): string => {
  return 'player_' + Math.random().toString(36).slice(2, 11)
}

// 建立房間
export const createRoom = async (hostName: string, characterId: string): Promise<{ roomId: string; playerId: string }> => {
  const roomId = generateRoomCode()
  const playerId = generatePlayerId()

  const room: Room = {
    id: roomId,
    hostId: playerId,
    players: [
      {
        id: playerId,
        name: hostName,
        characterId,
        ready: true,
      }
    ],
    status: 'waiting',
    gameState: null,
    createdAt: Date.now(),
  }

  await set(ref(database, `rooms/${roomId}`), room)

  return { roomId, playerId }
}

// 加入房間
export const joinRoom = async (
  roomId: string,
  playerName: string,
  characterId: string
): Promise<{ success: boolean; playerId?: string; error?: string }> => {
  const roomRef = ref(database, `rooms/${roomId}`)
  const snapshot = await get(roomRef)

  if (!snapshot.exists()) {
    return { success: false, error: '房間不存在' }
  }

  const room = snapshot.val() as Room

  if (room.status !== 'waiting') {
    return { success: false, error: '遊戲已經開始' }
  }

  if (room.players.length >= 4) {
    return { success: false, error: '房間已滿' }
  }

  // 檢查角色是否已被選
  if (room.players.some(p => p.characterId === characterId)) {
    return { success: false, error: '此角色已被其他玩家選擇' }
  }

  const playerId = generatePlayerId()
  const newPlayer: RoomPlayer = {
    id: playerId,
    name: playerName,
    characterId,
    ready: false,
  }

  await update(roomRef, {
    players: [...room.players, newPlayer]
  })

  return { success: true, playerId }
}

// 離開房間
export const leaveRoom = async (roomId: string, playerId: string): Promise<void> => {
  const roomRef = ref(database, `rooms/${roomId}`)
  const snapshot = await get(roomRef)

  if (!snapshot.exists()) return

  const room = snapshot.val() as Room
  const updatedPlayers = room.players.filter(p => p.id !== playerId)

  if (updatedPlayers.length === 0) {
    // 沒有玩家了，刪除房間
    await remove(roomRef)
  } else if (room.hostId === playerId) {
    // 房主離開，轉移房主
    await update(roomRef, {
      players: updatedPlayers,
      hostId: updatedPlayers[0].id,
    })
  } else {
    await update(roomRef, {
      players: updatedPlayers,
    })
  }
}

// 更新玩家準備狀態
export const setPlayerReady = async (roomId: string, playerId: string, ready: boolean): Promise<void> => {
  const roomRef = ref(database, `rooms/${roomId}`)
  const snapshot = await get(roomRef)

  if (!snapshot.exists()) return

  const room = snapshot.val() as Room
  const updatedPlayers = room.players.map(p =>
    p.id === playerId ? { ...p, ready } : p
  )

  await update(roomRef, { players: updatedPlayers })
}

// 更新玩家角色
export const setPlayerCharacter = async (roomId: string, playerId: string, characterId: string): Promise<{ success: boolean; error?: string }> => {
  const roomRef = ref(database, `rooms/${roomId}`)
  const snapshot = await get(roomRef)

  if (!snapshot.exists()) return { success: false, error: '房間不存在' }

  const room = snapshot.val() as Room

  // 檢查角色是否已被選
  if (room.players.some(p => p.id !== playerId && p.characterId === characterId)) {
    return { success: false, error: '此角色已被其他玩家選擇' }
  }

  const updatedPlayers = room.players.map(p =>
    p.id === playerId ? { ...p, characterId } : p
  )

  await update(roomRef, { players: updatedPlayers })
  return { success: true }
}

// 開始遊戲（只有房主可以）
export const startGame = async (roomId: string, playerId: string, gameState: GameState): Promise<{ success: boolean; error?: string }> => {
  const roomRef = ref(database, `rooms/${roomId}`)
  const snapshot = await get(roomRef)

  if (!snapshot.exists()) return { success: false, error: '房間不存在' }

  const room = snapshot.val() as Room

  if (room.hostId !== playerId) {
    return { success: false, error: '只有房主可以開始遊戲' }
  }

  if (room.players.length < 2) {
    return { success: false, error: '至少需要 2 位玩家' }
  }

  if (!room.players.every(p => p.ready)) {
    return { success: false, error: '還有玩家未準備' }
  }

  await update(roomRef, {
    status: 'playing',
    gameState,
  })

  return { success: true }
}

// 更新遊戲狀態
export const updateGameState = async (roomId: string, gameState: GameState): Promise<void> => {
  const roomRef = ref(database, `rooms/${roomId}`)
  await update(roomRef, { gameState })
}

// 監聽房間變化
export const subscribeToRoom = (roomId: string, callback: (room: Room | null) => void): (() => void) => {
  const roomRef = ref(database, `rooms/${roomId}`)

  // onValue 返回 unsubscribe 函數，這才是正確的清理方式
  // 使用 off(ref) 會移除該 ref 上所有監聯器，在多人環境下會影響其他玩家
  const unsubscribe = onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as Room)
    } else {
      callback(null)
    }
  })

  return unsubscribe
}

// 檢查房間是否存在
export const checkRoomExists = async (roomId: string): Promise<boolean> => {
  const snapshot = await get(ref(database, `rooms/${roomId}`))
  return snapshot.exists()
}

// 清理舊房間
const ROOM_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 小時
const PLAYING_MAX_AGE_MS = 6 * 60 * 60 * 1000 // playing 狀態最多 6 小時

export const cleanupOldRooms = async (): Promise<{ deleted: number; total: number }> => {
  const roomsRef = ref(database, 'rooms')
  const snapshot = await get(roomsRef)

  if (!snapshot.exists()) {
    return { deleted: 0, total: 0 }
  }

  const now = Date.now()
  const rooms = snapshot.val() as Record<string, Room>
  const roomEntries = Object.entries(rooms)
  let deleted = 0

  for (const [roomId, room] of roomEntries) {
    const age = now - (room.createdAt || 0)
    const shouldDelete =
      // 超過 24 小時的房間
      age > ROOM_MAX_AGE_MS ||
      // 或 playing 狀態超過 6 小時（可能是斷線的遊戲）
      (room.status === 'playing' && age > PLAYING_MAX_AGE_MS) ||
      // 或 finished 狀態超過 1 小時
      (room.status === 'finished' && age > 60 * 60 * 1000)

    if (shouldDelete) {
      await remove(ref(database, `rooms/${roomId}`))
      deleted++
    }
  }

  console.log(`[Room Cleanup] 清理了 ${deleted}/${roomEntries.length} 個舊房間`)
  return { deleted, total: roomEntries.length }
}
