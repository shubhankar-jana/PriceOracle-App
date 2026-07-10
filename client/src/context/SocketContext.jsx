import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext()

export const useSocket = () => useContext(SocketContext)

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5
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
