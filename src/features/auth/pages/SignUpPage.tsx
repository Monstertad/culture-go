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
      <header className="flex items-center gap-2 px-4 py-4 bg-yellow-400 shrink-0">
        <Link to="/login" className="text-xl">←</Link>
        <h1 className="font-black text-lg">회원가입</h1>
      </header>

      <div className="flex-1 flex flex-col px-6 pt-8 pb-8">
        {isGooglePending && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6">
            <GoogleIcon />
            <p className="text-sm text-blue-700 font-medium">
              Google 계정이 연결됐어요! 역할만 선택해주세요.
            </p>
          </div>
        )}

        <p className="text-2xl font-black text-center mb-1">어떤 계정으로</p>
        <p className="text-2xl font-black text-center mb-8">가입하시겠어요?</p>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => onSelect('customer')}
            className="flex items-start gap-4 p-5 border-2 border-gray-200 rounded-2xl text-left hover:border-yellow-400 hover:bg-yellow-50 active:scale-95 transition-all group"
          >
            <div className="text-4xl leading-none mt-0.5">🧑‍💼</div>
            <div>
              <p className="font-black text-base group-hover:text-yellow-700">일반 고객</p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                지도에서 몬스터를 포획하고,<br />
                3마리를 모아 융합해 쿠폰을 받아요!
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
            className="flex items-start gap-4 p-5 border-2 border-gray-200 rounded-2xl text-left hover:border-yellow-400 hover:bg-yellow-50 active:scale-95 transition-all group"
          >
            <div className="text-4xl leading-none mt-0.5">🏪</div>
            <div>
              <p className="font-black text-base group-hover:text-yellow-700">상인 (가게 관리자)</p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                내 가게에 몬스터를 등록하고,<br />
                고객이 사용하는 쿠폰을 관리해요!
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
  const roleLabel = role === 'customer' ? '🧑‍💼 일반 고객' : '🏪 상인'

  // Google 가입 상태
  const [googleLoading, setGoogleLoading] = useState(false)

  // 이메일 가입 상태
  const [name, setName] = useState(
    // Google 로그인이 이미 된 경우 displayName 자동 입력
    isGooglePending ? (auth.currentUser?.displayName ?? '') : ''
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)

  // ── Firestore 문서 저장 + 이동 ────────────────────────────────
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

  // ── Google 가입 ───────────────────────────────────────────────
  const handleGoogleSignUp = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      const existingUser = auth.currentUser

      if (existingUser) {
        // LoginPage에서 Google 로그인 후 리다이렉트된 케이스
        await saveUserAndNavigate(
          existingUser.uid,
          existingUser.email ?? '',
          existingUser.displayName ?? '사용자',
        )
      } else {
        // 처음 Google 가입
        const result = await signInWithPopup(auth, new GoogleAuthProvider())
        const { uid, email: gEmail, displayName } = result.user

        // 이미 가입된 Google 계정인지 확인
        const snap = await getDoc(doc(db, 'users', uid))
        if (snap.exists()) {
          navigate(snap.data().role === 'merchant' ? '/merchant' : '/map', { replace: true })
          return
        }

        await saveUserAndNavigate(uid, gEmail ?? '', displayName ?? '사용자')
      }
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      console.error('[Google SignUp]', code, err)
      if (code !== 'auth/popup-closed-by-user') setError(getErrorMsg(code))
    } finally {
      setGoogleLoading(false)
    }
  }

  // ── 이메일 가입 ───────────────────────────────────────────────
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
      console.error('[Email SignUp]', code, err)
      setError(getErrorMsg(code))
    } finally {
      setEmailLoading(false)
    }
  }

  const isLoading = googleLoading || emailLoading

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      <header className="flex items-center gap-2 px-4 py-4 bg-yellow-400 shrink-0">
        <button onClick={onBack} className="text-xl">←</button>
        <div>
          <p className="text-xs font-medium text-yellow-800">{roleLabel}</p>
          <h1 className="font-black text-lg leading-tight">정보 입력</h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col px-6 pt-6 pb-8">
        {/* Google 가입 버튼 */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 w-full border-2 border-gray-200 rounded-2xl py-3.5 font-bold text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition-all"
        >
          <GoogleIcon />
          {isGooglePending ? 'Google 계정으로 가입 완료하기' : 'Google로 가입하기'}
        </button>

        {!isGooglePending && (
          <>
            <div className="flex items-center gap-2 my-4">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">또는 이메일로 가입</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <form onSubmit={handleEmailSignUp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500">
                  이름 {role === 'merchant' ? '/ 상호명' : ''}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === 'merchant' ? '상호명을 입력하세요' : '이름을 입력하세요'}
                  required
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                />
              </div>

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
                <label className="text-xs font-bold text-gray-500">비밀번호 (6자 이상)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  autoComplete="new-password"
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500">비밀번호 확인</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                  autoComplete="new-password"
                  className={`border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${
                    confirm && password !== confirm
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : 'border-gray-200 focus:border-yellow-400 focus:ring-yellow-100'
                  }`}
                />
                {confirm && password !== confirm && (
                  <p className="text-xs text-red-500">비밀번호가 일치하지 않습니다.</p>
                )}
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-1 bg-yellow-400 hover:bg-yellow-500 active:scale-95 disabled:opacity-50 transition-all text-black font-black text-base py-4 rounded-2xl shadow-md"
              >
                {emailLoading ? '가입 중...' : `${roleLabel} 가입하기`}
              </button>
            </form>
          </>
        )}

        {error && isGooglePending && (
          <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3 mt-4">{error}</p>
        )}

        <p className="text-center text-sm text-gray-400 mt-6">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-yellow-500 font-bold">
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

  // LoginPage에서 Google 로그인 후 /signup으로 리다이렉트된 케이스 감지
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
