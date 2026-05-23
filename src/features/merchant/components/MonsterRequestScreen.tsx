import { useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useAuth } from '../../auth/AuthContext'

interface MonsterResult {
  id: string
  name: string
  description: string
  attribute: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  imageUrl: string
}

type Step = 'idle' | 'generating' | 'imaging' | 'nuking' | 'saving' | 'done' | 'error'

const STEP_INFO: Record<string, { label: string; sub: string }> = {
  generating: { label: '🧠 몬스터 설정 생성 중', sub: 'GPT가 가게 특성을 분석합니다' },
  imaging:    { label: '🎨 이미지 생성 중',      sub: '약 30초 소요됩니다' },
  nuking:     { label: '✂️ 배경 제거(누끼) 중',   sub: '투명 배경 PNG로 변환합니다' },
  saving:     { label: '💾 저장 중',              sub: 'Firebase에 업로드합니다' },
}

const RARITY_STYLE: Record<string, string> = {
  common:    'bg-gray-100 text-gray-600',
  rare:      'bg-blue-100 text-blue-700',
  epic:      'bg-purple-100 text-purple-700',
  legendary: 'bg-amber-100 text-amber-700',
}

const RARITY_KO: Record<string, string> = {
  common: '커먼', rare: '레어', epic: '에픽', legendary: '레전더리',
}

const STEPS = ['generating', 'imaging', 'nuking', 'saving'] as const

interface Props {
  shopId: string
  shopName: string
  category: string
  lat: number
  lng: number
}

export default function MonsterRequestScreen({ shopId, shopName, category, lat, lng }: Props) {
  const { user } = useAuth()
  const [menu, setMenu] = useState('')
  const [feature, setFeature] = useState('')
  const [keyword, setKeyword] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [monster, setMonster] = useState<MonsterResult | null>(null)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!user) return
    setMonster(null)
    setError('')

    // 단계 UI 타이머 — 실제 처리는 Cloud Function 내부에서 순서대로 진행
    const t1 = setTimeout(() => setStep('imaging'),    4000)
    const t2 = setTimeout(() => setStep('nuking'),    35000)
    const t3 = setTimeout(() => setStep('saving'),    42000)

    try {
      setStep('generating')

      const fn = httpsCallable(
        getFunctions(undefined, 'asia-northeast3'),
        'generateMonster'
      )
      const res = await fn({ shopId, shopName, category, lat, lng, menu, feature, keyword })
      const data = res.data as MonsterResult

      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      setMonster(data)
      setStep('done')
    } catch (e) {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      setError(e instanceof Error ? e.message : '생성 중 오류가 발생했습니다.')
      setStep('error')
    }
  }

  const isLoading = ['generating', 'imaging', 'nuking', 'saving'].includes(step)

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <h2 className="text-lg font-black text-gray-900">몬스터 신청</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          가게 정보를 입력하면 AI가 전용 몬스터를 생성합니다
        </p>
      </div>

      {/* 가게 정보 배지 */}
      <div className="bg-amber-50 rounded-xl px-4 py-3 flex items-center gap-2">
        <span className="text-xl">🏪</span>
        <div>
          <p className="text-sm font-bold text-gray-900">{shopName}</p>
          <p className="text-xs text-gray-500">{category}</p>
        </div>
      </div>

      {/* 입력 폼 */}
      {step === 'idle' || step === 'error' ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              대표 메뉴 <span className="text-red-400">*</span>
            </label>
            <input
              value={menu}
              onChange={(e) => setMenu(e.target.value)}
              placeholder="예: 튀김소보로, 판타롱 슈크림"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              가게 특징
            </label>
            <textarea
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              placeholder="예: 70년 전통 대전 대표 빵집, 줄 서서 먹는 명물"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              키워드
            </label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="예: 달콤, 바삭, 따뜻함, 대전"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {step === 'error' && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">❌ {error}</p>
          )}

          <button
            onClick={handleGenerate}
            disabled={!menu.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-amber-400 text-white font-black py-4 rounded-2xl text-base disabled:opacity-40"
          >
            ✨ AI로 몬스터 생성
          </button>
        </div>
      ) : null}

      {/* 로딩 단계 표시 */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="bg-gray-50 rounded-2xl p-5 flex flex-col items-center gap-3">
            <span className="text-4xl animate-bounce">🐾</span>
            <div className="text-center">
              <p className="font-bold text-gray-900">{STEP_INFO[step]?.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{STEP_INFO[step]?.sub}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {STEPS.map((s) => {
              const stepIdx = STEPS.indexOf(s)
              const curIdx  = STEPS.indexOf(step as typeof STEPS[number])
              const done    = stepIdx < curIdx
              const active  = stepIdx === curIdx
              return (
                <div key={s} className="flex items-center gap-3 text-sm">
                  <span className={done ? 'text-green-500' : active ? 'text-amber-400 animate-pulse' : 'text-gray-200'}>
                    {done ? '✅' : active ? '⏳' : '○'}
                  </span>
                  <span className={done ? 'text-gray-300 line-through' : active ? 'font-bold text-gray-900' : 'text-gray-200'}>
                    {STEP_INFO[s].label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 완성 몬스터 카드 */}
      {step === 'done' && monster && (
        <div className="border-2 border-amber-300 rounded-2xl overflow-hidden">
          <div className="aspect-square bg-gradient-to-b from-purple-50 to-amber-50 flex items-center justify-center">
            {monster.imageUrl
              ? <img src={monster.imageUrl} alt={monster.name} className="w-full h-full object-contain" />
              : <span className="text-7xl">🐉</span>
            }
          </div>
          <div className="p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xl font-black text-gray-900">{monster.name}</p>
                <p className="text-sm text-gray-400">{monster.attribute} 속성 · {category}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${RARITY_STYLE[monster.rarity]}`}>
                {RARITY_KO[monster.rarity]}
              </span>
            </div>
            <p className="text-sm text-gray-600">{monster.description}</p>
            <p className="text-xs text-green-600 bg-green-50 rounded-xl px-3 py-2">
              ✅ 저장 완료 · 유저 지도에 즉시 표시됩니다
            </p>
          </div>
          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={() => { setStep('idle'); setMonster(null); setMenu(''); setFeature(''); setKeyword('') }}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-bold text-gray-600"
            >
              새 몬스터 신청
            </button>
            <button
              onClick={handleGenerate}
              className="flex-1 bg-purple-100 text-purple-700 rounded-xl py-2.5 text-sm font-bold"
            >
              다시 생성
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
