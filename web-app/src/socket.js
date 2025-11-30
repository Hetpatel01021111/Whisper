import { io } from 'socket.io-client'
import { securityManager } from './security/securityManager'

// Backend URL - Railway deployment
const SOCKET_URL = import.meta.env.PROD 
  ? 'https://session-messenger-backend-production.up.railway.app'
  : 'http://localhost:3000'

console.log('🔌 Connecting to:', SOCKET_URL)

let socket = null

export function initSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000
    })
    
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id)
      
      // Initialize security features on connect
      const userId = localStorage.getItem('user')
      if (userId) {
        const user = JSON.parse(userId)
        securityManager.initializeAll(user.id, socket).catch(console.error)
      }
    })
    
    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message)
    })
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason)
    })
  }
  return socket
}

export function getSocket() {
  if (!socket) {
    console.log('⚠️ Socket not initialized, initializing now...')
    return initSocket()
  }
  console.log('✅ Returning existing socket, connected:', socket.connected, 'id:', socket.id)
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Test function - expose to window for debugging
if (typeof window !== 'undefined') {
  window.testSocketEmit = (eventName, data) => {
    const s = getSocket()
    console.log('🧪 Test emit:', eventName, data)
    console.log('🧪 Socket:', s)
    console.log('🧪 Socket connected:', s?.connected)
    s.emit(eventName, data)
    console.log('🧪 Emitted!')
  }
}
