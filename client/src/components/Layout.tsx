import { Outlet, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { LayoutDashboard, Dumbbell, BarChart2, Settings } from 'lucide-react'
import { apiFetch } from '../utils/api'
import { LogoLockup } from './Logo'

interface CurrentUser {
  firstname: string
  lastname: string
  profile_picture_url: string | null
}

export default function Layout() {
  const [user, setUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    apiFetch('/auth/me')
      .then(res => res.json())
      .then(data => setUser(data))
  }, [])

  return (
    <div className="flex h-screen">

      {/* Sidebar */}
      <div className="w-56 border-r border-[#1f1f1f] bg-[#111111] flex flex-col px-3 py-4">

        {/* Logo */}
        {/* Logo */}
        <div className="px-2 mb-6">
          <LogoLockup size={24} textClassName="text-sm" />
        </div>
        

        {/* Nav links */}
        <nav className="flex flex-col gap-1">
          <NavLink to="/" end className={({ isActive }) =>
            isActive
              ? "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm bg-[#1f1f1f] text-[#ededed] font-medium"
              : "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm text-[#888888] hover:bg-[#1f1f1f] hover:text-[#ededed] transition-colors"
          }>
            <LayoutDashboard size={15} />
            Overview
          </NavLink>

          <NavLink to="/training" className={({ isActive }) =>
            isActive
              ? "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm bg-[#1f1f1f] text-[#ededed] font-medium"
              : "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm text-[#888888] hover:bg-[#1f1f1f] hover:text-[#ededed] transition-colors"
          }>
            <Dumbbell size={15} />
            Training
          </NavLink>

          <NavLink to="/insights" className={({ isActive }) =>
            isActive
              ? "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm bg-[#1f1f1f] text-[#ededed] font-medium"
              : "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm text-[#888888] hover:bg-[#1f1f1f] hover:text-[#ededed] transition-colors"
          }>
            <BarChart2 size={15} />
            Insights
          </NavLink>

          <NavLink to="/settings" className={({ isActive }) =>
            isActive
              ? "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm bg-[#1f1f1f] text-[#ededed] font-medium"
              : "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm text-[#888888] hover:bg-[#1f1f1f] hover:text-[#ededed] transition-colors"
          }>
            <Settings size={15} />
            Settings
          </NavLink>
        </nav>

        {/* Current user, pinned to the bottom */}
        <div className="mt-auto flex items-center gap-2.5 px-2 py-2 border-t border-[#1f1f1f]">
          {user?.profile_picture_url ? (
            <img
              src={user.profile_picture_url}
              alt=""
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#1f1f1f] flex items-center justify-center text-xs text-[#888888]">
              {user?.firstname?.[0] ?? '?'}
            </div>
          )}
          <span className="text-sm text-[#ededed] truncate">
            {user ? `${user.firstname} ${user.lastname}` : ''}
          </span>
        </div>

      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto bg-[#0a0a0a]">
        <Outlet />
      </div>

    </div>
  )
}