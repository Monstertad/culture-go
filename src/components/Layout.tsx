import { type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebase'
import { useAuth } from '../features/auth/AuthContext'

interface LayoutProps {
  children: ReactNode
}

const CUSTOMER_NAV = [
  { path: '/map', label: '지도', icon: MapIcon },
  { path: '/inventory', label: '도감', icon: BagIcon },
]

const MERCHANT_NAV = [
  { path: '/merchant', label: '대시보드', icon: ShopIcon },
]

const HIDE_NAV_PATHS = ['/catch', '/login', '/signup']

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3z" stroke={active ? '#f59e0b' : '#9ca3af'} strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 3v15M15 6v15" stroke={active ? '#f59e0b' : '#9ca3af'} strokeWidth="2" />
    </svg>
  )
}

function BagIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="7" width="20" height="15" rx="2" stroke={active ? '#f59e0b' : '#9ca3af'} strokeWidth="2" />
      <path d="M16 7V5a4 4 0 0 0-8 0v2" stroke={active ? '#f59e0b' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ShopIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={active ? '#f59e0b' : '#9ca3af'} strokeWidth="2" strokeLinejoin="round" />
      <polyline points="9 22 9 12 15 12 15 22" stroke={active ? '#f59e0b' : '#9ca3af'} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
      <polyline points="16 17 21 12 16 7" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="12" x2="9" y2="12" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const hideNav = HIDE_NAV_PATHS.some((p) => location.pathname.startsWith(p))
  const navItems = user?.role === 'merchant' ? MERCHANT_NAV : CUSTOMER_NAV

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex justify-center h-screen bg-gray-100">
      <div className="relative w-full max-w-md h-screen bg-white flex flex-col overflow-hidden shadow-xl">
        <div className="flex-1 overflow-hidden min-h-0">{children}</div>

        {!hideNav && user && (
          <nav className="flex bg-white shrink-0 border-t border-gray-100">
            {navItems.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path
              return (
                <Link
                  key={path}
                  to={path}
                  className="flex-1 flex flex-col items-center justify-center pt-2.5 pb-3 gap-1 relative"
                >
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-amber-400 rounded-full" />
                  )}
                  <Icon active={active} />
                  <span className={`text-xs font-medium ${active ? 'text-amber-500' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </Link>
              )
            })}

            <button
              onClick={handleLogout}
              className="flex-1 flex flex-col items-center justify-center pt-2.5 pb-3 gap-1 group"
            >
              <LogoutIcon />
              <span className="text-xs font-medium text-gray-400 group-hover:text-red-400 transition-colors">
                로그아웃
              </span>
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
