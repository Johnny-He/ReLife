import type { GameEvent } from '../types'

// MVP: 10 回合的事件設定
// 固定事件 + 隨機事件池

export const fixedEvents: GameEvent[] = [
  {
    id: 'new-mayor',
    turn: 1,
    name: '新鎮長上任',
    description: '小鎮新氣象！未來充滿希望。所有人獲得 $500 紅包！',
    target: { type: 'all' },
    effect: { type: 'money_change', value: 500 },
  },
  {
    id: 'poverty-relief',
    turn: 5,
    name: '濟貧政策',
    description: '濟貧政策上路！金錢少於 $1,500 可得補助金 $1,500。',
    target: { type: 'poorest', count: 4 },  // 會在 engine 中過濾
    effect: { type: 'special', handler: 'poverty_relief' },
  },
  {
    id: 'competition',
    turn: 8,
    name: '小鎮競賽',
    description: '小鎮競賽開跑！各項能力最高者獲得獎金。',
    target: { type: 'all' },
    effect: { type: 'special', handler: 'competition' },
  },
  {
    id: 'finale',
    turn: 10,
    name: '城鎮大會',
    description: '遊戲結束！所有人到廣場集合，進行最終結算。',
    target: { type: 'all' },
    effect: { type: 'special', handler: 'game_end' },
  },
]

export const randomEvents: GameEvent[] = [
  {
    id: 'tax',
    turn: 'random',
    name: '萬稅萬稅萬萬稅',
    description: '場上最有錢的 2 人，繳納 10% 稅金。',
    target: { type: 'richest', count: 2 },
    effect: { type: 'special', handler: 'tax' },
  },
  {
    id: 'red-envelope',
    turn: 'random',
    name: '過年發紅包',
    description: '鎮長發紅包囉！所有人金錢 +$1,000',
    target: { type: 'all' },
    effect: { type: 'money_change', value: 1000 },
  },
  {
    id: 'plague',
    turn: 'random',
    name: '瘟疫來襲',
    description: '瘟疫席捲小鎮。所有人體力 -3',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'stamina', value: -3 },
  },
  {
    id: 'white-terror',
    turn: 'random',
    name: '白色恐怖',
    description: '白色恐怖來臨，小鎮人心惶惶。所有人智力 -3',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'intelligence', value: -3 },
  },
  {
    id: 'water-shortage',
    turn: 'random',
    name: '小鎮停水',
    description: '小鎮停水，大家都髒兮兮。所有人魅力 -3',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'charisma', value: -3 },
  },
  {
    id: 'vaccine',
    turn: 'random',
    name: '施打疫苗',
    description: '嚴防傳染病，小鎮排隊施打疫苗。所有人體力 +3',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'stamina', value: 3 },
  },
  {
    id: 'lecture',
    turn: 'random',
    name: '名人講座',
    description: '小鎮舉辦名人講座。所有人智力 +3',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'intelligence', value: 3 },
  },
  {
    id: 'beauty-contest',
    turn: 'random',
    name: '選美大賽',
    description: '小鎮舉辦選美大賽。所有人魅力 +3',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'charisma', value: 3 },
  },
  {
    id: 'voucher',
    turn: 'random',
    name: '消費券發放',
    description: '鎮長英明！發放消費券。所有玩家抽一張牌。',
    target: { type: 'all' },
    effect: { type: 'draw_cards', count: 1 },
  },
  {
    id: 'landlord-gift',
    turn: 'random',
    name: '大地主發錢',
    description: '大地主發錢囉！最窮的 2 人各得 $1,000',
    target: { type: 'poorest', count: 2 },
    effect: { type: 'money_change', value: 1000 },
  },
]

// 取得指定回合的事件
export const getEventForTurn = (turn: number): GameEvent => {
  // 先檢查是否有固定事件
  const fixedEvent = fixedEvents.find((e) => e.turn === turn)
  if (fixedEvent) {
    return fixedEvent
  }

  // 否則從隨機事件池抽取
  const randomIndex = Math.floor(Math.random() * randomEvents.length)
  return { ...randomEvents[randomIndex], turn }
}
