import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import api from '../api/axios'

let socket = null

export default function usePrices() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/assets')
      setAssets(data.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch assets')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchAssets()
    if (!socket) {
      const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
      socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
    }
    socket.on('priceUpdate', (updated) => {
      setAssets(prev => prev.map(a => updated[a.symbol] ? { ...a, ...updated[a.symbol] } : a))
    })
    return () => { socket?.off('priceUpdate') }
  }, [fetchAssets])

  const getAsset = useCallback((symbol) => assets.find(a => a.symbol === symbol), [assets])

  return { assets, loading, error, refetch: fetchAssets, getAsset }
}
