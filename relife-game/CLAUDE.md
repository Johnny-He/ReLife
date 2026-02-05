# ReLife 重生 - 開發指南

## 專案概述

Web 版桌遊「ReLife 重生」- 人生模擬類策略卡牌遊戲

- **技術棧**: React 18 + TypeScript + Vite + Zustand + Tailwind CSS
- **目標**: 本地多人 MVP（4人固定）
- **語言**: 繁體中文介面

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
src/
├── types/           # 型別定義
├── data/            # 靜態資料（角色、卡牌、職業、事件）
├── engine/          # 遊戲邏輯（純函數）
├── store/           # Zustand 狀態管理
├── components/      # React 元件
└── pages/           # 頁面元件
```

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

---

## 遊戲流程

```
遊戲開始
    ↓
每回合 (1-10):
    1. 事件階段 (event)     → 觸發回合事件
    2. 發薪階段 (salary)    → 有工作者領薪水
    3. 行動階段 (action)    → 玩家輪流出牌
    4. 抽牌階段 (draw)      → 每人抽 2 張
    5. 回合結束 (end_turn)  → 切換到下一回合
    ↓
遊戲結束 → 計分 → 顯示排名
```

---

## MVP 範圍

### 包含
- 4 個角色（陳建志、鄭安琪、陳東明、柯若亞）
- 3 種職業（律師、工人、歌手）
- 10 回合
- 約 40 張卡牌
- 3 個探險地點
- 基本事件系統

### 暫不包含
- 婚姻系統
- 商品區購物
- 完整 15 個角色
- 完整 12 種職業

---

## 測試策略

1. **Engine 單元測試**: 使用 Vitest 測試純函數邏輯
2. **手動測試**: 完整玩一場 10 回合遊戲
3. **邊界測試**: 金錢不足、手牌上限等情況

---

## 常用指令

```bash
npm run dev      # 啟動開發伺服器
npm run build    # 建置生產版本
npm run test     # 執行測試
npm run lint     # 程式碼檢查
```

---

## 未來擴展

1. 加入完整內容（角色、職業、卡牌）
2. 加入婚姻系統
3. 線上多人（WebSocket + 房間系統）
