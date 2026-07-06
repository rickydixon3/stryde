const API_BASE = import.meta.env.VITE_API_URL

export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token')

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  })

  if (response.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/'
  }

  return response
}