
const API_BASE_URL = 'http://127.0.0.1:8000'

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('access_token')

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `API Error: ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

