import { describe, it, expect } from 'vitest'
import {
  canPlayCard,
  applyBasicEffect,
  playCard,
  applyStatChoice,
  getStatName,
} from './cardEffects'
import type { Player, Card, Job } from '../types'

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

const createMockCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'test-card',
  type: 'study',
  name: '測試卡',
  description: '測試用',
  effect: { type: 'stat_change', stat: 'intelligence', value: 1 },
  count: 1,
  ...overrides,
})

// === canPlayCard 測試 ===

describe('canPlayCard', () => {
  it('should_allow_playing_basic_card', () => {
    const player = createMockPlayer()
    const card = createMockCard()
    const result = canPlayCard(player, card)
    expect(result.canPlay).toBe(true)
  })

  it('should_reject_card_when_not_enough_money', () => {
    const player = createMockPlayer({ money: 100 })
    const card = createMockCard({ cost: 500 })
    const result = canPlayCard(player, card)

    expect(result.canPlay).toBe(false)
    expect(result.reason).toContain('金錢不足')
  })

  it('should_reject_work_card_when_no_job', () => {
    const player = createMockPlayer({ job: null })
    const card = createMockCard({ type: 'work' })
    const result = canPlayCard(player, card)

    expect(result.canPlay).toBe(false)
    expect(result.reason).toContain('需要有工作')
  })

  it('should_allow_work_card_when_has_job', () => {
    const player = createMockPlayer({ job: mockJob })
    const card = createMockCard({ type: 'work' })
    const result = canPlayCard(player, card)

    expect(result.canPlay).toBe(true)
  })

  it('should_reject_invalid_card_as_active_play', () => {
    const player = createMockPlayer()
    const card = createMockCard({
      type: 'function',
      effect: { type: 'special', handler: 'invalid' },
    })
    const result = canPlayCard(player, card)

    expect(result.canPlay).toBe(false)
    expect(result.reason).toContain('反應卡')
  })

  it('should_reject_job_change_when_no_job', () => {
    const player = createMockPlayer({ job: null })
    const card = createMockCard({
      type: 'function',
      effect: { type: 'special', handler: 'job_change' },
    })
    const result = canPlayCard(player, card)

    expect(result.canPlay).toBe(false)
    expect(result.reason).toContain('需要有工作才能轉職')
  })
})

// === applyBasicEffect 測試 ===

describe('applyBasicEffect', () => {
  it('should_apply_stat_change', () => {
    const player = createMockPlayer()
    const result = applyBasicEffect(player, { type: 'stat_change', stat: 'intelligence', value: 3 })

    expect(result.player.stats.intelligence).toBe(8)
    expect(result.message).toContain('智力')
    expect(result.message).toContain('+3')
  })

  it('should_apply_negative_stat_change', () => {
    const player = createMockPlayer()
    const result = applyBasicEffect(player, { type: 'stat_change', stat: 'stamina', value: -2 })

    expect(result.player.stats.stamina).toBe(3)
  })

  it('should_apply_money_change', () => {
    const player = createMockPlayer({ money: 1000 })
    const result = applyBasicEffect(player, { type: 'money_change', value: 500 })

    expect(result.player.money).toBe(1500)
    expect(result.message).toContain('$500')
  })

  it('should_apply_performance_change_with_job', () => {
    const player = createMockPlayer({ job: mockJob, performance: 2 })
    const result = applyBasicEffect(player, { type: 'performance_change', value: 2 })

    expect(result.player.performance).toBe(4)
  })

  it('should_not_apply_performance_change_without_job', () => {
    const player = createMockPlayer({ job: null, performance: 0 })
    const result = applyBasicEffect(player, { type: 'performance_change', value: 2 })

    expect(result.player.performance).toBe(0)
    expect(result.message).toContain('沒有工作')
  })

  it('should_return_selection_for_stat_choice', () => {
    const player = createMockPlayer()
    const result = applyBasicEffect(player, { type: 'stat_change_choice', value: 2 })

    expect(result.needsSelection?.type).toBe('stat')
    expect(result.needsSelection?.options).toContain('intelligence')
  })

  it('should_return_selection_for_explore', () => {
    const player = createMockPlayer()
    const result = applyBasicEffect(player, { type: 'explore', location: '' })

    expect(result.needsSelection?.type).toBe('location')
  })

  it('should_handle_bootlicking_special_effect', () => {
    const player = createMockPlayer({ money: 1000, stats: { intelligence: 5, stamina: 5, charisma: 5 } })
    const result = applyBasicEffect(player, { type: 'special', handler: 'bootlicking' })

    expect(result.player.money).toBe(1500)
    expect(result.player.stats.charisma).toBe(3)  // 魅力 -2（根據桌遊規則）
  })

  it('should_handle_overtime_special_effect', () => {
    const player = createMockPlayer({ money: 1000, stats: { intelligence: 5, stamina: 5, charisma: 5 } })
    const result = applyBasicEffect(player, { type: 'special', handler: 'overtime' })

    expect(result.player.money).toBe(2000)
    expect(result.player.stats.stamina).toBe(3)
  })

  it('should_handle_job_change_special_effect', () => {
    const player = createMockPlayer({ job: mockJob, jobLevel: 1, performance: 5 })
    const result = applyBasicEffect(player, { type: 'special', handler: 'job_change' })

    expect(result.player.job).toBeNull()
    expect(result.player.jobLevel).toBe(0)
    expect(result.player.performance).toBe(0)
  })

  it('should_handle_park_bad_special_effect', () => {
    const player = createMockPlayer({ money: 2000, stats: { intelligence: 5, stamina: 5, charisma: 5 } })
    const result = applyBasicEffect(player, { type: 'special', handler: 'park_bad' })

    expect(result.player.money).toBe(1500)         // -$500
    expect(result.player.stats.charisma).toBe(3)    // 魅力 -2
    expect(result.message).toContain('流浪漢')
  })

  it('should_handle_park_good_special_effect', () => {
    const player = createMockPlayer({ money: 2000, stats: { intelligence: 5, stamina: 5, charisma: 5 } })
    const result = applyBasicEffect(player, { type: 'special', handler: 'park_good' })

    expect(result.player.money).toBe(2500)          // +$500
    expect(result.player.stats.stamina).toBe(7)     // 體力 +2
    expect(result.message).toContain('撿到錢')
  })

  it('should_handle_socializing_special_effect', () => {
    const player = createMockPlayer({ money: 2000, stats: { intelligence: 5, stamina: 5, charisma: 5 } })
    const result = applyBasicEffect(player, { type: 'special', handler: 'socializing' })

    expect(result.player.money).toBe(1500)          // -$500
    expect(result.player.stats.charisma).toBe(7)    // 魅力 +2
  })

  it('should_handle_napping_special_effect', () => {
    const player = createMockPlayer({ money: 2000, stats: { intelligence: 5, stamina: 5, charisma: 5 } })
    const result = applyBasicEffect(player, { type: 'special', handler: 'napping' })

    expect(result.player.money).toBe(1500)          // -$500
    expect(result.player.stats.stamina).toBe(7)     // 體力 +2
  })
})

// === playCard 測試 ===

describe('playCard', () => {
  it('should_deduct_cost_and_apply_effect', () => {
    const player = createMockPlayer({ money: 1000 })
    const card = createMockCard({
      cost: 200,
      effect: { type: 'stat_change', stat: 'intelligence', value: 2 },
    })
    const result = playCard(player, card)

    expect(result.player.money).toBe(800)
    expect(result.player.stats.intelligence).toBe(7)
    expect(result.usedCard).toBe(card)
  })

  it('should_not_deduct_cost_when_no_cost', () => {
    const player = createMockPlayer({ money: 1000 })
    const card = createMockCard({
      effect: { type: 'money_change', value: 500 },
    })
    const result = playCard(player, card)

    expect(result.player.money).toBe(1500)
  })
})

// === applyStatChoice 測試 ===

describe('applyStatChoice', () => {
  it('should_apply_chosen_stat_increase', () => {
    const player = createMockPlayer()
    const result = applyStatChoice(player, 'intelligence', 3)

    expect(result.player.stats.intelligence).toBe(8)
    expect(result.message).toContain('智力')
    expect(result.message).toContain('+3')
  })

  it('should_apply_to_different_stats', () => {
    const player = createMockPlayer()

    const intResult = applyStatChoice(player, 'intelligence', 2)
    expect(intResult.player.stats.intelligence).toBe(7)

    const staResult = applyStatChoice(player, 'stamina', 2)
    expect(staResult.player.stats.stamina).toBe(7)

    const chaResult = applyStatChoice(player, 'charisma', 2)
    expect(chaResult.player.stats.charisma).toBe(7)
  })
})

// === getStatName 測試 ===

describe('getStatName', () => {
  it('should_return_chinese_names', () => {
    expect(getStatName('intelligence')).toBe('智力')
    expect(getStatName('stamina')).toBe('體力')
    expect(getStatName('charisma')).toBe('魅力')
  })
})
