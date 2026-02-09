import { useState } from 'react'
import { useGameStore } from './store/gameStore'
import { useRoomStore } from './store/roomStore'
import { StartPage } from './pages/StartPage'
import { GamePage } from './pages/GamePage'
import { ResultPage } from './pages/ResultPage'
import { LobbyPage } from './pages/LobbyPage'
import { changelog } from './data/changelog'

const APP_VERSION = changelog[0]?.version ?? ''

function App() {
  const { phase } = useGameStore()
  const { room, isReconnecting, error, hasStoredSession, tryReconnect, resetRoom } = useRoomStore()
  const [showLobby, setShowLobby] = useState(false)
  // 使用懶初始化來檢查是否有儲存的連線資訊，避免在 Effect 中 setState
  const [showReconnectPrompt, setShowReconnectPrompt] = useState(() => hasStoredSession())

  // 處理重連
  const handleReconnect = async () => {
    setShowReconnectPrompt(false)
    const success = await tryReconnect()
    if (success) {
      setShowLobby(true)
    }
  }

  // 取消重連，清除儲存的連線資訊
  const handleCancelReconnect = () => {
    setShowReconnectPrompt(false)
    resetRoom()
  }

  let content

  // 重連提示彈窗
  if (showReconnectPrompt) {
    content = (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-white mb-4">發現上次的連線</h2>
          <p className="text-gray-300 mb-6">
            你之前有加入一個線上房間，是否要嘗試重新連線？
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReconnect}
              className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded font-bold"
            >
              重新連線
            </button>
            <button
              onClick={handleCancelReconnect}
              className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    )
  } else if (isReconnecting) {
    content = (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-white mb-4">重新連線中...</h2>
          <div className="animate-pulse text-gray-400">正在嘗試連接房間</div>
        </div>
      </div>
    )
  } else if (error && !showLobby) {
    content = (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-400 mb-4">連線失敗</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => {
              resetRoom()
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold"
          >
            返回首頁
          </button>
        </div>
      </div>
    )
  } else if (showLobby && (!room || room.status === 'waiting')) {
    content = (
      <LobbyPage
        onStartGame={() => setShowLobby(false)}
        onBack={() => setShowLobby(false)}
      />
    )
  } else if (phase === 'game_over') {
    content = <ResultPage />
  } else if (room && room.status === 'playing') {
    content = <GamePage />
  } else if (phase === 'setup') {
    content = <StartPage onOnlineClick={() => setShowLobby(true)} />
  } else {
    content = <GamePage />
  }

  return (
    <>
      {content}
      <div className="fixed bottom-2 right-3 text-gray-600 text-xs select-none pointer-events-none">
        {APP_VERSION}
      </div>
    </>
  )
}

export default App
