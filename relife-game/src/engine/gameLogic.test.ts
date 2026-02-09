import { describe, it, expect } from 'vitest'
import {
  createInitialGameState,
  startEventPhase,
  startSalaryPhase,
  startActionPhase,
  nextPlayerAction,
  startDrawPhase,
  endTurn,
  discardCard,
  drawCards,
  getOverflowPlayers,
  discardMultipleCards,
  applyEventEffect,
} from './gameLogic'
import type { GameState, GameEvent, Player, Card } from '../types'

// === 測試用 Mock 資料 ===

const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
  playerCount: 4,
  maxTurns: 10,
  players: [
    createMockPlayer({ id: 'p1', name: '玩家1' }),
    createMockPlayer({ id: 'p2', name: '玩家2' }),
    createMockPlayer({ id: 'p3', name: '玩家3' }),
    createMockPlayer({ id: 'p4', name: '玩家4' }),
  ],
  currentPlayerIndex: 0,
  turn: 1,
  phase: 'event',
  deck: createMockDeck(20),
  discardPile: [],
  currentEvent: null,
  eventLog: [],
  actionLog: [],
  selectedCardIndex: null,
  showEventModal: false,
  ...overrides,
})

const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'player-1',
  name: '測試玩家',
  character: {
    id: 'test',
    name: '測試角色',
    gender: 'male',
    description: '測試用',
    initialStats: { intelligence: 5, stamina: 5, charisma: 5 },
    initialMoney: 3000,
    marriageRequirement: { intelligence: 0, stamina: 0, charisma: 0 },
  },
  stats: { intelligence: 5, stamina: 5, charisma: 5 },
  money: 3000,
  job: null,
  jobLevel: 0,
  performance: 0,
  hand: [],
  isSkipTurn: false,
  ...overrides,
})

const createMockCard = (id: string): Card => ({
  id,
  type: 'study',
  name: `卡牌${id}`,
  description: '測試卡',
  effect: { type: 'stat_change', stat: 'intelligence', value: 1 },
  count: 1,
})

const createMockDeck = (count: number): Card[] => {
  return Array.from({ length: count }, (_, i) => createMockCard(`card-${i}`))
}

// === createInitialGameState 測試 ===

describe('createInitialGameState', () => {
  it('should_create_game_with_correct_number_of_players', () => {
    const state = createInitialGameState(
      ['Alice', 'Bob', 'Carol', 'Dave'],
      ['chen-jian-zhi', 'zheng-an-qi', 'chen-dong-ming', 'ke-ruo-ya']
    )

    expect(state.players).toHaveLength(4)
    expect(state.players[0].name).toBe('Alice')
    expect(state.players[1].name).toBe('Bob')
  })

  it('should_deal_initial_hands', () => {
    const state = createInitialGameState(
      ['Alice', 'Bob', 'Carol', 'Dave'],
      ['chen-jian-zhi', 'zheng-an-qi', 'chen-dong-ming', 'ke-ruo-ya']
    )

    // 每位玩家應有 3 張初始手牌
    state.players.forEach((player) => {
      expect(player.hand.length).toBe(3)
    })
  })

  it('should_initialize_game_state_correctly', () => {
    const state = createInitialGameState(
      ['Alice', 'Bob', 'Carol', 'Dave'],
      ['chen-jian-zhi', 'zheng-an-qi', 'chen-dong-ming', 'ke-ruo-ya']
    )

    expect(state.turn).toBe(1)
    expect(state.phase).toBe('event')
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.discardPile).toHaveLength(0)
    expect(state.eventLog).toHaveLength(0)
  })
})

// === startEventPhase 測試 ===

describe('startEventPhase', () => {
  it('should_set_phase_to_event', () => {
    const state = createMockGameState({ phase: 'draw' })
    const newState = startEventPhase(state)

    expect(newState.phase).toBe('event')
  })

  it('should_set_current_event', () => {
    const state = createMockGameState({ turn: 1 })
    const newState = startEventPhase(state)

    expect(newState.currentEvent).not.toBeNull()
    expect(newState.showEventModal).toBe(true)
  })
})

// === startSalaryPhase 測試 ===

describe('startSalaryPhase', () => {
  it('should_set_phase_to_salary', () => {
    const state = createMockGameState({ phase: 'event' })
    const newState = startSalaryPhase(state)

    expect(newState.phase).toBe('salary')
  })

  it('should_pay_salary_to_employed_players', () => {
    const mockJob = {
      id: 'worker',
      name: '工人',
      category: 'stamina' as const,
      levels: [
        { name: '工人', requiredStats: { stamina: 5 }, salary: [1000, 1200, 1500] },
        { name: '技工', requiredStats: { stamina: 8 }, salary: [2000, 2500, 3000] },
        { name: '工頭', requiredStats: { stamina: 12 }, salary: [3500, 4000, 5000, 6000] },
      ],
    }

    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', money: 1000, job: mockJob, performance: 0 }),
        createMockPlayer({ id: 'p2', money: 1000, job: null }),
      ],
    })

    const newState = startSalaryPhase(state)

    expect(newState.players[0].money).toBe(2000) // 1000 + 1000 salary
    expect(newState.players[1].money).toBe(1000) // No job, no salary
  })
})

// === startActionPhase 測試 ===

describe('startActionPhase', () => {
  it('should_set_phase_to_action', () => {
    const state = createMockGameState({ phase: 'salary' })
    const newState = startActionPhase(state)

    expect(newState.phase).toBe('action')
  })

  it('should_reset_current_player_to_first', () => {
    const state = createMockGameState({ currentPlayerIndex: 2 })
    const newState = startActionPhase(state)

    expect(newState.currentPlayerIndex).toBe(0)
  })
})

// === nextPlayerAction 測試 ===

describe('nextPlayerAction', () => {
  it('should_move_to_next_player', () => {
    const state = createMockGameState({ currentPlayerIndex: 0, phase: 'action' })
    const newState = nextPlayerAction(state)

    expect(newState.currentPlayerIndex).toBe(1)
  })

  it('should_transition_to_draw_phase_after_last_player', () => {
    const state = createMockGameState({ currentPlayerIndex: 3, phase: 'action' })
    const newState = nextPlayerAction(state)

    expect(newState.phase).toBe('draw')
  })

  it('should_skip_player_with_isSkipTurn', () => {
    const players = [
      createMockPlayer({ id: 'p1', isSkipTurn: false }),
      createMockPlayer({ id: 'p2', isSkipTurn: true }),
      createMockPlayer({ id: 'p3', isSkipTurn: false }),
      createMockPlayer({ id: 'p4', isSkipTurn: false }),
    ]
    const state = createMockGameState({ currentPlayerIndex: 0, players, phase: 'action' })
    const newState = nextPlayerAction(state)

    expect(newState.currentPlayerIndex).toBe(2) // Skipped player 1
    expect(newState.players[1].isSkipTurn).toBe(false) // Reset flag
  })
})

// === startDrawPhase 測試 ===

describe('startDrawPhase', () => {
  it('should_set_phase_to_draw', () => {
    const state = createMockGameState({ phase: 'action' })
    const newState = startDrawPhase(state)

    expect(newState.phase).toBe('draw')
  })

  it('should_draw_2_cards_for_each_player', () => {
    const players = [
      createMockPlayer({ id: 'p1', hand: [createMockCard('c1')] }),
      createMockPlayer({ id: 'p2', hand: [] }),
    ]
    const state = createMockGameState({ players, deck: createMockDeck(10) })
    const newState = startDrawPhase(state)

    expect(newState.players[0].hand.length).toBe(3) // 1 + 2
    expect(newState.players[1].hand.length).toBe(2) // 0 + 2
  })

  it('should_reshuffle_discard_pile_when_deck_empty', () => {
    const players = [
      createMockPlayer({ id: 'p1', hand: [] }),
      createMockPlayer({ id: 'p2', hand: [] }),
    ]
    const state = createMockGameState({
      players,
      deck: createMockDeck(2), // Not enough for all players
      discardPile: createMockDeck(10),
    })
    const newState = startDrawPhase(state)

    // Should have reshuffled and dealt
    expect(newState.discardPile).toHaveLength(0)
    expect(newState.players[0].hand.length).toBe(2)
    expect(newState.players[1].hand.length).toBe(2)
  })

  it('should_allow_hand_to_exceed_10_for_discard_selection', () => {
    const players = [
      createMockPlayer({ id: 'p1', hand: createMockDeck(9) }),
    ]
    const state = createMockGameState({ players, deck: createMockDeck(10) })
    const newState = startDrawPhase(state)

    expect(newState.players[0].hand.length).toBe(11) // 不再自動裁剪，由 store 處理棄牌
  })
})

// === endTurn 測試 ===

describe('endTurn', () => {
  it('should_increment_turn', () => {
    const state = createMockGameState({ turn: 1 })
    const newState = endTurn(state)

    expect(newState.turn).toBe(2)
  })

  it('should_set_phase_to_event', () => {
    const state = createMockGameState({ turn: 1, phase: 'draw' })
    const newState = endTurn(state)

    expect(newState.phase).toBe('event')
  })

  it('should_end_game_after_max_turns', () => {
    const state = createMockGameState({ turn: 10, maxTurns: 10 })
    const newState = endTurn(state)

    expect(newState.phase).toBe('game_over')
  })
})

// === discardCard 測試 ===

describe('discardCard', () => {
  it('should_remove_card_from_hand', () => {
    const cards = [createMockCard('c1'), createMockCard('c2'), createMockCard('c3')]
    const players = [createMockPlayer({ id: 'p1', hand: cards })]
    const state = createMockGameState({ players, discardPile: [] })

    const newState = discardCard(state, 0, 1) // Discard card at index 1

    expect(newState.players[0].hand.length).toBe(2)
    expect(newState.players[0].hand.map((c) => c.id)).toEqual(['c1', 'c3'])
  })

  it('should_add_card_to_discard_pile', () => {
    const cards = [createMockCard('c1'), createMockCard('c2')]
    const players = [createMockPlayer({ id: 'p1', hand: cards })]
    const state = createMockGameState({ players, discardPile: [] })

    const newState = discardCard(state, 0, 0)

    expect(newState.discardPile.length).toBe(1)
    expect(newState.discardPile[0].id).toBe('c1')
  })
})

// === drawCards 測試 ===

describe('drawCards', () => {
  it('should_add_cards_to_player_hand', () => {
    const players = [createMockPlayer({ id: 'p1', hand: [] })]
    const state = createMockGameState({ players, deck: createMockDeck(5) })

    const newState = drawCards(state, 0, 3)

    expect(newState.players[0].hand.length).toBe(3)
  })

  it('should_remove_cards_from_deck', () => {
    const players = [createMockPlayer({ id: 'p1', hand: [] })]
    const state = createMockGameState({ players, deck: createMockDeck(5) })

    const newState = drawCards(state, 0, 3)

    expect(newState.deck.length).toBe(2)
  })

  it('should_not_draw_more_than_deck_size', () => {
    const players = [createMockPlayer({ id: 'p1', hand: [] })]
    const state = createMockGameState({ players, deck: createMockDeck(2) })

    const newState = drawCards(state, 0, 5)

    expect(newState.players[0].hand.length).toBe(2)
    expect(newState.deck.length).toBe(0)
  })

  it('should_cap_hand_at_10', () => {
    const players = [createMockPlayer({ id: 'p1', hand: createMockDeck(8) })]
    const state = createMockGameState({ players, deck: createMockDeck(5) })

    const newState = drawCards(state, 0, 5)

    expect(newState.players[0].hand.length).toBe(10)
  })
})

// === getOverflowPlayers 測試 ===

describe('getOverflowPlayers', () => {
  it('should_return_empty_when_no_overflow', () => {
    const players = [
      createMockPlayer({ id: 'p1', hand: createMockDeck(8) }),
      createMockPlayer({ id: 'p2', hand: createMockDeck(10) }),
    ]
    expect(getOverflowPlayers(players)).toEqual([])
  })

  it('should_detect_overflow_players', () => {
    const players = [
      createMockPlayer({ id: 'p1', hand: createMockDeck(12) }),
      createMockPlayer({ id: 'p2', hand: createMockDeck(8) }),
      createMockPlayer({ id: 'p3', hand: createMockDeck(11) }),
    ]
    const overflow = getOverflowPlayers(players)
    expect(overflow).toHaveLength(2)
    expect(overflow[0]).toEqual({ playerIndex: 0, discardCount: 2 })
    expect(overflow[1]).toEqual({ playerIndex: 2, discardCount: 1 })
  })
})

// === discardMultipleCards 測試 ===

describe('discardMultipleCards', () => {
  it('should_remove_selected_cards_and_add_to_discard_pile', () => {
    const hand = createMockDeck(5)
    const players = [createMockPlayer({ id: 'p1', hand })]
    const state = createMockGameState({ players, discardPile: [] })

    const newState = discardMultipleCards(state, 0, [1, 3])

    expect(newState.players[0].hand).toHaveLength(3)
    expect(newState.discardPile).toHaveLength(2)
    expect(newState.discardPile[0].id).toBe(hand[1].id)
    expect(newState.discardPile[1].id).toBe(hand[3].id)
  })

  it('should_keep_correct_remaining_cards', () => {
    const hand = createMockDeck(4)
    const players = [createMockPlayer({ id: 'p1', hand })]
    const state = createMockGameState({ players, discardPile: [] })

    const newState = discardMultipleCards(state, 0, [0, 2])

    expect(newState.players[0].hand).toHaveLength(2)
    expect(newState.players[0].hand[0].id).toBe(hand[1].id)
    expect(newState.players[0].hand[1].id).toBe(hand[3].id)
  })
})

// === applyEventEffect 測試 ===

const createMockEvent = (overrides: Partial<GameEvent> = {}): GameEvent => ({
  id: 'test-event',
  turn: 1,
  name: '測試事件',
  description: '測試用事件',
  target: { type: 'all' },
  effect: { type: 'money_change', value: 500 },
  ...overrides,
})

describe('applyEventEffect', () => {
  // --- 無事件時 ---
  it('should_return_unchanged_state_when_no_event', () => {
    const state = createMockGameState({ currentEvent: null })
    const result = applyEventEffect(state)
    expect(result).toEqual(state)
  })

  // --- 一般效果：money_change ---
  it('should_apply_money_change_to_all_players', () => {
    const state = createMockGameState({
      currentEvent: createMockEvent({
        target: { type: 'all' },
        effect: { type: 'money_change', value: 1000 },
      }),
    })
    const result = applyEventEffect(state)

    result.players.forEach(p => expect(p.money).toBe(4000)) // 3000 + 1000
    expect(result.currentEvent).toBeNull()
  })

  it('should_apply_money_change_only_to_richest', () => {
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: '窮人', money: 1000 }),
        createMockPlayer({ id: 'p2', name: '富人', money: 5000 }),
        createMockPlayer({ id: 'p3', name: '中等', money: 3000 }),
      ],
      currentEvent: createMockEvent({
        target: { type: 'richest', count: 1 },
        effect: { type: 'money_change', value: -500 },
      }),
    })
    const result = applyEventEffect(state)

    expect(result.players[0].money).toBe(1000) // 不受影響
    expect(result.players[1].money).toBe(4500) // 5000 - 500
    expect(result.players[2].money).toBe(3000) // 不受影響
  })

  it('should_apply_money_change_only_to_poorest', () => {
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: '窮人', money: 500 }),
        createMockPlayer({ id: 'p2', name: '富人', money: 5000 }),
        createMockPlayer({ id: 'p3', name: '中等', money: 3000 }),
      ],
      currentEvent: createMockEvent({
        target: { type: 'poorest', count: 1 },
        effect: { type: 'money_change', value: 1000 },
      }),
    })
    const result = applyEventEffect(state)

    expect(result.players[0].money).toBe(1500) // 500 + 1000
    expect(result.players[1].money).toBe(5000) // 不受影響
    expect(result.players[2].money).toBe(3000) // 不受影響
  })

  // --- 一般效果：stat_change ---
  it('should_apply_stat_change_to_all_players', () => {
    const state = createMockGameState({
      currentEvent: createMockEvent({
        effect: { type: 'stat_change', stat: 'stamina', value: -3 },
      }),
    })
    const result = applyEventEffect(state)

    result.players.forEach(p => expect(p.stats.stamina).toBe(2)) // 5 - 3
  })

  // --- 一般效果：draw_cards ---
  it('should_draw_cards_for_all_players', () => {
    const state = createMockGameState({
      deck: createMockDeck(10),
      currentEvent: createMockEvent({
        effect: { type: 'draw_cards', count: 1 },
      }),
    })
    const result = applyEventEffect(state)

    result.players.forEach(p => expect(p.hand.length).toBe(1))
    expect(result.deck.length).toBe(6) // 10 - 4 players × 1 card
  })

  // --- 特殊事件：poverty_relief ---
  it('should_set_poor_players_to_1500', () => {
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: '窮人A', money: 500 }),
        createMockPlayer({ id: 'p2', name: '窮人B', money: 1499 }),
        createMockPlayer({ id: 'p3', name: '正好', money: 1500 }),
        createMockPlayer({ id: 'p4', name: '富人', money: 5000 }),
      ],
      currentEvent: createMockEvent({
        effect: { type: 'special', handler: 'poverty_relief' },
      }),
    })
    const result = applyEventEffect(state)

    expect(result.players[0].money).toBe(1500)
    expect(result.players[1].money).toBe(1500)
    expect(result.players[2].money).toBe(1500) // 剛好 1500 不受影響
    expect(result.players[3].money).toBe(5000) // 富人不受影響
  })

  // --- 特殊事件：tax ---
  it('should_tax_richest_players_10_percent', () => {
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: '窮人', money: 1000 }),
        createMockPlayer({ id: 'p2', name: '富人A', money: 10000 }),
        createMockPlayer({ id: 'p3', name: '富人B', money: 8000 }),
        createMockPlayer({ id: 'p4', name: '中等', money: 3000 }),
      ],
      currentEvent: createMockEvent({
        target: { type: 'richest', count: 2 },
        effect: { type: 'special', handler: 'tax' },
      }),
    })
    const result = applyEventEffect(state)

    expect(result.players[0].money).toBe(1000)  // 不受影響
    expect(result.players[1].money).toBe(9000)   // 10000 - 1000
    expect(result.players[2].money).toBe(7200)   // 8000 - 800
    expect(result.players[3].money).toBe(3000)  // 不受影響
  })

  // --- 特殊事件：competition ---
  it('should_award_2000_to_each_stat_winner', () => {
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: '智力王', money: 1000, stats: { intelligence: 10, stamina: 3, charisma: 3 } }),
        createMockPlayer({ id: 'p2', name: '體力王', money: 1000, stats: { intelligence: 3, stamina: 10, charisma: 3 } }),
        createMockPlayer({ id: 'p3', name: '魅力王', money: 1000, stats: { intelligence: 3, stamina: 3, charisma: 10 } }),
      ],
      currentEvent: createMockEvent({
        effect: { type: 'special', handler: 'competition' },
      }),
    })
    const result = applyEventEffect(state)

    expect(result.players[0].money).toBe(3000) // 1000 + 2000 (intelligence)
    expect(result.players[1].money).toBe(3000) // 1000 + 2000 (stamina)
    expect(result.players[2].money).toBe(3000) // 1000 + 2000 (charisma)
  })

  it('should_give_all_prizes_to_one_player_if_highest_in_all', () => {
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: '全能', money: 1000, stats: { intelligence: 10, stamina: 10, charisma: 10 } }),
        createMockPlayer({ id: 'p2', name: '弱者', money: 1000, stats: { intelligence: 1, stamina: 1, charisma: 1 } }),
      ],
      currentEvent: createMockEvent({
        effect: { type: 'special', handler: 'competition' },
      }),
    })
    const result = applyEventEffect(state)

    expect(result.players[0].money).toBe(7000) // 1000 + 2000 × 3
    expect(result.players[1].money).toBe(1000) // 不受影響
  })

  // --- 特殊事件：competition_ranked ---
  it('should_rank_players_by_score_and_award_prizes', () => {
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: '第三', money: 1000, stats: { intelligence: 5, stamina: 5, charisma: 5 } }),
        createMockPlayer({ id: 'p2', name: '第一', money: 5000, stats: { intelligence: 10, stamina: 10, charisma: 10 } }),
        createMockPlayer({ id: 'p3', name: '第二', money: 3000, stats: { intelligence: 8, stamina: 8, charisma: 8 } }),
        createMockPlayer({ id: 'p4', name: '第四', money: 500, stats: { intelligence: 1, stamina: 1, charisma: 1 } }),
      ],
      currentEvent: createMockEvent({
        effect: { type: 'special', handler: 'competition_ranked' },
      }),
    })
    const result = applyEventEffect(state)

    // p2: score = 5000 + 30*100 = 8000 → 第一 +3000
    expect(result.players[1].money).toBe(8000)
    // p3: score = 3000 + 24*100 = 5400 → 第二 +2000
    expect(result.players[2].money).toBe(5000)
    // p1: score = 1000 + 15*100 = 2500 → 第三 +1000
    expect(result.players[0].money).toBe(2000)
    // p4: 第四名無獎金
    expect(result.players[3].money).toBe(500)
  })

  // --- 特殊事件：competition_achievement ---
  it('should_award_higher_prizes_for_achievement_competition', () => {
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: '第一', money: 10000, stats: { intelligence: 10, stamina: 10, charisma: 10 } }),
        createMockPlayer({ id: 'p2', name: '第二', money: 5000, stats: { intelligence: 5, stamina: 5, charisma: 5 } }),
        createMockPlayer({ id: 'p3', name: '第三', money: 1000, stats: { intelligence: 3, stamina: 3, charisma: 3 } }),
      ],
      currentEvent: createMockEvent({
        effect: { type: 'special', handler: 'competition_achievement' },
      }),
    })
    const result = applyEventEffect(state)

    expect(result.players[0].money).toBe(15000) // 10000 + 5000
    expect(result.players[1].money).toBe(8500)   // 5000 + 3500
    expect(result.players[2].money).toBe(3000)   // 1000 + 2000
  })

  // --- 特殊事件：poverty_relief_3000 ---
  it('should_give_3000_to_poorest_player', () => {
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: '窮人', money: 200 }),
        createMockPlayer({ id: 'p2', name: '中等', money: 3000 }),
        createMockPlayer({ id: 'p3', name: '富人', money: 8000 }),
      ],
      currentEvent: createMockEvent({
        target: { type: 'poorest', count: 1 },
        effect: { type: 'special', handler: 'poverty_relief_3000' },
      }),
    })
    const result = applyEventEffect(state)

    expect(result.players[0].money).toBe(3200)  // 200 + 3000
    expect(result.players[1].money).toBe(3000)  // 不受影響
    expect(result.players[2].money).toBe(8000)  // 不受影響
  })

  // --- 特殊事件：game_end ---
  it('should_set_phase_to_game_over', () => {
    const state = createMockGameState({
      currentEvent: createMockEvent({
        effect: { type: 'special', handler: 'game_end' },
      }),
    })
    const result = applyEventEffect(state)

    expect(result.phase).toBe('game_over')
    expect(result.currentEvent).toBeNull()
  })

  // --- 共通行為 ---
  it('should_clear_current_event_after_applying', () => {
    const state = createMockGameState({
      currentEvent: createMockEvent(),
    })
    const result = applyEventEffect(state)

    expect(result.currentEvent).toBeNull()
    expect(result.showEventModal).toBe(false)
  })

  it('should_add_event_to_event_log', () => {
    const state = createMockGameState({
      eventLog: [],
      currentEvent: createMockEvent({ name: '紅包', description: '恭喜發財' }),
    })
    const result = applyEventEffect(state)

    expect(result.eventLog.length).toBeGreaterThan(0)
    expect(result.eventLog[0]).toContain('紅包')
  })

  // --- 特殊事件：skip_turn ---
  it('should_set_isSkipTurn_for_targeted_players', () => {
    const mockJob = {
      id: 'worker', name: '工人', category: 'stamina' as const,
      levels: [{ name: '工人', requiredStats: { stamina: 5 }, salary: [1000] }],
    }
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: 'A', job: mockJob }),
        createMockPlayer({ id: 'p2', name: 'B', job: null }),
        createMockPlayer({ id: 'p3', name: 'C', job: mockJob }),
      ],
      currentEvent: createMockEvent({
        target: { type: 'has_job' },
        effect: { type: 'special', handler: 'skip_turn' },
      }),
    })
    const result = applyEventEffect(state)

    expect(result.players[0].isSkipTurn).toBe(true)
    expect(result.players[1].isSkipTurn).toBe(false)
    expect(result.players[2].isSkipTurn).toBe(true)
  })

  // --- 特殊事件：pass_cards_left ---
  it('should_pass_one_card_left_to_next_player', () => {
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: 'A', hand: [createMockCard('a1'), createMockCard('a2')] }),
        createMockPlayer({ id: 'p2', name: 'B', hand: [createMockCard('b1')] }),
        createMockPlayer({ id: 'p3', name: 'C', hand: [createMockCard('c1'), createMockCard('c2'), createMockCard('c3')] }),
      ],
      currentEvent: createMockEvent({
        effect: { type: 'special', handler: 'pass_cards_left' },
      }),
    })
    const result = applyEventEffect(state)

    // 每人傳一張給下家（環形），手牌數應不變
    expect(result.players[0].hand.length).toBe(2)
    expect(result.players[1].hand.length).toBe(1)
    expect(result.players[2].hand.length).toBe(3)
  })

  it('should_handle_pass_cards_when_player_has_no_cards', () => {
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: 'A', hand: [createMockCard('a1')] }),
        createMockPlayer({ id: 'p2', name: 'B', hand: [] }),
      ],
      currentEvent: createMockEvent({
        effect: { type: 'special', handler: 'pass_cards_left' },
      }),
    })
    const result = applyEventEffect(state)

    // B 沒牌可傳，A 傳一張給 B
    // A: 少一張（傳出）+ 0（B沒牌傳來） = 0
    // B: 不變 + 1（A傳來）= 1
    expect(result.players[0].hand.length).toBe(0)
    expect(result.players[1].hand.length).toBe(1)
  })

  // --- 特殊事件：charity ---
  it('should_transfer_2000_from_richest_to_poorest', () => {
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: '富人', money: 10000 }),
        createMockPlayer({ id: 'p2', name: '中等', money: 5000 }),
        createMockPlayer({ id: 'p3', name: '窮人', money: 1000 }),
      ],
      currentEvent: createMockEvent({
        effect: { type: 'special', handler: 'charity' },
      }),
    })
    const result = applyEventEffect(state)

    expect(result.players[0].money).toBe(8000)  // 10000 - 2000
    expect(result.players[1].money).toBe(5000)  // 不受影響
    expect(result.players[2].money).toBe(3000)  // 1000 + 2000
  })

  it('should_not_transfer_if_richest_and_poorest_are_same', () => {
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: '唯一', money: 5000 }),
      ],
      currentEvent: createMockEvent({
        effect: { type: 'special', handler: 'charity' },
      }),
    })
    const result = applyEventEffect(state)

    expect(result.players[0].money).toBe(5000) // 不變
  })

  // --- 目標篩選：has_job ---
  it('should_apply_effect_only_to_players_with_jobs', () => {
    const mockJob = {
      id: 'worker', name: '工人', category: 'stamina' as const,
      levels: [{ name: '工人', requiredStats: { stamina: 5 }, salary: [1000] }],
    }
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: '有工作', money: 3000, job: mockJob }),
        createMockPlayer({ id: 'p2', name: '無業', money: 3000, job: null }),
      ],
      currentEvent: createMockEvent({
        target: { type: 'has_job' },
        effect: { type: 'money_change', value: -500 },
      }),
    })
    const result = applyEventEffect(state)

    expect(result.players[0].money).toBe(2500) // 有工作，扣錢
    expect(result.players[1].money).toBe(3000) // 無業，不受影響
  })

  // --- 目標篩選：specific_job ---
  it('should_apply_effect_only_to_specific_job_players', () => {
    const teacherJob = {
      id: 'teacher', name: '老師', category: 'intelligence' as const,
      levels: [{ name: '老師', requiredStats: { intelligence: 5 }, salary: [2000] }],
    }
    const workerJob = {
      id: 'worker', name: '工人', category: 'stamina' as const,
      levels: [{ name: '工人', requiredStats: { stamina: 5 }, salary: [1000] }],
    }
    const state = createMockGameState({
      players: [
        createMockPlayer({ id: 'p1', name: '老師', money: 3000, job: teacherJob }),
        createMockPlayer({ id: 'p2', name: '工人', money: 3000, job: workerJob }),
        createMockPlayer({ id: 'p3', name: '無業', money: 3000, job: null }),
      ],
      currentEvent: createMockEvent({
        target: { type: 'specific_job', jobIds: ['teacher'] },
        effect: { type: 'money_change', value: 1000 },
      }),
    })
    const result = applyEventEffect(state)

    expect(result.players[0].money).toBe(4000) // 老師，加錢
    expect(result.players[1].money).toBe(3000) // 工人，不受影響
    expect(result.players[2].money).toBe(3000) // 無業，不受影響
  })
})
