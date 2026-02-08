import { useState, useEffect } from 'react'
import { useRoomStore } from '../store/roomStore'
import { characters } from '../data/characters'
import { cleanupOldRooms } from '../firebase/roomService'

interface LobbyPageProps {
  onStartGame: () => void
  onBack: () => void
}

export const LobbyPage = ({ onStartGame, onBack }: LobbyPageProps) => {
  const {
    roomId,
    room,
    error,
    createNewRoom,
    joinExistingRoom,
    leaveCurrentRoom,
    toggleReady,
    changeCharacter,
    startOnlineGame,
    getCurrentPlayer,
    isHost,
    canStartGame,
  } = useRoomStore()

  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu')
  const [playerName, setPlayerName] = useState('')
  const [selectedCharacter, setSelectedCharacter] = useState(characters[0].id)
  const [joinRoomId, setJoinRoomId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 進入大廳時清理舊房間
  useEffect(() => {
    cleanupOldRooms().catch(console.error)
  }, [])

  // 在房間中
  if (roomId && room) {
    const currentPlayer = getCurrentPlayer()

    const handleStartGame = async () => {
      setIsLoading(true)
      const success = await startOnlineGame()
      if (success) {
        onStartGame()
      }
      setIsLoading(false)
    }

    const handleLeave = async () => {
      await leaveCurrentRoom()
      setMode('menu')
    }

    // 取得已被選擇的角色
    const takenCharacterIds = room.players
      .filter(p => p.id !== currentPlayer?.id)
      .map(p => p.characterId)

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
          {/* 房間資訊 */}
          <div className="text-center mb-6">
            <h2 className="text-white text-xl font-bold mb-2">房間代碼</h2>
            <div className="bg-gray-700 rounded-lg p-4">
              <span className="text-yellow-400 text-3xl font-mono tracking-widest">
                {roomId}
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-2">把代碼分享給朋友加入</p>
          </div>

          {/* 玩家列表 */}
          <div className="mb-6">
            <h3 className="text-white font-bold mb-3">
              玩家 ({room.players.length}/4)
            </h3>
            <div className="space-y-2">
              {room.players.map((player) => {
                const char = characters.find(c => c.id === player.characterId)
                const isMe = player.id === currentPlayer?.id
                const isRoomHost = player.id === room.hostId

                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-lg flex items-center justify-between ${
                      isMe ? 'bg-blue-900/50 border border-blue-500' : 'bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold">
                        {player.name}
                        {isMe && <span className="text-blue-400 text-sm ml-1">(你)</span>}
                        {isRoomHost && <span className="text-yellow-400 text-sm ml-1">👑</span>}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {char?.name}
                      </span>
                    </div>
                    <div>
                      {player.ready ? (
                        <span className="text-green-400 text-sm">✓ 已準備</span>
                      ) : (
                        <span className="text-gray-500 text-sm">等待中...</span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* 空位 */}
              {Array.from({ length: 4 - room.players.length }).map((_, i) => (
                <div key={`empty-${i}`} className="p-3 rounded-lg bg-gray-700/50 border border-dashed border-gray-600">
                  <span className="text-gray-500">等待玩家加入...</span>
                </div>
              ))}
            </div>
          </div>

          {/* 角色選擇（自己） */}
          {currentPlayer && (
            <div className="mb-6">
              <h3 className="text-white font-bold mb-3">選擇角色</h3>
              <div className="grid grid-cols-2 gap-2">
                {characters.map((char) => {
                  const isTaken = takenCharacterIds.includes(char.id)
                  const isSelected = currentPlayer.characterId === char.id

                  return (
                    <button
                      key={char.id}
                      onClick={() => !isTaken && changeCharacter(char.id)}
                      disabled={isTaken || currentPlayer.ready}
                      className={`p-2 rounded text-left text-sm ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : isTaken
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                      }`}
                    >
                      <div className="font-bold">{char.name}</div>
                      <div className="text-xs opacity-75">
                        ${char.initialMoney.toLocaleString()}
                        {isTaken && ' (已選)'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 錯誤訊息 */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* 按鈕 */}
          <div className="space-y-2">
            {isHost() ? (
              <button
                onClick={handleStartGame}
                disabled={!canStartGame() || isLoading}
                className={`w-full py-3 rounded-lg font-bold ${
                  canStartGame()
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? '開始中...' : canStartGame() ? '開始遊戲' : '等待所有玩家準備'}
              </button>
            ) : (
              <button
                onClick={toggleReady}
                className={`w-full py-3 rounded-lg font-bold ${
                  currentPlayer?.ready
                    ? 'bg-gray-600 hover:bg-gray-500 text-white'
                    : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
              >
                {currentPlayer?.ready ? '取消準備' : '準備'}
              </button>
            )}

            <button
              onClick={handleLeave}
              className="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300"
            >
              離開房間
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 選單
  if (mode === 'menu') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm">
          <h2 className="text-white text-2xl font-bold text-center mb-6">線上多人</h2>

          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
            >
              建立房間
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold"
            >
              加入房間
            </button>
            <button
              onClick={onBack}
              className="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 建立房間
  if (mode === 'create') {
    const handleCreate = async () => {
      if (!playerName.trim()) return
      setIsLoading(true)
      await createNewRoom(playerName.trim(), selectedCharacter)
      setIsLoading(false)
    }

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm">
          <h2 className="text-white text-xl font-bold text-center mb-6">建立房間</h2>

          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">你的名稱</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="輸入名稱"
                className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                maxLength={10}
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm block mb-1">選擇角色</label>
              <select
                value={selectedCharacter}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                {characters.map((char) => (
                  <option key={char.id} value={char.id}>
                    {char.name} (${char.initialMoney.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={!playerName.trim() || isLoading}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isLoading ? '建立中...' : '建立'}
            </button>

            <button
              onClick={() => setMode('menu')}
              className="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 加入房間
  if (mode === 'join') {
    const handleJoin = async () => {
      if (!playerName.trim() || !joinRoomId.trim()) return
      setIsLoading(true)
      const success = await joinExistingRoom(joinRoomId.trim(), playerName.trim(), selectedCharacter)
      setIsLoading(false)
      if (!success) {
        // error 已經被設定在 store 中
      }
    }

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm">
          <h2 className="text-white text-xl font-bold text-center mb-6">加入房間</h2>

          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">房間代碼</label>
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="輸入 6 位數代碼"
                className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none text-center text-xl tracking-widest"
                maxLength={6}
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm block mb-1">你的名稱</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="輸入名稱"
                className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                maxLength={10}
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm block mb-1">選擇角色</label>
              <select
                value={selectedCharacter}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                {characters.map((char) => (
                  <option key={char.id} value={char.id}>
                    {char.name} (${char.initialMoney.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={!playerName.trim() || !joinRoomId.trim() || isLoading}
              className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isLoading ? '加入中...' : '加入'}
            </button>

            <button
              onClick={() => setMode('menu')}
              className="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
