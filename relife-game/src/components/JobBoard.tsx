import { useGameStore } from '../store/gameStore'
import { getJobsByCategory } from '../data/jobs'
import { canPromote } from '../engine/jobSystem'

interface JobBoardProps {
  disabled?: boolean
}

export const JobBoard = ({ disabled = false }: JobBoardProps) => {
  const {
    phase,
    getCurrentPlayer,
    getAvailableJobsForCurrentPlayer,
    applyJob,
    tryPromote,
  } = useGameStore()

  const currentPlayer = getCurrentPlayer()
  if (!currentPlayer) return null

  const availableJobs = getAvailableJobsForCurrentPlayer()
  const canPlayerPromote = canPromote(currentPlayer)
  const jobsByCategory = getJobsByCategory()

  const categoryNames = {
    intelligence: { name: '智力型', color: 'text-blue-400', bg: 'bg-blue-900/30' },
    stamina: { name: '體力型', color: 'text-red-400', bg: 'bg-red-900/30' },
    charisma: { name: '魅力型', color: 'text-pink-400', bg: 'bg-pink-900/30' },
  }

  if (phase !== 'action') {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white font-bold mb-2">職業板</h3>
        <div className="text-gray-400 text-sm">行動階段才能應徵職業</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white font-bold mb-3">職業板</h3>

      {/* 目前職業狀態 */}
      {currentPlayer.job ? (
        <div className="mb-4 p-3 bg-gray-700 rounded">
          <div className="text-sm text-gray-400">目前職業</div>
          <div className="text-white font-bold">
            {currentPlayer.job.levels[currentPlayer.jobLevel].name}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {currentPlayer.job.skill}
          </div>
          <div className="text-sm text-gray-300 mt-1">
            績效: {currentPlayer.performance}/9
          </div>
          {canPlayerPromote && !disabled && (
            <button
              onClick={tryPromote}
              className="mt-2 bg-green-600 hover:bg-green-500 text-white text-sm px-3 py-1 rounded w-full"
            >
              升遷！
            </button>
          )}
        </div>
      ) : (
        <div className="mb-4 text-gray-400 text-sm">目前無業</div>
      )}

      {/* 可應徵的職業 */}
      {!currentPlayer.job && (
        <div>
          <div className="text-sm text-gray-400 mb-2">
            可應徵的職業 ({availableJobs.length})：
          </div>
          {availableJobs.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableJobs.map((job) => {
                const cat = categoryNames[job.category]
                return (
                  <button
                    key={job.id}
                    onClick={() => applyJob(job.id)}
                    disabled={disabled}
                    className={`w-full text-left p-2 ${cat.bg} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-125'} rounded transition-all`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold">{job.levels[0].name}</span>
                      <span className={`text-xs ${cat.color}`}>{cat.name}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      薪水: ${job.levels[0].salary[0].toLocaleString()}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">
              能力值不足，無法應徵任何職業
            </div>
          )}
        </div>
      )}

      {/* 所有職業需求 */}
      <details className="mt-4">
        <summary className="text-gray-400 text-xs cursor-pointer hover:text-gray-300">
          查看所有職業需求
        </summary>
        <div className="mt-2 space-y-3 text-xs max-h-64 overflow-y-auto">
          {(['intelligence', 'stamina', 'charisma'] as const).map((category) => {
            const cat = categoryNames[category]
            return (
              <div key={category}>
                <div className={`${cat.color} font-bold mb-1`}>{cat.name}</div>
                <div className="space-y-1">
                  {jobsByCategory[category].map((job) => {
                    const req = job.levels[0].requiredStats
                    const isAvailable = availableJobs.some((j) => j.id === job.id)
                    return (
                      <div
                        key={job.id}
                        className={`p-2 rounded ${isAvailable ? cat.bg : 'bg-gray-900'}`}
                      >
                        <div className="flex justify-between">
                          <span className={isAvailable ? 'text-white' : 'text-gray-500'}>
                            {job.name}
                          </span>
                          <span className="text-gray-500">
                            ${job.levels[0].salary[0].toLocaleString()}
                          </span>
                        </div>
                        <div className="text-gray-500">
                          {req.intelligence ? `智${req.intelligence} ` : ''}
                          {req.stamina ? `體${req.stamina} ` : ''}
                          {req.charisma ? `魅${req.charisma}` : ''}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </details>
    </div>
  )
}
