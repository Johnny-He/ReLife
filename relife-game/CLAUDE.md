# ReLife 重生 - 開發指南

## 專案概述

Web 版桌遊「ReLife 重生」- 人生模擬類策略卡牌遊戲

- **技術棧**: React 19 + TypeScript + Vite + Zustand + Tailwind CSS + Firebase
- **目標**: 支援本地多人與線上多人
- **語言**: 繁體中文介面
- **部署**: GitHub Pages (https://johnny-he.github.io/ReLife/)

---

## 架構原則

### 四層分離架構

```
UI Layer (React)     → 只負責顯示和接收輸入
    ↓
State Layer (Zustand) → 單一資料來源，管理遊戲狀態
    ↓
Engine Layer         → 純函數，不依賴 React，可獨立測試
    ↓
Data Layer           → 靜態資料定義（角色、卡牌、職業等）
```

**為什麼這樣設計？**
- 方便未來擴展為線上多人（只需在 State Layer 加入網路同步）
- Engine Layer 可以在 Server 端重複使用
- 每層都可以獨立測試

### 遊戲引擎原則

1. **純函數**: Engine 中的函數不應有副作用，只接收輸入、返回輸出
2. **不可變性**: 不要直接修改 state，總是返回新物件
3. **型別安全**: 善用 TypeScript 的 Union Types 處理不同效果

---

## 檔案結構

```
relife-game/
├── vitest.config.ts # 測試設定
├── src/
│   ├── types/           # 型別定義
│   ├── data/            # 靜態資料（角色、卡牌、職業、事件、成就、版本紀錄）
│   ├── engine/          # 遊戲邏輯（純函數）
│   │   ├── calculator.ts      # 數值計算（含成就計分整合）
│   │   ├── calculator.test.ts # 測試
│   │   ├── cardEffects.ts     # 卡牌效果
│   │   ├── cardEffects.test.ts
│   │   ├── jobSystem.ts       # 職業系統
│   │   ├── jobSystem.test.ts
│   │   ├── gameLogic.ts       # 回合流程
│   │   ├── gameLogic.test.ts
│   │   ├── aiPlayer.ts        # AI 玩家決策邏輯
│   │   └── aiPlayer.test.ts
│   ├── store/           # Zustand 狀態管理
│   │   ├── gameStore.ts # 遊戲狀態
│   │   └── roomStore.ts # 房間狀態（線上模式）
│   ├── firebase/        # Firebase 設定與服務
│   │   ├── config.ts    # Firebase 初始化
│   │   └── roomService.ts # 房間 CRUD 操作
│   ├── hooks/           # React Hooks
│   │   ├── useGameSync.ts    # 線上同步邏輯
│   │   ├── useAIPlayer.ts    # AI 玩家自動行動
│   │   └── useValueChange.ts # 數值變化追蹤
│   ├── components/      # React 元件
│   │   ├── PlayerPanel.tsx        # 玩家資訊面板
│   │   ├── CardHand.tsx           # 手牌顯示
│   │   ├── CardDisplay.tsx        # 單張卡牌
│   │   ├── ActionBar.tsx          # 行動按鈕
│   │   ├── JobBoard.tsx           # 職業板
│   │   ├── EventModal.tsx         # 事件彈窗
│   │   └── ValueChangeIndicator.tsx # 數值變化動畫
│   └── pages/           # 頁面元件
│       ├── StartPage.tsx   # 開始畫面（本地/線上選擇）
│       ├── LobbyPage.tsx   # 線上大廳（創建/加入/等待房間）
│       ├── GamePage.tsx    # 遊戲中
│       └── ResultPage.tsx  # 結算畫面
```

---

## 線上多人功能

### Firebase 架構

```
Firebase Realtime Database
└── rooms/
    └── {roomId}/
        ├── id: string
        ├── hostId: string
        ├── status: 'waiting' | 'playing' | 'finished'
        ├── players: RoomPlayer[]
        ├── gameState: GameState | null
        └── createdAt: number
```

### 同步機制

1. **房主開始遊戲** → 初始化 GameState 並寫入 Firebase
2. **玩家操作** → 更新本地 Zustand → 自動同步到 Firebase
3. **其他玩家** → 監聽 Firebase 變化 → 更新本地 Zustand

### 關鍵檔案

- `useGameSync.ts`: 處理雙向同步，避免循環更新（同步 pendingFunctionCard（含 invalidChain）、pendingTargetPlayer、pendingDiscard）
- `roomService.ts`: 房間的 CRUD 操作
- `roomStore.ts`: 管理房間狀態（roomId, playerId, room）

### Firebase 注意事項

**Firebase 不接受 undefined 值**，同步前需要清理資料：

```typescript
// 在 useGameSync.ts 中
const cleanForFirebase = <T>(obj: T): T => {
  if (obj === undefined) return null as T
  if (Array.isArray(obj)) {
    return obj.filter(item => item !== undefined).map(cleanForFirebase) as T
  }
  // ...
}
```

**陣列欄位需要 fallback**，因為 Firebase 同步回來可能是 undefined：

```typescript
// 在 spread 陣列時加上 || []
[...(state.discardPile || []), card]
[...(state.eventLog || []), ...messages]
```

### 房間自動清理

`cleanupOldRooms()` 在進入大廳時自動執行，清理過期房間：

| 狀態 | 過期時間 |
|------|----------|
| waiting | 24 小時 |
| playing | 6 小時 |
| finished | 1 小時 |

### 線上模式已知問題與修復（2026-02-07）

#### 問題：Chrome 當掉 / 白畫面

**症狀**：線上模式使用無痕視窗開兩個畫面時，Chrome 會當掉或遊戲中途出現白畫面。

**根本原因**：

1. **Firebase 監聽器洩漏**
   - 錯誤使用 `off(ref)` 清理監聽器，會移除所有監聽器（包括其他玩家的）
   - 正確做法是保存並使用 `onValue()` 返回的 unsubscribe 函數

2. **Firebase 會移除空陣列**
   - Firebase 存空陣列 `[]` 時會自動轉成 `undefined`
   - 同步回來後存取 `players.length` 會崩潰
   - **必須在所有陣列存取前加上 `?? []` fallback**

3. **競合條件**
   - 使用固定 100ms `setTimeout` 重置同步 flag 不可靠
   - 改用 `queueMicrotask()` 確保在 React 批次更新後執行

**修復檔案清單**：

| 檔案 | 修復內容 |
|------|---------|
| `roomService.ts` | `onValue()` 返回值作為 unsubscribe |
| `useGameSync.ts` | 監聽器正確清理 + 所有陣列加 `?? []` + `queueMicrotask` |
| `roomStore.ts` | 重連/建立房間時先清理舊訂閱 |
| `GamePage.tsx` | 用 `useRef` 避免 `syncToFirebase` 依賴變化導致重複訂閱 |
| `PlayerPanel.tsx` | `player.hand?.length ?? 0` |
| `ActionBar.tsx` | null 檢查 + 陣列 fallback |
| `gameStore.ts` | 陣列存取前加 fallback |
| `useValueChange.ts` | setTimeout 在 unmount 時正確清理 |

**重要教訓**：

```typescript
// ❌ 錯誤：Firebase 同步回來可能是 undefined
players: firebaseGameState.players,

// ✅ 正確：永遠加上 fallback
players: firebaseGameState.players ?? [],
```

```typescript
// ❌ 錯誤：off() 會移除所有監聽器
onValue(roomRef, callback)
return () => off(roomRef)

// ✅ 正確：保存並使用 unsubscribe 函數
const unsubscribe = onValue(roomRef, callback)
return unsubscribe
```

### 線上模式修復（2026-02-09）

| 問題 | 修復 |
|------|------|
| 事件紀錄遺失 | Firebase 同步收到 `phase === 'event'` 時強制 `showEventModal: true` |
| 偷竊/搶劫無法選目標 | `pendingTargetPlayer` 加入 Firebase 同步 |
| 非當事人可操作選擇 UI | 所有 pending 狀態 UI 加入 `isMyAction` 權限檢查 |
| 房主無法換角色 | 角色選擇 disabled 條件加入 `!isHost()` 例外 |
| 第 30 回合不結算 | `App.tsx` 路由：`phase === 'game_over'` 判斷移到 `room.status === 'playing'` 之前 |

---

## AI 電腦玩家

### 開發階段

| 階段 | 名稱 | 狀態 | 說明 |
|------|------|------|------|
| 第一階段 | 隨機 AI | ✅ 完成 | 隨機出牌、隨機選擇 |
| 第二階段 | 規則 AI | ✅ 完成 | 卡牌評分系統 + 策略決策 |
| 第三階段 | 個性 AI | 🔲 未開始 | 不同 AI 有不同性格（攻擊型/防禦型/平衡型） |

### 架構

AI 系統分為兩層：

- **決策邏輯**（`engine/aiPlayer.ts`）：純函數，不依賴 React，可獨立測試
- **自動行動 Hook**（`hooks/useAIPlayer.ts`）：監聯遊戲狀態，在 AI 回合自動觸發決策

### 決策函數（第二階段：規則 AI）

| 函數 | 用途 |
|------|------|
| `aiChooseCard(player)` | 卡牌評分系統，80% 出最高分牌、20% 隨機增加不確定性 |
| `aiChooseStat(player)` | 永遠選最低屬性，均衡發展 |
| `aiChooseExploreLocation()` | 加權隨機：圖書館 45%、回家 35%、公園 20% |
| `aiChooseTargetPlayer(players, idx, action)` | 偷竊/搶劫→手牌最多、陷害→領先者、空降→職等最高 |
| `aiShouldUseInvalidCard(card, player)` | 威脅判斷：高威脅必擋、中威脅 70%、低威脅 30%。連鎖反制時：自己的卡被取消→一定反制；敵方卡生效→依威脅決定；其他→不反制 |
| `aiChooseJob(player)` | 一定應徵，選起薪最高的職業 |
| `aiChooseDiscardCards(player, count)` | 手牌溢出時丟棄評分最低的牌 |

### 卡牌評分系統

每張可出的牌根據玩家狀態評分（分數越高越優先出）：

| 卡牌類型 | 評分邏輯 | 分數範圍 |
|----------|----------|----------|
| 績效卡 | 有工作時最重要 | 0-90 |
| 屬性卡（最低屬性） | 學力卡需有錢、加到最弱屬性更好 | 0-70 |
| 自由研究 | 便宜又能補最弱屬性 | 0-65 |
| 抽牌（無中生有） | 穩定好牌 | 60 |
| 加班 | 缺錢時出 | 0-60 |
| 應酬/偷睡覺 | 對應屬性低且有錢時出 | 0-50 |
| 偷竊/搶劫 | 攻擊牌 | 45 |
| 陷害 | 攻擊牌 | 40 |
| 探險 | 沒更好牌時出 | 0-25 |

### 目標選擇策略

| 行動 | 策略 | 依據 |
|------|------|------|
| 偷竊/搶劫 | 手牌最多的玩家 | 偷到好牌機率高 |
| 陷害 | 分數最高的玩家（領先者） | 金錢 + 屬性×100 + 薪水 |
| 空降 | 職等最高的玩家 | 搶到更好的職位 |

### UI 保護機制

AI 行動時，ActionBar 不顯示互動按鈕，改為顯示等待動畫：

```typescript
// 反應卡：回應者是 AI 時不顯示按鈕
const isMyResponse = isOnlineGame
  ? myIndex === respondingPlayerIndex
  : !respondingPlayer?.isAI

// 其他待決定項：當前玩家是 AI 時顯示等待文字
if (isCurrentAI) {
  return <div>🤖 {currentPlayer?.name} 正在選擇...</div>
}
```

### 本地模式 + AI 的 UI 行為

- **中間主面板**：固定顯示人類玩家的資訊和手牌
- **左側欄位**：顯示其他玩家（含 AI），標示「行動中」和「🤖」
- **回合指示**：輪到人類時顯示「🎮 輪到你了！」，AI 行動時顯示等待
- **非互動階段**（發薪、抽牌、事件）：自動推進，不需手動操作

---

## 行動記錄系統

### 型別定義

```typescript
type LogType = 'event' | 'action' | 'job' | 'system'

interface GameLog {
  turn: number       // 回合數
  playerName: string // 行動者名稱
  message: string    // 行動描述
  type: LogType      // 分類（用於 UI 上色）
}
```

### 記錄範圍

| 分類 | 顏色 | 記錄內容 |
|------|------|----------|
| `event` | 黃色 | 回合事件（天災、政策等） |
| `action` | 藍色 | 出牌、偷竊、探險、使用無效卡等 |
| `job` | 綠色 | 應徵、升遷 |
| `system` | 灰色 | 發薪 |

### 實作位置

記錄在 `gameStore.ts` 的各個 action 中，使用 `addLog()` 輔助函數寫入 `GameState.actionLog`。UI 顯示在 `GamePage.tsx` 右下角，最新記錄在最上方，保留最近 20 筆。

`actionLog` 也會同步到 Firebase，線上模式可看到對手行動。

---

## 成就系統

遊戲結束時根據玩家表現頒發成就並加分，顯示在 ResultPage 上。

### 架構

- **資料定義**（`data/achievements.ts`）：成就門檻、唯一成就定義、夢想條件 + `evaluateAchievements()` 純函數
- **計分整合**（`engine/calculator.ts`）：`calculateGameResult()` 呼叫 `evaluateAchievements()` 計入總分
- **UI 顯示**（`pages/ResultPage.tsx`）：分數明細第四欄「成就加成」+ 成就標籤
- **夢想條件**（`data/achievements.ts`）：`DREAM_CONDITIONS` map（characterId → 判定函數），6 個可達成的角色夢想

### 門檻成就（只取最高一個，不疊加）

| 成就 | 條件 | 得分 |
|------|------|------|
| 人生贏家 | 金錢 ≥ $200,000 | +25,000 |
| 財富自由 | 金錢 ≥ $150,000 | +18,000 |
| 十萬富翁 | 金錢 ≥ $100,000 | +12,000 |
| 富裕人生 | 金錢 ≥ $80,000 | +8,000 |
| 小康生活 | 金錢 ≥ $50,000 | +5,000 |

### 唯一成就（每場最多一人）

| 成就 | 條件 | 得分 |
|------|------|------|
| 率先致富 | 第一個存到 $100,000（多人達標取最高，平手無人得） | +10,000 |
| 首富 | 擁有最多金錢（平手無人得） | +5,000 |
| 第一個就業 | 最早獲得職業的玩家（平手無人得） | +3,000 |
| 先驅者 | 第一個升遷到第二階段的玩家（平手無人得） | +5,000 |
| 轉職達人 | 轉職次數最多的玩家（≥2次，平手無人得） | +3,000 |
| 大器晚成 | 最晚獲得職業的玩家（須有就業過，僅一人就業不算，平手無人得） | +5,000 |
| 躺平高手 | 全場從未就業直到遊戲結束（僅一人如此才頒發） | +8,000 |

### 個人夢想成就（達成角色夢想 +8,000）

`DREAM_CONDITIONS` map 定義 characterId → 判定函數，只有 6 個夢想可在現有系統中實現：

| 角色 | 夢想 | 判定條件 |
|------|------|----------|
| 鄭安琪 | 當工程師 | `job?.id === 'engineer'` |
| 姚欣蓓 | 賺到 $100,000 | `money >= 100000` |
| 許睿和 | 當知名魔術師 | `job?.id === 'magician' && jobLevel >= 2` |
| 梁思妤 | 當醫生 | `job?.id === 'doctor'` |
| 吳欣怡 | 智力 > 30 | `stats.intelligence > 30` |
| 莊語澄 | 歌手 | `job?.id === 'singer'` |

其餘 9 個角色的夢想需要婚姻/寵物/跨玩家系統，暫不實現。

---

## 程式碼風格

### TypeScript
- 優先使用 `interface` 定義物件型別
- 使用 `type` 定義 Union Types
- 避免 `any`，善用泛型

### React
- 使用 Function Components + Hooks
- 小元件優先，單一職責
- Props 使用解構

### 命名
- 元件: PascalCase (`PlayerPanel.tsx`)
- 函數: camelCase (`calculateScore`)
- 常數: SCREAMING_SNAKE_CASE (`MAX_HAND_SIZE`)
- 型別: PascalCase (`GameState`)
- **重要**: `use` 前綴保留給 React Hooks，普通函數應使用 `apply`, `handle`, `get` 等動詞

### ESLint 規範

專案使用嚴格的 ESLint 規則，部署前必須通過 `npm run lint`。常見問題：

| 問題 | 解決方式 |
|------|----------|
| Hook 在 callback 中調用 | 函數名稱不要用 `use` 開頭（如 `applyInvalidCard` 而非 `useInvalidCard`） |
| Effect 中同步 setState | 改用 `useState(() => initialValue)` 懶初始化 |
| case block 中的變數宣告 | 用 `{}` 包圍 case 內容 |
| Fast Refresh 問題 | 每個檔案只 export 組件或只 export Hook，不要混合 |
| 未使用的 catch 變數 | 使用空 catch block：`catch { ... }` |
| 使用 `any` 類型 | 使用正確的類型（如 Firebase 的 `DataSnapshot`） |

---

## 遊戲流程

```
遊戲開始
    ↓
每回合 (1-30):
    1. 事件階段 (event)     → 觸發回合事件（影響金錢/能力值）
    2. 發薪階段 (salary)    → 有工作者領薪水 + 職業技能效果
    3. 行動階段 (action)    → 玩家輪流出牌
    4. 抽牌階段 (draw)      → 每人抽 2 張（超過 10 張需棄牌）
    5. 回合結束 (end_turn)  → 切換到下一回合
    ↓
遊戲結束 → 計分 → 顯示排名

### 固定事件時間點

| 回合 | 事件 | 效果 |
|------|------|------|
| 1 | 新鎮長上任 | 所有人 +$500 |
| 5 | 濟貧政策 | 金錢 < $1,500 者補助至 $1,500 |
| 8 | 小鎮競賽 | 第一名 +$3,000、第二名 +$2,000、第三名 +$1,000 |
| 15 | 終生成就競賽 | 第一名 +$5,000、第二名 +$3,500、第三名 +$2,000 |
| 21 | 濟貧政策 | 最窮者補助 $3,000 |
| 30 | 城鎮大會 | 遊戲結束，最終結算 |
```

### 事件系統

- **固定事件**: 第 1、5、8、15、21、30 回合（見上表）
- **隨機事件**: 其他 24 個回合從 27 個隨機事件池中抽取（可重複）
- **事件彈窗**: 手動確認，不自動關閉。顯示目標玩家名字與金額

#### 隨機事件分類（27 個）

| 類別 | 數量 | 事件 |
|------|------|------|
| 金錢事件 | 9 | 萬稅x2、iPhone上市、大地主發錢、過年發紅包、新政府上任、慈善募款、股市大漲、股市崩盤 |
| 屬性增益 | 6 | 施打疫苗(+5)、名人講座(+5)、選美大賽(+5)、健身風潮(+2)、讀書風潮(+2)、社區活動(+2) |
| 屬性減益 | 4 | 瘟疫(-5)、白色恐怖(-5)、小鎮停水(-5)、小鎮徵兵(-2) |
| 卡牌事件 | 3 | 消費券、放暑假、傳牌 |
| 暫停/災害 | 4 | 颱風(-$500)、土石流(-3體)、集體罷工(has_job跳過)、掃黑(特定職業跳過) |
| 特殊 | 1 | 經濟不景氣(has_job -$500) |

#### 事件目標篩選類型

| 目標類型 | 說明 |
|----------|------|
| `all` | 所有玩家 |
| `richest` | 最有錢的 N 人 |
| `poorest` | 最窮的 N 人 |
| `has_job` | 有工作的人 |
| `no_job` | 沒工作的人 |
| `specific_job` | 特定職業（搭配 `jobIds`） |

#### 特殊事件處理器

| handler | 說明 |
|---------|------|
| `tax` | 最有錢的人繳 10% 稅 |
| `skip_turn` | 目標玩家 `isSkipTurn = true` |
| `pass_cards_left` | 每人傳一張隨機手牌給下家 |
| `charity` | 最有錢的人捐 $2,000 給最窮的人 |

### 職業技能（發薪階段自動觸發）

| 職業 | 被動效果 |
|------|----------|
| 老師 | 愛的教育，每回合智力 +1 |
| 工人 | 刻苦耐勞，每回合體力 +1 |
| 農夫 | 有機生活，每回合體力 +1 |
| 歌手 | 人見人愛，每回合魅力 +1 |
| 走私集團 | 地下經濟（轉職需付 $8,000 退出費） |
| 黑道 | 江湖規矩（轉職時體力 -5） |
| 魔術師 | 見證奇蹟，可無效一張功能卡 |
| 酒店小姐 | 交際手腕，應酬卡效果加倍 |
| 律師 | 訴訟專家 |
| 工程師 | （無特殊被動） |
| 醫生 | （無特殊被動） |

---

## 勝利條件

- **提前勝利**: 第一個達到 **$20,000** 的玩家立即獲勝
- **回合結束**: 30 回合結束後，以最終分數最高者獲勝

分數計算：金錢 + 屬性總和 × 100 + 職業加成 + 成就加成

---

## 卡牌系統

### 牌庫總覽（共 145 張）

#### 學力卡（58 張）- 需付費使用

| 卡牌 | 數量 | 費用 | 效果 |
|------|------|------|------|
| 社交訓練 | 6 | $500 | 魅力 +2 |
| 重量訓練 | 6 | $500 | 體力 +2 |
| 論文研究 | 6 | $500 | 智力 +2 |
| 自由研究 | 40 | $300 | 選擇任一能力 +1 |

#### 工作卡（48 張）- 需有工作才能使用

| 卡牌 | 數量 | 效果 |
|------|------|------|
| 績效 | 20 | 績效 +1 |
| 拍老闆馬屁 | 7 | 獲得 $500，魅力 -2 |
| 應酬 | 7 | 花費 $500，魅力 +2 |
| 偷睡覺 | 7 | 花費 $500，體力 +2 |
| 加班 | 7 | 獲得 $1,000，體力 -2 |

#### 功能卡（39 張）

| 卡牌 | 數量 | 效果 | 可被無效 |
|------|------|------|----------|
| 偷竊 | 5 | 隨機抽取目標一張手牌 | ✓ |
| 搶劫 | 5 | 檢視目標手牌並拿走一張 | ✓ |
| 陷害 | 7 | 目標隨機屬性 -2 | ✗ |
| 無效 | 6 | 取消一張功能卡（反應卡，可連鎖反制） | - |
| 無中生有 | 6 | 免費抽兩張牌 | ✓ |
| 轉職 | 8 | 離職，可應徵新工作 | ✓ |
| 空降 | 2 | 無條件就職任意職業 | ✓ |

### 卡牌機制

- **反應卡流程**: 功能卡使用時，其他玩家依序可選擇使用「無效」卡取消
- **無效卡連鎖反制**: 當有人使用「無效」卡時，其他玩家可以再用「無效」反制。奇數張無效→功能卡被取消；偶數張無效→功能卡生效。連鎖中每次重新詢問（跳過剛出無效的人）
- **陷害卡例外**: 無法被「無效」卡取消
- **手牌上限**: 10 張，超過時玩家自行選擇要丟棄哪些牌（AI 自動丟評分最低的）

---

## MVP 範圍

### 已實作
- 15 個角色（完整版）
- 11 種職業（智力型 5 種、體力型 3 種、魅力型 3 種）
- 30 回合遊戲（根據桌遊規則）
- 145 張卡牌
- 3 個探險地點
- 事件系統（6 個固定事件 + 27 個隨機事件，含暫停回合、傳牌、職業篩選等機制）
- 本地多人模式（支援動態 2-4 人，可自由新增/移除人類或 AI 玩家）
- 線上多人模式（Firebase）
- AI 電腦玩家（第二階段規則 AI：卡牌評分系統、策略目標選擇、威脅判斷）
- 行動記錄系統（記錄所有玩家行動，含回合數與分類）
- 非互動階段自動進行（發薪 800ms、抽牌 800ms、事件自動推進）
- 數值變化動畫
- 房間自動清理（24小時過期）
- $20,000 提前勝利條件
- 升遷恭喜彈窗（顯示新職稱與薪水範圍）
- 職業板顯示升遷條件（色彩標示已達/未達需求）
- 手牌溢出棄牌選擇（玩家自選要丟的牌，AI 自動丟最低分牌）
- 成就系統（門檻成就 + 唯一成就 + 個人夢想成就，結算畫面顯示成就標籤與加成分數）
- 版本更新紀錄（首頁收合區塊，`<details>/<summary>` 原生收合）

### 已移除
- 校外教學卡（學力卡，前往探險區域）
- 出差卡（工作卡，前往探險區域）

### 暫不包含
- 婚姻系統
- 商品區購物
- 拍賣系統
- 探險卡（40 張獨立探險卡）
- 音效系統

---

## 常用指令

```bash
npm run dev      # 啟動開發伺服器
npm run build    # 建置生產版本
npm run lint     # 程式碼檢查
npm run deploy   # 部署到 GitHub Pages
npm run test     # 執行測試（監聽模式）
npm run test:run # 執行測試（單次）
```

---

## 部署流程

1. **更新版本紀錄**：部署前必須先更新 `src/data/changelog.ts`，每次部署都建立新的 patch 版號（如 v1.2.1 → v1.2.2），新功能或大改動才升 minor 版號（如 v1.2.x → v1.3.0）
2. **完成修改後直接部署，不需詢問使用者確認**
3. 執行 `npm run deploy`（工作目錄：`relife-game/`）
3. 自動建置並推送到 `gh-pages` 分支
4. 訪問 https://johnny-he.github.io/ReLife/

### 快取問題

部署後如遇到舊版本快取：
- 使用 `Cmd + Shift + R` 強制重新整理
- 或使用無痕模式測試

---

## 版本紀錄系統

首頁（StartPage）底部的收合區塊，讓玩家查看每次版本更新內容。

### 架構

- **資料**（`data/changelog.ts`）：純陣列，由新到舊排列，每筆含 `version`、`date`、`changes`
- **UI**（`pages/StartPage.tsx`）：使用 `<details>/<summary>` 原生收合，預設收合

### 新增版本

在 `changelog` 陣列最前面新增一筆即可，不需改其他檔案：

```typescript
export const changelog = [
  { version: 'v1.2.1', date: '2026-02-08', changes: ['修復某某問題'] },
  // ... 舊版本
]
```

### 版號規則

- **patch**（v1.2.0 → v1.2.1）：每次部署
- **minor**（v1.2.x → v1.3.0）：新功能或大改動

---

## 測試策略

### 單元測試（Vitest）

Engine Layer 的純函數測試，共 210 個測試案例：

| 檔案 | 測試數 | 涵蓋功能 |
|------|--------|----------|
| `calculator.test.ts` | 60 | 分數計算、金錢/屬性變化、玩家查詢、勝利條件、成就判定（含職業成就、夢想成就） |
| `jobSystem.test.ts` | 35 | 應徵、離職、升遷、薪水、職業技能、工程師/醫生職業 |
| `cardEffects.test.ts` | 25 | 卡牌使用檢查、效果套用、特殊效果（park_bad/good、應酬、偷睡覺） |
| `gameLogic.test.ts` | 52 | 回合流程、抽牌、棄牌、溢出偵測、事件效果（skip_turn/pass_cards_left/charity + 目標篩選 has_job/specific_job） |
| `aiPlayer.test.ts` | 38 | AI 卡牌評分、屬性選擇、加權探險、策略目標選擇、威脅判斷、棄牌決策 |

### 測試命名規範

使用 snake_case 描述測試情境：

```typescript
it('should_return_true_when_stats_meet_requirement', () => { ... })
it('should_not_go_below_zero', () => { ... })
```

### 測試結構

```typescript
// Arrange
const player = createMockPlayer({ money: 1000 })

// Act
const updated = changeMoney(player, -500)

// Assert
expect(updated.money).toBe(500)
```

### 其他測試方式

1. **手動測試**: 完整玩一場 10 回合遊戲
2. **線上測試**: 多個瀏覽器視窗測試同步功能
3. **邊界測試**: 金錢不足、手牌上限等情況

---

## 未來擴展

1. AI 第三階段：個性 AI（攻擊型/防禦型/平衡型不同策略）
2. 加入婚姻系統
3. 加入商品區購物
4. 加入音效系統（金錢變化、回合提示等）
5. 優化 UI/UX（拖曳出牌、動畫效果）
6. 加入 Firebase Authentication（可選）
