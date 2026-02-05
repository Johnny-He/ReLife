import type { Job } from '../types'

// 完整職業列表（根據原版桌遊設計）
export const jobs: Job[] = [
  // ========== 智力型職業 ==========
  {
    id: 'lawyer',
    name: '律師',
    category: 'intelligence',
    levels: [
      {
        name: '律師',
        requiredStats: { intelligence: 20, charisma: 15 },
        salary: [4000, 5000, 6000],
      },
      {
        name: '資深律師',
        requiredStats: { intelligence: 25, stamina: 10, charisma: 20 },
        salary: [10000, 12000, 15000],
      },
      {
        name: '王牌律師',
        requiredStats: { intelligence: 30, stamina: 10, charisma: 25 },
        salary: [18000, 20000, 25000, 30000],
      },
    ],
    skill: '訴訟專家',
  },
  {
    id: 'teacher',
    name: '老師',
    category: 'intelligence',
    levels: [
      {
        name: '實習老師',
        requiredStats: { intelligence: 15, charisma: 5 },
        salary: [2000, 3000, 4000],
      },
      {
        name: '正式老師',
        requiredStats: { intelligence: 20, stamina: 10, charisma: 10 },
        salary: [8000, 10000, 15000],
      },
      {
        name: '主任',
        requiredStats: { intelligence: 25, stamina: 15, charisma: 15 },
        salary: [20000, 22000, 24000, 26000],
      },
    ],
    skill: '愛的教育，每回合智力+1',
  },
  {
    id: 'smuggler',
    name: '走私集團',
    category: 'intelligence',
    levels: [
      {
        name: '集團成員',
        requiredStats: { intelligence: 12, charisma: 8 },
        salary: [2000, 4000, 6000],
      },
      {
        name: '集團幹部',
        requiredStats: { intelligence: 18, charisma: 15 },
        salary: [10000, 15000, 20000],
      },
      {
        name: '集團首領',
        requiredStats: { intelligence: 25, stamina: 10, charisma: 20 },
        salary: [30000, 40000, 50000],
      },
    ],
    skill: '地下經濟（轉職需付 $8,000 退出費）',
  },

  // ========== 體力型職業 ==========
  {
    id: 'worker',
    name: '工人',
    category: 'stamina',
    levels: [
      {
        name: '工人',
        requiredStats: { stamina: 12, charisma: 3 },
        salary: [1000, 2000, 3000],
      },
      {
        name: '工頭',
        requiredStats: { stamina: 18, charisma: 8 },
        salary: [5000, 6000, 7000],
      },
      {
        name: '工廠廠長',
        requiredStats: { intelligence: 10, stamina: 20, charisma: 15 },
        salary: [10000, 12000, 15000],
      },
    ],
    skill: '刻苦耐勞，每回合體力+1',
  },
  {
    id: 'farmer',
    name: '農夫',
    category: 'stamina',
    levels: [
      {
        name: '農夫',
        requiredStats: { stamina: 10 },
        salary: [1000, 2000, 3000],
      },
      {
        name: '資深農夫',
        requiredStats: { stamina: 18, charisma: 8 },
        salary: [5000, 7000, 10000],
      },
      {
        name: '農產大亨',
        requiredStats: { intelligence: 15, stamina: 25, charisma: 15 },
        salary: [20000, 22000, 25000],
      },
    ],
    skill: '有機生活，每回合體力+1',
  },
  {
    id: 'gangster',
    name: '黑道',
    category: 'stamina',
    levels: [
      {
        name: '小弟',
        requiredStats: { stamina: 12, charisma: 8 },
        salary: [2000, 4000, 6000],
      },
      {
        name: '堂主',
        requiredStats: { stamina: 20, charisma: 15 },
        salary: [10000, 15000, 20000],
      },
      {
        name: '幫主',
        requiredStats: { intelligence: 15, stamina: 25, charisma: 20 },
        salary: [30000, 35000, 40000],
      },
    ],
    skill: '江湖規矩（轉職時體力 -5）',
  },

  // ========== 魅力型職業 ==========
  {
    id: 'singer',
    name: '歌手',
    category: 'charisma',
    levels: [
      {
        name: '駐唱歌手',
        requiredStats: { stamina: 8, charisma: 12 },
        salary: [800, 1500, 2000],
      },
      {
        name: '出道歌手',
        requiredStats: { intelligence: 10, stamina: 15, charisma: 18 },
        salary: [5000, 8000, 12000],
      },
      {
        name: '知名歌手',
        requiredStats: { intelligence: 15, stamina: 20, charisma: 25 },
        salary: [15000, 20000, 30000],
      },
    ],
    skill: '人見人愛，每回合魅力+1',
  },
  {
    id: 'magician',
    name: '魔術師',
    category: 'charisma',
    levels: [
      {
        name: '街頭魔術師',
        requiredStats: { intelligence: 10, charisma: 10 },
        salary: [800, 1200, 1500],
      },
      {
        name: '職業魔術師',
        requiredStats: { intelligence: 18, charisma: 18 },
        salary: [2500, 3000, 4000],
      },
      {
        name: '知名魔術師',
        requiredStats: { intelligence: 25, stamina: 15, charisma: 25 },
        salary: [8000, 10000, 15000],
      },
    ],
    skill: '見證奇蹟，可無效一張功能卡',
  },
  {
    id: 'hostess',
    name: '酒店小姐',
    category: 'charisma',
    levels: [
      {
        name: '酒店小姐',
        requiredStats: { stamina: 10, charisma: 15 },
        salary: [1500, 2000, 2500],
      },
      {
        name: '酒店紅牌',
        requiredStats: { intelligence: 8, stamina: 15, charisma: 22 },
        salary: [6000, 8000, 15000],
      },
      {
        name: '媽媽桑',
        requiredStats: { intelligence: 15, stamina: 18, charisma: 28 },
        salary: [20000, 25000, 35000],
      },
    ],
    skill: '交際手腕，應酬卡效果加倍',
  },
]

export const getJobById = (id: string): Job | undefined => {
  return jobs.find((j) => j.id === id)
}

// 檢查玩家是否符合職業要求
export const canApplyForJob = (
  playerStats: { intelligence: number; stamina: number; charisma: number },
  job: Job,
  level: number = 0
): boolean => {
  const required = job.levels[level].requiredStats
  return (
    (required.intelligence === undefined || playerStats.intelligence >= required.intelligence) &&
    (required.stamina === undefined || playerStats.stamina >= required.stamina) &&
    (required.charisma === undefined || playerStats.charisma >= required.charisma)
  )
}

// 依類別分組職業
export const getJobsByCategory = () => {
  return {
    intelligence: jobs.filter((j) => j.category === 'intelligence'),
    stamina: jobs.filter((j) => j.category === 'stamina'),
    charisma: jobs.filter((j) => j.category === 'charisma'),
  }
}
