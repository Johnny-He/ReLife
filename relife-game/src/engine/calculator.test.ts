import { describe, it, expect } from 'vitest'
import {
  checkWinCondition,
  calculatePlayerScore,
  calculateGameResult,
  changeMoney,
  changeStat,
  changePerformance,
  getRichestPlayers,
  getPoorestPlayers,
  getHighestStatPlayer,
  getEmployedPlayers,
  getUnemployedPlayers,
} from './calculator'
import { evaluateAchievements } from '../data/achievements'
import type { Player, Job } from '../types'

// === 測試用 Mock 資料 ===

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

const mockJob: Job = {
  id: 'worker',
  name: '工人',
  category: 'stamina',
  levels: [
    { name: '工人', requiredStats: { stamina: 5 }, salary: [1000, 1200, 1500] },
    { name: '技工', requiredStats: { stamina: 8 }, salary: [2000, 2500, 3000] },
    { name: '工頭', requiredStats: { stamina: 12 }, salary: [3500, 4000, 5000, 6000] },
  ],
}

// === checkWinCondition 測試 ===

describe('checkWinCondition', () => {
  it('should_always_return_null_since_early_win_is_disabled', () => {
    expect(checkWinCondition([])).toBeNull()
    expect(checkWinCondition([
      createMockPlayer({ id: 'p1', money: 20000 }),
    ])).toBeNull()
    expect(checkWinCondition([
      createMockPlayer({ id: 'p1', money: 99999 }),
    ])).toBeNull()
  })
})

// === calculatePlayerScore 測試 ===

describe('calculatePlayerScore', () => {
  it('should_calculate_score_for_unemployed_player', () => {
    const player = createMockPlayer({ money: 5000 })
    const score = calculatePlayerScore(player)

    expect(score.money).toBe(5000)
    expect(score.stats).toBe(1500) // (5+5+5) * 100
    expect(score.jobBonus).toBe(0)
    expect(score.achievements).toBe(0)
    expect(score.total).toBe(6500)
  })

  it('should_calculate_score_with_job_bonus', () => {
    const player = createMockPlayer({
      money: 5000,
      job: mockJob,
      jobLevel: 1,
      performance: 5,
    })
    const score = calculatePlayerScore(player)

    expect(score.money).toBe(5000)
    expect(score.stats).toBe(1500)
    expect(score.jobBonus).toBe(2500) // (1+1)*1000 + 5*100
    expect(score.achievements).toBe(0)
    expect(score.total).toBe(9000)
  })

  it('should_include_achievement_score_in_total', () => {
    const player = createMockPlayer({ money: 5000 })
    const score = calculatePlayerScore(player, 12000)

    expect(score.achievements).toBe(12000)
    expect(score.total).toBe(5000 + 1500 + 0 + 12000)
  })

  it('should_calculate_max_job_bonus_at_level_2', () => {
    const player = createMockPlayer({
      money: 0,
      job: mockJob,
      jobLevel: 2,
      performance: 9,
    })
    const score = calculatePlayerScore(player)

    expect(score.jobBonus).toBe(3900) // (2+1)*1000 + 9*100
  })
})

// === calculateGameResult 測試 ===

describe('calculateGameResult', () => {
  it('should_rank_players_by_total_score', () => {
    const players = [
      createMockPlayer({ id: 'p1', name: '窮人', money: 1000 }),
      createMockPlayer({ id: 'p2', name: '富人', money: 10000 }),
      createMockPlayer({ id: 'p3', name: '中等', money: 5000 }),
    ]

    const result = calculateGameResult(players)

    expect(result.rankings[0].player.name).toBe('富人')
    expect(result.rankings[0].rank).toBe(1)
    expect(result.rankings[1].player.name).toBe('中等')
    expect(result.rankings[1].rank).toBe(2)
    expect(result.rankings[2].player.name).toBe('窮人')
    expect(result.rankings[2].rank).toBe(3)
  })
})

// === changeMoney 測試 ===

describe('changeMoney', () => {
  it('should_add_money', () => {
    const player = createMockPlayer({ money: 1000 })
    const updated = changeMoney(player, 500)
    expect(updated.money).toBe(1500)
  })

  it('should_subtract_money', () => {
    const player = createMockPlayer({ money: 1000 })
    const updated = changeMoney(player, -300)
    expect(updated.money).toBe(700)
  })

  it('should_not_go_below_zero', () => {
    const player = createMockPlayer({ money: 100 })
    const updated = changeMoney(player, -500)
    expect(updated.money).toBe(0)
  })

  it('should_be_immutable', () => {
    const player = createMockPlayer({ money: 1000 })
    const updated = changeMoney(player, 500)
    expect(player.money).toBe(1000)
    expect(updated.money).toBe(1500)
  })
})

// === changeStat 測試 ===

describe('changeStat', () => {
  it('should_increase_stat', () => {
    const player = createMockPlayer()
    const updated = changeStat(player, 'intelligence', 3)
    expect(updated.stats.intelligence).toBe(8)
  })

  it('should_decrease_stat', () => {
    const player = createMockPlayer()
    const updated = changeStat(player, 'stamina', -2)
    expect(updated.stats.stamina).toBe(3)
  })

  it('should_not_go_below_zero', () => {
    const player = createMockPlayer({ stats: { intelligence: 2, stamina: 5, charisma: 5 } })
    const updated = changeStat(player, 'intelligence', -10)
    expect(updated.stats.intelligence).toBe(0)
  })
})

// === changePerformance 測試 ===

describe('changePerformance', () => {
  it('should_not_change_if_no_job', () => {
    const player = createMockPlayer()
    const updated = changePerformance(player, 3)
    expect(updated.performance).toBe(0)
  })

  it('should_increase_performance_with_job', () => {
    const player = createMockPlayer({ job: mockJob, performance: 2 })
    const updated = changePerformance(player, 3)
    expect(updated.performance).toBe(5)
  })

  it('should_cap_at_9', () => {
    const player = createMockPlayer({ job: mockJob, performance: 7 })
    const updated = changePerformance(player, 5)
    expect(updated.performance).toBe(9)
  })

  it('should_not_go_below_zero', () => {
    const player = createMockPlayer({ job: mockJob, performance: 2 })
    const updated = changePerformance(player, -5)
    expect(updated.performance).toBe(0)
  })
})

// === getRichestPlayers / getPoorestPlayers 測試 ===

describe('getRichestPlayers', () => {
  it('should_return_richest_players', () => {
    const players = [
      createMockPlayer({ id: 'p1', money: 1000 }),
      createMockPlayer({ id: 'p2', money: 5000 }),
      createMockPlayer({ id: 'p3', money: 3000 }),
      createMockPlayer({ id: 'p4', money: 2000 }),
    ]

    const richest = getRichestPlayers(players, 2)

    expect(richest).toHaveLength(2)
    expect(richest[0].money).toBe(5000)
    expect(richest[1].money).toBe(3000)
  })
})

describe('getPoorestPlayers', () => {
  it('should_return_poorest_players', () => {
    const players = [
      createMockPlayer({ id: 'p1', money: 1000 }),
      createMockPlayer({ id: 'p2', money: 5000 }),
      createMockPlayer({ id: 'p3', money: 3000 }),
      createMockPlayer({ id: 'p4', money: 2000 }),
    ]

    const poorest = getPoorestPlayers(players, 2)

    expect(poorest).toHaveLength(2)
    expect(poorest[0].money).toBe(1000)
    expect(poorest[1].money).toBe(2000)
  })
})

// === getHighestStatPlayer 測試 ===

describe('getHighestStatPlayer', () => {
  it('should_return_player_with_highest_stat', () => {
    const players = [
      createMockPlayer({ id: 'p1', stats: { intelligence: 10, stamina: 5, charisma: 5 } }),
      createMockPlayer({ id: 'p2', stats: { intelligence: 5, stamina: 15, charisma: 5 } }),
      createMockPlayer({ id: 'p3', stats: { intelligence: 5, stamina: 5, charisma: 20 } }),
    ]

    expect(getHighestStatPlayer(players, 'intelligence').id).toBe('p1')
    expect(getHighestStatPlayer(players, 'stamina').id).toBe('p2')
    expect(getHighestStatPlayer(players, 'charisma').id).toBe('p3')
  })
})

// === getEmployedPlayers / getUnemployedPlayers 測試 ===

describe('getEmployedPlayers', () => {
  it('should_filter_employed_players', () => {
    const players = [
      createMockPlayer({ id: 'p1', job: mockJob }),
      createMockPlayer({ id: 'p2', job: null }),
      createMockPlayer({ id: 'p3', job: mockJob }),
    ]

    const employed = getEmployedPlayers(players)

    expect(employed).toHaveLength(2)
    expect(employed.every(p => p.job !== null)).toBe(true)
  })
})

describe('getUnemployedPlayers', () => {
  it('should_filter_unemployed_players', () => {
    const players = [
      createMockPlayer({ id: 'p1', job: mockJob }),
      createMockPlayer({ id: 'p2', job: null }),
      createMockPlayer({ id: 'p3', job: null }),
    ]

    const unemployed = getUnemployedPlayers(players)

    expect(unemployed).toHaveLength(2)
    expect(unemployed.every(p => p.job === null)).toBe(true)
  })
})

// === evaluateAchievements 測試 ===

describe('evaluateAchievements - threshold achievements', () => {
  it('should_award_highest_threshold_only', () => {
    const players = [
      createMockPlayer({ id: 'p1', money: 120000 }),
      createMockPlayer({ id: 'p2', money: 120000 }),
    ]
    const result = evaluateAchievements(players)
    const thresholdAchievements = result.get('p1')!.filter(a => a.id.startsWith('money_'))

    // $120,000 → 十萬富翁 (≥$100k)，不疊加富裕人生或小康生活
    expect(thresholdAchievements).toHaveLength(1)
    expect(thresholdAchievements[0].id).toBe('money_100k')
    expect(thresholdAchievements[0].score).toBe(12000)
  })

  it('should_award_top_tier_for_200k', () => {
    const players = [createMockPlayer({ id: 'p1', money: 200000 })]
    const result = evaluateAchievements(players)
    const achievements = result.get('p1')!

    expect(achievements.some(a => a.id === 'money_200k')).toBe(true)
    expect(achievements.filter(a => a.id.startsWith('money_')).length).toBe(1)
  })

  it('should_award_no_threshold_when_below_50k', () => {
    const players = [createMockPlayer({ id: 'p1', money: 49999 })]
    const result = evaluateAchievements(players)
    const achievements = result.get('p1')!

    expect(achievements.filter(a => a.id.startsWith('money_')).length).toBe(0)
  })

  it('should_award_different_thresholds_to_different_players', () => {
    const players = [
      createMockPlayer({ id: 'p1', money: 200000 }),
      createMockPlayer({ id: 'p2', money: 80000 }),
      createMockPlayer({ id: 'p3', money: 30000 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'money_200k')).toBe(true)
    expect(result.get('p2')!.some(a => a.id === 'money_80k')).toBe(true)
    expect(result.get('p3')!.filter(a => a.id.startsWith('money_')).length).toBe(0)
  })
})

describe('evaluateAchievements - first to 100k', () => {
  it('should_award_when_one_player_reaches_100k', () => {
    const players = [
      createMockPlayer({ id: 'p1', money: 100000 }),
      createMockPlayer({ id: 'p2', money: 50000 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'first_to_100k')).toBe(true)
    expect(result.get('p2')!.some(a => a.id === 'first_to_100k')).toBe(false)
  })

  it('should_award_richest_when_multiple_players_reach_100k', () => {
    const players = [
      createMockPlayer({ id: 'p1', money: 150000 }),
      createMockPlayer({ id: 'p2', money: 120000 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'first_to_100k')).toBe(true)
    expect(result.get('p2')!.some(a => a.id === 'first_to_100k')).toBe(false)
  })

  it('should_award_nobody_when_multiple_players_tie_at_100k', () => {
    const players = [
      createMockPlayer({ id: 'p1', money: 100000 }),
      createMockPlayer({ id: 'p2', money: 100000 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'first_to_100k')).toBe(false)
    expect(result.get('p2')!.some(a => a.id === 'first_to_100k')).toBe(false)
  })

  it('should_award_nobody_when_no_player_reaches_100k', () => {
    const players = [
      createMockPlayer({ id: 'p1', money: 99999 }),
      createMockPlayer({ id: 'p2', money: 80000 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'first_to_100k')).toBe(false)
    expect(result.get('p2')!.some(a => a.id === 'first_to_100k')).toBe(false)
  })
})

describe('evaluateAchievements - richest', () => {
  it('should_award_richest_player', () => {
    const players = [
      createMockPlayer({ id: 'p1', money: 50000 }),
      createMockPlayer({ id: 'p2', money: 30000 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'richest')).toBe(true)
    expect(result.get('p2')!.some(a => a.id === 'richest')).toBe(false)
  })

  it('should_award_nobody_when_tied', () => {
    const players = [
      createMockPlayer({ id: 'p1', money: 50000 }),
      createMockPlayer({ id: 'p2', money: 50000 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'richest')).toBe(false)
    expect(result.get('p2')!.some(a => a.id === 'richest')).toBe(false)
  })
})

// === 職業相關成就測試 ===

describe('evaluateAchievements - first job', () => {
  it('should_award_player_with_earliest_firstJobTurn', () => {
    const players = [
      createMockPlayer({ id: 'p1', firstJobTurn: 5 }),
      createMockPlayer({ id: 'p2', firstJobTurn: 8 }),
      createMockPlayer({ id: 'p3' }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'first_job')).toBe(true)
    expect(result.get('p2')!.some(a => a.id === 'first_job')).toBe(false)
  })

  it('should_award_nobody_when_tied', () => {
    const players = [
      createMockPlayer({ id: 'p1', firstJobTurn: 5 }),
      createMockPlayer({ id: 'p2', firstJobTurn: 5 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'first_job')).toBe(false)
    expect(result.get('p2')!.some(a => a.id === 'first_job')).toBe(false)
  })

  it('should_award_nobody_when_no_one_has_job', () => {
    const players = [
      createMockPlayer({ id: 'p1' }),
      createMockPlayer({ id: 'p2' }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'first_job')).toBe(false)
  })
})

describe('evaluateAchievements - first promotion', () => {
  it('should_award_player_with_earliest_firstPromotionTurn', () => {
    const players = [
      createMockPlayer({ id: 'p1', firstPromotionTurn: 10 }),
      createMockPlayer({ id: 'p2', firstPromotionTurn: 15 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'first_promotion')).toBe(true)
    expect(result.get('p2')!.some(a => a.id === 'first_promotion')).toBe(false)
  })

  it('should_award_nobody_when_tied', () => {
    const players = [
      createMockPlayer({ id: 'p1', firstPromotionTurn: 10 }),
      createMockPlayer({ id: 'p2', firstPromotionTurn: 10 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'first_promotion')).toBe(false)
  })

  it('should_award_nobody_when_no_one_promoted', () => {
    const players = [
      createMockPlayer({ id: 'p1' }),
      createMockPlayer({ id: 'p2' }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'first_promotion')).toBe(false)
  })
})

describe('evaluateAchievements - most job changes', () => {
  it('should_award_player_with_most_job_changes', () => {
    const players = [
      createMockPlayer({ id: 'p1', jobChangeCount: 3 }),
      createMockPlayer({ id: 'p2', jobChangeCount: 2 }),
      createMockPlayer({ id: 'p3', jobChangeCount: 1 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'most_job_changes')).toBe(true)
    expect(result.get('p2')!.some(a => a.id === 'most_job_changes')).toBe(false)
  })

  it('should_award_nobody_when_tied', () => {
    const players = [
      createMockPlayer({ id: 'p1', jobChangeCount: 3 }),
      createMockPlayer({ id: 'p2', jobChangeCount: 3 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'most_job_changes')).toBe(false)
  })

  it('should_require_at_least_2_changes', () => {
    const players = [
      createMockPlayer({ id: 'p1', jobChangeCount: 1 }),
      createMockPlayer({ id: 'p2', jobChangeCount: 0 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'most_job_changes')).toBe(false)
  })
})

describe('evaluateAchievements - late bloomer', () => {
  it('should_award_player_with_latest_firstJobTurn', () => {
    const players = [
      createMockPlayer({ id: 'p1', firstJobTurn: 5 }),
      createMockPlayer({ id: 'p2', firstJobTurn: 20 }),
      createMockPlayer({ id: 'p3' }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p2')!.some(a => a.id === 'late_bloomer')).toBe(true)
    expect(result.get('p1')!.some(a => a.id === 'late_bloomer')).toBe(false)
  })

  it('should_award_nobody_when_tied', () => {
    const players = [
      createMockPlayer({ id: 'p1', firstJobTurn: 20 }),
      createMockPlayer({ id: 'p2', firstJobTurn: 20 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'late_bloomer')).toBe(false)
  })

  it('should_not_award_when_only_one_person_has_job', () => {
    const players = [
      createMockPlayer({ id: 'p1', firstJobTurn: 10 }),
      createMockPlayer({ id: 'p2' }),
    ]
    const result = evaluateAchievements(players)

    // Only one person has a job — they're both first AND last, so no award
    expect(result.get('p1')!.some(a => a.id === 'late_bloomer')).toBe(false)
  })
})

describe('evaluateAchievements - never worked', () => {
  it('should_award_sole_unemployed_player', () => {
    const players = [
      createMockPlayer({ id: 'p1', firstJobTurn: 5 }),
      createMockPlayer({ id: 'p2', firstJobTurn: 10 }),
      createMockPlayer({ id: 'p3' }), // never worked
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p3')!.some(a => a.id === 'never_worked')).toBe(true)
  })

  it('should_award_nobody_when_multiple_never_worked', () => {
    const players = [
      createMockPlayer({ id: 'p1', firstJobTurn: 5 }),
      createMockPlayer({ id: 'p2' }),
      createMockPlayer({ id: 'p3' }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p2')!.some(a => a.id === 'never_worked')).toBe(false)
    expect(result.get('p3')!.some(a => a.id === 'never_worked')).toBe(false)
  })

  it('should_award_nobody_when_everyone_has_job', () => {
    const players = [
      createMockPlayer({ id: 'p1', firstJobTurn: 5 }),
      createMockPlayer({ id: 'p2', firstJobTurn: 10 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'never_worked')).toBe(false)
    expect(result.get('p2')!.some(a => a.id === 'never_worked')).toBe(false)
  })
})

// === calculateGameResult with achievements 測試 ===

describe('calculateGameResult - achievements integration', () => {
  it('should_include_achievements_in_total_score', () => {
    const players = [
      createMockPlayer({ id: 'p1', name: '富人', money: 100000 }),
      createMockPlayer({ id: 'p2', name: '窮人', money: 5000 }),
    ]

    const result = calculateGameResult(players)
    const richPlayer = result.rankings.find(r => r.player.id === 'p1')!

    // 十萬富翁(12000) + 率先致富(10000) + 首富(5000)
    expect(richPlayer.score.achievements).toBe(27000)
    expect(richPlayer.achievements).toHaveLength(3)
    expect(richPlayer.score.total).toBe(
      richPlayer.score.money + richPlayer.score.stats + richPlayer.score.jobBonus + 27000
    )
  })

  it('should_include_zero_achievements_for_low_money_player', () => {
    const players = [
      createMockPlayer({ id: 'p1', money: 100000 }),
      createMockPlayer({ id: 'p2', money: 5000 }),
    ]

    const result = calculateGameResult(players)
    const poorPlayer = result.rankings.find(r => r.player.id === 'p2')!

    expect(poorPlayer.score.achievements).toBe(0)
    expect(poorPlayer.achievements).toHaveLength(0)
  })

  it('should_affect_ranking_order', () => {
    // p1 有較少金錢但有成就加成，p2 金錢稍多但沒成就
    const players = [
      createMockPlayer({ id: 'p1', money: 50000, stats: { intelligence: 5, stamina: 5, charisma: 5 } }),
      createMockPlayer({ id: 'p2', money: 48000, stats: { intelligence: 5, stamina: 5, charisma: 5 } }),
    ]

    const result = calculateGameResult(players)
    // p1: 50000 + 1500 + 小康(5000) + 首富(5000) = 61500
    // p2: 48000 + 1500 = 49500
    expect(result.rankings[0].player.id).toBe('p1')
  })
})

// === 個人夢想成就測試 ===

const createCharacterPlayer = (characterId: string, personalDream: string, overrides: Partial<Player> = {}): Player =>
  createMockPlayer({
    character: {
      id: characterId,
      name: '測試角色',
      gender: 'male',
      initialStats: { intelligence: 5, stamina: 5, charisma: 5 },
      initialMoney: 3000,
      marriageRequirement: { intelligence: 0, stamina: 0, charisma: 0 },
      personalDream,
    },
    ...overrides,
  })

const engineerJob: Job = {
  id: 'engineer', name: '工程師', category: 'intelligence',
  levels: [
    { name: '工程師', requiredStats: { intelligence: 8 }, salary: [2000, 2500, 3000] },
    { name: '資深工程師', requiredStats: { intelligence: 12 }, salary: [3500, 4000, 5000] },
    { name: '技術總監', requiredStats: { intelligence: 16 }, salary: [5000, 6000, 7000] },
  ],
}

const magicianJob: Job = {
  id: 'magician', name: '魔術師', category: 'charisma',
  levels: [
    { name: '街頭魔術師', requiredStats: { charisma: 6 }, salary: [1000, 1500, 2000] },
    { name: '舞台魔術師', requiredStats: { charisma: 10 }, salary: [2500, 3000, 4000] },
    { name: '知名魔術師', requiredStats: { charisma: 15 }, salary: [4000, 5000, 6000] },
  ],
}

describe('evaluateAchievements - dream achievements', () => {
  it('should_award_zheng_an_qi_dream_when_engineer', () => {
    const players = [
      createCharacterPlayer('zheng-an-qi', '當工程師', { id: 'p1', job: engineerJob, jobLevel: 0 }),
      createMockPlayer({ id: 'p2', money: 5000 }),
    ]
    const result = evaluateAchievements(players)

    const dreamAchievements = result.get('p1')!.filter(a => a.id.startsWith('dream_'))
    expect(dreamAchievements).toHaveLength(1)
    expect(dreamAchievements[0].id).toBe('dream_zheng-an-qi')
    expect(dreamAchievements[0].name).toBe('夢想成真：當工程師')
    expect(dreamAchievements[0].score).toBe(8000)
  })

  it('should_award_yao_xin_bei_dream_when_money_100k', () => {
    const players = [
      createCharacterPlayer('yao-xin-bei', '賺到 $100,000', { id: 'p1', money: 100000 }),
      createMockPlayer({ id: 'p2', money: 5000 }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'dream_yao-xin-bei')).toBe(true)
  })

  it('should_award_wu_xin_yi_dream_when_intelligence_over_30', () => {
    const players = [
      createCharacterPlayer('wu-xin-yi', '智力 > 30', {
        id: 'p1',
        stats: { intelligence: 31, stamina: 5, charisma: 5 },
      }),
      createMockPlayer({ id: 'p2' }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'dream_wu-xin-yi')).toBe(true)
  })

  it('should_not_award_xu_rui_he_dream_when_magician_level_1', () => {
    const players = [
      createCharacterPlayer('xu-rui-he', '當知名魔術師', { id: 'p1', job: magicianJob, jobLevel: 1 }),
      createMockPlayer({ id: 'p2' }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'dream_xu-rui-he')).toBe(false)
  })

  it('should_award_xu_rui_he_dream_when_magician_level_2', () => {
    const players = [
      createCharacterPlayer('xu-rui-he', '當知名魔術師', { id: 'p1', job: magicianJob, jobLevel: 2 }),
      createMockPlayer({ id: 'p2' }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'dream_xu-rui-he')).toBe(true)
  })

  it('should_award_liang_si_yu_dream_when_doctor', () => {
    const doctorJob: Job = {
      id: 'doctor', name: '醫生', category: 'intelligence',
      levels: [
        { name: '實習醫生', requiredStats: { intelligence: 10 }, salary: [2000, 2500, 3000] },
        { name: '主治醫師', requiredStats: { intelligence: 14 }, salary: [4000, 5000, 6000] },
        { name: '院長', requiredStats: { intelligence: 18 }, salary: [6000, 7000, 8000] },
      ],
    }
    const players = [
      createCharacterPlayer('liang-si-yu', '當醫生', { id: 'p1', job: doctorJob, jobLevel: 0 }),
      createMockPlayer({ id: 'p2' }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'dream_liang-si-yu')).toBe(true)
  })

  it('should_award_zhuang_yu_cheng_dream_when_singer', () => {
    const singerJob: Job = {
      id: 'singer', name: '歌手', category: 'charisma',
      levels: [
        { name: '街頭藝人', requiredStats: { charisma: 6 }, salary: [1000, 1500, 2000] },
        { name: '駐唱歌手', requiredStats: { charisma: 10 }, salary: [2500, 3000, 4000] },
        { name: '知名歌手', requiredStats: { charisma: 15 }, salary: [4000, 5000, 6000] },
      ],
    }
    const players = [
      createCharacterPlayer('zhuang-yu-cheng', '歌手', { id: 'p1', job: singerJob, jobLevel: 0 }),
      createMockPlayer({ id: 'p2' }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'dream_zhuang-yu-cheng')).toBe(true)
  })

  it('should_not_award_wu_xin_yi_dream_when_intelligence_exactly_30', () => {
    const players = [
      createCharacterPlayer('wu-xin-yi', '智力 > 30', {
        id: 'p1',
        stats: { intelligence: 30, stamina: 5, charisma: 5 },
      }),
      createMockPlayer({ id: 'p2' }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id === 'dream_wu-xin-yi')).toBe(false)
  })

  it('should_not_award_dream_for_character_without_condition', () => {
    // 陳建志的夢想是「跟柯若亞結婚」— 無法在現有系統中判定
    const players = [
      createCharacterPlayer('chen-jian-zhi', '跟柯若亞結婚', { id: 'p1', money: 200000 }),
      createMockPlayer({ id: 'p2' }),
    ]
    const result = evaluateAchievements(players)

    expect(result.get('p1')!.some(a => a.id.startsWith('dream_'))).toBe(false)
  })
})

describe('calculateGameResult - dream achievements integration', () => {
  it('should_include_dream_score_in_total_and_ranking', () => {
    // 同金錢避免 richest 干擾，純粹測試夢想分數影響排名
    const players = [
      createCharacterPlayer('zheng-an-qi', '當工程師', { id: 'p1', money: 5000, job: engineerJob, jobLevel: 0 }),
      createMockPlayer({ id: 'p2', money: 5000 }),
    ]

    const result = calculateGameResult(players)
    const dreamPlayer = result.rankings.find(r => r.player.id === 'p1')!

    // p1 應有夢想成就 8000 分
    expect(dreamPlayer.achievements.some(a => a.id === 'dream_zheng-an-qi')).toBe(true)
    expect(dreamPlayer.score.achievements).toBeGreaterThanOrEqual(8000)
    // p1: 5000 + 1500 + 1000(job) + 8000(dream) = 15500 > p2: 5000 + 1500 = 6500
    expect(result.rankings[0].player.id).toBe('p1')
  })
})
