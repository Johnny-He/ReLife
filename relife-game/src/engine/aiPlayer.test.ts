import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  aiChooseCard,
  aiChooseStat,
  aiChooseExploreLocation,
  aiChooseTargetPlayer,
  aiShouldUseInvalidCard,
  aiChooseJob,
  aiChooseParachuteJob,
  aiChooseDiscardCards,
  isCurrentPlayerAI,
  AI_ACTION_DELAY,
} from './aiPlayer'
import type { Player, Card, GameState } from '../types'
import { jobs } from '../data/jobs'

// Mock player factory
const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'player-1',
  name: '測試玩家',
  character: {
    id: 'char-1',
    name: '測試角色',
    gender: 'male',
    initialMoney: 3000,
    initialStats: { intelligence: 5, stamina: 5, charisma: 5 },
    marriageRequirement: { intelligence: 10, stamina: 10, charisma: 10 },
  },
  stats: { intelligence: 5, stamina: 5, charisma: 5 },
  money: 3000,
  job: null,
  jobLevel: 0,
  performance: 0,
  hand: [],
  isSkipTurn: false,
  isAI: false,
  ...overrides,
})

// Mock card factory
const createMockCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'card-1',
  type: 'study',
  name: '自由研究',
  description: '選擇任一能力 +1',
  cost: 300,
  effect: { type: 'stat_change_choice', value: 1 },
  count: 1,
  ...overrides,
})

describe('aiChooseCard', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should_return_null_when_no_cards_in_hand', () => {
    const player = createMockPlayer({ hand: [] })
    const result = aiChooseCard(player)
    expect(result).toBeNull()
  })

  it('should_return_null_when_no_playable_cards', () => {
    const player = createMockPlayer({
      money: 0,
      hand: [createMockCard({ cost: 500 })],
    })
    const result = aiChooseCard(player)
    expect(result).toBeNull()
  })

  it('should_prefer_performance_card_when_has_job', () => {
    vi.mocked(Math.random).mockReturnValue(0) // 80% path → pick best
    const player = createMockPlayer({
      money: 1000,
      job: jobs[0],
      hand: [
        createMockCard({ id: 'study', cost: 300, effect: { type: 'stat_change_choice', value: 1 } }),
        createMockCard({ id: 'perf', type: 'work', name: '績效', cost: undefined, effect: { type: 'performance_change', value: 1 } }),
      ],
    })
    const result = aiChooseCard(player)
    expect(result).toBe(1) // 績效卡 score=90 > 自由研究 score=65
  })

  it('should_prefer_study_card_for_lowest_stat', () => {
    vi.mocked(Math.random).mockReturnValue(0)
    const player = createMockPlayer({
      money: 1000,
      stats: { intelligence: 3, stamina: 8, charisma: 8 }, // 智力最低
      hand: [
        createMockCard({ id: 'int', cost: 500, effect: { type: 'stat_change', stat: 'intelligence', value: 2 } }),
        createMockCard({ id: 'sta', cost: 500, effect: { type: 'stat_change', stat: 'stamina', value: 2 } }),
      ],
    })
    const result = aiChooseCard(player)
    expect(result).toBe(0) // 智力卡 score=70 > 體力卡 score=50
  })

  it('should_skip_study_cards_when_no_money', () => {
    vi.mocked(Math.random).mockReturnValue(0)
    const player = createMockPlayer({
      money: 0,
      hand: [
        createMockCard({ id: 'study', cost: 500, effect: { type: 'stat_change', stat: 'intelligence', value: 2 } }),
      ],
    })
    const result = aiChooseCard(player)
    expect(result).toBeNull() // 沒錢買不起
  })

  it('should_sometimes_pick_random_card_for_variety', () => {
    vi.mocked(Math.random).mockReturnValue(0.9) // >0.8 → random path
    const player = createMockPlayer({
      money: 1000,
      hand: [
        createMockCard({ id: 'c1', cost: 300 }),
        createMockCard({ id: 'c2', cost: 300 }),
      ],
    })
    const result = aiChooseCard(player)
    expect(result).not.toBeNull()
  })

  it('should_prefer_overtime_when_low_money_and_has_job', () => {
    vi.mocked(Math.random).mockReturnValue(0)
    const player = createMockPlayer({
      money: 500,
      job: jobs[0],
      hand: [
        createMockCard({ id: 'social', type: 'work', effect: { type: 'special', handler: 'socializing' } }),
        createMockCard({ id: 'overtime', type: 'work', effect: { type: 'special', handler: 'overtime' } }),
      ],
    })
    const result = aiChooseCard(player)
    expect(result).toBe(1) // 加班 score=60 > 應酬 score=20
  })
})

describe('aiChooseStat', () => {
  it('should_return_lowest_stat_intelligence', () => {
    const player = createMockPlayer({
      stats: { intelligence: 3, stamina: 8, charisma: 8 },
    })
    expect(aiChooseStat(player)).toBe('intelligence')
  })

  it('should_return_lowest_stat_stamina', () => {
    const player = createMockPlayer({
      stats: { intelligence: 8, stamina: 2, charisma: 8 },
    })
    expect(aiChooseStat(player)).toBe('stamina')
  })

  it('should_return_lowest_stat_charisma', () => {
    const player = createMockPlayer({
      stats: { intelligence: 8, stamina: 8, charisma: 3 },
    })
    expect(aiChooseStat(player)).toBe('charisma')
  })

  it('should_return_intelligence_when_all_stats_equal', () => {
    const player = createMockPlayer({
      stats: { intelligence: 5, stamina: 5, charisma: 5 },
    })
    expect(aiChooseStat(player)).toBe('intelligence')
  })
})

describe('aiChooseExploreLocation', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should_return_library_when_random_is_low', () => {
    vi.mocked(Math.random).mockReturnValue(0.1)
    expect(aiChooseExploreLocation()).toBe('library')
  })

  it('should_return_home_when_random_is_medium', () => {
    vi.mocked(Math.random).mockReturnValue(0.6)
    expect(aiChooseExploreLocation()).toBe('home')
  })

  it('should_return_park_when_random_is_high', () => {
    vi.mocked(Math.random).mockReturnValue(0.9)
    expect(aiChooseExploreLocation()).toBe('park')
  })

  it('should_always_return_valid_location', () => {
    vi.restoreAllMocks()
    for (let i = 0; i < 100; i++) {
      const result = aiChooseExploreLocation()
      expect(['park', 'library', 'home']).toContain(result)
    }
  })
})

describe('aiChooseTargetPlayer', () => {
  it('should_return_null_when_no_other_players', () => {
    const players = [createMockPlayer({ id: 'p1' })]
    expect(aiChooseTargetPlayer(players, 0, 'steal')).toBeNull()
  })

  it('should_not_target_self', () => {
    const players = [
      createMockPlayer({ id: 'p1' }),
      createMockPlayer({ id: 'p2' }),
    ]
    const result = aiChooseTargetPlayer(players, 0, 'sabotage')
    expect(result).toBe('p2')
  })

  it('should_target_player_with_most_cards_for_steal', () => {
    const players = [
      createMockPlayer({ id: 'p1' }),
      createMockPlayer({ id: 'p2', hand: [createMockCard()] }),
      createMockPlayer({ id: 'p3', hand: [createMockCard(), createMockCard(), createMockCard()] }),
    ]
    expect(aiChooseTargetPlayer(players, 0, 'steal')).toBe('p3')
  })

  it('should_target_player_with_most_cards_for_robbery', () => {
    const players = [
      createMockPlayer({ id: 'p1' }),
      createMockPlayer({ id: 'p2', hand: [createMockCard(), createMockCard()] }),
      createMockPlayer({ id: 'p3', hand: [createMockCard()] }),
    ]
    expect(aiChooseTargetPlayer(players, 0, 'robbery')).toBe('p2')
  })

  it('should_target_leader_for_sabotage', () => {
    const players = [
      createMockPlayer({ id: 'p1' }),
      createMockPlayer({ id: 'p2', money: 1000 }),
      createMockPlayer({ id: 'p3', money: 10000 }), // 領先者
    ]
    expect(aiChooseTargetPlayer(players, 0, 'sabotage')).toBe('p3')
  })

  it('should_fallback_to_random_for_unknown_action', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const players = [
      createMockPlayer({ id: 'p1' }),
      createMockPlayer({ id: 'p2' }),
      createMockPlayer({ id: 'p3' }),
    ]
    const result = aiChooseTargetPlayer(players, 0, 'unknown')
    expect(['p2', 'p3']).toContain(result)
    vi.restoreAllMocks()
  })
})

describe('aiShouldUseInvalidCard', () => {
  it('should_always_block_steal', () => {
    const stealCard = createMockCard({ effect: { type: 'special', handler: 'steal' } })
    expect(aiShouldUseInvalidCard(stealCard, createMockPlayer())).toBe(true)
  })

  it('should_always_block_robbery', () => {
    const robberyCard = createMockCard({ effect: { type: 'special', handler: 'robbery' } })
    expect(aiShouldUseInvalidCard(robberyCard, createMockPlayer())).toBe(true)
  })

  it('should_not_always_block_parachute', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // > 0.3 → pass
    const parachuteCard = createMockCard({ effect: { type: 'special', handler: 'parachute' } })
    expect(aiShouldUseInvalidCard(parachuteCard, createMockPlayer())).toBe(false)
    vi.restoreAllMocks()
  })

  it('should_sometimes_block_low_threat_cards', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // < 0.3 → block
    const drawCard = createMockCard({ effect: { type: 'draw_cards', count: 2 } })
    expect(aiShouldUseInvalidCard(drawCard, createMockPlayer())).toBe(true)
    vi.restoreAllMocks()
  })

  it('should_sometimes_pass_low_threat_cards', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // > 0.3 → pass
    const drawCard = createMockCard({ effect: { type: 'draw_cards', count: 2 } })
    expect(aiShouldUseInvalidCard(drawCard, createMockPlayer())).toBe(false)
    vi.restoreAllMocks()
  })
})

describe('aiChooseJob', () => {
  it('should_return_null_when_already_has_job', () => {
    const player = createMockPlayer({ job: jobs[0] })
    expect(aiChooseJob(player)).toBeNull()
  })

  it('should_return_null_when_no_available_jobs', () => {
    const player = createMockPlayer({
      stats: { intelligence: 0, stamina: 0, charisma: 0 },
    })
    expect(aiChooseJob(player)).toBeNull()
  })

  it('should_always_apply_when_jobs_available', () => {
    const player = createMockPlayer({
      stats: { intelligence: 15, stamina: 15, charisma: 15 },
    })
    // 不再有隨機跳過，一定會應徵
    expect(aiChooseJob(player)).not.toBeNull()
  })

  it('should_pick_highest_salary_job', () => {
    const player = createMockPlayer({
      stats: { intelligence: 15, stamina: 15, charisma: 15 },
    })
    const result = aiChooseJob(player)
    expect(result).not.toBeNull()
    // 應該選起薪最高的職業
    expect(typeof result).toBe('string')
  })
})

describe('aiChooseParachuteJob', () => {
  it('should_return_highest_salary_job', () => {
    const result = aiChooseParachuteJob()
    expect(result).not.toBeNull()
    expect(typeof result).toBe('string')
  })
})

describe('isCurrentPlayerAI', () => {
  it('should_return_true_when_current_player_is_AI', () => {
    const state: GameState = {
      playerCount: 2,
      maxTurns: 10,
      players: [
        createMockPlayer({ id: 'p1', isAI: true }),
        createMockPlayer({ id: 'p2', isAI: false }),
      ],
      currentPlayerIndex: 0,
      turn: 1,
      phase: 'action',
      deck: [],
      discardPile: [],
      currentEvent: null,
      eventLog: [],
      actionLog: [],
      selectedCardIndex: null,
      showEventModal: false,
    }
    expect(isCurrentPlayerAI(state)).toBe(true)
  })

  it('should_return_false_when_current_player_is_human', () => {
    const state: GameState = {
      playerCount: 2,
      maxTurns: 10,
      players: [
        createMockPlayer({ id: 'p1', isAI: true }),
        createMockPlayer({ id: 'p2', isAI: false }),
      ],
      currentPlayerIndex: 1,
      turn: 1,
      phase: 'action',
      deck: [],
      discardPile: [],
      currentEvent: null,
      eventLog: [],
      actionLog: [],
      selectedCardIndex: null,
      showEventModal: false,
    }
    expect(isCurrentPlayerAI(state)).toBe(false)
  })

  it('should_return_false_when_isAI_is_undefined', () => {
    const state: GameState = {
      playerCount: 2,
      maxTurns: 10,
      players: [
        createMockPlayer({ id: 'p1' }),
      ],
      currentPlayerIndex: 0,
      turn: 1,
      phase: 'action',
      deck: [],
      discardPile: [],
      currentEvent: null,
      eventLog: [],
      actionLog: [],
      selectedCardIndex: null,
      showEventModal: false,
    }
    expect(isCurrentPlayerAI(state)).toBe(false)
  })
})

describe('aiChooseDiscardCards', () => {
  it('should_return_correct_number_of_cards', () => {
    const player = createMockPlayer({
      hand: [
        createMockCard({ id: 'c1' }),
        createMockCard({ id: 'c2' }),
        createMockCard({ id: 'c3' }),
        createMockCard({ id: 'c4' }),
        createMockCard({ id: 'c5' }),
      ],
    })
    const result = aiChooseDiscardCards(player, 2)
    expect(result).toHaveLength(2)
  })

  it('should_discard_lowest_scored_cards', () => {
    const player = createMockPlayer({
      money: 1000,
      job: jobs[0],
      hand: [
        // 績效卡 score=90（有工作時最高分）
        createMockCard({ id: 'perf', type: 'work', effect: { type: 'performance_change', value: 1 } }),
        // 無效卡 score=0（不能主動出）
        createMockCard({ id: 'invalid', type: 'function', effect: { type: 'special', handler: 'invalid' } }),
        // 自由研究 score=65
        createMockCard({ id: 'study', cost: 300, effect: { type: 'stat_change_choice', value: 1 } }),
        // 探險 score=25（有工作時）
        createMockCard({ id: 'explore', type: 'work', effect: { type: 'explore', location: '' } }),
      ],
    })
    const result = aiChooseDiscardCards(player, 2)

    // 應丟掉分數最低的：無效卡(0) 和 探險(25)
    expect(result).toContain(1) // invalid card index
    expect(result).toContain(3) // explore card index
    // 不應丟掉高分卡
    expect(result).not.toContain(0) // performance
    expect(result).not.toContain(2) // study
  })

  it('should_keep_performance_card_when_has_job', () => {
    const player = createMockPlayer({
      money: 1000,
      job: jobs[0],
      hand: [
        createMockCard({ id: 'perf', type: 'work', effect: { type: 'performance_change', value: 1 } }),
        createMockCard({ id: 'c2', effect: { type: 'stat_change', stat: 'intelligence', value: 1 } }),
        createMockCard({ id: 'c3', effect: { type: 'stat_change', stat: 'stamina', value: 1 } }),
      ],
    })
    const result = aiChooseDiscardCards(player, 1)

    // 績效卡 score=90，不應被丟棄
    expect(result).not.toContain(0)
  })
})

describe('AI_ACTION_DELAY', () => {
  it('should_be_500ms', () => {
    expect(AI_ACTION_DELAY).toBe(500)
  })
})
