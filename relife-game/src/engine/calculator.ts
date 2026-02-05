import type { Player, Stats, ScoreBreakdown, GameResult } from '../types'

// === 數值計算 ===

// 計算單一玩家分數
export const calculatePlayerScore = (player: Player): ScoreBreakdown => {
  const statsTotal = player.stats.intelligence + player.stats.stamina + player.stats.charisma

  // 職業加成：有工作且等級越高分數越多
  let jobBonus = 0
  if (player.job) {
    jobBonus = (player.jobLevel + 1) * 1000  // 等級 0=1000, 1=2000, 2=3000
    jobBonus += player.performance * 100      // 每點績效 +100
  }

  return {
    money: player.money,
    stats: statsTotal * 100,  // 每點屬性值 100 分
    jobBonus,
    total: player.money + statsTotal * 100 + jobBonus,
  }
}

// 計算遊戲結果（排名）
export const calculateGameResult = (players: Player[]): GameResult => {
  const rankings = players
    .map((player) => ({
      player,
      score: calculatePlayerScore(player),
      rank: 0,
    }))
    .sort((a, b) => b.score.total - a.score.total)
    .map((item, index) => ({ ...item, rank: index + 1 }))

  return { rankings }
}

// === 數值變化 ===

// 修改玩家金錢（確保不會變成負數）
export const changeMoney = (player: Player, amount: number): Player => {
  return {
    ...player,
    money: Math.max(0, player.money + amount),
  }
}

// 修改玩家屬性
export const changeStat = (
  player: Player,
  stat: keyof Stats,
  amount: number
): Player => {
  return {
    ...player,
    stats: {
      ...player.stats,
      [stat]: Math.max(0, player.stats[stat] + amount),  // 最低為 0
    },
  }
}

// 修改績效
export const changePerformance = (player: Player, amount: number): Player => {
  if (!player.job) return player  // 沒工作不能加績效

  const newPerformance = Math.max(0, Math.min(9, player.performance + amount))
  return {
    ...player,
    performance: newPerformance,
  }
}

// === 查詢函數 ===

// 取得最有錢的 N 位玩家
export const getRichestPlayers = (players: Player[], count: number): Player[] => {
  return [...players]
    .sort((a, b) => b.money - a.money)
    .slice(0, count)
}

// 取得最窮的 N 位玩家
export const getPoorestPlayers = (players: Player[], count: number): Player[] => {
  return [...players]
    .sort((a, b) => a.money - b.money)
    .slice(0, count)
}

// 取得特定屬性最高的玩家
export const getHighestStatPlayer = (
  players: Player[],
  stat: keyof Stats
): Player => {
  return players.reduce((highest, player) =>
    player.stats[stat] > highest.stats[stat] ? player : highest
  )
}

// 取得有工作的玩家
export const getEmployedPlayers = (players: Player[]): Player[] => {
  return players.filter((p) => p.job !== null)
}

// 取得沒工作的玩家
export const getUnemployedPlayers = (players: Player[]): Player[] => {
  return players.filter((p) => p.job === null)
}
