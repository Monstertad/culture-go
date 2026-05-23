import { useState, type FormEvent } from 'react'
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { Link, useNavigate } from 'react-router-dom'
import { auth, db } from '../../../config/firebase'
import type { AppUser } from '../../../types'

type Role = 'customer' | 'merchant'

const ERROR_MAP: Record<string, string> = {
  'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
  'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
  'auth/operation-not-allowed': 'Firebase 콘솔 → Authentication → 이메일/비밀번호를 활성화해주세요.',
  'auth/configuration-not-found': 'Firebase 콘솔 → Authentication → "시작하기" 후 이메일/비밀번호를 활성화해주세요.',
  'auth/network-request-failed': '네트워크 오류입니다. 인터넷 연결을 확인해주세요.',
}

function getErrorMsg(code: string) {
  return ERROR_MAP[code] ?? `회원가입에 실패했습니다. (${code})`
}

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

// ── Step 1: 계정 유형 선택 ──────────────────────────────────────
function RoleSelectStep({
  onSelect,
  isGooglePending,
}: {
  onSelect: (role: Role) => void
  isGooglePending: boolean
}) {
  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      <div className="flex items-center gap-3 px-6 pt-12 pb-8 shrink-0">
        <Link
          to="/login"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          ←
        </Link>
        <h1 className="text-xl font-black text-gray-900">회원가입</h1>
      </div>

      <div className="flex-1 px-6 pb-8 flex flex-col">
        {isGooglePending && (
          <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-6">
            <GoogleIcon />
            <p className="text-sm text-blue-700 font-medium">
              Google 계정 연결 완료! 역할만 선택해주세요.
            </p>
          </div>
        )}

        <p className="text-2xl font-black text-gray-900 mb-1">어떤 계정으로</p>
        <p className="text-2xl font-black text-gray-900 mb-8">가입하시겠어요?</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onSelect('customer')}
            className="flex items-start gap-4 p-5 border-2 border-gray-100 rounded-2xl text-left hover:border-amber-300 hover:bg-amber-50 active:scale-[0.98] transition-all group"
          >
            <div className="text-4xl leading-none mt-0.5">🧑‍💼</div>
            <div>
              <p className="font-black text-base text-gray-900 group-hover:text-amber-700">일반 고객</p>
              <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                지도에서 몬스터를 포획하고,<br />
                3마리를 모아 쿠폰을 받아요!
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['🗺️ 지도 탐험', '🎯 몬스터 포획', '🎟️ 쿠폰 수집'].map((tag) => (
                  <span key={tag} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelect('merchant')}
            className="flex items-start gap-4 p-5 border-2 border-gray-100 rounded-2xl text-left hover:border-amber-300 hover:bg-amber-50 active:scale-[0.98] transition-all group"
          >
            <div className="text-4xl leading-none mt-0.5">🏪</div>
            <div>
              <p className="font-black text-base text-gray-900 group-hover:text-amber-700">상인 (가게 관리자)</p>
              <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                내 가게에 몬스터를 등록하고,<br />
                고객 쿠폰을 관리해요!
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['🐾 몬스터 등록', '📊 쿠폰 통계', '📷 QR 스캔'].map((tag) => (
                  <span key={tag} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Step 2: 정보 입력 ───────────────────────────────────────────
function InfoFormStep({
  role,
  isGooglePending,
  onBack,
}: {
  role: Role
  isGooglePending: boolean
  onBack: () => void
}) {
  const navigate = useNavigate()
  const roleLabel = role === 'customer' ? '일반 고객' : '상인'

  const [googleLoading, setGoogleLoading] = useState(false)
  const [name, setName] = useState(isGooglePending ? (auth.currentUser?.displayName ?? '') : '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)

  const saveUserAndNavigate = async (uid: string, userEmail: string, userName: string) => {
    const userData: Omit<AppUser, 'id' | 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
      email: userEmail,
      name: userName,
      role,
      createdAt: serverTimestamp(),
    }
    await setDoc(doc(db, 'users', uid), userData)
    navigate(role === 'merchant' ? '/merchant' : '/map', { replace: true })
  }

  const handleGoogleSignUp = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      const existingUser = auth.currentUser
      if (existingUser) {
        await saveUserAndNavigate(existingUser.uid, existingUser.email ?? '', existingUser.displayName ?? '사용자')
      } else {
        const result = await signInWithPopup(auth, new GoogleAuthProvider())
        const { uid, email: gEmail, displayName } = result.user
        const snap = await getDoc(doc(db, 'users', uid))
        if (snap.exists()) {
          navigate(snap.data().role === 'merchant' ? '/merchant' : '/map', { replace: true })
          return
        }
        await saveUserAndNavigate(uid, gEmail ?? '', displayName ?? '사용자')
      }
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      if (code !== 'auth/popup-closed-by-user') setError(getErrorMsg(code))
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleEmailSignUp = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }
    setEmailLoading(true)
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)
      await saveUserAndNavigate(firebaseUser.uid, email, name)
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      setError(getErrorMsg(code))
    } finally {
      setEmailLoading(false)
    }
  }

  const isLoading = googleLoading || emailLoading

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      <div className="flex items-center gap-3 px-6 pt-12 pb-2 shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          ←
        </button>
        <div>
          <p className="text-xs text-amber-500 font-semibold">{roleLabel}</p>
          <h1 className="text-xl font-black text-gray-900 leading-tight">정보 입력</h1>
        </div>
      </div>

      <div className="flex-1 px-6 pt-6 pb-8 flex flex-col gap-4">
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border border-gray-200 bg-white font-semibold text-sm text-gray-700 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50 transition-all"
        >
          <GoogleIcon />
          {isGooglePending ? 'Google 계정으로 가입 완료하기' : 'Google로 가입하기'}
        </button>

        {!isGooglePending && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">또는 이메일로 가입</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <form onSubmit={handleEmailSignUp} className="flex flex-col gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'merchant' ? '상호명을 입력하세요' : '이름을 입력하세요'}
                required
                className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 border border-transparent text-sm placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
                required
                autoComplete="email"
                className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 border border-transparent text-sm placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 (6자 이상)"
                required
                autoComplete="new-password"
                className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 border border-transparent text-sm placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="비밀번호 확인"
                required
                autoComplete="new-password"
                className={`w-full px-4 py-3.5 rounded-2xl bg-gray-50 text-sm placeholder-gray-400 focus:outline-none focus:bg-white transition-colors border ${
                  confirm && password !== confirm
                    ? 'border-red-300 focus:border-red-400'
                    : 'border-transparent focus:border-amber-400'
                }`}
              />
              {confirm && password !== confirm && (
                <p className="text-xs text-red-500 -mt-1 px-1">비밀번호가 일치하지 않습니다.</p>
              )}

              {error && (
                <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-100">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50 font-bold text-gray-900 text-sm transition-all shadow-sm shadow-amber-200 mt-1"
              >
                {emailLoading ? '가입 중...' : `${roleLabel}으로 가입하기`}
              </button>
            </form>
          </>
        )}

        {error && isGooglePending && (
          <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-100">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <p className="text-center text-sm text-gray-400">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-amber-500 font-semibold">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function SignUpPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const isGooglePending = !!auth.currentUser

  if (!selectedRole) {
    return <RoleSelectStep onSelect={setSelectedRole} isGooglePending={isGooglePending} />
  }

  return (
    <InfoFormStep
      role={selectedRole}
      isGooglePending={isGooglePending}
      onBack={() => setSelectedRole(null)}
    />
  )
}
