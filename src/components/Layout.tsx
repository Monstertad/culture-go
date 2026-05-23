import { type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebase'
import { useAuth } from '../features/auth/AuthContext'

interface LayoutProps {
  children: ReactNode
}

const CUSTOMER_NAV = [
  { path: '/map', label: '지도', emoji: '🗺️' },
  { path: '/inventory', label: '도감', emoji: '🎒' },
]

const MERCHANT_NAV = [
  { path: '/merchant', label: '대시보드', emoji: '🏪' },
]

// 하단 내비게이션 + 로그아웃을 숨길 경로
const HIDE_NAV_PATHS = ['/catch', '/login', '/signup']

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
          <nav className="flex items-stretch border-t border-gray-200 bg-white shrink-0">
            {navItems.map(({ path, label, emoji }) => {
              const active = location.pathname === path
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                    active ? 'text-yellow-500' : 'text-gray-400'
                  }`}
                >
                  <span className="text-xl leading-none">{emoji}</span>
                  <span>{label}</span>
                </Link>
              )
            })}

            {/* 로그아웃 버튼 */}
            <button
              onClick={handleLogout}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium text-gray-400 hover:text-red-400 transition-colors"
              title="로그아웃"
            >
              <span className="text-xl leading-none">🚪</span>
              <span>로그아웃</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
