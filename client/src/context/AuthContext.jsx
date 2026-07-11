import { createContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useNavigate } from 'react-router-dom'

const storage = {
  get: (key) => { try { return sessionStorage.getItem(key) } catch { return null } },
  set: (key, val) => { try { sessionStorage.setItem(key, val) } catch {} },
  remove: (key) => { try { sessionStorage.removeItem(key) } catch {} },
  clear: () => { try { sessionStorage.clear() } catch {} },
  getJSON: (key) => {
    try { return JSON.parse(sessionStorage.getItem(key)) } catch { return null }
  }
}

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.getJSON('user'))
  const [token, setToken] = useState(() => storage.get('token'))
  const [loading, setLoading] = useState(false)

  const saveAuth = (userData, tok, refresh) => {
    setUser(userData)
    setToken(tok)
    storage.set('user', JSON.stringify(userData))
    storage.set('token', tok)
    if (refresh) storage.set('refreshToken', refresh)
  }

  const login = async (email, password) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      saveAuth(data.data.user, data.data.token, data.data.refreshToken)
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' }
    } finally { setLoading(false) }
  }

  const register = async (name, email, phone, password) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', { name, email, phone, password })
      if (data.data?.token) {
        saveAuth(data.data.user, data.data.token, data.data.refreshToken)
      }
      return { success: true, data: data.data }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' }
    } finally { setLoading(false) }
  }

  const verifyOTP = async (phone, code) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, code })
      saveAuth(data.user, data.token, data.refreshToken)
      storage.remove('pendingPhone')
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Invalid OTP' }
    } finally { setLoading(false) }
  }

  const forgotPassword = async (email) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      storage.set('resetEmail', email)
      return { success: true, data: data.data }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to generate reset code' }
    } finally { setLoading(false) }
  }

  const resetPassword = async (email, code, newPassword) => {
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email, code, newPassword })
      storage.remove('resetEmail')
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Reset failed' }
    } finally { setLoading(false) }
  }

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => {})
    setUser(null)
    setToken(null)
    storage.clear()
    window.location.href = '/'
  }, [])

  const updateProfile = async (profileData) => {
    try {
      const { data } = await api.put('/user/profile', profileData)
      setUser(data.user)
      storage.set('user', JSON.stringify(data.user))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Update failed' }
    }
  }

  // Auto-logout on 10 minutes of inactivity
  useEffect(() => {
    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      if (token) {
        timeoutId = setTimeout(() => {
          logout();
        }, 10 * 60 * 1000);
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, verifyOTP, forgotPassword, resetPassword, logout, updateProfile, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}