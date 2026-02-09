import { describe, it, expect } from 'vitest'
import {
  canPlayerApplyForJob,
  getAvailableJobs,
  applyForJob,
  quitJob,
  canPromote,
  promote,
  calculateSalary,
  paySalary,
  getJobDisplayName,
  applyJobSkillEffect,
} from './jobSystem'
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

const mockWorkerJob: Job = {
  id: 'worker',
  name: '工人',
  category: 'stamina',
  levels: [
    { name: '工人', requiredStats: { stamina: 5 }, salary: [1000, 1200, 1500] },
    { name: '技工', requiredStats: { stamina: 8 }, salary: [2000, 2500, 3000] },
    { name: '工頭', requiredStats: { stamina: 12 }, salary: [3500, 4000, 5000, 6000] },
  ],
}

const mockSingerJob: Job = {
  id: 'singer',
  name: '歌手',
  category: 'charisma',
  levels: [
    { name: '街頭藝人', requiredStats: { charisma: 5 }, salary: [800, 1000, 1200] },
    { name: '駐唱歌手', requiredStats: { charisma: 8 }, salary: [1500, 2000, 2500] },
    { name: '知名歌手', requiredStats: { charisma: 12 }, salary: [3000, 4000, 5000, 6000] },
  ],
}

const mockEngineerJob: Job = {
  id: 'engineer',
  name: '工程師',
  category: 'intelligence',
  levels: [
    { name: '菜鳥工程師', requiredStats: { intelligence: 25, stamina: 15 }, salary: [3000, 4000, 5000] },
    { name: '資深工程師', requiredStats: { intelligence: 30, stamina: 15, charisma: 10 }, salary: [6000, 8000, 10000] },
    { name: '高級工程師', requiredStats: { intelligence: 30, stamina: 20, charisma: 10 }, salary: [8000, 10000, 12000, 15000] },
  ],
}

const mockDoctorJob: Job = {
  id: 'doctor',
  name: '醫生',
  category: 'intelligence',
  levels: [
    { name: '實習醫生', requiredStats: { intelligence: 30, stamina: 15 }, salary: [3000, 4000, 5000] },
    { name: '住院醫生', requiredStats: { intelligence: 35, stamina: 15, charisma: 10 }, salary: [6000, 8000, 10000] },
    { name: '主治醫生', requiredStats: { intelligence: 35, stamina: 25, charisma: 10 }, salary: [10000, 12000, 15000, 18000] },
  ],
}

// === canPlayerApplyForJob 測試 ===

describe('canPlayerApplyForJob', () => {
  it('should_return_true_when_stats_meet_requirement', () => {
    // 農夫需要 stamina: 10
    const player = createMockPlayer({ stats: { intelligence: 5, stamina: 12, charisma: 5 } })
    expect(canPlayerApplyForJob(player, 'farmer')).toBe(true)
  })

  it('should_return_false_when_stats_not_enough', () => {
    // 農夫需要 stamina: 10
    const player = createMockPlayer({ stats: { intelligence: 5, stamina: 5, charisma: 5 } })
    expect(canPlayerApplyForJob(player, 'farmer')).toBe(false)
  })

  it('should_return_false_for_invalid_job_id', () => {
    const player = createMockPlayer()
    expect(canPlayerApplyForJob(player, 'non-existent-job')).toBe(false)
  })
})

// === getAvailableJobs 測試 ===

describe('getAvailableJobs', () => {
  it('should_return_jobs_player_qualifies_for', () => {
    const player = createMockPlayer({ stats: { intelligence: 10, stamina: 10, charisma: 10 } })
    const jobs = getAvailableJobs(player)
    expect(jobs.length).toBeGreaterThan(0)
  })

  it('should_return_empty_for_low_stats', () => {
    const player = createMockPlayer({ stats: { intelligence: 1, stamina: 1, charisma: 1 } })
    const jobs = getAvailableJobs(player)
    expect(jobs).toHaveLength(0)
  })
})

// === applyForJob 測試 ===

describe('applyForJob', () => {
  it('should_assign_job_when_qualified', () => {
    // 農夫需要 stamina: 10
    const player = createMockPlayer({ stats: { intelligence: 5, stamina: 12, charisma: 5 } })
    const updated = applyForJob(player, 'farmer')

    expect(updated.job).not.toBeNull()
    expect(updated.job?.id).toBe('farmer')
    expect(updated.jobLevel).toBe(0)
    expect(updated.performance).toBe(0)
  })

  it('should_not_assign_job_when_not_qualified', () => {
    // 農夫需要 stamina: 10
    const player = createMockPlayer({ stats: { intelligence: 5, stamina: 5, charisma: 5 } })
    const updated = applyForJob(player, 'farmer')

    expect(updated.job).toBeNull()
  })

  it('should_return_unchanged_for_invalid_job', () => {
    const player = createMockPlayer()
    const updated = applyForJob(player, 'invalid-job')

    expect(updated).toEqual(player)
  })
})

// === quitJob 測試 ===

describe('quitJob', () => {
  it('should_remove_job_and_reset_progress', () => {
    const player = createMockPlayer({
      job: mockWorkerJob,
      jobLevel: 2,
      performance: 7,
    })
    const updated = quitJob(player)

    expect(updated.job).toBeNull()
    expect(updated.jobLevel).toBe(0)
    expect(updated.performance).toBe(0)
  })
})

// === canPromote 測試 ===

describe('canPromote', () => {
  it('should_return_false_when_no_job', () => {
    const player = createMockPlayer()
    expect(canPromote(player)).toBe(false)
  })

  it('should_return_false_when_max_level', () => {
    const player = createMockPlayer({
      job: mockWorkerJob,
      jobLevel: 2,
      performance: 9,
      stats: { intelligence: 5, stamina: 15, charisma: 5 },
    })
    expect(canPromote(player)).toBe(false)
  })

  it('should_return_false_when_performance_not_enough', () => {
    const player = createMockPlayer({
      job: mockWorkerJob,
      jobLevel: 0,
      performance: 2, // 需要 3 才能升級
      stats: { intelligence: 5, stamina: 10, charisma: 5 },
    })
    expect(canPromote(player)).toBe(false)
  })

  it('should_return_false_when_stats_not_enough', () => {
    const player = createMockPlayer({
      job: mockWorkerJob,
      jobLevel: 0,
      performance: 3,
      stats: { intelligence: 5, stamina: 5, charisma: 5 }, // 需要 stamina 8
    })
    expect(canPromote(player)).toBe(false)
  })

  it('should_return_true_when_all_requirements_met', () => {
    const player = createMockPlayer({
      job: mockWorkerJob,
      jobLevel: 0,
      performance: 3,
      stats: { intelligence: 5, stamina: 10, charisma: 5 },
    })
    expect(canPromote(player)).toBe(true)
  })
})

// === promote 測試 ===

describe('promote', () => {
  it('should_increase_job_level', () => {
    const player = createMockPlayer({
      job: mockWorkerJob,
      jobLevel: 0,
      performance: 3,
      stats: { intelligence: 5, stamina: 10, charisma: 5 },
    })
    const updated = promote(player)

    expect(updated.jobLevel).toBe(1)
  })

  it('should_not_promote_if_cannot', () => {
    const player = createMockPlayer({
      job: mockWorkerJob,
      jobLevel: 0,
      performance: 1,
    })
    const updated = promote(player)

    expect(updated.jobLevel).toBe(0)
  })
})

// === calculateSalary 測試 ===

describe('calculateSalary', () => {
  it('should_return_0_when_no_job', () => {
    const player = createMockPlayer()
    expect(calculateSalary(player)).toBe(0)
  })

  it('should_return_base_salary_at_performance_0', () => {
    const player = createMockPlayer({
      job: mockWorkerJob,
      jobLevel: 0,
      performance: 0,
    })
    expect(calculateSalary(player)).toBe(1000)
  })

  it('should_return_higher_salary_at_higher_performance', () => {
    const player = createMockPlayer({
      job: mockWorkerJob,
      jobLevel: 0,
      performance: 2,
    })
    expect(calculateSalary(player)).toBe(1500)
  })

  it('should_calculate_salary_for_higher_level', () => {
    const player = createMockPlayer({
      job: mockWorkerJob,
      jobLevel: 1,
      performance: 4, // 相對績效 = 4 - 3 = 1
    })
    expect(calculateSalary(player)).toBe(2500)
  })
})

// === paySalary 測試 ===

describe('paySalary', () => {
  it('should_not_change_money_when_no_job', () => {
    const player = createMockPlayer({ money: 1000 })
    const updated = paySalary(player)
    expect(updated.money).toBe(1000)
  })

  it('should_add_salary_to_money', () => {
    const player = createMockPlayer({
      money: 1000,
      job: mockWorkerJob,
      jobLevel: 0,
      performance: 0,
    })
    const updated = paySalary(player)
    expect(updated.money).toBe(2000) // 1000 + 1000
  })
})

// === getJobDisplayName 測試 ===

describe('getJobDisplayName', () => {
  it('should_return_無業_when_no_job', () => {
    const player = createMockPlayer()
    expect(getJobDisplayName(player)).toBe('無業')
  })

  it('should_return_job_level_name', () => {
    const player = createMockPlayer({
      job: mockWorkerJob,
      jobLevel: 1,
    })
    expect(getJobDisplayName(player)).toBe('技工')
  })
})

// === applyJobSkillEffect 測試 ===

describe('applyJobSkillEffect', () => {
  it('should_not_change_when_no_job', () => {
    const player = createMockPlayer()
    const updated = applyJobSkillEffect(player)
    expect(updated.stats).toEqual(player.stats)
  })

  it('should_increase_stamina_for_worker', () => {
    const player = createMockPlayer({
      job: mockWorkerJob,
      stats: { intelligence: 5, stamina: 5, charisma: 5 },
    })
    const updated = applyJobSkillEffect(player)
    expect(updated.stats.stamina).toBe(6)
    expect(updated.stats.intelligence).toBe(5)
    expect(updated.stats.charisma).toBe(5)
  })

  it('should_increase_charisma_for_singer', () => {
    const player = createMockPlayer({
      job: mockSingerJob,
      stats: { intelligence: 5, stamina: 5, charisma: 5 },
    })
    const updated = applyJobSkillEffect(player)
    expect(updated.stats.charisma).toBe(6)
  })

  it('should_not_change_stats_for_engineer', () => {
    const player = createMockPlayer({
      job: mockEngineerJob,
      stats: { intelligence: 25, stamina: 15, charisma: 5 },
    })
    const updated = applyJobSkillEffect(player)
    expect(updated.stats).toEqual(player.stats)
  })

  it('should_not_change_stats_for_doctor', () => {
    const player = createMockPlayer({
      job: mockDoctorJob,
      stats: { intelligence: 30, stamina: 15, charisma: 5 },
    })
    const updated = applyJobSkillEffect(player)
    expect(updated.stats).toEqual(player.stats)
  })
})

// === 工程師職業測試 ===

describe('engineer job', () => {
  it('should_allow_apply_with_sufficient_stats', () => {
    const player = createMockPlayer({
      stats: { intelligence: 25, stamina: 15, charisma: 5 },
    })
    expect(canPlayerApplyForJob(player, 'engineer')).toBe(true)
  })

  it('should_reject_apply_with_insufficient_intelligence', () => {
    const player = createMockPlayer({
      stats: { intelligence: 20, stamina: 15, charisma: 5 },
    })
    expect(canPlayerApplyForJob(player, 'engineer')).toBe(false)
  })

  it('should_calculate_correct_base_salary', () => {
    const player = createMockPlayer({
      job: mockEngineerJob,
      jobLevel: 0,
      performance: 0,
    })
    expect(calculateSalary(player)).toBe(3000)
  })
})

// === 醫生職業測試 ===

describe('doctor job', () => {
  it('should_allow_apply_with_sufficient_stats', () => {
    const player = createMockPlayer({
      stats: { intelligence: 30, stamina: 15, charisma: 5 },
    })
    expect(canPlayerApplyForJob(player, 'doctor')).toBe(true)
  })

  it('should_reject_apply_with_insufficient_intelligence', () => {
    const player = createMockPlayer({
      stats: { intelligence: 25, stamina: 15, charisma: 5 },
    })
    expect(canPlayerApplyForJob(player, 'doctor')).toBe(false)
  })

  it('should_calculate_correct_base_salary', () => {
    const player = createMockPlayer({
      job: mockDoctorJob,
      jobLevel: 0,
      performance: 0,
    })
    expect(calculateSalary(player)).toBe(3000)
  })
})
