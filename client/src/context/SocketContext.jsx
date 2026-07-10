import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext()

export const useSocket = () => useContext(SocketContext)

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Assuming backend runs on port 5000, Vite dev server proxies to it or we connect directly
    const socketInstance = io('http://localhost:5000', {
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
