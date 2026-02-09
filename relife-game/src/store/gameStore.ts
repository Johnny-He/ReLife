import { create } from 'zustand'
import type { GameState, StatType, Card, GameLog } from '../types'
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
  getOverflowPlayers,
  discardMultipleCards,
} from '../engine'
import { checkWinCondition } from '../engine/calculator'
import { playCard, canPlayCard, applyStatChoice } from '../engine/cardEffects'
import { applyForJob, getAvailableJobs, canPromote, promote } from '../engine/jobSystem'
import { jobs } from '../data/jobs'
import { resolveExplore } from '../data/locations'

// UI 專用的額外狀態
interface UIState {
  // 選擇狀態
  pendingStatChoice: { cardIndex: number; value: number } | null
  pendingExplore: boolean
  pendingTargetPlayer: { action: string; cardIndex: number } | null
  pendingParachute: { cardIndex: number } | null
  pendingDiscard: {
    playerIndex: number
    discardCount: number
    selectedCardIndices: number[]
  } | null

  // 反應卡機制
  pendingFunctionCard: {
    card: Card
    cardIndex: number
    sourcePlayerIndex: number
    targetPlayerId?: string  // 如果是指定目標的卡（偷竊、陷害）
    respondingPlayerIndex: number  // 目前詢問哪位玩家
    passedPlayerIndices: number[]  // 已經放棄回應的玩家
    invalidChain?: { playerIndex: number; card: Card }[]  // 無效卡連鎖
  } | null

  // 升遷彈窗
  promotionInfo: {
    playerName: string
    jobTitle: string
    salaryRange: string
  } | null

  // 訊息
  lastMessage: string | null
}

interface GameStore extends GameState, UIState {
  // === 遊戲流程 Actions ===
  startGame: (playerNames: string[], characterIds: string[], isAIFlags?: boolean[]) => void
  nextPhase: () => void
  confirmEvent: () => void

  // === 玩家行動 Actions ===
  selectCard: (index: number | null) => void
  playSelectedCard: () => void
  chooseStat: (stat: StatType) => void
  chooseExploreLocation: (locationId: string) => void
  chooseTargetPlayer: (targetPlayerId: string) => void
  applyParachute: (jobId: string) => void
  cancelPendingAction: () => void
  endPlayerTurn: () => void

  // === 反應卡 Actions ===
  applyInvalidCard: (cardIndex: number) => void  // 使用無效卡
  passReaction: () => void  // 不使用反應卡
  confirmFunctionCard: () => void  // 確認執行功能卡（所有人都 pass）

  // === 棄牌 Actions ===
  toggleDiscardCard: (cardIndex: number) => void
  confirmDiscard: () => void

  // === 職業 Actions ===
  applyJob: (jobId: string) => void
  tryPromote: () => void
  dismissPromotion: () => void

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
  pendingParachute: null,
  pendingDiscard: null,
  pendingFunctionCard: null,
  promotionInfo: null,
  lastMessage: null,
}

// 輔助函數：找到下一位持有「無效」卡的玩家（跳過出牌者和已放棄的玩家）
const findNextPlayerWithInvalidCard = (
  state: GameState & UIState,
  startFromIndex: number,
  passedIndices: number[] = [],
  skipIndex?: number  // 要跳過的玩家（使用無效卡的人不能反制自己）
): number => {
  const playerCount = state.players.length

  for (let i = 1; i < playerCount; i++) {
    const checkIndex = (startFromIndex + i) % playerCount
    if (skipIndex !== undefined && checkIndex === skipIndex) continue  // 跳過指定玩家
    if (passedIndices.includes(checkIndex)) continue  // 跳過已放棄的玩家

    const player = state.players[checkIndex]
    const hasInvalidCard = (player?.hand ?? []).some(
      (card) => card.effect.type === 'special' && card.effect.handler === 'invalid'
    )
    if (hasInvalidCard) return checkIndex
  }
  return -1  // 沒有人有無效卡
}

// 輔助函數：新增行動記錄
const addLog = (state: GameState, playerName: string, message: string, type: GameLog['type'] = 'action'): GameLog[] => {
  const log: GameLog = { turn: state.turn, playerName, message, type }
  return [...(state.actionLog || []), log]
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
  actionLog: [],
  selectedCardIndex: null,
  showEventModal: false,
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialGameState,
  ...initialUIState,

  // === 遊戲流程 ===

  startGame: (playerNames, characterIds, isAIFlags = []) => {
    const gameState = createInitialGameState(playerNames, characterIds, isAIFlags)
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
      case 'event': {
        // 事件階段結束，進入發薪階段
        newState = startSalaryPhase(state)
        // 記錄發薪
        let salaryLogs = state.actionLog || []
        newState.players.forEach((p, i) => {
          const oldMoney = state.players[i]?.money ?? 0
          const diff = p.money - oldMoney
          if (diff > 0) {
            salaryLogs = [...salaryLogs, { turn: state.turn, playerName: p.name, message: `領薪 +$${diff}`, type: 'system' as const }]
          }
        })
        newState = { ...newState, actionLog: salaryLogs }
        // 檢查發薪後是否有人達到 $20,000 勝利條件
        const salaryWinner = checkWinCondition(newState.players)
        if (salaryWinner) {
          set({
            ...newState,
            phase: 'game_over',
            lastMessage: `${salaryWinner.name} 率先達到 $20,000，獲得勝利！`,
          })
          return
        }
        set({ ...newState, lastMessage: '發薪階段' })
        break
      }

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

    // 記錄事件
    const eventName = state.currentEvent?.name || '未知事件'
    const eventDesc = state.currentEvent?.description || ''
    const eventLogs = addLog(state, '系統', `${eventName}：${eventDesc}`, 'event')

    // 檢查是否有人達到 $20,000 勝利條件
    const winner = checkWinCondition(newState.players)
    if (winner) {
      set({
        ...newState,
        actionLog: eventLogs,
        phase: 'game_over',
        showEventModal: false,
        lastMessage: `${winner.name} 率先達到 $20,000，獲得勝利！`,
      })
      return
    }

    set({
      ...newState,
      actionLog: eventLogs,
      showEventModal: false,
      // phase 仍是 'event'，由 GamePage 的 useEffect 偵測 showEventModal=false 後推進
    })
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

    // 功能卡需要先進入反應卡等待階段
    // 例外：無效卡本身、陷害卡（無法被無效）
    const isUnblockable = card.effect.type === 'special' &&
      (card.effect.handler === 'invalid' || card.effect.handler === 'sabotage')

    if (card.type === 'function' && !isUnblockable) {
      // 找到下一位有「無效」卡的玩家（跳過出牌者自己）
      const nextRespondingIndex = findNextPlayerWithInvalidCard(state, state.currentPlayerIndex, [], state.currentPlayerIndex)

      if (nextRespondingIndex !== -1) {
        // 有人可以回應，進入等待狀態
        set({
          pendingFunctionCard: {
            card,
            cardIndex: state.selectedCardIndex,
            sourcePlayerIndex: state.currentPlayerIndex,
            respondingPlayerIndex: nextRespondingIndex,
            passedPlayerIndices: [],
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
      if (result.needsSelection.type === 'job') {
        // 空降：選擇要就職的職業
        set({
          pendingParachute: {
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
      discardPile: [...(state.discardPile || []), card],
      selectedCardIndex: null,
      lastMessage: result.message,
      actionLog: addLog(state, player.name, `使用「${card.name}」：${result.message}`),
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

    const statNames: Record<string, string> = { intelligence: '智力', stamina: '體力', charisma: '魅力' }
    set({
      players: updatedPlayers,
      discardPile: [...(state.discardPile || []), card],
      selectedCardIndex: null,
      pendingStatChoice: null,
      lastMessage: result.message,
      actionLog: addLog(state, player.name, `使用「${card.name}」→ ${statNames[stat] || stat} ${state.pendingStatChoice.value > 0 ? '+' : ''}${state.pendingStatChoice.value}`),
    })
  },

  chooseExploreLocation: (locationId) => {
    const state = get()
    if (!state.pendingExplore) return

    const result = resolveExplore(locationId)
    if (!result) {
      set({ pendingExplore: false, selectedCardIndex: null, lastMessage: '探險失敗' })
      return
    }

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
        discardPile: [...(state.discardPile || []), card],
      })
    }

    const updatedPlayers = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? updatedPlayer : p
    )

    const explorePlayer = state.players[state.currentPlayerIndex]
    set({
      players: updatedPlayers,
      pendingExplore: false,
      selectedCardIndex: null,
      lastMessage: `${result.location.name}：${result.outcome.description}`,
      actionLog: addLog(state, explorePlayer.name, `探險「${result.location.name}」：${result.outcome.description}`),
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
      set({ pendingTargetPlayer: null, selectedCardIndex: null, lastMessage: '無效的目標' })
      return
    }

    let updatedPlayers = [...(state.players || [])]
    let message = ''

    switch (action) {
      case 'steal': {
        // 偷竊：隨機抽取目標玩家一張手牌
        const targetHand = targetPlayer.hand ?? []
        if (targetHand.length === 0) {
          set({ pendingTargetPlayer: null, selectedCardIndex: null, lastMessage: `${targetPlayer.name} 沒有手牌可偷` })
          return
        }
        const randomIndex = Math.floor(Math.random() * targetHand.length)
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

      case 'robbery': {
        // 搶劫：檢視目標玩家手牌並拿走一張（目前簡化為隨機抽取最好的牌）
        const targetHand = targetPlayer.hand ?? []
        if (targetHand.length === 0) {
          set({ pendingTargetPlayer: null, selectedCardIndex: null, lastMessage: `${targetPlayer.name} 沒有手牌可搶` })
          return
        }
        // 簡化處理：隨機選一張（完整版應該讓玩家選擇）
        const randomIndex = Math.floor(Math.random() * targetHand.length)
        const robbedCard = targetPlayer.hand[randomIndex]

        updatedPlayers = updatedPlayers.map((p, i) => {
          if (i === state.currentPlayerIndex) {
            return {
              ...p,
              hand: [...p.hand.filter((_, ci) => ci !== cardIndex), robbedCard],
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
        message = `搶劫 ${targetPlayer.name}，拿走了「${robbedCard.name}」！`
        break
      }


      default:
        set({ pendingTargetPlayer: null, selectedCardIndex: null, lastMessage: '未知的行動' })
        return
    }

    set({
      players: updatedPlayers,
      discardPile: [...(state.discardPile || []), card],
      pendingTargetPlayer: null,
      selectedCardIndex: null,
      lastMessage: message,
      actionLog: addLog(state, currentPlayer.name, message),
    })
  },

  applyParachute: (jobId: string) => {
    const state = get()
    if (!state.pendingParachute) return

    const { cardIndex } = state.pendingParachute
    const player = state.players[state.currentPlayerIndex]
    const job = jobs.find(j => j.id === jobId)

    if (!job) {
      set({ pendingParachute: null, selectedCardIndex: null, lastMessage: '無效的職業' })
      return
    }

    const updatedPlayers = state.players.map((p, i) => {
      if (i === state.currentPlayerIndex) {
        return {
          ...p,
          hand: p.hand.filter((_, ci) => ci !== cardIndex),
          job,
          jobLevel: 0,
          performance: 0,
          firstJobTurn: p.firstJobTurn ?? state.turn,
          jobChangeCount: (p.jobChangeCount ?? 0) + 1,
        }
      }
      return p
    })

    const card = player.hand[cardIndex]
    const message = `使用空降，直接就職「${job.levels[0].name}」！`
    set({
      players: updatedPlayers,
      discardPile: [...(state.discardPile || []), card],
      pendingParachute: null,
      selectedCardIndex: null,
      lastMessage: message,
      actionLog: addLog(state, player.name, message),
    })
  },

  cancelPendingAction: () => {
    set({
      pendingStatChoice: null,
      pendingExplore: false,
      pendingTargetPlayer: null,
      pendingParachute: null,
      pendingDiscard: null,
      pendingFunctionCard: null,
      selectedCardIndex: null,
      lastMessage: '已取消',
    })
  },

  // === 棄牌 ===

  toggleDiscardCard: (cardIndex: number) => {
    const state = get()
    if (!state.pendingDiscard) return

    const { selectedCardIndices, discardCount } = state.pendingDiscard
    const isSelected = selectedCardIndices.includes(cardIndex)

    let newSelected: number[]
    if (isSelected) {
      newSelected = selectedCardIndices.filter(i => i !== cardIndex)
    } else {
      if (selectedCardIndices.length >= discardCount) return
      newSelected = [...selectedCardIndices, cardIndex]
    }

    set({
      pendingDiscard: {
        ...state.pendingDiscard,
        selectedCardIndices: newSelected,
      },
    })
  },

  confirmDiscard: () => {
    const state = get()
    if (!state.pendingDiscard) return

    const { playerIndex, discardCount, selectedCardIndices } = state.pendingDiscard
    if (selectedCardIndices.length !== discardCount) return

    const player = state.players[playerIndex]
    const afterDiscard = discardMultipleCards(state, playerIndex, selectedCardIndices)

    const cardNames = selectedCardIndices.map(i => player.hand[i]?.name).filter(Boolean).join('、')
    const message = `${player.name} 丟棄了 ${cardNames}`

    // 檢查是否還有其他玩家需要棄牌
    const overflowPlayers = getOverflowPlayers(afterDiscard.players)

    if (overflowPlayers.length > 0) {
      const next = overflowPlayers[0]
      set({
        ...afterDiscard,
        pendingDiscard: {
          playerIndex: next.playerIndex,
          discardCount: next.discardCount,
          selectedCardIndices: [],
        },
        lastMessage: `${afterDiscard.players[next.playerIndex].name} 手牌超過上限，需要丟棄 ${next.discardCount} 張`,
        actionLog: addLog(state, player.name, message),
      })
    } else {
      set({
        ...afterDiscard,
        pendingDiscard: null,
        lastMessage: '抽牌階段',
        actionLog: addLog(state, player.name, message),
      })
    }
  },

  // === 反應卡 ===

  applyInvalidCard: (invalidCardIndex: number) => {
    const state = get()
    if (!state.pendingFunctionCard) return

    const { respondingPlayerIndex } = state.pendingFunctionCard
    const respondingPlayer = state.players[respondingPlayerIndex]
    const invalidCard = respondingPlayer.hand[invalidCardIndex]

    if (!invalidCard || !(invalidCard.effect.type === 'special' && invalidCard.effect.handler === 'invalid')) {
      set({ lastMessage: '這不是無效卡' })
      return
    }

    // 從回應者手中移除無效卡
    const updatedPlayers = state.players.map((p, i) => {
      if (i === respondingPlayerIndex) {
        return { ...p, hand: p.hand.filter((_, ci) => ci !== invalidCardIndex) }
      }
      return p
    })

    // 修正 cardIndex：若回應者就是出牌者，移除的無效卡在功能卡之前，cardIndex 需 -1
    let adjustedCardIndex = state.pendingFunctionCard.cardIndex
    if (respondingPlayerIndex === state.pendingFunctionCard.sourcePlayerIndex && invalidCardIndex < adjustedCardIndex) {
      adjustedCardIndex -= 1
    }

    // 加入無效連鎖
    const invalidChain = [
      ...(state.pendingFunctionCard.invalidChain ?? []),
      { playerIndex: respondingPlayerIndex, card: invalidCard },
    ]

    // 找下一位可以反制的玩家（跳過剛出無效的人）
    const stateWithUpdatedPlayers = { ...state, players: updatedPlayers }
    const nextIndex = findNextPlayerWithInvalidCard(
      stateWithUpdatedPlayers,
      respondingPlayerIndex,
      [],  // 重置 passedIndices，新一輪反制
      respondingPlayerIndex  // 跳過剛出無效的人
    )

    const invalidMsg = `使用「無效」卡！`

    if (nextIndex === -1) {
      // 沒有人可以反制，根據連鎖長度決定結果
      // 奇數：原始功能卡被取消；偶數：原始功能卡生效
      const allInvalidCards = invalidChain.map(c => c.card)

      if (invalidChain.length % 2 === 1) {
        // 奇數：功能卡被取消
        const { card: functionCard, sourcePlayerIndex } = state.pendingFunctionCard
        const sourcePlayer = updatedPlayers[sourcePlayerIndex]
        const finalPlayers = updatedPlayers.map((p, i) => {
          if (i === sourcePlayerIndex) {
            return { ...p, hand: p.hand.filter((_, ci) => ci !== adjustedCardIndex) }
          }
          return p
        })
        const lastInvalidator = updatedPlayers[invalidChain[invalidChain.length - 1].playerIndex]
        set({
          players: finalPlayers,
          discardPile: [...(state.discardPile || []), functionCard, ...allInvalidCards],
          pendingFunctionCard: null,
          selectedCardIndex: null,
          lastMessage: `${lastInvalidator.name} 的「無效」生效，${sourcePlayer.name} 的「${functionCard.name}」被取消！`,
          actionLog: addLog({ ...state, players: finalPlayers, actionLog: addLog(state, respondingPlayer.name, invalidMsg) }, lastInvalidator.name, `「無效」生效，取消了「${functionCard.name}」`),
        })
      } else {
        // 偶數：功能卡生效（無效被反制）
        const lastInvalidator = updatedPlayers[invalidChain[invalidChain.length - 1].playerIndex]
        set({
          players: updatedPlayers,
          discardPile: [...(state.discardPile || []), ...allInvalidCards],
          pendingFunctionCard: {
            ...state.pendingFunctionCard,
            cardIndex: adjustedCardIndex,
            invalidChain: [],
            passedPlayerIndices: [],
          },
          lastMessage: `${lastInvalidator.name} 反制成功！功能卡繼續生效。`,
          actionLog: addLog({ ...state, players: updatedPlayers, actionLog: addLog(state, respondingPlayer.name, invalidMsg) }, lastInvalidator.name, `反制「無效」成功！`),
        })
        // 功能卡生效，直接執行
        get().confirmFunctionCard()
      }
    } else {
      // 有人可以反制，繼續詢問
      set({
        players: updatedPlayers,
        pendingFunctionCard: {
          ...state.pendingFunctionCard,
          cardIndex: adjustedCardIndex,
          respondingPlayerIndex: nextIndex,
          passedPlayerIndices: [],
          invalidChain,
        },
        lastMessage: `${respondingPlayer.name} 使用「無效」！等待 ${updatedPlayers[nextIndex].name} 回應...`,
        actionLog: addLog(state, respondingPlayer.name, invalidMsg),
      })
    }
  },

  passReaction: () => {
    const state = get()
    if (!state.pendingFunctionCard) return

    const { respondingPlayerIndex, passedPlayerIndices, invalidChain } = state.pendingFunctionCard

    // 將當前玩家加入已放棄列表（Firebase 同步後 passedPlayerIndices 可能是 undefined）
    const newPassedIndices = [...(passedPlayerIndices ?? []), respondingPlayerIndex]

    // 判斷要跳過誰：如果有無效連鎖，跳過最後一位使用無效的人
    const chainLength = (invalidChain ?? []).length
    const skipIndex = chainLength > 0
      ? invalidChain![chainLength - 1].playerIndex
      : state.pendingFunctionCard.sourcePlayerIndex

    // 找下一位有無效卡的玩家
    const nextIndex = findNextPlayerWithInvalidCard(state, respondingPlayerIndex, newPassedIndices, skipIndex)

    if (nextIndex === -1) {
      // 沒有其他人可以回應了
      if (chainLength > 0 && chainLength % 2 === 1) {
        // 奇數無效卡：功能卡被取消
        const { card: functionCard, cardIndex: functionCardIndex, sourcePlayerIndex } = state.pendingFunctionCard
        const sourcePlayer = state.players[sourcePlayerIndex]
        const allInvalidCards = invalidChain!.map(c => c.card)
        const lastInvalidator = state.players[invalidChain![chainLength - 1].playerIndex]
        const updatedPlayers = state.players.map((p, i) => {
          if (i === sourcePlayerIndex) {
            return { ...p, hand: p.hand.filter((_, ci) => ci !== functionCardIndex) }
          }
          return p
        })
        set({
          players: updatedPlayers,
          discardPile: [...(state.discardPile || []), functionCard, ...allInvalidCards],
          pendingFunctionCard: null,
          selectedCardIndex: null,
          lastMessage: `${lastInvalidator.name} 的「無效」生效，${sourcePlayer.name} 的「${functionCard.name}」被取消！`,
          actionLog: addLog(state, lastInvalidator.name, `「無效」生效，取消了「${functionCard.name}」`),
        })
      } else {
        // 沒有無效卡或偶數：功能卡生效
        if (chainLength > 0) {
          // 偶數：丟棄所有無效卡，然後執行
          const allInvalidCards = invalidChain!.map(c => c.card)
          set({
            discardPile: [...(state.discardPile || []), ...allInvalidCards],
            pendingFunctionCard: {
              ...state.pendingFunctionCard,
              invalidChain: [],
              passedPlayerIndices: [],
            },
          })
        }
        get().confirmFunctionCard()
      }
    } else {
      // 繼續詢問下一位
      set({
        pendingFunctionCard: {
          ...state.pendingFunctionCard,
          respondingPlayerIndex: nextIndex,
          passedPlayerIndices: newPassedIndices,
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

    // 處理空降：選擇職業
    if (result.needsSelection?.type === 'job') {
      set({
        pendingFunctionCard: null,
        pendingParachute: {
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
      discardPile: [...(state.discardPile || []), card],
      pendingFunctionCard: null,
      selectedCardIndex: null,
      lastMessage: `${sourcePlayer.name} 使用「${card.name}」：${result.message}`,
      actionLog: addLog(state, sourcePlayer.name, `使用「${card.name}」：${result.message}`),
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
      const overflowPlayers = getOverflowPlayers(afterDraw.players)

      if (overflowPlayers.length > 0) {
        const first = overflowPlayers[0]
        set({
          ...afterDraw,
          pendingDiscard: {
            playerIndex: first.playerIndex,
            discardCount: first.discardCount,
            selectedCardIndices: [],
          },
          lastMessage: `${afterDraw.players[first.playerIndex].name} 手牌超過上限，需要丟棄 ${first.discardCount} 張`,
        })
      } else {
        set({
          ...afterDraw,
          lastMessage: '抽牌階段',
        })
      }
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
      const trackedPlayer = {
        ...updatedPlayer,
        firstJobTurn: updatedPlayer.firstJobTurn ?? state.turn,
        jobChangeCount: (updatedPlayer.jobChangeCount ?? 0) + 1,
      }
      const updatedPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? trackedPlayer : p
      )
      set({
        players: updatedPlayers,
        lastMessage: `成功應徵 ${updatedPlayer.job.levels[0].name}！`,
        actionLog: addLog(state, player.name, `應徵「${updatedPlayer.job.levels[0].name}」成功`, 'job'),
      })
    } else {
      set({ lastMessage: '應徵失敗，不符合資格' })
    }
  },

  tryPromote: () => {
    const state = get()
    const player = state.players[state.currentPlayerIndex]

    if (canPromote(player)) {
      const updatedPlayer = {
        ...promote(player),
        firstPromotionTurn: player.firstPromotionTurn ?? state.turn,
      }
      const updatedPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? updatedPlayer : p
      )
      const jobTitle = updatedPlayer.job!.levels[updatedPlayer.jobLevel].name
      const salary = updatedPlayer.job!.levels[updatedPlayer.jobLevel].salary
      const salaryRange = `$${salary[0].toLocaleString()}~$${salary[salary.length - 1].toLocaleString()}`
      set({
        players: updatedPlayers,
        promotionInfo: { playerName: player.name, jobTitle, salaryRange },
        lastMessage: `🎉 恭喜升遷為「${jobTitle}」！薪水: ${salaryRange}`,
        actionLog: addLog(state, player.name, `升遷為「${jobTitle}」🎉`, 'job'),
      })
    } else {
      set({ lastMessage: '尚未滿足升遷條件' })
    }
  },

  dismissPromotion: () => {
    set({ promotionInfo: null })
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
    // 檢查是否有人達到 $20,000 勝利條件
    const earlyWinner = checkWinCondition(state.players)
    return calculateGameResult(state.players, earlyWinner ?? undefined)
  },

  // === 重置 ===

  resetGame: () => {
    set({
      ...initialGameState,
      ...initialUIState,
    })
  },
}))
