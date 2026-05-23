import { type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import Layout from './components/Layout'
import LoginPage from './features/auth/pages/LoginPage'
import SignUpPage from './features/auth/pages/SignUpPage'
import UserMainMap from './features/map/pages/UserMainMap'
import ArCatchPage from './features/catch/pages/ArCatchPage'
import InventoryPage from './features/inventory/pages/InventoryPage'
import MerchantDashboard from './features/merchant/pages/MerchantDashboard'

// ── 로딩 스피너 ─────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center h-screen">
      <span className="text-5xl animate-bounce">🐾</span>
    </div>
  )
}

// ── 로그인한 유저의 역할에 따라 첫 화면으로 분기 ─────────────────
function AuthRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'merchant' ? '/merchant' : '/map'} replace />
}

// ── 인증 + 역할 보호 라우트 ─────────────────────────────────────
function ProtectedRoute({
  children,
  role,
}: {
  children: ReactNode
  role?: 'customer' | 'merchant'
}) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  // 역할이 맞지 않으면 자기 홈으로 리다이렉트
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'merchant' ? '/merchant' : '/map'} replace />
  }
  return <>{children}</>
}

// ── 이미 로그인한 유저가 /login, /signup 접근 시 홈으로 ──────────
function GuestRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (user) return <Navigate to={user.role === 'merchant' ? '/merchant' : '/map'} replace />
  return <>{children}</>
}

// ── 라우터 ────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Layout>
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><SignUpPage /></GuestRoute>} />

        {/* 고객 전용 */}
        <Route path="/map" element={<ProtectedRoute role="customer"><UserMainMap /></ProtectedRoute>} />
        <Route path="/catch" element={<ProtectedRoute role="customer"><ArCatchPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute role="customer"><InventoryPage /></ProtectedRoute>} />

        {/* 상인 전용 */}
        <Route path="/merchant" element={<ProtectedRoute role="merchant"><MerchantDashboard /></ProtectedRoute>} />

        {/* 루트: 로그인 상태에 따라 분기 */}
        <Route path="/" element={<AuthRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
