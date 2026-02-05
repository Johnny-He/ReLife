// ============================================
// ReLife 重生 - 型別定義
// ============================================

// --- 基礎數值 ---
export type StatType = 'intelligence' | 'stamina' | 'charisma'

export interface Stats {
  intelligence: number  // 智力
  stamina: number       // 體力
  charisma: number      // 魅力
}

// --- 角色 ---
export interface Character {
  id: string
  name: string
  gender: 'male' | 'female'
  initialMoney: number
  initialStats: Stats
  marriageRequirement: Stats  // 結婚所需數值（MVP 暫不使用）
  description?: string
}

// --- 職業 ---
export interface JobLevel {
  name: string
  requiredStats: Partial<Stats>
  salary: number[]  // 依績效等級的薪水 [績效0, 績效1, 績效2, ...]
}

export interface Job {
  id: string
  name: string
  category: 'intelligence' | 'stamina' | 'charisma'  // 主要需求屬性
  levels: JobLevel[]  // 3 個階段
  skill?: string      // 職業技能描述
}

// --- 卡牌 ---
export type CardType = 'study' | 'work' | 'explore' | 'function'

export type CardEffect =
  | { type: 'stat_change'; stat: StatType; value: number }
  | { type: 'stat_change_choice'; value: number }  // 選擇任一屬性
  | { type: 'money_change'; value: number }
  | { type: 'draw_cards'; count: number }
  | { type: 'performance_change'; value: number }  // 績效變化
  | { type: 'explore'; location: string }
  | { type: 'special'; handler: string }  // 特殊效果

export interface Card {
  id: string
  type: CardType
  name: string
  description: string
  cost?: number       // 使用成本（學力卡需要付錢）
  effect: CardEffect
  count: number       // 牌庫中的數量
}

// --- 探險地點 ---
export interface ExploreOutcome {
  description: string
  probability: number  // 0-1 的機率
  effect: CardEffect
}

export interface ExploreLocation {
  id: string
  name: string
  outcomes: ExploreOutcome[]
}

// --- 事件 ---
export type EventTargetType =
  | 'all'           // 所有玩家
  | 'richest'       // 最有錢的 N 人
  | 'poorest'       // 最窮的 N 人
  | 'has_job'       // 有工作的人
  | 'no_job'        // 沒工作的人
  | 'specific_job'  // 特定職業

export interface GameEvent {
  id: string
  turn: number | 'random'  // 固定回合或隨機
  name: string
  description: string
  target: {
    type: EventTargetType
    count?: number       // 影響人數
    jobIds?: string[]    // 特定職業 ID
  }
  effect: CardEffect
}

// --- 玩家 ---
export interface Player {
  id: string
  name: string
  character: Character
  stats: Stats
  money: number
  job: Job | null
  jobLevel: number      // 職業階段 0-2
  performance: number   // 績效 0-9
  hand: Card[]
  isSkipTurn: boolean   // 是否跳過本回合
}

// --- 遊戲狀態 ---
export type GamePhase =
  | 'setup'       // 遊戲設置
  | 'event'       // 事件階段
  | 'salary'      // 發薪階段
  | 'action'      // 出牌階段
  | 'draw'        // 抽牌階段
  | 'end_turn'    // 回合結束
  | 'game_over'   // 遊戲結束

export interface GameState {
  // 遊戲設定
  playerCount: number
  maxTurns: number

  // 玩家
  players: Player[]
  currentPlayerIndex: number

  // 回合
  turn: number
  phase: GamePhase

  // 牌庫
  deck: Card[]
  discardPile: Card[]

  // 事件
  currentEvent: GameEvent | null
  eventLog: string[]

  // UI 狀態
  selectedCardIndex: number | null
  showEventModal: boolean
}

// --- 遊戲動作 ---
export type GameAction =
  | { type: 'START_GAME'; playerNames: string[]; characterIds: string[] }
  | { type: 'NEXT_PHASE' }
  | { type: 'PLAY_CARD'; cardIndex: number }
  | { type: 'SELECT_STAT'; stat: StatType }  // 選擇屬性（用於自由研究等）
  | { type: 'END_TURN' }
  | { type: 'DRAW_CARDS'; count: number }
  | { type: 'APPLY_JOB'; jobId: string }
  | { type: 'EXPLORE'; locationId: string }

// --- 計分 ---
export interface ScoreBreakdown {
  money: number
  stats: number
  jobBonus: number
  total: number
}

export interface GameResult {
  rankings: {
    player: Player
    score: ScoreBreakdown
    rank: number
  }[]
}
