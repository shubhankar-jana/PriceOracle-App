import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/refresh-token', '/auth/verify-otp']

api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      if (AUTH_ENDPOINTS.some(e => original.url?.includes(e))) {
        return Promise.reject(err)
      }
      original._retry = true
      try {
        const refresh = sessionStorage.getItem('refreshToken')
        const { data } = await axios.post('/api/auth/refresh-token', { refreshToken: refresh })
        sessionStorage.setItem('token', data.token)
        original.headers.Authorization = `Bearer ${data.token}`
        return api(original)
      } catch {
        sessionStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api