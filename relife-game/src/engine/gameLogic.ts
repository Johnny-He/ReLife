import type { GameState, Player, Card, GameEvent, Character, StatType } from '../types'
import { characters } from '../data/characters'
import { createDeck, shuffleDeck } from '../data/cards'
import { getEventForTurn } from '../data/events'
import { paySalary, applyJobSkillEffect } from './jobSystem'
import { changeMoney, changeStat, getRichestPlayers, getPoorestPlayers, getHighestStatPlayer } from './calculator'

// === 遊戲常數 ===
const INITIAL_HAND_SIZE = 3
const DRAW_PER_TURN = 2
const MAX_HAND_SIZE = 10
const MAX_TURNS = 10

// === 遊戲初始化 ===

export const createInitialGameState = (
  playerNames: string[],
  characterIds: string[]
): GameState => {
  // 建立玩家
  const players: Player[] = playerNames.map((name, index) => {
    const character = characters.find((c) => c.id === characterIds[index])!
    return createPlayer(name, character)
  })

  // 建立並洗牌
  const deck = shuffleDeck(createDeck())

  // 發初始手牌
  let currentDeck = deck
  const playersWithHands = players.map((player) => {
    const hand = currentDeck.slice(0, INITIAL_HAND_SIZE)
    currentDeck = currentDeck.slice(INITIAL_HAND_SIZE)
    return { ...player, hand }
  })

  return {
    playerCount: 4,
    maxTurns: MAX_TURNS,
    players: playersWithHands,
    currentPlayerIndex: 0,
    turn: 1,
    phase: 'event',
    deck: currentDeck,
    discardPile: [],
    currentEvent: null,
    eventLog: [],
    selectedCardIndex: null,
    showEventModal: false,
  }
}

const createPlayer = (name: string, character: Character): Player => {
  return {
    id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    character,
    stats: { ...character.initialStats },
    money: character.initialMoney,
    job: null,
    jobLevel: 0,
    performance: 0,
    hand: [],
    isSkipTurn: false,
  }
}

// === 回合流程 ===

// 進入事件階段
export const startEventPhase = (state: GameState): GameState => {
  const event = getEventForTurn(state.turn)

  return {
    ...state,
    phase: 'event',
    currentEvent: event,
    showEventModal: true,
  }
}

// 執行事件效果
export const applyEventEffect = (state: GameState): GameState => {
  if (!state.currentEvent) return state

  const event = state.currentEvent
  let updatedPlayers = [...state.players]
  const messages: string[] = [`【${event.name}】${event.description}`]

  // 根據目標類型找出受影響的玩家
  let targetPlayers: Player[]
  switch (event.target.type) {
    case 'all':
      targetPlayers = updatedPlayers
      break
    case 'richest':
      targetPlayers = getRichestPlayers(updatedPlayers, event.target.count || 1)
      break
    case 'poorest':
      targetPlayers = getPoorestPlayers(updatedPlayers, event.target.count || 1)
      break
    default:
      targetPlayers = updatedPlayers
  }

  // 處理特殊事件
  if (event.effect.type === 'special') {
    switch (event.effect.handler) {
      case 'poverty_relief':
        // 濟貧：金錢少於 1500 的玩家獲得補助
        updatedPlayers = updatedPlayers.map((player) => {
          if (player.money < 1500) {
            messages.push(`${player.name} 獲得補助金 $1,500`)
            return { ...player, money: 1500 }
          }
          return player
        })
        break

      case 'tax':
        // 徵稅：最有錢的人繳 10%
        updatedPlayers = updatedPlayers.map((player) => {
          if (targetPlayers.find((t) => t.id === player.id)) {
            const tax = Math.floor(player.money * 0.1)
            messages.push(`${player.name} 繳納稅金 $${tax}`)
            return changeMoney(player, -tax)
          }
          return player
        })
        break

      case 'competition':
        // 競賽：各屬性最高者獲得獎金
        const statPrizes: { stat: StatType; name: string; prize: number }[] = [
          { stat: 'intelligence', name: '智力競賽', prize: 2000 },
          { stat: 'stamina', name: '體力競賽', prize: 2000 },
          { stat: 'charisma', name: '魅力競賽', prize: 2000 },
        ]

        for (const { stat, name, prize } of statPrizes) {
          const winner = getHighestStatPlayer(updatedPlayers, stat)
          messages.push(`${name}冠軍：${winner.name}，獲得 $${prize}`)
          updatedPlayers = updatedPlayers.map((player) =>
            player.id === winner.id ? changeMoney(player, prize) : player
          )
        }
        break

      case 'game_end':
        // 遊戲結束
        return {
          ...state,
          phase: 'game_over',
          currentEvent: null,
          showEventModal: false,
          eventLog: [...state.eventLog, ...messages],
        }
    }
  } else {
    // 一般效果
    updatedPlayers = updatedPlayers.map((player) => {
      if (!targetPlayers.find((t) => t.id === player.id)) return player

      switch (event.effect.type) {
        case 'money_change':
          return changeMoney(player, event.effect.value)
        case 'stat_change':
          return changeStat(player, event.effect.stat, event.effect.value)
        case 'draw_cards':
          // 抽牌在後面統一處理
          return player
        default:
          return player
      }
    })

    // 處理抽牌效果
    if (event.effect.type === 'draw_cards') {
      let deck = [...state.deck]
      updatedPlayers = updatedPlayers.map((player) => {
        if (!targetPlayers.find((t) => t.id === player.id)) return player

        const drawCount = Math.min(event.effect.type === 'draw_cards' ? event.effect.count : 0, deck.length)
        const drawnCards = deck.slice(0, drawCount)
        deck = deck.slice(drawCount)

        return {
          ...player,
          hand: [...player.hand, ...drawnCards].slice(0, MAX_HAND_SIZE),
        }
      })

      return {
        ...state,
        players: updatedPlayers,
        deck,
        currentEvent: null,
        showEventModal: false,
        eventLog: [...state.eventLog, ...messages],
      }
    }
  }

  return {
    ...state,
    players: updatedPlayers,
    currentEvent: null,
    showEventModal: false,
    eventLog: [...state.eventLog, ...messages],
  }
}

// 進入發薪階段
export const startSalaryPhase = (state: GameState): GameState => {
  const updatedPlayers = state.players.map((player) => {
    // 先發薪水
    let updated = paySalary(player)
    // 再套用職業技能
    updated = applyJobSkillEffect(updated)
    return updated
  })

  return {
    ...state,
    phase: 'salary',
    players: updatedPlayers,
  }
}

// 進入行動階段
export const startActionPhase = (state: GameState): GameState => {
  return {
    ...state,
    phase: 'action',
    currentPlayerIndex: 0,
  }
}

// 下一位玩家行動
export const nextPlayerAction = (state: GameState): GameState => {
  const nextIndex = state.currentPlayerIndex + 1

  // 如果所有玩家都行動完畢
  if (nextIndex >= state.players.length) {
    return {
      ...state,
      phase: 'draw',
    }
  }

  // 跳過需要暫停的玩家
  if (state.players[nextIndex].isSkipTurn) {
    return nextPlayerAction({
      ...state,
      currentPlayerIndex: nextIndex,
      players: state.players.map((p, i) =>
        i === nextIndex ? { ...p, isSkipTurn: false } : p
      ),
    })
  }

  return {
    ...state,
    currentPlayerIndex: nextIndex,
  }
}

// 進入抽牌階段
export const startDrawPhase = (state: GameState): GameState => {
  let deck = [...state.deck]
  const discardPile = [...state.discardPile]

  // 如果牌庫不夠，把棄牌堆洗回去
  const totalCardsToDraw = state.players.length * DRAW_PER_TURN
  if (deck.length < totalCardsToDraw && discardPile.length > 0) {
    deck = [...deck, ...shuffleDeck(discardPile)]
  }

  // 每個玩家抽牌
  const updatedPlayers = state.players.map((player) => {
    const drawCount = Math.min(DRAW_PER_TURN, deck.length)
    const drawnCards = deck.slice(0, drawCount)
    deck = deck.slice(drawCount)

    const newHand = [...player.hand, ...drawnCards]
    // 超過上限的話丟棄多餘的牌（簡化處理：從最早的開始丟）
    const excessCards = newHand.length > MAX_HAND_SIZE ? newHand.slice(0, newHand.length - MAX_HAND_SIZE) : []

    return {
      ...player,
      hand: newHand.slice(-MAX_HAND_SIZE),
    }
  })

  return {
    ...state,
    phase: 'draw',
    players: updatedPlayers,
    deck,
    discardPile: [],  // 已經洗回牌庫了
  }
}

// 進入回合結束階段
export const endTurn = (state: GameState): GameState => {
  const nextTurn = state.turn + 1

  // 檢查遊戲是否結束
  if (nextTurn > MAX_TURNS) {
    return {
      ...state,
      phase: 'game_over',
    }
  }

  return {
    ...state,
    turn: nextTurn,
    phase: 'event',
  }
}

// 丟棄卡牌
export const discardCard = (state: GameState, playerIndex: number, cardIndex: number): GameState => {
  const player = state.players[playerIndex]
  const card = player.hand[cardIndex]

  return {
    ...state,
    players: state.players.map((p, i) =>
      i === playerIndex
        ? { ...p, hand: p.hand.filter((_, ci) => ci !== cardIndex) }
        : p
    ),
    discardPile: [...state.discardPile, card],
  }
}

// 從牌庫抽牌
export const drawCards = (state: GameState, playerIndex: number, count: number): GameState => {
  let deck = [...state.deck]

  const drawCount = Math.min(count, deck.length)
  const drawnCards = deck.slice(0, drawCount)
  deck = deck.slice(drawCount)

  return {
    ...state,
    deck,
    players: state.players.map((p, i) =>
      i === playerIndex
        ? { ...p, hand: [...p.hand, ...drawnCards].slice(0, MAX_HAND_SIZE) }
        : p
    ),
  }
}
