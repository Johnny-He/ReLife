import { useGameStore } from '../store/gameStore'

export const ResultPage = () => {
  const { getGameResult, resetGame } = useGameStore()

  const result = getGameResult()
  if (!result) return null

  const medals = ['🥇', '🥈', '🥉', '']

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full">
        {/* Logo 和標題 */}
        <div className="text-center mb-8">
          <img
            src={import.meta.env.BASE_URL + "logo.png"}
            alt="ReLife"
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-white mb-2">遊戲結束</h1>
          {result.winner && (
            <p className="text-yellow-400 text-lg font-semibold mb-1">
              {result.winner.name} 獲勝！
            </p>
          )}
          <p className="text-gray-400">
            {result.winReason === 'money_threshold'
              ? '率先達到 $20,000！'
              : '最終結算分數最高'}
          </p>
        </div>

        {/* 排名 */}
        <div className="space-y-4 mb-8">
          {result.rankings.map((ranking, index) => (
            <div
              key={ranking.player.id}
              className={`rounded-lg p-4 ${
                index === 0
                  ? 'bg-yellow-900/50 border-2 border-yellow-500'
                  : 'bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* 左側：排名和玩家資訊 */}
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{medals[index] || `#${ranking.rank}`}</div>
                  <div>
                    <div className="text-white font-bold text-lg">
                      {ranking.player.name}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {ranking.player.character.name}
                    </div>
                  </div>
                </div>

                {/* 右側：總分 */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-400">
                    {ranking.score.total.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-xs">總分</div>
                </div>
              </div>

              {/* 分數明細 */}
              <div className="mt-3 pt-3 border-t border-gray-600 grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">金錢</div>
                  <div className="text-white">${ranking.score.money.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-400">屬性加成</div>
                  <div className="text-white">{ranking.score.stats.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-400">職業加成</div>
                  <div className="text-white">{ranking.score.jobBonus.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-400">成就加成</div>
                  <div className="text-white">{ranking.score.achievements.toLocaleString()}</div>
                </div>
              </div>

              {/* 成就標籤 */}
              {ranking.achievements.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600 flex flex-wrap gap-2">
                  {ranking.achievements.map((achievement) => (
                    <span
                      key={achievement.id}
                      className="bg-yellow-600/30 text-yellow-300 text-xs px-2 py-1 rounded-full border border-yellow-500/50"
                      title={achievement.description}
                    >
                      {achievement.name} (+{achievement.score.toLocaleString()})
                    </span>
                  ))}
                </div>
              )}

              {/* 最終狀態 */}
              <div className="mt-3 pt-3 border-t border-gray-600 flex gap-4 text-xs text-gray-400">
                <span>智力: {ranking.player.stats.intelligence}</span>
                <span>體力: {ranking.player.stats.stamina}</span>
                <span>魅力: {ranking.player.stats.charisma}</span>
                <span>
                  職業: {ranking.player.job ? ranking.player.job.levels[ranking.player.jobLevel].name : '無業'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 再玩一次 */}
        <button
          onClick={resetGame}
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-lg transition-colors"
        >
          再玩一次
        </button>
      </div>
    </div>
  )
}
