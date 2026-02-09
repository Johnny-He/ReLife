import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../store/gameStore'
import {
  aiChooseCard,
  aiChooseStat,
  aiChooseExploreLocation,
  aiChooseTargetPlayer,
  aiShouldUseInvalidCard,
  aiChooseJob,
  aiChooseParachuteJob,
  aiChooseDiscardCards,
  AI_ACTION_DELAY,
} from '../engine/aiPlayer'

/**
 * 處理 AI 玩家自動行動的 Hook
 * 監聯遊戲狀態，當輪到 AI 時自動執行動作
 * @param disabled - 設為 true 時停用 AI（例如線上模式）
 */
export const useAIPlayer = (disabled: boolean = false) => {
  const {
    players,
    currentPlayerIndex,
    phase,
    pendingStatChoice,
    pendingExplore,
    pendingTargetPlayer,
    pendingParachute,
    pendingFunctionCard,
    pendingDiscard,
  } = useGameStore(useShallow(s => ({
    players: s.players,
    currentPlayerIndex: s.currentPlayerIndex,
    phase: s.phase,
    pendingStatChoice: s.pendingStatChoice,
    pendingExplore: s.pendingExplore,
    pendingTargetPlayer: s.pendingTargetPlayer,
    pendingParachute: s.pendingParachute,
    pendingFunctionCard: s.pendingFunctionCard,
    pendingDiscard: s.pendingDiscard,
  })))
  const selectCard = useGameStore(s => s.selectCard)
  const playSelectedCard = useGameStore(s => s.playSelectedCard)
  const chooseStat = useGameStore(s => s.chooseStat)
  const chooseExploreLocation = useGameStore(s => s.chooseExploreLocation)
  const chooseTargetPlayer = useGameStore(s => s.chooseTargetPlayer)
  const applyParachute = useGameStore(s => s.applyParachute)
  const passReaction = useGameStore(s => s.passReaction)
  const applyInvalidCard = useGameStore(s => s.applyInvalidCard)
  const applyJob = useGameStore(s => s.applyJob)
  const endPlayerTurn = useGameStore(s => s.endPlayerTurn)
  const toggleDiscardCard = useGameStore(s => s.toggleDiscardCard)
  const confirmDiscard = useGameStore(s => s.confirmDiscard)

  // 用 ref 追蹤是否正在執行 AI 動作，避免重複觸發
  const isProcessingRef = useRef(false)
  // 所有 AI timer（含巢狀）統一追蹤，cleanup 時全部清除
  const pendingTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  const scheduleTimer = (callback: () => void, delay: number) => {
    const id = setTimeout(() => {
      pendingTimers.current.delete(id)
      callback()
    }, delay)
    pendingTimers.current.add(id)
    return id
  }

  const clearAllTimers = () => {
    pendingTimers.current.forEach(id => clearTimeout(id))
    pendingTimers.current.clear()
  }

  // 清理所有 timeout
  useEffect(() => {
    return () => clearAllTimers()
  }, [])

  // 取得當前玩家
  const currentPlayer = players[currentPlayerIndex]
  const isCurrentPlayerAI = currentPlayer?.isAI === true

  // 處理 AI 在行動階段的出牌
  useEffect(() => {
    if (disabled) return
    if (!isCurrentPlayerAI || phase !== 'action' || isProcessingRef.current) return
    if (pendingStatChoice || pendingExplore || pendingTargetPlayer || pendingParachute || pendingFunctionCard || pendingDiscard) return

    isProcessingRef.current = true

    scheduleTimer(() => {
      const state = useGameStore.getState()
      const player = state.players[state.currentPlayerIndex]

      if (!player?.isAI) {
        isProcessingRef.current = false
        return
      }

      // AI 決定出牌或跳過
      const cardIndex = aiChooseCard(player)

      if (cardIndex !== null) {
        // 選擇並使用卡牌
        selectCard(cardIndex)
        scheduleTimer(() => {
          playSelectedCard()

          // 檢查是否需要進一步互動（選屬性、探險、選目標、反應卡）
          const afterState = useGameStore.getState()
          const needsMoreInput = afterState.pendingStatChoice ||
            afterState.pendingExplore ||
            afterState.pendingTargetPlayer ||
            afterState.pendingParachute ||
            afterState.pendingFunctionCard

          if (!needsMoreInput) {
            // 直接生效的卡，結束回合
            scheduleTimer(() => {
              endPlayerTurn()
              isProcessingRef.current = false
            }, AI_ACTION_DELAY)
          } else {
            // 需要進一步互動，交給對應的 useEffect 處理
            isProcessingRef.current = false
          }
        }, 200)
      } else {
        // 嘗試應徵工作
        const jobId = aiChooseJob(player)
        if (jobId) {
          applyJob(jobId)
          scheduleTimer(() => {
            endPlayerTurn()
            isProcessingRef.current = false
          }, AI_ACTION_DELAY)
        } else {
          // 跳過回合
          endPlayerTurn()
          isProcessingRef.current = false
        }
      }
    }, AI_ACTION_DELAY)

    return () => clearAllTimers()
  }, [
    disabled,
    isCurrentPlayerAI,
    phase,
    pendingStatChoice,
    pendingExplore,
    pendingTargetPlayer,
    pendingParachute,
    pendingFunctionCard,
    pendingDiscard,
    currentPlayerIndex,
    selectCard,
    playSelectedCard,
    applyJob,
    endPlayerTurn,
  ])

  // 處理 AI 選擇屬性
  useEffect(() => {
    if (disabled) return
    if (!isCurrentPlayerAI || !pendingStatChoice || isProcessingRef.current) return

    isProcessingRef.current = true

    scheduleTimer(() => {
      const state = useGameStore.getState()
      const player = state.players[state.currentPlayerIndex]

      if (!player?.isAI || !state.pendingStatChoice) {
        isProcessingRef.current = false
        return
      }

      const stat = aiChooseStat(player)
      chooseStat(stat)
      endPlayerTurn()
      isProcessingRef.current = false
    }, AI_ACTION_DELAY)

    return () => clearAllTimers()
  }, [disabled, isCurrentPlayerAI, pendingStatChoice, chooseStat, endPlayerTurn])

  // 處理 AI 選擇探險地點
  useEffect(() => {
    if (disabled) return
    if (!isCurrentPlayerAI || !pendingExplore || isProcessingRef.current) return

    isProcessingRef.current = true

    scheduleTimer(() => {
      const state = useGameStore.getState()
      const player = state.players[state.currentPlayerIndex]

      if (!player?.isAI || !state.pendingExplore) {
        isProcessingRef.current = false
        return
      }

      const locationId = aiChooseExploreLocation()
      chooseExploreLocation(locationId)
      endPlayerTurn()
      isProcessingRef.current = false
    }, AI_ACTION_DELAY)

    return () => clearAllTimers()
  }, [disabled, isCurrentPlayerAI, pendingExplore, chooseExploreLocation, endPlayerTurn])

  // 處理 AI 選擇目標玩家
  useEffect(() => {
    if (disabled) return
    if (!isCurrentPlayerAI || !pendingTargetPlayer || isProcessingRef.current) return

    isProcessingRef.current = true

    scheduleTimer(() => {
      const state = useGameStore.getState()
      const player = state.players[state.currentPlayerIndex]

      if (!player?.isAI || !state.pendingTargetPlayer) {
        isProcessingRef.current = false
        return
      }

      const targetId = aiChooseTargetPlayer(
        state.players,
        state.currentPlayerIndex,
        state.pendingTargetPlayer.action
      )

      if (targetId) {
        chooseTargetPlayer(targetId)
      }
      endPlayerTurn()
      isProcessingRef.current = false
    }, AI_ACTION_DELAY)

    return () => clearAllTimers()
  }, [disabled, isCurrentPlayerAI, pendingTargetPlayer, chooseTargetPlayer, endPlayerTurn])

  // 處理 AI 空降選職業
  useEffect(() => {
    if (disabled) return
    if (!isCurrentPlayerAI || !pendingParachute || isProcessingRef.current) return

    isProcessingRef.current = true

    scheduleTimer(() => {
      const state = useGameStore.getState()
      const player = state.players[state.currentPlayerIndex]

      if (!player?.isAI || !state.pendingParachute) {
        isProcessingRef.current = false
        return
      }

      const jobId = aiChooseParachuteJob()
      if (jobId) {
        applyParachute(jobId)
      }
      endPlayerTurn()
      isProcessingRef.current = false
    }, AI_ACTION_DELAY)

    return () => clearAllTimers()
  }, [disabled, isCurrentPlayerAI, pendingParachute, applyParachute, endPlayerTurn])

  // 處理 AI 棄牌（手牌超過上限時）
  useEffect(() => {
    if (disabled) return
    if (!pendingDiscard || isProcessingRef.current) return

    const discardingPlayer = players[pendingDiscard.playerIndex]
    if (!discardingPlayer?.isAI) return

    isProcessingRef.current = true

    scheduleTimer(() => {
      const state = useGameStore.getState()
      if (!state.pendingDiscard) {
        isProcessingRef.current = false
        return
      }

      const player = state.players[state.pendingDiscard.playerIndex]
      if (!player?.isAI) {
        isProcessingRef.current = false
        return
      }

      const cardIndices = aiChooseDiscardCards(player, state.pendingDiscard.discardCount)
      // 逐一選取要棄的牌
      cardIndices.forEach(idx => toggleDiscardCard(idx))
      // 確認棄牌
      scheduleTimer(() => {
        confirmDiscard()
        isProcessingRef.current = false
      }, 300)
    }, AI_ACTION_DELAY)

    return () => clearAllTimers()
  }, [disabled, pendingDiscard, players, toggleDiscardCard, confirmDiscard])

  // 處理 AI 回應功能卡（無效卡決策）— 這不是 AI 自己的回合，不需要 endPlayerTurn
  useEffect(() => {
    if (disabled) return
    if (!pendingFunctionCard || isProcessingRef.current) return

    const respondingPlayer = players[pendingFunctionCard.respondingPlayerIndex]
    if (!respondingPlayer?.isAI) return

    isProcessingRef.current = true

    scheduleTimer(() => {
      const state = useGameStore.getState()
      if (!state.pendingFunctionCard) {
        isProcessingRef.current = false
        return
      }

      const responder = state.players[state.pendingFunctionCard.respondingPlayerIndex]
      if (!responder?.isAI) {
        isProcessingRef.current = false
        return
      }

      // 檢查是否有無效卡
      const invalidCardIndex = (responder.hand ?? []).findIndex(
        card => card.effect.type === 'special' && card.effect.handler === 'invalid'
      )

      if (invalidCardIndex !== -1) {
        const chainLength = (state.pendingFunctionCard.invalidChain ?? []).length
        const isSource = state.pendingFunctionCard.respondingPlayerIndex === state.pendingFunctionCard.sourcePlayerIndex
        let shouldUse = false

        if (isSource && chainLength % 2 === 1) {
          // AI 是功能卡使用者且卡牌被取消 → 一定反制
          shouldUse = true
        } else if (!isSource && chainLength % 2 === 0) {
          // 卡牌目前生效，AI 評估威脅決定是否取消
          shouldUse = aiShouldUseInvalidCard(
            state.pendingFunctionCard.card,
            responder
          )
        }
        // 其他情況（AI是source但卡片生效、AI不是source但卡片已取消）→ 不需反制

        if (shouldUse) {
          applyInvalidCard(invalidCardIndex)
        } else {
          passReaction()
        }
      } else {
        passReaction()
      }

      isProcessingRef.current = false
    }, AI_ACTION_DELAY)

    return () => clearAllTimers()
  }, [disabled, pendingFunctionCard, players, applyInvalidCard, passReaction])
}
