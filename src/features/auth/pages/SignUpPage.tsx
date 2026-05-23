import { useState, type FormEvent } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { Link, useNavigate } from 'react-router-dom'
import { auth, db } from '../../../config/firebase'
import type { AppUser } from '../../../types'

type Role = 'customer' | 'merchant'

const ERROR_MAP: Record<string, string> = {
  'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
  'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
  'auth/operation-not-allowed': 'Firebase 콘솔 → Authentication → 이메일/비밀번호를 활성화해주세요.',
  'auth/configuration-not-found': 'Firebase 콘솔 → Authentication → "시작하기"를 클릭 후 이메일/비밀번호를 활성화해주세요.',
  'auth/network-request-failed': '네트워크 오류입니다. 인터넷 연결을 확인해주세요.',
}

function getErrorMsg(code: string) {
  return ERROR_MAP[code] ?? `회원가입에 실패했습니다. (${code})`
}

// ── Step 1: 계정 유형 선택 ──────────────────────────────────────
function RoleSelectStep({ onSelect }: { onSelect: (role: Role) => void }) {
  return (
    <div className="flex flex-col min-h-full bg-white">
      <header className="flex items-center gap-2 px-4 py-4 bg-yellow-400">
        <Link to="/login" className="text-xl">←</Link>
        <h1 className="font-black text-lg">회원가입</h1>
      </header>

      <div className="flex-1 flex flex-col px-6 pt-10">
        <p className="text-2xl font-black text-center mb-2">어떤 계정으로</p>
        <p className="text-2xl font-black text-center mb-8">가입하시겠어요?</p>

        <div className="flex flex-col gap-4">
          {/* 일반 고객 카드 */}
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

          {/* 상인 카드 */}
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
  onBack,
}: {
  role: Role
  onBack: () => void
}) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const roleLabel = role === 'customer' ? '🧑‍💼 일반 고객' : '🏪 상인'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    setLoading(true)
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)

      // Firestore에 유저 정보 저장
      const userData: Omit<AppUser, 'id' | 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
        email,
        name,
        role,
        createdAt: serverTimestamp(),
      }
      await setDoc(doc(db, 'users', firebaseUser.uid), userData)

      // 역할별 첫 화면으로 이동
      navigate(role === 'merchant' ? '/merchant' : '/map', { replace: true })
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      console.error('[SignUp Error]', code, err)
      setError(`${getErrorMsg(code)} (코드: ${code})`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-white">
      <header className="flex items-center gap-2 px-4 py-4 bg-yellow-400">
        <button onClick={onBack} className="text-xl">←</button>
        <div>
          <p className="text-xs font-medium text-yellow-800">{roleLabel}</p>
          <h1 className="font-black text-lg leading-tight">정보 입력</h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col px-6 pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500">이름 {role === 'merchant' ? '/ 상호명' : ''}</label>
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
            disabled={loading}
            className="mt-2 bg-yellow-400 hover:bg-yellow-500 active:scale-95 disabled:opacity-50 transition-all text-black font-black text-base py-4 rounded-2xl shadow-md"
          >
            {loading ? '가입 중...' : `${roleLabel} 가입하기`}
          </button>
        </form>

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

// ── 메인 컴포넌트: Step 상태 관리 ──────────────────────────────
export default function SignUpPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  if (!selectedRole) {
    return <RoleSelectStep onSelect={setSelectedRole} />
  }

  return (
    <InfoFormStep
      role={selectedRole}
      onBack={() => setSelectedRole(null)}
    />
  )
}
