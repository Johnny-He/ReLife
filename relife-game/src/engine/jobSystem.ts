import type { Player, Job } from '../types'
import { jobs, canApplyForJob } from '../data'

// === 職業系統 ===

// 檢查玩家是否可以應徵某職業
export const canPlayerApplyForJob = (player: Player, jobId: string): boolean => {
  const job = jobs.find((j) => j.id === jobId)
  if (!job) return false

  return canApplyForJob(player.stats, job, 0)
}

// 取得玩家可以應徵的職業列表
export const getAvailableJobs = (player: Player): Job[] => {
  return jobs.filter((job) => canApplyForJob(player.stats, job, 0))
}

// 應徵職業
export const applyForJob = (player: Player, jobId: string): Player => {
  const job = jobs.find((j) => j.id === jobId)
  if (!job) return player

  if (!canApplyForJob(player.stats, job, 0)) {
    return player  // 不符合資格
  }

  return {
    ...player,
    job,
    jobLevel: 0,
    performance: 0,
  }
}

// 轉職（放棄原職業）
export const quitJob = (player: Player): Player => {
  return {
    ...player,
    job: null,
    jobLevel: 0,
    performance: 0,
  }
}

// 檢查是否可以升遷
export const canPromote = (player: Player): boolean => {
  if (!player.job) return false
  if (player.jobLevel >= 2) return false  // 已經是最高等級

  const nextLevel = player.jobLevel + 1
  const required = player.job.levels[nextLevel].requiredStats

  // 檢查績效要求：升到等級 1 需要績效 3，升到等級 2 需要績效 6
  const requiredPerformance = nextLevel * 3
  if (player.performance < requiredPerformance) return false

  // 檢查能力值要求
  return (
    (required.intelligence === undefined || player.stats.intelligence >= required.intelligence) &&
    (required.stamina === undefined || player.stats.stamina >= required.stamina) &&
    (required.charisma === undefined || player.stats.charisma >= required.charisma)
  )
}

// 執行升遷
export const promote = (player: Player): Player => {
  if (!canPromote(player)) return player

  return {
    ...player,
    jobLevel: player.jobLevel + 1,
  }
}

// 計算薪水
export const calculateSalary = (player: Player): number => {
  if (!player.job) return 0

  const level = player.job.levels[player.jobLevel]
  const salaryArray = level.salary

  // 根據績效決定在該等級中的薪水檔次
  // 等級 0: 績效 0-2 對應 salary[0-2]
  // 等級 1: 績效 3-5 對應 salary[0-2]
  // 等級 2: 績效 6-9 對應 salary[0-3]
  const basePerformance = player.jobLevel * 3
  const relativePerformance = player.performance - basePerformance
  const salaryIndex = Math.min(relativePerformance, salaryArray.length - 1)

  return salaryArray[Math.max(0, salaryIndex)]
}

// 發薪水
export const paySalary = (player: Player): Player => {
  const salary = calculateSalary(player)
  if (salary === 0) return player

  return {
    ...player,
    money: player.money + salary,
  }
}

// 取得職業顯示名稱（包含等級）
export const getJobDisplayName = (player: Player): string => {
  if (!player.job) return '無業'
  return player.job.levels[player.jobLevel].name
}

// 應用職業技能效果（每回合自動觸發）
export const applyJobSkillEffect = (player: Player): Player => {
  if (!player.job) return player

  switch (player.job.id) {
    // 智力型
    case 'teacher':
      // 老師：每回合智力 +1
      return {
        ...player,
        stats: { ...player.stats, intelligence: player.stats.intelligence + 1 },
      }

    // 體力型
    case 'worker':
    case 'farmer':
      // 工人/農夫：每回合體力 +1
      return {
        ...player,
        stats: { ...player.stats, stamina: player.stats.stamina + 1 },
      }

    // 魅力型
    case 'singer':
      // 歌手：每回合魅力 +1
      return {
        ...player,
        stats: { ...player.stats, charisma: player.stats.charisma + 1 },
      }

    default:
      return player
  }
}
