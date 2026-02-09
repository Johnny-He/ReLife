import type { GameEvent } from '../types'

// 30 回合的事件設定（根據桌遊規則）
// 固定事件 + 隨機事件池（30 個）

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
    id: 'poverty-relief-1',
    turn: 5,
    name: '濟貧政策',
    description: '濟貧政策上路！金錢少於 $1,500 的玩家可得補助金至 $1,500。',
    target: { type: 'poorest', count: 4 },
    effect: { type: 'special', handler: 'poverty_relief' },
  },
  {
    id: 'competition-1',
    turn: 8,
    name: '小鎮競賽',
    description: '小鎮競賽開跑！第一名 +$3,000、第二名 +$2,000、第三名 +$1,000',
    target: { type: 'all' },
    effect: { type: 'special', handler: 'competition_ranked' },
  },
  {
    id: 'competition-2',
    turn: 15,
    name: '終生成就競賽',
    description: '終生成就競賽！第一名 +$5,000、第二名 +$3,500、第三名 +$2,000',
    target: { type: 'all' },
    effect: { type: 'special', handler: 'competition_achievement' },
  },
  {
    id: 'poverty-relief',
    turn: 21,
    name: '濟貧政策',
    description: '濟貧政策上路！場上最貧窮者補助 $3,000。',
    target: { type: 'poorest', count: 1 },
    effect: { type: 'special', handler: 'poverty_relief_3000' },
  },
  {
    id: 'finale',
    turn: 30,
    name: '城鎮大會',
    description: '遊戲結束！所有人到廣場集合，進行最終結算。',
    target: { type: 'all' },
    effect: { type: 'special', handler: 'game_end' },
  },
]

export const randomEvents: GameEvent[] = [
  // === 金錢事件 ===
  {
    id: 'tax',
    turn: 'random',
    name: '萬稅萬稅萬萬稅',
    description: '場上最有錢的 3 人，繳納 10% 稅金。',
    target: { type: 'richest', count: 3 },
    effect: { type: 'special', handler: 'tax' },
  },
  {
    id: 'tax-2',
    turn: 'random',
    name: '萬稅萬稅萬萬稅',
    description: '場上最有錢的 3 人，繳納 10% 稅金。',
    target: { type: 'richest', count: 3 },
    effect: { type: 'special', handler: 'tax' },
  },
  {
    id: 'iphone',
    turn: 'random',
    name: 'iPhone 新機上市',
    description: '富家子女徹夜排隊搶購！最有錢的 2 人各花 $1,000。',
    target: { type: 'richest', count: 2 },
    effect: { type: 'money_change', value: -1000 },
  },
  {
    id: 'landlord-gift',
    turn: 'random',
    name: '大地主發錢',
    description: '大地主發錢囉！最窮的 3 人各得 $1,000',
    target: { type: 'poorest', count: 3 },
    effect: { type: 'money_change', value: 1000 },
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
    id: 'new-government',
    turn: 'random',
    name: '新政府上任',
    description: '人事變動新氣象！老師、律師各得 $1,000 獎勵。',
    target: { type: 'specific_job', jobIds: ['teacher', 'lawyer'] },
    effect: { type: 'money_change', value: 1000 },
  },
  {
    id: 'charity',
    turn: 'random',
    name: '慈善募款',
    description: '小鎮慈善活動！最有錢的人捐 $2,000 給最窮的人。',
    target: { type: 'all' },
    effect: { type: 'special', handler: 'charity' },
  },
  {
    id: 'stock-boom',
    turn: 'random',
    name: '股市大漲',
    description: '股市一片紅！所有人金錢 +$2,000',
    target: { type: 'all' },
    effect: { type: 'money_change', value: 2000 },
  },
  {
    id: 'stock-crash',
    turn: 'random',
    name: '股市崩盤',
    description: '股市一片綠！所有人金錢 -$1,000',
    target: { type: 'all' },
    effect: { type: 'money_change', value: -1000 },
  },

  // === 屬性增益事件 ===
  {
    id: 'vaccine',
    turn: 'random',
    name: '施打疫苗',
    description: '嚴防傳染病，小鎮排隊施打流感疫苗。所有人體力 +2',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'stamina', value: 2 },
  },
  {
    id: 'lecture',
    turn: 'random',
    name: '名人講座',
    description: '小鎮舉辦名人講座。所有人智力 +2',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'intelligence', value: 2 },
  },
  {
    id: 'beauty-contest',
    turn: 'random',
    name: '選美大賽',
    description: '小鎮舉辦選美大賽。所有人魅力 +2',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'charisma', value: 2 },
  },
  {
    id: 'fitness-trend',
    turn: 'random',
    name: '健身風潮',
    description: '全民瘋健身！所有人體力 +2',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'stamina', value: 2 },
  },
  {
    id: 'book-club',
    turn: 'random',
    name: '讀書風潮',
    description: '小鎮吹起閱讀風潮！所有人智力 +2',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'intelligence', value: 2 },
  },
  {
    id: 'community-event',
    turn: 'random',
    name: '社區活動',
    description: '小鎮舉辦社區聯歡！所有人魅力 +2',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'charisma', value: 2 },
  },

  // === 屬性減益事件 ===
  {
    id: 'plague',
    turn: 'random',
    name: '瘟疫來襲',
    description: '瘟疫席捲小鎮。所有人體力 -1',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'stamina', value: -1 },
  },
  {
    id: 'white-terror',
    turn: 'random',
    name: '白色恐怖',
    description: '白色恐怖來臨，小鎮人心惶惶。所有人智力 -1',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'intelligence', value: -1 },
  },
  {
    id: 'water-shortage',
    turn: 'random',
    name: '小鎮停水',
    description: '小鎮停水，大家都髒兮兮。所有人魅力 -1',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'charisma', value: -1 },
  },
  {
    id: 'conscription',
    turn: 'random',
    name: '小鎮徵兵',
    description: '小鎮徵兵！大家忙著訓練，所有人體力 -1',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'stamina', value: -1 },
  },

  // === 卡牌事件 ===
  {
    id: 'voucher',
    turn: 'random',
    name: '消費券發放',
    description: '鎮長英明！發放消費券。所有玩家抽一張牌。',
    target: { type: 'all' },
    effect: { type: 'draw_cards', count: 1 },
  },
  {
    id: 'summer-vacation',
    turn: 'random',
    name: '放暑假',
    description: '放暑假囉！大家開心出遊。所有玩家抽一張牌。',
    target: { type: 'all' },
    effect: { type: 'draw_cards', count: 1 },
  },
  // === 暫停事件 ===
  {
    id: 'typhoon',
    turn: 'random',
    name: '颱風來臨',
    description: '颱風來臨！所有人金錢 -$500',
    target: { type: 'all' },
    effect: { type: 'money_change', value: -500 },
  },
  {
    id: 'landslide',
    turn: 'random',
    name: '土石流',
    description: '人民的慘叫！土石流崩落。所有人體力 -1',
    target: { type: 'all' },
    effect: { type: 'stat_change', stat: 'stamina', value: -1 },
  },
  {
    id: 'strike',
    turn: 'random',
    name: '集體罷工',
    description: '老闆壓榨！有工作的人集體罷工，暫停一回合。',
    target: { type: 'has_job' },
    effect: { type: 'special', handler: 'skip_turn' },
  },
  {
    id: 'crackdown',
    turn: 'random',
    name: '掃黑行動',
    description: '警方掃黑！酒店小姐、走私集團、黑道暫停一回合。',
    target: { type: 'specific_job', jobIds: ['hostess', 'smuggler', 'gangster'] },
    effect: { type: 'special', handler: 'skip_turn' },
  },

  // === 特殊事件 ===
  {
    id: 'recession',
    turn: 'random',
    name: '經濟不景氣',
    description: '經濟不景氣，有工作的人薪水被扣！金錢 -$500',
    target: { type: 'has_job' },
    effect: { type: 'money_change', value: -500 },
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
