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
