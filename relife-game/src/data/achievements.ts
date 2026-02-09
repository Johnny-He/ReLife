import type { Player, Achievement } from '../types'

// === 個人夢想成就條件（characterId → 判定函數） ===

export const DREAM_CONDITIONS: Record<string, (player: Player) => boolean> = {
  'zheng-an-qi':      (p) => p.job?.id === 'engineer',                          // 鄭安琪：當工程師
  'yao-xin-bei':      (p) => p.money >= 100000,                                 // 姚欣蓓：賺到 $100,000
  'xu-rui-he':        (p) => p.job?.id === 'magician' && p.jobLevel >= 2,       // 許睿和：當知名魔術師
  'liang-si-yu':      (p) => p.job?.id === 'doctor',                            // 梁思妤：當醫生
  'wu-xin-yi':        (p) => p.stats.intelligence > 30,                         // 吳欣怡：智力 > 30
  'zhuang-yu-cheng':  (p) => p.job?.id === 'singer',                            // 莊語澄：歌手
}

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
  firstTo100k:    { id: 'first_to_100k',    name: '率先致富', description: '第一個存到 $100,000 的玩家',         score: 10000 },
  richest:        { id: 'richest',          name: '首富',     description: '遊戲結束時擁有最多金錢',             score: 5000 },
  firstJob:       { id: 'first_job',        name: '第一個就業', description: '最早獲得職業的玩家',               score: 3000 },
  firstPromotion: { id: 'first_promotion',  name: '先驅者',   description: '第一個升遷到第二階段的玩家',         score: 5000 },
  mostJobChanges: { id: 'most_job_changes', name: '轉職達人', description: '轉職次數最多的玩家',               score: 3000 },
  lateBloomer:    { id: 'late_bloomer',     name: '大器晚成', description: '最晚獲得職業的玩家（須有就業過）',   score: 5000 },
  neverWorked:    { id: 'never_worked',     name: '躺平高手', description: '全場從未就業直到遊戲結束',          score: 8000 },
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

  // 唯一成就：職業相關
  evaluateFirstJob(players, result)
  evaluateFirstPromotion(players, result)
  evaluateMostJobChanges(players, result)
  evaluateLateBloomer(players, result)
  evaluateNeverWorked(players, result)

  // 個人夢想成就
  evaluateDreamAchievements(players, result)

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

// --- 職業相關唯一成就 ---

function addUniqueAchievement(playerId: string, key: keyof typeof UNIQUE_ACHIEVEMENTS, result: Map<string, Achievement[]>) {
  const a = UNIQUE_ACHIEVEMENTS[key]
  result.get(playerId)!.push({ id: a.id, name: a.name, description: a.description, score: a.score })
}

/** 第一個就業：firstJobTurn 最小者，平手無人獲得 */
function evaluateFirstJob(players: Player[], result: Map<string, Achievement[]>) {
  const withJob = players.filter(p => p.firstJobTurn != null)
  if (withJob.length === 0) return

  const minTurn = Math.min(...withJob.map(p => p.firstJobTurn!))
  const winners = withJob.filter(p => p.firstJobTurn === minTurn)
  if (winners.length !== 1) return

  addUniqueAchievement(winners[0].id, 'firstJob', result)
}

/** 先驅者：firstPromotionTurn 最小者，平手無人獲得 */
function evaluateFirstPromotion(players: Player[], result: Map<string, Achievement[]>) {
  const withPromotion = players.filter(p => p.firstPromotionTurn != null)
  if (withPromotion.length === 0) return

  const minTurn = Math.min(...withPromotion.map(p => p.firstPromotionTurn!))
  const winners = withPromotion.filter(p => p.firstPromotionTurn === minTurn)
  if (winners.length !== 1) return

  addUniqueAchievement(winners[0].id, 'firstPromotion', result)
}

/** 轉職達人：jobChangeCount 最大者（≥2 才算，首次就業不算轉職），平手無人獲得 */
function evaluateMostJobChanges(players: Player[], result: Map<string, Achievement[]>) {
  const qualified = players.filter(p => (p.jobChangeCount ?? 0) >= 2)
  if (qualified.length === 0) return

  const maxChanges = Math.max(...qualified.map(p => p.jobChangeCount!))
  const winners = qualified.filter(p => p.jobChangeCount === maxChanges)
  if (winners.length !== 1) return

  addUniqueAchievement(winners[0].id, 'mostJobChanges', result)
}

/** 大器晚成：firstJobTurn 最大者（須有就業過），平手無人獲得 */
function evaluateLateBloomer(players: Player[], result: Map<string, Achievement[]>) {
  const withJob = players.filter(p => p.firstJobTurn != null)
  if (withJob.length === 0) return

  const maxTurn = Math.max(...withJob.map(p => p.firstJobTurn!))
  const winners = withJob.filter(p => p.firstJobTurn === maxTurn)
  if (winners.length !== 1) return

  // 如果最晚就業的人也是最早就業的（只有一人就業），不頒發
  const minTurn = Math.min(...withJob.map(p => p.firstJobTurn!))
  if (maxTurn === minTurn) return

  addUniqueAchievement(winners[0].id, 'lateBloomer', result)
}

/** 躺平高手：全場從未就業，且僅一人如此，平手無人獲得 */
function evaluateNeverWorked(players: Player[], result: Map<string, Achievement[]>) {
  const neverWorked = players.filter(p => p.firstJobTurn == null)
  if (neverWorked.length !== 1) return

  addUniqueAchievement(neverWorked[0].id, 'neverWorked', result)
}

/** 個人夢想成就：角色有對應夢想條件且達成 → +8,000 */
function evaluateDreamAchievements(players: Player[], result: Map<string, Achievement[]>) {
  for (const player of players) {
    const condition = DREAM_CONDITIONS[player.character.id]
    if (condition && condition(player)) {
      result.get(player.id)!.push({
        id: `dream_${player.character.id}`,
        name: '夢想成真',
        description: player.character.personalDream!,
        score: 8000,
      })
    }
  }
}
