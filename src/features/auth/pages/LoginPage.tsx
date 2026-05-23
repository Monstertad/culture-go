import { useState, type FormEvent } from 'react'
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { Link, useNavigate } from 'react-router-dom'
import { auth, db } from '../../../config/firebase'

const ERROR_MAP: Record<string, string> = {
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/user-not-found': '존재하지 않는 계정입니다.',
  'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
  'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
  'auth/too-many-requests': '잠시 후 다시 시도해주세요.',
  'auth/configuration-not-found': 'Firebase 콘솔 → Authentication → "시작하기"를 클릭 후 이메일/비밀번호를 활성화해주세요.',
  'auth/operation-not-allowed': 'Firebase 콘솔 → Authentication → 이메일/비밀번호를 활성화해주세요.',
  'auth/network-request-failed': '네트워크 오류입니다. 인터넷 연결을 확인해주세요.',
}

function getErrorMsg(code: string) {
  return ERROR_MAP[code] ?? `로그인에 실패했습니다. (${code})`
}

// Google 로고 SVG
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/', { replace: true })
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      setError(getErrorMsg(code))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider())
      const snap = await getDoc(doc(db, 'users', result.user.uid))
      if (!snap.exists()) {
        // 신규 Google 유저 → 역할 선택 필요
        navigate('/signup', { replace: true })
      }
      // 기존 유저는 AuthContext가 user를 set하면 GuestRoute가 자동으로 /map 또는 /merchant로 이동
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      if (code !== 'auth/popup-closed-by-user') setError(getErrorMsg(code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      {/* 상단 로고 영역 */}
      <div className="flex flex-col items-center justify-center gap-2 pt-14 pb-8 bg-yellow-400 shrink-0">
        <span className="text-6xl">🐾</span>
        <h1 className="text-3xl font-black tracking-tight">Culture Go</h1>
        <p className="text-sm font-medium text-yellow-800">지역 문화를 탐험하는 몬스터 포획 게임</p>
      </div>

      {/* 폼 영역 */}
      <div className="flex-1 flex flex-col px-6 pt-8 pb-8">
        <h2 className="text-xl font-black mb-6">로그인</h2>

        {/* Google 로그인 */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full border-2 border-gray-200 rounded-2xl py-3.5 font-bold text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition-all mb-4"
        >
          <GoogleIcon />
          Google로 로그인
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">또는 이메일로 로그인</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* 이메일 로그인 */}
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              autoComplete="email"
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              autoComplete="current-password"
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 bg-yellow-400 hover:bg-yellow-500 active:scale-95 disabled:opacity-50 transition-all text-black font-black text-base py-4 rounded-2xl shadow-md"
          >
            {loading ? '로그인 중...' : '이메일로 로그인'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="text-yellow-500 font-bold">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
