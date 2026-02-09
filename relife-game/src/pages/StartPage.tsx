import { useState } from 'react'
import { characters } from '../data/characters'
import { changelog } from '../data/changelog'
import { useGameStore } from '../store/gameStore'

interface PlayerConfig {
  name: string
  characterId: string
  isAI: boolean
}

interface StartPageProps {
  onOnlineClick?: () => void
}

export const StartPage = ({ onOnlineClick }: StartPageProps) => {
  const { startGame } = useGameStore()

  // 初始只有一位人類玩家
  const [players, setPlayers] = useState<PlayerConfig[]>([
    { name: '玩家1', characterId: characters[0].id, isAI: false },
  ])

  const getNextAvailableCharacter = () => {
    const usedIds = players.map(p => p.characterId)
    return characters.find(c => !usedIds.includes(c.id))?.id || characters[0].id
  }

  const handleAddPlayer = () => {
    if (players.length >= 4) return
    const newIndex = players.length + 1
    setPlayers([
      ...players,
      {
        name: `玩家${newIndex}`,
        characterId: getNextAvailableCharacter(),
        isAI: false,
      },
    ])
  }

  const handleAddAI = () => {
    if (players.length >= 4) return
    const aiCount = players.filter(p => p.isAI).length + 1
    setPlayers([
      ...players,
      {
        name: `電腦${aiCount}`,
        characterId: getNextAvailableCharacter(),
        isAI: true,
      },
    ])
  }

  const handleRemovePlayer = (index: number) => {
    if (players.length <= 2) return
    setPlayers(players.filter((_, i) => i !== index))
  }

  const handleNameChange = (index: number, name: string) => {
    const newPlayers = [...players]
    newPlayers[index] = { ...newPlayers[index], name }
    setPlayers(newPlayers)
  }

  const handleCharacterChange = (index: number, characterId: string) => {
    const newPlayers = [...players]
    newPlayers[index] = { ...newPlayers[index], characterId }
    setPlayers(newPlayers)
  }

  const handleToggleAI = (index: number) => {
    const newPlayers = [...players]
    const wasAI = newPlayers[index].isAI
    newPlayers[index] = {
      ...newPlayers[index],
      isAI: !wasAI,
      name: wasAI ? `玩家${index + 1}` : `電腦${index + 1}`,
    }
    setPlayers(newPlayers)
  }

  const handleStartGame = () => {
    startGame(
      players.map(p => p.name),
      players.map(p => p.characterId),
      players.map(p => p.isAI)
    )
  }

  // 驗證
  const selectedCharacters = players.map(p => p.characterId)
  const hasDuplicateCharacters = new Set(selectedCharacters).size !== selectedCharacters.length
  const allAI = players.every(p => p.isAI)
  const notEnoughPlayers = players.length < 2
  const canAddMore = players.length < 4

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full">
        {/* Logo 和標題 */}
        <div className="text-center mb-8">
          <img
            src={import.meta.env.BASE_URL + "logo.png"}
            alt="ReLife 重生"
            className="h-20 mx-auto mb-4"
          />
          <p className="text-gray-400">人生只有一次，如果可以重來，你會怎麼選擇？</p>
        </div>

        {/* 玩家設定 */}
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">玩家設定</h2>
            <span className="text-gray-400 text-sm">{players.length}/4 位玩家</span>
          </div>

          {players.map((player, index) => (
            <div
              key={index}
              className="bg-gray-700 rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
            >
              {/* AI 切換 */}
              <button
                onClick={() => handleToggleAI(index)}
                className={`px-3 py-1 rounded text-sm font-bold transition-colors ${
                  player.isAI
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {player.isAI ? '🤖 電腦' : '👤 玩家'}
              </button>

              {/* 玩家名稱 */}
              <div className="flex-1 w-full sm:w-auto">
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  className="w-full bg-gray-600 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder={player.isAI ? '電腦名稱' : '玩家名稱'}
                />
              </div>

              {/* 角色選擇 */}
              <div className="flex-1 w-full sm:w-auto">
                <select
                  value={player.characterId}
                  onChange={(e) => handleCharacterChange(index, e.target.value)}
                  className="w-full bg-gray-600 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  {characters.map((char) => (
                    <option key={char.id} value={char.id}>
                      {char.name} (${char.initialMoney.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* 角色資訊 */}
              <div className="text-xs text-gray-400 w-full sm:w-24">
                {(() => {
                  const char = characters.find((c) => c.id === player.characterId)
                  if (!char) return null
                  return (
                    <div className="flex sm:flex-col gap-2 sm:gap-0">
                      <span>智:{char.initialStats.intelligence}</span>
                      <span>體:{char.initialStats.stamina}</span>
                      <span>魅:{char.initialStats.charisma}</span>
                    </div>
                  )
                })()}
              </div>

              {/* 移除按鈕 */}
              {players.length > 2 && (
                <button
                  onClick={() => handleRemovePlayer(index)}
                  className="text-red-400 hover:text-red-300 text-xl px-2"
                  title="移除"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* 新增玩家按鈕 */}
          {canAddMore && (
            <div className="flex gap-3">
              <button
                onClick={handleAddPlayer}
                className="flex-1 py-3 rounded-lg border-2 border-dashed border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors"
              >
                + 新增玩家 👤
              </button>
              <button
                onClick={handleAddAI}
                className="flex-1 py-3 rounded-lg border-2 border-dashed border-purple-600 text-purple-400 hover:border-purple-500 hover:text-purple-300 transition-colors"
              >
                + 新增電腦 🤖
              </button>
            </div>
          )}

          {/* 錯誤訊息 */}
          {hasDuplicateCharacters && (
            <div className="text-red-400 text-sm">
              ⚠️ 有重複選擇的角色，請調整
            </div>
          )}
          {allAI && (
            <div className="text-red-400 text-sm">
              ⚠️ 至少需要一位人類玩家
            </div>
          )}
          {notEnoughPlayers && (
            <div className="text-yellow-400 text-sm">
              ⚠️ 至少需要 2 位玩家才能開始遊戲
            </div>
          )}
        </div>

        {/* 開始按鈕 */}
        <div className="space-y-3">
          <button
            onClick={handleStartGame}
            disabled={hasDuplicateCharacters || allAI || notEnoughPlayers}
            className={`w-full py-4 rounded-lg font-bold text-xl transition-colors ${
              hasDuplicateCharacters || allAI || notEnoughPlayers
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-yellow-500 hover:bg-yellow-400 text-black'
            }`}
          >
            開始遊戲 ({players.length} 人)
          </button>

          {onOnlineClick && (
            <button
              onClick={onOnlineClick}
              className="w-full py-4 rounded-lg font-bold text-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              線上多人
            </button>
          )}
        </div>

        {/* 遊戲說明 */}
        <div className="mt-8 text-gray-400 text-sm space-y-3">
          <div>
            <h3 className="font-bold text-white mb-1">遊戲目標</h3>
            <p>30 回合後，總分最高的玩家獲勝。總分 = 金錢 + 屬性總和 × 100 + 職業加成 + 成就加成。</p>
          </div>
          <div>
            <h3 className="font-bold text-white mb-2">成就系統</h3>
            <p className="mb-2">金錢門檻成就（只取最高一級）：</p>
            <table className="w-full text-sm mb-3">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-600">
                  <th className="pb-1">成就</th>
                  <th className="pb-1">條件</th>
                  <th className="pb-1 text-right">加分</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr><td>人生贏家</td><td>金錢 ≥ $200,000</td><td className="text-right text-yellow-400">+25,000</td></tr>
                <tr><td>財富自由</td><td>金錢 ≥ $150,000</td><td className="text-right text-yellow-400">+18,000</td></tr>
                <tr><td>十萬富翁</td><td>金錢 ≥ $100,000</td><td className="text-right text-yellow-400">+12,000</td></tr>
                <tr><td>富裕人生</td><td>金錢 ≥ $80,000</td><td className="text-right text-yellow-400">+8,000</td></tr>
                <tr><td>小康生活</td><td>金錢 ≥ $50,000</td><td className="text-right text-yellow-400">+5,000</td></tr>
              </tbody>
            </table>
            <p className="mb-2">唯一成就（每場最多一人，平手則無人獲得）：</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-600">
                  <th className="pb-1">成就</th>
                  <th className="pb-1">條件</th>
                  <th className="pb-1 text-right">加分</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr><td>率先致富</td><td>第一個存到 $100,000</td><td className="text-right text-yellow-400">+10,000</td></tr>
                <tr><td>首富</td><td>擁有最多金錢</td><td className="text-right text-yellow-400">+5,000</td></tr>
                <tr><td>第一個就業</td><td>最早獲得職業</td><td className="text-right text-yellow-400">+3,000</td></tr>
                <tr><td>先驅者</td><td>第一個升遷</td><td className="text-right text-yellow-400">+5,000</td></tr>
                <tr><td>轉職達人</td><td>轉職次數最多</td><td className="text-right text-yellow-400">+3,000</td></tr>
                <tr><td>大器晚成</td><td>最晚獲得職業</td><td className="text-right text-yellow-400">+5,000</td></tr>
                <tr><td>躺平高手</td><td>全場從未就業</td><td className="text-right text-yellow-400">+8,000</td></tr>
              </tbody>
            </table>
            <p className="mb-2 mt-3">個人夢想成就（達成角色的夢想 +8,000）：</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-600">
                  <th className="pb-1">角色</th>
                  <th className="pb-1">夢想</th>
                  <th className="pb-1">判定條件</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr><td>鄭安琪</td><td>當工程師</td><td>職業為工程師</td></tr>
                <tr><td>姚欣蓓</td><td>賺到 $100,000</td><td>金錢 ≥ $100,000</td></tr>
                <tr><td>許睿和</td><td>當知名魔術師</td><td>魔術師且職等 ≥ 2</td></tr>
                <tr><td>梁思妤</td><td>當醫生</td><td>職業為醫生</td></tr>
                <tr><td>吳欣怡</td><td>智力 &gt; 30</td><td>智力超過 30</td></tr>
                <tr><td>莊語澄</td><td>歌手</td><td>職業為歌手</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="font-bold text-white mb-1">遊戲人數</h3>
            <p>支援 2-4 人，可自由搭配人類與電腦玩家</p>
          </div>
          <div>
            <h3 className="font-bold text-white mb-1">遊戲規則</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>每回合流程：事件 → 發薪 → 行動 → 抽牌</li>
              <li>行動階段可出牌（學力卡、工作卡、功能卡）或應徵職業</li>
              <li>有工作可領薪水，績效達標可升遷加薪</li>
              <li>功能卡可偷竊、搶劫、陷害其他玩家，也可用「無效」卡反制</li>
              <li>手牌上限 10 張，超過需自行選擇丟棄</li>
            </ul>
          </div>
        </div>

        {/* 版本紀錄 */}
        <details className="mt-6">
          <summary className="text-gray-400 text-sm cursor-pointer hover:text-gray-300 transition-colors">
            版本紀錄
          </summary>
          <div className="mt-3 space-y-4 text-gray-400 text-sm">
            {changelog.map((release) => (
              <div key={release.version}>
                <h4 className="font-bold text-white">
                  {release.version}{' '}
                  <span className="font-normal text-gray-500">{release.date}</span>
                </h4>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {release.changes.map((change, i) => (
                    <li key={i}>{change}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  )
}
