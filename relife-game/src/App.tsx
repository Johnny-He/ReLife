import { useGameStore } from './store/gameStore'
import { StartPage } from './pages/StartPage'
import { GamePage } from './pages/GamePage'
import { ResultPage } from './pages/ResultPage'

function App() {
  const { phase } = useGameStore()

  // 根據遊戲階段顯示不同頁面
  if (phase === 'setup') {
    return <StartPage />
  }

  if (phase === 'game_over') {
    return <ResultPage />
  }

  return <GamePage />
}

export default App
