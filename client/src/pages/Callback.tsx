import { useEffect } from 'react'
import { apiFetch } from '../utils/api'

export default function Callback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (!token) {
      window.location.href = '/'
      return
    }

    localStorage.setItem('token', token)

    apiFetch('/auth/me')
      .then(res => res.json())
      .then(user => {
        window.location.href = user.onboarding_complete ? '/' : '/onboarding'
      })
  }, [])

  return <p className="px-8 py-8 text-sm text-[#888888]">Signing you in...</p>
}