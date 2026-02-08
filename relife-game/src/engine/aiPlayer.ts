import type { Player, Card, StatType, GameState } from '../types'
import { canPlayCard } from './cardEffects'
import { getAvailableJobs, calculateSalary } from './jobSystem'
import { jobs } from '../data/jobs'

/**
 * AI 玩家決策模組（第二階段：規則 AI）
 * 根據遊戲狀態和基本策略做出決策
 */

// === 工具函數 ===

const randomChoice = <T>(arr: T[]): T | null => {
  if (arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

// 取得玩家最低屬性
const getLowestStat = (player: Player): StatType => {
  const { intelligence, stamina, charisma } = player.stats
  if (intelligence <= stamina && intelligence <= charisma) return 'intelligence'
  if (stamina <= charisma) return 'stamina'
  return 'charisma'
}

// 計算玩家「實力分數」（用於判斷誰是領先者）
const getPlayerScore = (player: Player): number => {
  const statTotal = player.stats.intelligence + player.stats.stamina + player.stats.charisma
  const jobBonus = player.job ? calculateSalary(player) : 0
  return player.money + statTotal * 100 + jobBonus
}

// === 卡牌評分系統 ===

// 根據玩家狀態為每張可用牌評分（分數越高越優先出）
const scoreCard = (player: Player, card: Card): number => {
  const { effect } = card
  const hasJob = !!player.job
  const money = player.money

  switch (effect.type) {
    // 績效卡：有工作時最重要
    case 'performance_change':
      return hasJob ? 90 : 0

    // 直接加屬性：根據是否需要該屬性
    case 'stat_change': {
      const lowest = getLowestStat(player)
      const isLowestStat = effect.stat === lowest
      // 有錢才出學力卡，加到最低屬性更好
      if (card.type === 'study') {
        return money >= (card.cost || 0) ? (isLowestStat ? 70 : 50) : 0
      }
      return isLowestStat ? 60 : 40
    }

    // 自由研究：便宜又能補最弱屬性
    case 'stat_change_choice':
      return money >= (card.cost || 0) ? 65 : 0

    // 抽牌（無中生有）：穩定好牌
    case 'draw_cards':
      return 60

    // 探險：有風險，但沒其他好牌時可以出
    case 'explore':
      return card.type === 'work' && !hasJob ? 0 : 25

    // 特殊效果
    case 'special':
      return scoreSpecialCard(player, effect.handler, card)

    default:
      return 10
  }
}

// 特殊卡評分
const scoreSpecialCard = (player: Player, handler: string, _card: Card): number => {
  const hasJob = !!player.job
  const money = player.money

  switch (handler) {
    // 工作卡特殊效果
    case 'bootlicking':  // 拍馬屁：+$500, 魅力-2。缺錢時出
      return hasJob && money < 2000 ? 55 : (hasJob ? 30 : 0)

    case 'socializing':  // 應酬：-$500, 魅力+2。魅力低且有錢時出
      return hasJob && money >= 1000 && player.stats.charisma < 10 ? 50 : (hasJob ? 20 : 0)

    case 'napping':  // 偷睡覺：-$500, 體力+2。體力低且有錢時出
      return hasJob && money >= 1000 && player.stats.stamina < 10 ? 50 : (hasJob ? 20 : 0)

    case 'overtime':  // 加班：+$1000, 體力-2。缺錢時出
      return hasJob && money < 3000 ? 60 : (hasJob ? 25 : 0)

    // 功能卡
    case 'steal':     // 偷竊
    case 'robbery':   // 搶劫
      return 45

    case 'sabotage':  // 陷害
      return 40

    case 'job_change': // 轉職：只有想換更好工作時出
      return hasJob ? 15 : 0

    case 'parachute':  // 空降：無條件就職，沒工作時超重要
      return !hasJob ? 85 : 15

    case 'invalid':  // 無效卡不能主動出
      return 0

    default:
      return 10
  }
}

// === 主要決策函數 ===

// AI 決定要出哪張牌（回傳 index，null 表示跳過）
export const aiChooseCard = (player: Player): number | null => {
  const playableCards: { index: number; score: number }[] = []

  player.hand.forEach((card, index) => {
    const check = canPlayCard(player, card)
    if (check.canPlay) {
      const score = scoreCard(player, card)
      if (score > 0) {
        playableCards.push({ index, score })
      }
    }
  })

  if (playableCards.length === 0) return null

  // 按分數排序，取最高分
  playableCards.sort((a, b) => b.score - a.score)

  // 80% 機率出最優牌，20% 隨機（增加不確定性）
  if (Math.random() < 0.8) {
    return playableCards[0].index
  }
  return randomChoice(playableCards)?.index ?? null
}

// AI 選擇要提升的屬性（自由研究等）
export const aiChooseStat = (player: Player): StatType => {
  // 選最低的屬性，均衡發展
  return getLowestStat(player)
}

// AI 選擇探險地點
export const aiChooseExploreLocation = (): string => {
  // 圖書館期望值最高（+3 或 +1 智力為主），回家也不錯（+3 體力）
  const locations = ['library', 'home', 'park']
  const weights = [0.45, 0.35, 0.2]

  const roll = Math.random()
  let cumulative = 0
  for (let i = 0; i < locations.length; i++) {
    cumulative += weights[i]
    if (roll < cumulative) return locations[i]
  }
  return 'library'
}

// AI 選擇目標玩家（用於偷竊、搶劫、陷害、空降）
export const aiChooseTargetPlayer = (
  players: Player[],
  currentPlayerIndex: number,
  action: string
): string | null => {
  const validTargets = players.filter((_, i) => i !== currentPlayerIndex)
  if (validTargets.length === 0) return null

  switch (action) {
    case 'steal':
    case 'robbery': {
      // 偷竊/搶劫：優先選手牌最多的玩家
      const withCards = validTargets.filter(p => (p.hand?.length ?? 0) > 0)
      if (withCards.length === 0) return randomChoice(validTargets)?.id || null
      const sorted = [...withCards].sort((a, b) => (b.hand?.length ?? 0) - (a.hand?.length ?? 0))
      return sorted[0].id
    }

    case 'sabotage': {
      // 陷害：攻擊分數最高的玩家（領先者）
      const sorted = [...validTargets].sort((a, b) => getPlayerScore(b) - getPlayerScore(a))
      return sorted[0].id
    }

    // parachute 不再需要選目標玩家
  }

  return randomChoice(validTargets)?.id || null
}

// AI 決定是否使用無效卡
export const aiShouldUseInvalidCard = (
  functionCard: Card,
  _aiPlayer: Player
): boolean => {
  const handler = functionCard.effect.type === 'special'
    ? functionCard.effect.handler
    : ''

  // 高威脅卡：一定擋
  if (['steal', 'robbery'].includes(handler)) {
    return true
  }

  // 中威脅卡：70% 機率擋
  if (['job_change'].includes(handler)) {
    return Math.random() < 0.7
  }

  // 低威脅卡（無中生有等）：30% 機率擋
  return Math.random() < 0.3
}

// AI 決定是否應徵工作
export const aiChooseJob = (player: Player): string | null => {
  if (player.job) return null

  const availableJobs = getAvailableJobs(player)
  if (availableJobs.length === 0) return null

  // 一定會嘗試應徵（有工作 = 有收入）
  // 選起薪最高的職業
  const sorted = [...availableJobs].sort((a, b) => {
    const salaryA = a.levels[0].salary[0] || 0
    const salaryB = b.levels[0].salary[0] || 0
    return salaryB - salaryA
  })

  return sorted[0].id
}

// AI 空降選職業（選起薪最高的）
export const aiChooseParachuteJob = (): string | null => {
  const sorted = [...jobs].sort((a, b) => {
    const salaryA = a.levels[0].salary[0] || 0
    const salaryB = b.levels[0].salary[0] || 0
    return salaryB - salaryA
  })
  return sorted[0]?.id ?? null
}

// AI 選擇要棄掉的牌（手牌超過上限時）
// 策略：丟掉評分最低的牌
export const aiChooseDiscardCards = (player: Player, discardCount: number): number[] => {
  const scored = player.hand.map((card, index) => ({
    index,
    score: scoreCard(player, card),
  }))
  scored.sort((a, b) => a.score - b.score)
  return scored.slice(0, discardCount).map(entry => entry.index)
}

// AI 行動延遲時間（毫秒）
export const AI_ACTION_DELAY = 500

// 判斷當前玩家是否為 AI
export const isCurrentPlayerAI = (state: GameState): boolean => {
  const currentPlayer = state.players[state.currentPlayerIndex]
  return currentPlayer?.isAI === true
}
