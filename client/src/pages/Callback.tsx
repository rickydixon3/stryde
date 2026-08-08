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

    // Strip the token out of the URL immediately, before any further
    // async work, so it never sits visibly in the address bar (or in
    // browser history) longer than a single frame. Uses replaceState so
    // this doesn't create a new history entry or reload the page.
    window.history.replaceState({}, '', '/callback')

    apiFetch('/auth/me')
      .then(res => res.json())
      .then(user => {
        window.location.href = user.onboarding_complete ? '/' : '/onboarding'
      })
  }, [])

  return <p className="px-8 py-8 text-sm text-[#888888]">Signing you in...</p>
}