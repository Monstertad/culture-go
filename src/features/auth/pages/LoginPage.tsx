import { useState, type FormEvent } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../../../config/firebase'

const ERROR_MAP: Record<string, string> = {
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/user-not-found': '존재하지 않는 계정입니다.',
  'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
  'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
  'auth/too-many-requests': '잠시 후 다시 시도해주세요.',
}

function getErrorMsg(code: string) {
  return ERROR_MAP[code] ?? '로그인에 실패했습니다. 다시 시도해주세요.'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // 역할별 리다이렉트는 App.tsx의 AuthRedirect가 처리
      navigate('/', { replace: true })
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      setError(getErrorMsg(code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-white">
      {/* 상단 로고 영역 */}
      <div className="flex flex-col items-center justify-center gap-2 pt-16 pb-10 bg-yellow-400">
        <span className="text-6xl">🐾</span>
        <h1 className="text-3xl font-black tracking-tight">Culture Go</h1>
        <p className="text-sm font-medium text-yellow-800">지역 문화를 탐험하는 몬스터 포획 게임</p>
      </div>

      {/* 폼 영역 */}
      <div className="flex-1 flex flex-col justify-start px-6 pt-8">
        <h2 className="text-xl font-black mb-6">로그인</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            className="mt-2 bg-yellow-400 hover:bg-yellow-500 active:scale-95 disabled:opacity-50 transition-all text-black font-black text-base py-4 rounded-2xl shadow-md"
          >
            {loading ? '로그인 중...' : '로그인하기'}
          </button>
        </form>

        <div className="flex items-center gap-2 mt-8">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">또는</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <Link
          to="/signup"
          className="mt-4 flex items-center justify-center py-4 border-2 border-gray-200 rounded-2xl font-bold text-sm text-gray-600 hover:border-yellow-400 hover:text-yellow-600 active:scale-95 transition-all"
        >
          처음이신가요? <span className="ml-1 text-yellow-500">회원가입</span>
        </Link>
      </div>
    </div>
  )
}
