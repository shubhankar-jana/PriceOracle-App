import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext()

export const useSocket = () => useContext(SocketContext)

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Determine socket server URL
    let socketUrl = import.meta.env.VITE_SOCKET_URL
    if (!socketUrl && import.meta.env.VITE_API_URL) {
      socketUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
    }
    if (!socketUrl) {
      socketUrl = 'http://localhost:5000'
    }

    const socketInstance = io(socketUrl, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
    })

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket')
      setConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket')
      setConnected(false)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}
