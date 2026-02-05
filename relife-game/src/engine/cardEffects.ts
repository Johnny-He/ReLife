import type { Player, Card, CardEffect, StatType } from '../types'
import { changeMoney, changeStat, changePerformance } from './calculator'

// === 卡牌效果處理 ===

export interface CardEffectResult {
  player: Player
  otherPlayers?: Player[]  // 如果影響其他玩家
  message: string
  needsSelection?: {
    type: 'stat' | 'player' | 'location'
    options?: string[]
  }
}

// 檢查玩家是否可以使用卡牌
export const canPlayCard = (player: Player, card: Card): { canPlay: boolean; reason?: string } => {
  // 反應卡不能主動使用
  if (card.effect.type === 'special' && card.effect.handler === 'invalid') {
    return { canPlay: false, reason: '反應卡只能在對方使用功能卡時使用' }
  }

  // 檢查費用
  if (card.cost && player.money < card.cost) {
    return { canPlay: false, reason: `金錢不足，需要 $${card.cost}` }
  }

  // 工作卡需要有工作
  if (card.type === 'work' && !player.job) {
    return { canPlay: false, reason: '需要有工作才能使用' }
  }

  // 轉職卡需要有工作
  if (card.effect.type === 'special' && card.effect.handler === 'job_change' && !player.job) {
    return { canPlay: false, reason: '需要有工作才能轉職' }
  }

  return { canPlay: true }
}

// 執行基本效果（不需要額外選擇的）
export const applyBasicEffect = (
  player: Player,
  effect: CardEffect
): CardEffectResult => {
  switch (effect.type) {
    case 'stat_change':
      return {
        player: changeStat(player, effect.stat, effect.value),
        message: `${getStatName(effect.stat)} ${effect.value > 0 ? '+' : ''}${effect.value}`,
      }

    case 'money_change':
      return {
        player: changeMoney(player, effect.value),
        message: `金錢 ${effect.value > 0 ? '+' : ''}$${effect.value}`,
      }

    case 'performance_change':
      if (!player.job) {
        return { player, message: '沒有工作，無法獲得績效' }
      }
      return {
        player: changePerformance(player, effect.value),
        message: `績效 ${effect.value > 0 ? '+' : ''}${effect.value}`,
      }

    case 'stat_change_choice':
      return {
        player,
        message: '請選擇要提升的屬性',
        needsSelection: {
          type: 'stat',
          options: ['intelligence', 'stamina', 'charisma'],
        },
      }

    case 'draw_cards':
      return {
        player,
        message: `抽 ${effect.count} 張牌`,
      }

    case 'explore':
      return {
        player,
        message: '前往探險',
        needsSelection: {
          type: 'location',
        },
      }

    case 'special':
      return handleSpecialEffect(player, effect.handler)

    default:
      return { player, message: '未知效果' }
  }
}

// 處理特殊效果
const handleSpecialEffect = (
  player: Player,
  handler: string
): CardEffectResult => {
  switch (handler) {
    // 工作卡特殊效果
    case 'bootlicking':  // 拍老闆馬屁
      return {
        player: changeStat(changeMoney(player, 500), 'charisma', -1),
        message: '獲得 $500，魅力 -1',
      }

    case 'socializing':  // 應酬
      if (player.money < 500) {
        return { player, message: '金錢不足' }
      }
      return {
        player: changeStat(changeMoney(player, -500), 'charisma', 2),
        message: '花費 $500，魅力 +2',
      }

    case 'overtime':  // 加班
      return {
        player: changeStat(changeMoney(player, 1000), 'stamina', -2),
        message: '獲得 $1000，體力 -2',
      }

    // 功能卡特殊效果
    case 'steal':  // 偷竊
      return {
        player,
        message: '選擇要偷竊的玩家',
        needsSelection: { type: 'player' },
      }

    case 'sabotage':  // 陷害
      return {
        player,
        message: '選擇要陷害的玩家和屬性',
        needsSelection: { type: 'player' },
      }

    case 'invalid':  // 無效
      return {
        player,
        message: '無效卡（反應卡，在對方出牌時使用）',
      }

    case 'job_change':  // 轉職
      return {
        player: { ...player, job: null, jobLevel: 0, performance: 0 },
        message: '已離職，可以應徵新工作',
      }

    // 探險結果
    case 'park_bad':
      return {
        player: changeStat(changeMoney(player, -500), 'charisma', -2),
        message: '遇到流浪漢，魅力 -2，損失 $500',
      }

    case 'park_good':
      return {
        player: changeStat(changeMoney(player, 500), 'stamina', 2),
        message: '撿到錢，體力 +2，獲得 $500',
      }

    default:
      return { player, message: `特殊效果: ${handler}` }
  }
}

// 使用卡牌（包含扣費）
export const playCard = (
  player: Player,
  card: Card
): CardEffectResult & { usedCard: Card } => {
  // 先扣除費用
  let updatedPlayer = player
  if (card.cost) {
    updatedPlayer = changeMoney(player, -card.cost)
  }

  // 執行效果
  const result = applyBasicEffect(updatedPlayer, card.effect)

  return {
    ...result,
    usedCard: card,
  }
}

// 選擇屬性後執行效果
export const applyStatChoice = (
  player: Player,
  stat: StatType,
  value: number
): CardEffectResult => {
  return {
    player: changeStat(player, stat, value),
    message: `${getStatName(stat)} +${value}`,
  }
}

// 工具函數：取得屬性中文名稱
export const getStatName = (stat: StatType): string => {
  const names: Record<StatType, string> = {
    intelligence: '智力',
    stamina: '體力',
    charisma: '魅力',
  }
  return names[stat]
}
