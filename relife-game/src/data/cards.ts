import type { Card } from '../types'

// 根據桌遊規則設定的完整牌庫
export const cards: Card[] = [
  // === 學力卡 (Study Cards) - 需付費使用，共 68 張 ===
  {
    id: 'social-training',
    type: 'study',
    name: '社交訓練',
    description: '魅力 +2',
    cost: 500,
    effect: { type: 'stat_change', stat: 'charisma', value: 2 },
    count: 6,
  },
  {
    id: 'weight-training',
    type: 'study',
    name: '重量訓練',
    description: '體力 +2',
    cost: 500,
    effect: { type: 'stat_change', stat: 'stamina', value: 2 },
    count: 6,
  },
  {
    id: 'thesis-research',
    type: 'study',
    name: '論文研究',
    description: '智力 +2',
    cost: 500,
    effect: { type: 'stat_change', stat: 'intelligence', value: 2 },
    count: 6,
  },
  {
    id: 'free-research',
    type: 'study',
    name: '自由研究',
    description: '選擇任一能力 +1',
    cost: 300,
    effect: { type: 'stat_change_choice', value: 1 },
    count: 40,
  },
  {
    id: 'field-trip',
    type: 'study',
    name: '校外教學',
    description: '前往探險區域',
    effect: { type: 'explore', location: 'random' },
    count: 10,
  },

  // === 工作卡 (Work Cards) - 免費使用，共 66 張 ===
  {
    id: 'performance',
    type: 'work',
    name: '績效',
    description: '績效 +1（需有工作）',
    effect: { type: 'performance_change', value: 1 },
    count: 28,
  },
  {
    id: 'bootlicking',
    type: 'work',
    name: '拍老闆馬屁',
    description: '獲得 $500，魅力 -2',
    effect: { type: 'special', handler: 'bootlicking' },
    count: 7,
  },
  {
    id: 'socializing',
    type: 'work',
    name: '應酬',
    description: '花費 $500，魅力 +2',
    effect: { type: 'special', handler: 'socializing' },
    count: 7,
  },
  {
    id: 'napping',
    type: 'work',
    name: '偷睡覺',
    description: '花費 $500，體力 +2',
    effect: { type: 'special', handler: 'napping' },
    count: 7,
  },
  {
    id: 'overtime',
    type: 'work',
    name: '加班',
    description: '獲得 $1,000，體力 -2',
    effect: { type: 'special', handler: 'overtime' },
    count: 7,
  },
  {
    id: 'business-trip',
    type: 'work',
    name: '出差',
    description: '前往探險區域',
    effect: { type: 'explore', location: 'random' },
    count: 10,
  },

  // === 功能卡 (Function Cards) - 共 41 張 ===
  {
    id: 'steal',
    type: 'function',
    name: '偷竊',
    description: '隨機抽取另一位玩家的一張手牌',
    effect: { type: 'special', handler: 'steal' },
    count: 5,
  },
  {
    id: 'robbery',
    type: 'function',
    name: '搶劫',
    description: '檢視一名玩家的手牌並拿走一張',
    effect: { type: 'special', handler: 'robbery' },
    count: 5,
  },
  {
    id: 'sabotage',
    type: 'function',
    name: '陷害',
    description: '指定玩家失去任一屬性 2 點（無法被無效）',
    effect: { type: 'special', handler: 'sabotage' },
    count: 7,
  },
  {
    id: 'invalid',
    type: 'function',
    name: '無效',
    description: '使一張功能卡無效',
    effect: { type: 'special', handler: 'invalid' },
    count: 10,
  },
  {
    id: 'something-from-nothing',
    type: 'function',
    name: '無中生有',
    description: '免費抽兩張牌',
    effect: { type: 'draw_cards', count: 2 },
    count: 6,
  },
  {
    id: 'job-change',
    type: 'function',
    name: '轉職',
    description: '可拋棄原職業換尚有空缺的職業',
    effect: { type: 'special', handler: 'job_change' },
    count: 5,
  },
  {
    id: 'parachute',
    type: 'function',
    name: '空降',
    description: '無條件就職任意職業',
    effect: { type: 'special', handler: 'parachute' },
    count: 3,
  },
]

// 建立完整牌庫（根據 count 展開）
export const createDeck = (): Card[] => {
  const deck: Card[] = []
  let cardInstanceId = 0

  for (const card of cards) {
    for (let i = 0; i < card.count; i++) {
      deck.push({
        ...card,
        id: `${card.id}-${cardInstanceId++}`,
      })
    }
  }

  return deck
}

// 洗牌
export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// 計算牌庫總張數
export const getTotalCardCount = (): number => {
  return cards.reduce((sum, card) => sum + card.count, 0)
}
