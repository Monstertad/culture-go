import { useState, useRef, useCallback } from 'react'
import {
  collection, query, where, getDocs,
  doc, updateDoc, addDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Monster } from '../../../types'
import { getUserId } from '../../../utils/userId'

const TOOLS = {
  tornBag:    { label: '찢어진 비닐봉지', rate: 0.3 },
  basicNet:   { label: '기본 잠자리채',   rate: 0.45 },
  premiumNet: { label: '고급 잠자리채',   rate: 0.7 },
}

const DEMO_CHEAT_100  = true
const DEFAULT_MAX_HP  = 100
const FUSION_REQUIRED = 3
const EVOLVED_IMAGE   = '/monsters/evolved.png'

type Phase =
  | 'fighting' | 'judging' | 'caught' | 'fled'
  | 'fusion_ready' | 'fusing' | 'fusion_complete'

interface Props {
  monster:     Monster
  toolKey?:    keyof typeof TOOLS
  onCaptured:  (monster: Monster) => void
  onClose:     () => void
}

export default function CatchCanvas({ monster, onCaptured, onClose }: Props) {
  const [hp, setHp]       = useState(DEFAULT_MAX_HP)
  const [phase, setPhase] = useState<Phase>('fighting')
  const [hits, setHits]   = useState<{ id: number; x: number; y: number; dmg: number }[]>([])
  const [shake, setShake] = useState(false)
  const [fusionLog, setFusionLog] = useState('')
  const lastPos   = useRef<{ x: number; y: number } | null>(null)
  const isSaving  = useRef(false)
  const userId    = getUserId()

  const registerHit = useCallback((x: number, y: number, dmg: number) => {
    const id = Date.now() + Math.random()
    setHits((p) => [...p, { id, x, y, dmg }])
    setShake(true)
    setTimeout(() => setShake(false), 120)
    setTimeout(() => setHits((p) => p.filter((h) => h.id !== id)), 600)
  }, [])

  // user_inventory 저장 후 현재 count 반환
  const saveToInventory = async (m: Monster): Promise<number> => {
    if (isSaving.current) return 0
    isSaving.current = true
    try {
      const q = query(
        collection(db, 'user_inventory'),
        where('userId',    '==', userId),
        where('monsterId', '==', m.id),
        where('isFused',   '==', false),
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        const ref      = snap.docs[0]
        const newCount = (ref.data().count ?? 0) + 1
        await updateDoc(doc(db, 'user_inventory', ref.id), { count: newCount })
        return newCount
      } else {
        await addDoc(collection(db, 'user_inventory'), {
          userId,
          monsterId:      m.id,
          monsterName:    m.name,
          category:       m.category,
          monsterImageUrl: m.imageUrl,
          imageUrl:       m.imageUrl,
          shopId:         m.shopId,
          shopName:       m.shopName,
          count:          1,
          isFused:        false,
          capturedAt:     new Date(),
        })
        return 1
      }
    } catch (err) {
      console.error('도감 저장 실패:', err)
      return 0
    } finally {
      isSaving.current = false
    }
  }

  // 포획 성공 판정: count >= FUSION_REQUIRED → 융합 화면
  const checkFusionTrigger = async () => {
    const newCount = await saveToInventory(monster)
    if (newCount >= FUSION_REQUIRED) {
      setPhase('fusion_ready')
    } else {
      onCaptured(monster)
      setPhase('caught')
    }
  }

  // 융합 실행: 말차튀소 도감 저장 + 쿠폰 발급
  const executeFusion = async () => {
    if (isSaving.current) return
    isSaving.current = true
    setPhase('fusing')
    setFusionLog('포획한 몬스터 조각들을 정렬하는 중... ✨')

    try {
      // 1. 기존 인벤토리 항목 → isFused: true
      const q = query(
        collection(db, 'user_inventory'),
        where('userId',    '==', userId),
        where('monsterId', '==', monster.id),
        where('isFused',   '==', false),
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        await updateDoc(doc(db, 'user_inventory', snap.docs[0].id), { count: 0, isFused: true })
      }

      setTimeout(() => setFusionLog('AI가 전설의 비주얼을 실시간 렌더링 중... 🎨'), 600)
      await new Promise((r) => setTimeout(r, 1400))

      // 2. 말차튀소 도감 저장
      await addDoc(collection(db, 'user_inventory'), {
        userId,
        monsterId:       `evolved_${monster.id}`,
        monsterName:     '말차튀소',
        category:        monster.category,
        monsterImageUrl: EVOLVED_IMAGE,
        imageUrl:        EVOLVED_IMAGE,
        shopId:          monster.shopId,
        shopName:        monster.shopName,
        count:           1,
        isFused:         false,
        capturedAt:      new Date(),
      })

      // 3. 융합 쿠폰 발급 (monsterId 포함)
      await addDoc(collection(db, 'coupons'), {
        userId,
        monsterId:  monster.id,
        shopId:     monster.shopId,
        shopName:   monster.shopName,
        title:      `${monster.name} 융합 쿠폰`,
        category:   monster.category,
        isUsed:     false,
        createdAt:  serverTimestamp(),
      })

      onCaptured({ ...monster, name: '말차튀소', imageUrl: EVOLVED_IMAGE })
      setPhase('fusion_complete')
    } catch (err) {
      console.error('융합 에러:', err)
      setPhase('fusion_complete')
    } finally {
      isSaving.current = false
    }
  }

  const judgeCapture = useCallback(() => {
    setPhase('judging')
    setTimeout(() => {
      if (DEMO_CHEAT_100) checkFusionTrigger()
      else setPhase('fled')
    }, 700)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monster])

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (phase !== 'fighting') return
      const point = 'touches' in e ? e.touches[0] : e
      const rect  = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = point.clientX - rect.left
      const y = point.clientY - rect.top
      if (lastPos.current) {
        const dx   = x - lastPos.current.x
        const dy   = y - lastPos.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const dmg  = Math.min(25, Math.max(5, Math.round(dist / 6)))
        setHp((prev) => {
          const next = Math.max(0, prev - dmg)
          if (next === 0 && prev > 0) setTimeout(judgeCapture, 400)
          return next
        })
        registerHit(x, y, dmg)
      }
      lastPos.current = { x, y }
    },
    [phase, registerHit, judgeCapture],
  )

  const hpPercent = (hp / DEFAULT_MAX_HP) * 100

  return (
    <div className="absolute inset-0 z-10 select-none bg-transparent" style={{ touchAction: 'none' }}>
      {/* HP 바 */}
      {(phase === 'fighting' || phase === 'judging') && (
        <div className="absolute top-0 left-0 right-0 p-4 z-20 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-white font-bold text-lg drop-shadow">{monster.name}</span>
            <button onClick={onClose} className="bg-black/40 text-white rounded-lg px-2.5 py-1">✕</button>
          </div>
          <div className="h-2.5 bg-black/40 rounded-md overflow-hidden">
            <div
              className="h-full transition-all duration-150"
              style={{
                width: `${hpPercent}%`,
                background: hpPercent > 50 ? '#4ade80' : hpPercent > 20 ? '#facc15' : '#ef4444',
              }}
            />
          </div>
        </div>
      )}

      {/* 타격 영역 + 몬스터 이미지 */}
      <div
        className="absolute inset-0 z-10"
        onMouseMove={handleMove}
        onTouchMove={handleMove}
        onMouseUp={() => { lastPos.current = null }}
        onTouchEnd={() => { lastPos.current = null }}
      >
        {(phase === 'fighting' || phase === 'judging') && (
          <img
            src={monster.imageUrl}
            alt={monster.name}
            draggable={false}
            className="absolute top-1/2 left-1/2 w-40 h-40 object-contain pointer-events-none transition-transform"
            style={{ transform: `translate(-50%, -50%) ${shake ? 'scale(1.1) rotate(3deg)' : ''}` }}
          />
        )}
        {hits.map((h) => (
          <div
            key={h.id}
            className="absolute font-extrabold text-2xl text-white pointer-events-none"
            style={{
              left: h.x, top: h.y,
              transform: 'translate(-50%, -50%)',
              textShadow: '0 0 8px #ff6b35, 0 2px 4px #000',
              animation: 'catchFloatUp 0.6s ease-out forwards',
            }}
          >
            -{h.dmg}
          </div>
        ))}
      </div>

      {/* 하단 팝업 */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-20 text-center">
        {phase === 'fighting' && (
          <p className="inline-block text-white text-base bg-black/60 px-4 py-2 rounded-full drop-shadow">
            👆 화면을 마구 문질러서 체력을 깎으세요!
          </p>
        )}

        {phase === 'judging' && (
          <p className="text-yellow-300 text-lg font-bold animate-pulse">캡슐 가동 중...</p>
        )}

        {phase === 'caught' && (
          <div className="bg-slate-900/95 text-white rounded-2xl p-5 border border-green-500 shadow-xl">
            <p className="text-green-400 text-xl font-extrabold mb-1">🎉 포획 성공! 🎉</p>
            <p className="text-gray-300 text-sm mb-4">{monster.name}이(가) 도감에 추가됐습니다.</p>
            <button onClick={onClose} className="bg-green-500 text-slate-950 font-bold px-7 py-2.5 rounded-xl w-full">
              확인
            </button>
          </div>
        )}

        {phase === 'fusion_ready' && (
          <div className="bg-slate-900/95 text-white rounded-2xl p-6 border-2 border-amber-400 shadow-2xl">
            <div className="text-amber-400 text-xs font-bold tracking-wider mb-1">✨ SPECIAL EVOLUTION ✨</div>
            <p className="text-xl font-black text-yellow-300 mb-2">{FUSION_REQUIRED}마리 포획 완료! 공명 감지</p>
            <p className="text-sm text-gray-300 mb-4">
              총 <span className="text-amber-400 font-bold">{FUSION_REQUIRED}마리</span>가 모였습니다.<br />
              여기서 즉시 <span className="text-green-400 font-bold">말차튀소</span>로 융합하겠습니까?
            </p>
            <button
              onClick={executeFusion}
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black py-3.5 rounded-xl text-base shadow-lg"
            >
              🍵 즉시 말차튀소로 융합하기!
            </button>
          </div>
        )}

        {phase === 'fusing' && (
          <div className="bg-slate-900/95 text-white rounded-2xl p-6 border border-green-400 shadow-xl">
            <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-green-400 font-bold text-base tracking-wide">{fusionLog}</p>
          </div>
        )}

        {phase === 'fusion_complete' && (
          <div className="bg-gradient-to-b from-slate-900 to-green-950 text-white rounded-2xl p-6 border-2 border-green-400 shadow-2xl">
            <h3 className="text-2xl font-black text-green-400 mb-1">🍵 말차튀소 진화 성공! 🍵</h3>
            <p className="text-xs text-gray-400 mb-4">성심당 구역 한정판 레어 소보로 몬스터</p>
            <div className="bg-black/40 rounded-xl py-3.5 mb-3 border border-green-900/50 px-3 text-sm text-gray-300">
              {monster.name} {FUSION_REQUIRED}마리가 하나로 합쳐져{' '}
              <span className="text-green-400 font-bold">말차튀소 1마리</span>로 도감에 영구 저장되었습니다!
            </div>
            <p className="text-xs text-amber-300 mb-4">🎫 쿠폰함에서 발급된 쿠폰을 확인하세요!</p>
            <button onClick={onClose} className="bg-green-400 text-slate-950 font-black px-8 py-3 rounded-xl w-full text-base">
              도감함에서 확인하기
            </button>
          </div>
        )}

        {phase === 'fled' && (
          <div className="bg-slate-900/95 text-white rounded-2xl p-5 border border-red-400 shadow-xl">
            <p className="text-red-400 text-xl font-extrabold mb-1">😢 도망갔다!</p>
            <button onClick={onClose} className="bg-gray-600 text-white font-bold px-7 py-2.5 rounded-xl w-full mt-3">
              돌아가기
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes catchFloatUp {
          0%   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -140%) scale(1.3); }
        }
      `}</style>
    </div>
  )
}
