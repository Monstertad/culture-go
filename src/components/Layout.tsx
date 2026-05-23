import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

const NAV_ITEMS = [
  { path: '/map', label: '지도', emoji: '🗺️' },
  { path: '/inventory', label: '도감', emoji: '🎒' },
  { path: '/merchant', label: '상인', emoji: '🏪' },
]

// 하단 내비게이션을 숨길 경로 (풀스크린 AR 포획 화면)
const HIDE_NAV_PATHS = ['/catch']

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const hideNav = HIDE_NAV_PATHS.some((p) => location.pathname.startsWith(p))

  return (
    <div className="flex justify-center min-h-screen bg-gray-100">
      <div className="relative w-full max-w-md min-h-screen bg-white flex flex-col overflow-hidden shadow-xl">
        <div className="flex-1 overflow-hidden">{children}</div>

        {!hideNav && (
          <nav className="flex border-t border-gray-200 bg-white shrink-0">
            {NAV_ITEMS.map(({ path, label, emoji }) => {
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
          </nav>
        )}
      </div>
    </div>
  )
}
