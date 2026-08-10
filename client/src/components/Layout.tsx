import { Outlet, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { LayoutDashboard, Dumbbell, Settings, LogOut } from 'lucide-react'
import { apiFetch } from '../utils/api'
import { LogoLockup } from './Logo'

interface CurrentUser {
  firstname: string
  lastname: string
  profile_picture_url: string | null
  is_demo?: boolean
}

const NAV_ITEMS = [
  { to: '/', end: true, icon: LayoutDashboard, label: 'Overview' },
  { to: '/training', end: false, icon: Dumbbell, label: 'Training' },
  { to: '/settings', end: false, icon: Settings, label: 'Settings' },
]

export default function Layout() {
  const [user, setUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    apiFetch('/auth/me')
      .then(res => {
        if (res.status === 404) {
          console.log('>>> 404 REDIRECT LOGIC FIRING <<<')
          localStorage.removeItem('token')
          window.location.href = '/'
          return null
        }
        return res.json()
      })
      .then(data => {
        if (!data) return
        setUser(data)
      })
  }, [])

  const handleExitDemo = () => {
    localStorage.removeItem('token')
    window.location.href = '/landing'
  }

  return (
    <div className="flex flex-col md:flex-row h-screen">

      {/* Mobile top bar -- md:hidden, only shows below the md breakpoint */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] bg-[#111111]">
        <LogoLockup size={22} textClassName="text-sm" />

        <div className="flex items-center gap-2.5">
          {user?.is_demo && (
            <span className="text-[9px] font-medium uppercase tracking-wide text-[#999999] border border-[#333333] rounded px-1.5 py-1">
              Demo
            </span>
          )}

          {user?.profile_picture_url ? (
            <img
              src={user.profile_picture_url}
              alt=""
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#1f1f1f] flex items-center justify-center text-[10px] text-[#999999]">
              {user?.firstname?.[0] ?? '?'}
            </div>
          )}

          {user?.is_demo && (
            <button onClick={handleExitDemo} aria-label="Exit demo" className="text-[#999999]">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Desktop sidebar -- unchanged, only shows at md and above */}
      <div className="hidden md:flex w-56 border-r border-[#1f1f1f] bg-[#111111] flex-col px-3 py-4">

        {/* Logo */}
        <div className="px-2 mb-6">
          <LogoLockup size={24} textClassName="text-sm" />
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) =>
              isActive
                ? "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm bg-[#1f1f1f] text-[#ededed] font-medium"
                : "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm text-[#999999] hover:bg-[#1f1f1f] hover:text-[#ededed] transition-colors"
            }>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Current user, pinned to the bottom */}
        <div className="mt-auto border-t border-[#1f1f1f] pt-2">
          <div className="flex items-center gap-2.5 px-2 py-2">
            {user?.profile_picture_url ? (
              <img
                src={user.profile_picture_url}
                alt=""
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#1f1f1f] flex items-center justify-center text-xs text-[#999999]">
                {user?.firstname?.[0] ?? '?'}
              </div>
            )}
            <span className="text-sm text-[#ededed] truncate">
              {user ? `${user.firstname} ${user.lastname}` : ''}
            </span>
          </div>

          {user?.is_demo && (
            <div className="px-2 pb-2">
              <span className="w-full flex items-center justify-center px-2 py-1.5 rounded text-xs font-medium uppercase tracking-wide text-[#999999] border border-[#333333]">
                Demo mode
              </span>
            </div>
          )}

          {user?.is_demo && (
            <button
              onClick={handleExitDemo}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-sm text-[#999999] hover:bg-[#1f1f1f] hover:text-[#ededed] transition-colors"
            >
              <LogOut size={15} />
              Exit demo
            </button>
          )}
        </div>

      </div>

      {/* Main content -- bottom padding on mobile clears the fixed tab bar */}
      <div className="flex-1 overflow-auto bg-[#0a0a0a] pb-16 md:pb-0">
        <Outlet />
      </div>

      {/* Mobile bottom tab bar -- fixed, md:hidden */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex border-t border-[#1f1f1f] bg-[#111111]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) =>
            isActive
              ? "flex-1 flex flex-col items-center gap-0.5 py-2 text-[#ededed]"
              : "flex-1 flex flex-col items-center gap-0.5 py-2 text-[#999999]"
          }>
            <Icon size={20} />
            <span className="text-[10px]">{label}</span>
          </NavLink>
        ))}
      </nav>

    </div>
  )
}