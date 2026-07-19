import axios from 'axios'

function getApiBaseURL(): string {
  const stored = localStorage.getItem('api_base_url')
  if (stored) return stored
  return import.meta.env.VITE_API_URL || ''
}

const api = axios.create({
  baseURL: `${getApiBaseURL()}/api`,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
