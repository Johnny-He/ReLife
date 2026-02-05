import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyAEOAwPVqYO-BbsBYQC6o7CfJvHdGfYKss",
  authDomain: "relife-bbd8c.firebaseapp.com",
  databaseURL: "https://relife-bbd8c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "relife-bbd8c",
  storageBucket: "relife-bbd8c.firebasestorage.app",
  messagingSenderId: "144008353106",
  appId: "1:144008353106:web:cc629a581daf2e2ed1168b"
}

// 初始化 Firebase
const app = initializeApp(firebaseConfig)

// 取得 Realtime Database 實例
export const database = getDatabase(app)

export default app
