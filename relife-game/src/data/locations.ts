import type { ExploreLocation } from '../types'

// MVP: 3 個探險地點
export const exploreLocations: ExploreLocation[] = [
  {
    id: 'park',
    name: '公園',
    outcomes: [
      {
        description: '遇到流浪漢，魅力 -2，損失 $500',
        probability: 0.3,
        effect: { type: 'special', handler: 'park_bad' },
      },
      {
        description: '撿到錢，體力 +2，獲得 $500',
        probability: 0.3,
        effect: { type: 'special', handler: 'park_good' },
      },
      {
        description: '悠閒散步，什麼事也沒發生',
        probability: 0.4,
        effect: { type: 'stat_change', stat: 'stamina', value: 0 },
      },
    ],
  },
  {
    id: 'library',
    name: '圖書館',
    outcomes: [
      {
        description: '旁人放屁，神智不清，智力 -2',
        probability: 0.3,
        effect: { type: 'stat_change', stat: 'intelligence', value: -2 },
      },
      {
        description: '吸收知識，智力 +3',
        probability: 0.4,
        effect: { type: 'stat_change', stat: 'intelligence', value: 3 },
      },
      {
        description: '安靜閱讀，智力 +1',
        probability: 0.3,
        effect: { type: 'stat_change', stat: 'intelligence', value: 1 },
      },
    ],
  },
  {
    id: 'home',
    name: '回家',
    outcomes: [
      {
        description: '回家吃飯，體力 +3',
        probability: 0.5,
        effect: { type: 'stat_change', stat: 'stamina', value: 3 },
      },
      {
        description: '做家事，體力 -2',
        probability: 0.3,
        effect: { type: 'stat_change', stat: 'stamina', value: -2 },
      },
      {
        description: '休息一下，體力 +1',
        probability: 0.2,
        effect: { type: 'stat_change', stat: 'stamina', value: 1 },
      },
    ],
  },
]

// 執行探險判定
export const resolveExplore = (locationId: string): { location: ExploreLocation; outcome: ExploreLocation['outcomes'][0] } | null => {
  const location = exploreLocations.find((l) => l.id === locationId)
  if (!location) return null

  // 根據機率選擇結果
  const roll = Math.random()
  let cumulative = 0

  for (const outcome of location.outcomes) {
    cumulative += outcome.probability
    if (roll < cumulative) {
      return { location, outcome }
    }
  }

  // 預設返回最後一個
  return { location, outcome: location.outcomes[location.outcomes.length - 1] }
}

// 隨機選擇一個地點
export const getRandomLocation = (): ExploreLocation => {
  const index = Math.floor(Math.random() * exploreLocations.length)
  return exploreLocations[index]
}
