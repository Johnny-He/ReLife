import { create } from 'zustand'
import type { GameState, StatType, Card } from '../types'
import {
  createInitialGameState,
  startEventPhase,
  applyEventEffect,
  startSalaryPhase,
  startActionPhase,
  nextPlayerAction,
  startDrawPhase,
  endTurn,
  drawCards,
  calculateGameResult,
} from '../engine'
import { playCard, canPlayCard, applyStatChoice } from '../engine/cardEffects'
import { applyForJob, getAvailableJobs, canPromote, promote } from '../engine/jobSystem'
import { resolveExplore } from '../data/locations'

// UI 專用的額外狀態
interface UIState {
  // 選擇狀態
  pendingStatChoice: { cardIndex: number; value: number } | null
  pendingExplore: boolean
  pendingTargetPlayer: { action: string; cardIndex: number } | null

  // 反應卡機制
  pendingFunctionCard: {
    card: Card
    cardIndex: number
    sourcePlayerIndex: number
    targetPlayerId?: string  // 如果是指定目標的卡（偷竊、陷害）
    respondingPlayerIndex: number  // 目前詢問哪位玩家
  } | null

  // 訊息
  lastMessage: string | null
}

interface GameStore extends GameState, UIState {
  // === 遊戲流程 Actions ===
  startGame: (playerNames: string[], characterIds: string[]) => void
  nextPhase: () => void
  confirmEvent: () => void

  // === 玩家行動 Actions ===
  selectCard: (index: number | null) => void
  playSelectedCard: () => void
  chooseStat: (stat: StatType) => void
  chooseExploreLocation: (locationId: string) => void
  chooseTargetPlayer: (targetPlayerId: string) => void
  cancelPendingAction: () => void
  endPlayerTurn: () => void

  // === 反應卡 Actions ===
  useInvalidCard: (cardIndex: number) => void  // 使用無效卡
  passReaction: () => void  // 不使用反應卡
  confirmFunctionCard: () => void  // 確認執行功能卡（所有人都 pass）

  // === 職業 Actions ===
  applyJob: (jobId: string) => void
  tryPromote: () => void

  // === 工具函數 ===
  getCurrentPlayer: () => GameState['players'][0] | null
  canCurrentPlayerPlayCard: (cardIndex: number) => { canPlay: boolean; reason?: string }
  getAvailableJobsForCurrentPlayer: () => ReturnType<typeof getAvailableJobs>
  getGameResult: () => ReturnType<typeof calculateGameResult> | null

  // === 重置 ===
  resetGame: () => void
}

const initialUIState: UIState = {
  pendingStatChoice: null,
  pendingExplore: false,
  pendingTargetPlayer: null,
  pendingFunctionCard: null,
  lastMessage: null,
}

// 輔助函數：找到下一位持有「無效」卡的玩家（跳過出牌者）
const findNextPlayerWithInvalidCard = (state: GameState & UIState, startFromIndex: number): number => {
  const playerCount = state.players.length
  const sourceIndex = (state as any).pendingFunctionCard?.sourcePlayerIndex ?? state.currentPlayerIndex

  for (let i = 1; i < playerCount; i++) {
    const checkIndex = (startFromIndex + i) % playerCount
    if (checkIndex === sourceIndex) continue  // 跳過出牌者

    const player = state.players[checkIndex]
    const hasInvalidCard = player.hand.some(
      (card) => card.effect.type === 'special' && card.effect.handler === 'invalid'
    )
    if (hasInvalidCard) return checkIndex
  }
  return -1  // 沒有人有無效卡
}

const initialGameState: GameState = {
  playerCount: 4,
  maxTurns: 10,
  players: [],
  currentPlayerIndex: 0,
  turn: 0,
  phase: 'setup',
  deck: [],
  discardPile: [],
  currentEvent: null,
  eventLog: [],
  selectedCardIndex: null,
  showEventModal: false,
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialGameState,
  ...initialUIState,

  // === 遊戲流程 ===

  startGame: (playerNames, characterIds) => {
    const gameState = createInitialGameState(playerNames, characterIds)
    const withEvent = startEventPhase(gameState)
    set({
      ...withEvent,
      ...initialUIState,
      lastMessage: '遊戲開始！',
    })
  },

  nextPhase: () => {
    const state = get()
    let newState: GameState

    switch (state.phase) {
      case 'event':
        // 事件階段結束，進入發薪階段
        newState = startSalaryPhase(state)
        set({ ...newState, lastMessage: '發薪階段' })
        break

      case 'salary':
        // 發薪階段結束，進入行動階段
        newState = startActionPhase(state)
        set({ ...newState, lastMessage: `${state.players[0].name} 的回合` })
        break

      case 'action':
        // 由 endPlayerTurn 處理
        break

      case 'draw':
        // 抽牌階段結束，進入下一回合
        newState = endTurn(state)
        if (newState.phase === 'game_over') {
          set({ ...newState, lastMessage: '遊戲結束！' })
        } else {
          const withEvent = startEventPhase(newState)
          set({ ...withEvent, lastMessage: `第 ${newState.turn} 回合開始` })
        }
        break

      default:
        break
    }
  },

  confirmEvent: () => {
    const state = get()
    const newState = applyEventEffect(state)
    set({
      ...newState,
      showEventModal: false,
    })
    // 自動進入下一階段
    setTimeout(() => get().nextPhase(), 500)
  },

  // === 玩家行動 ===

  selectCard: (index) => {
    set({ selectedCardIndex: index })
  },

  playSelectedCard: () => {
    const state = get()
    if (state.selectedCardIndex === null) return
    if (state.phase !== 'action') return

    const player = state.players[state.currentPlayerIndex]
    const card = player.hand[state.selectedCardIndex]
    if (!card) return

    // 檢查是否可以使用
    const check = canPlayCard(player, card)
    if (!check.canPlay) {
      set({ lastMessage: check.reason || '無法使用此卡' })
      return
    }

    // 功能卡需要先進入反應卡等待階段（除了無效卡本身）
    if (card.type === 'function' && !(card.effect.type === 'special' && card.effect.handler === 'invalid')) {
      // 找到下一位有「無效」卡的玩家
      const nextRespondingIndex = findNextPlayerWithInvalidCard(state, state.currentPlayerIndex)

      if (nextRespondingIndex !== -1) {
        // 有人可以回應，進入等待狀態
        set({
          pendingFunctionCard: {
            card,
            cardIndex: state.selectedCardIndex,
            sourcePlayerIndex: state.currentPlayerIndex,
            respondingPlayerIndex: nextRespondingIndex,
          },
          lastMessage: `${player.name} 想使用「${card.name}」，等待 ${state.players[nextRespondingIndex].name} 回應...`,
        })
        return
      }
      // 沒有人有無效卡，直接執行
    }

    // 執行卡牌效果
    const result = playCard(player, card)

    // 處理需要選擇的情況
    if (result.needsSelection) {
      if (result.needsSelection.type === 'stat') {
        set({
          pendingStatChoice: {
            cardIndex: state.selectedCardIndex,
            value: card.effect.type === 'stat_change_choice' ? card.effect.value : 1,
          },
          lastMessage: result.message,
        })
        return
      }
      if (result.needsSelection.type === 'location') {
        set({
          pendingExplore: true,
          lastMessage: '選擇探險地點',
        })
        return
      }
      if (result.needsSelection.type === 'player') {
        // 偷竊、陷害等需要選擇目標玩家的卡牌
        const handler = card.effect.type === 'special' ? card.effect.handler : ''
        set({
          pendingTargetPlayer: {
            action: handler,
            cardIndex: state.selectedCardIndex,
          },
          lastMessage: result.message,
        })
        return
      }
    }

    // 更新玩家狀態
    const updatedPlayers = state.players.map((p, i) =>
      i === state.currentPlayerIndex
        ? {
            ...result.player,
            hand: result.player.hand.filter((_, ci) => ci !== state.selectedCardIndex),
          }
        : p
    )

    // 處理抽牌效果
    let newState: Partial<GameStore> = {
      players: updatedPlayers,
      discardPile: [...state.discardPile, card],
      selectedCardIndex: null,
      lastMessage: result.message,
    }

    if (card.effect.type === 'draw_cards') {
      const afterDraw = drawCards({ ...state, players: updatedPlayers }, state.currentPlayerIndex, card.effect.count)
      newState = { ...newState, deck: afterDraw.deck, players: afterDraw.players }
    }

    set(newState as Partial<GameState>)
  },

  chooseStat: (stat) => {
    const state = get()
    if (!state.pendingStatChoice) return

    const player = state.players[state.currentPlayerIndex]
    const card = player.hand[state.pendingStatChoice.cardIndex]
    const result = applyStatChoice(player, stat, state.pendingStatChoice.value)

    // 扣除卡牌費用
    let updatedPlayer = result.player
    if (card.cost) {
      updatedPlayer = { ...updatedPlayer, money: updatedPlayer.money - card.cost }
    }

    const updatedPlayers = state.players.map((p, i) =>
      i === state.currentPlayerIndex
        ? {
            ...updatedPlayer,
            hand: updatedPlayer.hand.filter((_, ci) => ci !== state.pendingStatChoice!.cardIndex),
          }
        : p
    )

    set({
      players: updatedPlayers,
      discardPile: [...state.discardPile, card],
      selectedCardIndex: null,
      pendingStatChoice: null,
      lastMessage: result.message,
    })
  },

  chooseExploreLocation: (locationId) => {
    const state = get()
    if (!state.pendingExplore) return

    const result = resolveExplore(locationId)
    if (!result) return

    const player = state.players[state.currentPlayerIndex]
    let updatedPlayer = player

    // 套用探險結果
    const effect = result.outcome.effect
    if (effect.type === 'stat_change') {
      updatedPlayer = {
        ...updatedPlayer,
        stats: {
          ...updatedPlayer.stats,
          [effect.stat]: Math.max(0, updatedPlayer.stats[effect.stat] + effect.value),
        },
      }
    } else if (effect.type === 'special') {
      // 處理特殊探險效果
      if (effect.handler === 'park_bad') {
        updatedPlayer = {
          ...updatedPlayer,
          money: Math.max(0, updatedPlayer.money - 500),
          stats: { ...updatedPlayer.stats, charisma: Math.max(0, updatedPlayer.stats.charisma - 2) },
        }
      } else if (effect.handler === 'park_good') {
        updatedPlayer = {
          ...updatedPlayer,
          money: updatedPlayer.money + 500,
          stats: { ...updatedPlayer.stats, stamina: updatedPlayer.stats.stamina + 2 },
        }
      }
    }

    // 移除探險卡
    if (state.selectedCardIndex !== null) {
      const card = player.hand[state.selectedCardIndex]
      updatedPlayer = {
        ...updatedPlayer,
        hand: updatedPlayer.hand.filter((_, i) => i !== state.selectedCardIndex),
      }
      set({
        discardPile: [...state.discardPile, card],
      })
    }

    const updatedPlayers = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? updatedPlayer : p
    )

    set({
      players: updatedPlayers,
      pendingExplore: false,
      selectedCardIndex: null,
      lastMessage: `${result.location.name}：${result.outcome.description}`,
    })
  },

  chooseTargetPlayer: (targetPlayerId: string) => {
    const state = get()
    if (!state.pendingTargetPlayer) return

    const { action, cardIndex } = state.pendingTargetPlayer
    const currentPlayer = state.players[state.currentPlayerIndex]
    const card = currentPlayer.hand[cardIndex]
    const targetIndex = state.players.findIndex((p) => p.id === targetPlayerId)
    const targetPlayer = state.players[targetIndex]

    if (!targetPlayer || targetIndex === state.currentPlayerIndex) {
      set({ lastMessage: '無效的目標' })
      return
    }

    let updatedPlayers = [...state.players]
    let message = ''

    switch (action) {
      case 'steal': {
        // 偷竊：隨機抽取目標玩家一張手牌
        if (targetPlayer.hand.length === 0) {
          set({ lastMessage: `${targetPlayer.name} 沒有手牌可偷` })
          return
        }
        const randomIndex = Math.floor(Math.random() * targetPlayer.hand.length)
        const stolenCard = targetPlayer.hand[randomIndex]

        updatedPlayers = updatedPlayers.map((p, i) => {
          if (i === state.currentPlayerIndex) {
            return {
              ...p,
              hand: [...p.hand.filter((_, ci) => ci !== cardIndex), stolenCard],
            }
          }
          if (i === targetIndex) {
            return {
              ...p,
              hand: p.hand.filter((_, ci) => ci !== randomIndex),
            }
          }
          return p
        })
        message = `從 ${targetPlayer.name} 偷到了「${stolenCard.name}」！`
        break
      }

      case 'sabotage': {
        // 陷害：目標玩家隨機屬性 -2
        const stats: ('intelligence' | 'stamina' | 'charisma')[] = ['intelligence', 'stamina', 'charisma']
        const randomStat = stats[Math.floor(Math.random() * stats.length)]
        const statNames = { intelligence: '智力', stamina: '體力', charisma: '魅力' }

        updatedPlayers = updatedPlayers.map((p, i) => {
          if (i === state.currentPlayerIndex) {
            return {
              ...p,
              hand: p.hand.filter((_, ci) => ci !== cardIndex),
            }
          }
          if (i === targetIndex) {
            return {
              ...p,
              stats: {
                ...p.stats,
                [randomStat]: Math.max(0, p.stats[randomStat] - 2),
              },
            }
          }
          return p
        })
        message = `陷害 ${targetPlayer.name}，${statNames[randomStat]} -2！`
        break
      }

      default:
        set({ lastMessage: '未知的行動' })
        return
    }

    set({
      players: updatedPlayers,
      discardPile: [...state.discardPile, card],
      pendingTargetPlayer: null,
      selectedCardIndex: null,
      lastMessage: message,
    })
  },

  cancelPendingAction: () => {
    set({
      pendingStatChoice: null,
      pendingExplore: false,
      pendingTargetPlayer: null,
      pendingFunctionCard: null,
      selectedCardIndex: null,
      lastMessage: '已取消',
    })
  },

  // === 反應卡 ===

  useInvalidCard: (invalidCardIndex: number) => {
    const state = get()
    if (!state.pendingFunctionCard) return

    const { card: functionCard, cardIndex: functionCardIndex, sourcePlayerIndex, respondingPlayerIndex } = state.pendingFunctionCard
    const respondingPlayer = state.players[respondingPlayerIndex]
    const sourcePlayer = state.players[sourcePlayerIndex]
    const invalidCard = respondingPlayer.hand[invalidCardIndex]

    if (!invalidCard || !(invalidCard.effect.type === 'special' && invalidCard.effect.handler === 'invalid')) {
      set({ lastMessage: '這不是無效卡' })
      return
    }

    // 移除雙方的卡牌，都放入棄牌堆
    const updatedPlayers = state.players.map((p, i) => {
      if (i === sourcePlayerIndex) {
        return {
          ...p,
          hand: p.hand.filter((_, ci) => ci !== functionCardIndex),
        }
      }
      if (i === respondingPlayerIndex) {
        return {
          ...p,
          hand: p.hand.filter((_, ci) => ci !== invalidCardIndex),
        }
      }
      return p
    })

    set({
      players: updatedPlayers,
      discardPile: [...state.discardPile, functionCard, invalidCard],
      pendingFunctionCard: null,
      selectedCardIndex: null,
      lastMessage: `${respondingPlayer.name} 使用「無效」卡，${sourcePlayer.name} 的「${functionCard.name}」被取消！`,
    })
  },

  passReaction: () => {
    const state = get()
    if (!state.pendingFunctionCard) return

    const { sourcePlayerIndex, respondingPlayerIndex } = state.pendingFunctionCard

    // 找下一位有無效卡的玩家
    const nextIndex = findNextPlayerWithInvalidCard(state, respondingPlayerIndex)

    if (nextIndex === -1 || nextIndex === sourcePlayerIndex) {
      // 沒有其他人可以回應了，執行功能卡
      get().confirmFunctionCard()
    } else {
      // 繼續詢問下一位
      set({
        pendingFunctionCard: {
          ...state.pendingFunctionCard,
          respondingPlayerIndex: nextIndex,
        },
        lastMessage: `等待 ${state.players[nextIndex].name} 回應...`,
      })
    }
  },

  confirmFunctionCard: () => {
    const state = get()
    if (!state.pendingFunctionCard) return

    const { card, cardIndex, sourcePlayerIndex } = state.pendingFunctionCard
    const sourcePlayer = state.players[sourcePlayerIndex]

    // 執行功能卡效果
    const result = playCard(sourcePlayer, card)

    // 處理需要選擇目標的情況（偷竊、陷害）
    if (result.needsSelection?.type === 'player') {
      const handler = card.effect.type === 'special' ? card.effect.handler : ''
      set({
        pendingFunctionCard: null,
        pendingTargetPlayer: {
          action: handler,
          cardIndex: cardIndex,
        },
        lastMessage: result.message,
      })
      return
    }

    // 直接執行效果
    const updatedPlayers = state.players.map((p, i) =>
      i === sourcePlayerIndex
        ? {
            ...result.player,
            hand: result.player.hand.filter((_, ci) => ci !== cardIndex),
          }
        : p
    )

    let newState: Partial<GameStore> = {
      players: updatedPlayers,
      discardPile: [...state.discardPile, card],
      pendingFunctionCard: null,
      selectedCardIndex: null,
      lastMessage: `${sourcePlayer.name} 使用「${card.name}」：${result.message}`,
    }

    // 處理抽牌效果
    if (card.effect.type === 'draw_cards') {
      const afterDraw = drawCards({ ...state, players: updatedPlayers }, sourcePlayerIndex, card.effect.count)
      newState = { ...newState, deck: afterDraw.deck, players: afterDraw.players }
    }

    set(newState as Partial<GameState>)
  },

  endPlayerTurn: () => {
    const state = get()
    if (state.phase !== 'action') return

    const newState = nextPlayerAction(state)

    if (newState.phase === 'draw') {
      // 所有玩家行動完畢，進入抽牌階段
      const afterDraw = startDrawPhase(newState)
      set({
        ...afterDraw,
        lastMessage: '抽牌階段',
      })
    } else {
      // 下一位玩家
      set({
        ...newState,
        selectedCardIndex: null,
        lastMessage: `${newState.players[newState.currentPlayerIndex].name} 的回合`,
      })
    }
  },

  // === 職業 ===

  applyJob: (jobId) => {
    const state = get()
    const player = state.players[state.currentPlayerIndex]
    const updatedPlayer = applyForJob(player, jobId)

    if (updatedPlayer.job) {
      const updatedPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? updatedPlayer : p
      )
      set({
        players: updatedPlayers,
        lastMessage: `成功應徵 ${updatedPlayer.job.levels[0].name}！`,
      })
    } else {
      set({ lastMessage: '應徵失敗，不符合資格' })
    }
  },

  tryPromote: () => {
    const state = get()
    const player = state.players[state.currentPlayerIndex]

    if (canPromote(player)) {
      const updatedPlayer = promote(player)
      const updatedPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? updatedPlayer : p
      )
      set({
        players: updatedPlayers,
        lastMessage: `升遷為 ${updatedPlayer.job!.levels[updatedPlayer.jobLevel].name}！`,
      })
    } else {
      set({ lastMessage: '尚未滿足升遷條件' })
    }
  },

  // === 工具函數 ===

  getCurrentPlayer: () => {
    const state = get()
    return state.players[state.currentPlayerIndex] || null
  },

  canCurrentPlayerPlayCard: (cardIndex) => {
    const player = get().getCurrentPlayer()
    if (!player) return { canPlay: false, reason: '找不到玩家' }
    const card = player.hand[cardIndex]
    if (!card) return { canPlay: false, reason: '找不到卡牌' }
    return canPlayCard(player, card)
  },

  getAvailableJobsForCurrentPlayer: () => {
    const player = get().getCurrentPlayer()
    if (!player) return []
    return getAvailableJobs(player)
  },

  getGameResult: () => {
    const state = get()
    if (state.phase !== 'game_over') return null
    return calculateGameResult(state.players)
  },

  // === 重置 ===

  resetGame: () => {
    set({
      ...initialGameState,
      ...initialUIState,
    })
  },
}))
