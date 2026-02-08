import type { Player, Achievement } from '../types'

// === 門檻成就（由高到低排列，只取最高一個） ===

export const MONEY_THRESHOLD_ACHIEVEMENTS = [
  { id: 'money_200k', threshold: 200000, name: '人生贏家', description: '遊戲結束時金錢 ≥ $200,000', score: 25000 },
  { id: 'money_150k', threshold: 150000, name: '財富自由', description: '遊戲結束時金錢 ≥ $150,000', score: 18000 },
  { id: 'money_100k', threshold: 100000, name: '十萬富翁', description: '遊戲結束時金錢 ≥ $100,000', score: 12000 },
  { id: 'money_80k',  threshold: 80000,  name: '富裕人生', description: '遊戲結束時金錢 ≥ $80,000',  score: 8000 },
  { id: 'money_50k',  threshold: 50000,  name: '小康生活', description: '遊戲結束時金錢 ≥ $50,000',  score: 5000 },
]

// === 唯一成就定義 ===

export const UNIQUE_ACHIEVEMENTS = {
  firstTo100k: { id: 'first_to_100k', name: '率先致富', description: '第一個存到 $100,000 的玩家', score: 10000 },
  richest:     { id: 'richest',       name: '首富',     description: '遊戲結束時擁有最多金錢',     score: 5000 },
}

// === 成就判定 ===

export function evaluateAchievements(players: Player[]): Map<string, Achievement[]> {
  const result = new Map<string, Achievement[]>()
  for (const p of players) {
    result.set(p.id, [])
  }

  // 門檻成就：每位玩家取達到的最高門檻
  for (const player of players) {
    const matched = MONEY_THRESHOLD_ACHIEVEMENTS.find(a => player.money >= a.threshold)
    if (matched) {
      result.get(player.id)!.push({
        id: matched.id,
        name: matched.name,
        description: matched.description,
        score: matched.score,
      })
    }
  }

  // 唯一成就：率先致富
  evaluateFirstTo100k(players, result)

  // 唯一成就：首富
  evaluateRichest(players, result)

  return result
}

function evaluateFirstTo100k(players: Player[], result: Map<string, Achievement[]>) {
  const qualifiedPlayers = players.filter(p => p.money >= 100000)
  if (qualifiedPlayers.length === 0) return

  // 一人達標 → 該玩家；多人達標 → 金錢最多者
  const winner = qualifiedPlayers.length === 1
    ? qualifiedPlayers[0]
    : qualifiedPlayers.reduce((a, b) => a.money > b.money ? a : b)

  // 多人達標且金錢相同 → 無人獲得
  if (qualifiedPlayers.length > 1) {
    const tiedCount = qualifiedPlayers.filter(p => p.money === winner.money).length
    if (tiedCount > 1) return
  }

  const a = UNIQUE_ACHIEVEMENTS.firstTo100k
  result.get(winner.id)!.push({ id: a.id, name: a.name, description: a.description, score: a.score })
}

function evaluateRichest(players: Player[], result: Map<string, Achievement[]>) {
  if (players.length === 0) return

  const maxMoney = Math.max(...players.map(p => p.money))
  const richestPlayers = players.filter(p => p.money === maxMoney)

  // 平手 → 無人獲得
  if (richestPlayers.length !== 1) return

  const a = UNIQUE_ACHIEVEMENTS.richest
  result.get(richestPlayers[0].id)!.push({ id: a.id, name: a.name, description: a.description, score: a.score })
}
