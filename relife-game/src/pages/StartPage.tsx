import { useState } from 'react'
import { characters } from '../data/characters'
import { useGameStore } from '../store/gameStore'

export const StartPage = () => {
  const { startGame } = useGameStore()

  const [playerNames, setPlayerNames] = useState(['玩家1', '玩家2', '玩家3', '玩家4'])
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([
    characters[0].id,
    characters[1].id,
    characters[2].id,
    characters[3].id,
  ])

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...playerNames]
    newNames[index] = name
    setPlayerNames(newNames)
  }

  const handleCharacterChange = (index: number, characterId: string) => {
    const newCharacters = [...selectedCharacters]
    newCharacters[index] = characterId
    setSelectedCharacters(newCharacters)
  }

  const handleStartGame = () => {
    startGame(playerNames, selectedCharacters)
  }

  // 檢查是否有重複選擇的角色
  const hasDuplicateCharacters = new Set(selectedCharacters).size !== selectedCharacters.length

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full">
        {/* Logo 和標題 */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="ReLife 重生"
            className="h-20 mx-auto mb-4"
          />
          <p className="text-gray-400">人生只有一次，如果可以重來，你會怎麼選擇？</p>
        </div>

        {/* 玩家設定 */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-bold text-white">玩家設定</h2>

          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="bg-gray-700 rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
            >
              {/* 玩家名稱 */}
              <div className="flex-1 w-full sm:w-auto">
                <label className="block text-gray-400 text-sm mb-1">
                  玩家 {index + 1}
                </label>
                <input
                  type="text"
                  value={playerNames[index]}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  className="w-full bg-gray-600 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              {/* 角色選擇 */}
              <div className="flex-1 w-full sm:w-auto">
                <label className="block text-gray-400 text-sm mb-1">角色</label>
                <select
                  value={selectedCharacters[index]}
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
              <div className="text-xs text-gray-400 w-full sm:w-32">
                {(() => {
                  const char = characters.find((c) => c.id === selectedCharacters[index])
                  if (!char) return null
                  return (
                    <>
                      <div>智:{char.initialStats.intelligence}</div>
                      <div>體:{char.initialStats.stamina}</div>
                      <div>魅:{char.initialStats.charisma}</div>
                    </>
                  )
                })()}
              </div>
            </div>
          ))}

          {hasDuplicateCharacters && (
            <div className="text-red-400 text-sm">
              ⚠️ 有重複選擇的角色，請調整
            </div>
          )}
        </div>

        {/* 開始按鈕 */}
        <button
          onClick={handleStartGame}
          disabled={hasDuplicateCharacters}
          className={`w-full py-4 rounded-lg font-bold text-xl transition-colors ${
            hasDuplicateCharacters
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-yellow-500 hover:bg-yellow-400 text-black'
          }`}
        >
          開始遊戲
        </button>

        {/* 遊戲說明 */}
        <div className="mt-8 text-gray-400 text-sm">
          <h3 className="font-bold text-white mb-2">遊戲說明</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>每回合會觸發事件，然後發薪水</li>
            <li>行動階段可以出牌或應徵職業</li>
            <li>提升屬性可以解鎖更好的職業</li>
            <li>遊戲共 10 回合，最後計算總分</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
