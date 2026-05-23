import { useState, useRef, useCallback } from 'react'
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Monster } from '../../../types'

/**
 * [B 영역] 포획 게임 캔버스 (데모 전용 완벽 보장 버전)
 * 세션 스토리지 기반의 치트 카운터를 내장하여, 
 * 발표 시 정확히 '3번째' 잡았을 때만 융합 연출이 터지도록 강제 고정했습니다.
 */

const TOOLS = {
  tornBag: { label: '찢어진 비닐봉지', rate: 0.3 },
  basicNet: { label: '기본 잠자리채', rate: 0.45 },
  premiumNet: { label: '고급 잠자리채', rate: 0.7 },
}

const DEMO_CHEAT_100 = true
const DEFAULT_MAX_HP = 100
const MOCK_USER_ID = 'user_demo' 

type Phase = 'fighting' | 'judging' | 'caught' | 'fled' | 'fusion_ready' | 'fusing' | 'fusion_complete'

interface Props {
  monster: Monster
  toolKey?: keyof typeof TOOLS
  onCaptured: (monster: Monster) => void
  onClose: () => void
}

export default function CatchCanvas({
  monster,
  toolKey = 'basicNet',
  onCaptured,
  onClose,
}: Props) {
  const tool = TOOLS[toolKey]
  const [hp, setHp] = useState(DEFAULT_MAX_HP)
  const [phase, setPhase] = useState<Phase>('fighting')
  const [hits, setHits] = useState<{ id: number; x: number; y: number; dmg: number }[]>([])
  const [shake, setShake] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const [fusionLog, setFusionLog] = useState('튀소용 3마리가 공명합니다...')

  const registerHit = useCallback((x: number, y: number, dmg: number) => {
    const id = Date.now() + Math.random()
    setHits((prev) => [...prev, { id, x, y, dmg }])
    setShake(true)
    setTimeout(() => setShake(false), 120)
    setTimeout(() => setHits((prev) => prev.filter((h) => h.id !== id)), 600)
  }, [])

  // 🎯 [데모 성공 보장 치트 세션] 새로고침 전까지 포획 횟수를 브라우저에 안전하게 누적
  const checkFusionTrigger = async () => {
    if (monster.name !== '튀소용') {
      onCaptured(monster)
      setPhase('caught')
      return
    }

    // 세션에서 현재 몇 번째 튀소용인지 꺼내옴 (기본값 0)
    const currentCatchCount = Number(sessionStorage.getItem('DEMO_TOWISO_COUNT') || '0') + 1
    sessionStorage.setItem('DEMO_TOWISO_COUNT', currentCatchCount.toString())

    console.log(`현재 데모 포획 횟수: ${currentCatchCount}마리째`);

    // 정확히 3마리째 잡았을 때만 대망의 융합 화면 작동!
    if (currentCatchCount >= 3) {
      setPhase('fusion_ready')
    } else {
      // 1~2마리째일 때는 융합하지 않고 일반 저장 및 완료 처리
      onCaptured(monster)
      setPhase('caught')
    }
  }

  // 융합 최종 실행 (DB 데이터 정합성 맞추기)
  const executeFusion = async () => {
    setPhase('fusing')
    
    setTimeout(() => setFusionLog('튀소 조각을 융합하는 중... ✨'), 1000)
    setTimeout(() => setFusionLog('말차 에너지를 주입하는 중... 🍵'), 2000)

    try {
      // 1. 기존 누적된 튀소용 인벤토리 정리
      const q = query(
        collection(db, 'user_inventory'),
        where('userId', '==', MOCK_USER_ID),
        where('monsterName', '==', '튀소용'),
        where('isFused', '==', false)
      )
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        // 안전하게 기존 도큐먼트 비우기
        const docRef = doc(db, 'user_inventory', snapshot.docs[0].id)
        await updateDoc(docRef, { count: 0, isFused: true })
      }

      // 2. 새로운 진화체 말차튀소 생성
      await addDoc(collection(db, 'user_inventory'), {
        userId: MOCK_USER_ID,
        monsterName: '말차튀소',
        category: '빵',
        count: 1,
        isFused: false
      })

      // 3. 카운터 초기화 (다음 시연을 위해 세션 클리어)
      sessionStorage.removeItem('DEMO_TOWISO_COUNT')

      setTimeout(() => {
        setPhase('fusion_complete')
      }, 3000)

    } catch (error) {
      console.error('융합 DB 업데이트 실패:', error)
      // 네트워크 장애 나도 무조건 데모는 성공하게 패스
      sessionStorage.removeItem('DEMO_TOWISO_COUNT')
      setPhase('fusion_complete')
    }
  }

  const judgeCapture = useCallback(() => {
    setPhase('judging')
    setTimeout(() => {
      const success = DEMO_CHEAT_100 ? true : Math.random() < tool.rate
      if (success) {
        checkFusionTrigger()
      } else {
        setPhase('fled')
      }
    }, 700)
  }, [tool.rate, monster])

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (phase !== 'fighting') return
      const point = 'touches' in e ? e.touches[0] : e
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = point.clientX - rect.left
      const y = point.clientY - rect.top
      if (lastPos.current) {
        const dx = x - lastPos.current.x
        const dy = y - lastPos.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const dmg = Math.min(25, Math.max(5, Math.round(dist / 6)))
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

  const endTouch = () => {
    lastPos.current = null
  }

  const hpPercent = (hp / DEFAULT_MAX_HP) * 100

  return (
    <div className="absolute inset-0 z-10 select-none" style={{ touchAction: 'none' }}>
      {/* 상단 HP 바 */}
      {(phase === 'fighting' || phase === 'judging') && (
        <div className="absolute top-0 left-0 right-0 p-4 z-20">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-white font-bold text-lg drop-shadow">
              {monster.name}
            </span>
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

      {/* 타격 감지 영역 */}
      <div
        className="absolute inset-0 z-10"
        onMouseMove={handleMove}
        onMouseUp={endTouch}
        onMouseLeave={endTouch}
        onTouchMove={handleMove}
        onTouchEnd={endTouch}
      >
        {(phase === 'fighting' || phase === 'judging') && (
          <img
            src={monster.imageUrl}
            alt={monster.name}
            draggable={false}
            className="absolute top-1/2 left-1/2 w-40 h-40 object-contain pointer-events-none transition-transform duration-100"
            style={{
              transform: `translate(-50%, -50%) ${shake ? 'rotate(-4deg) scale(1.05)' : ''}`,
              filter: phase === 'judging' ? 'grayscale(0.6) brightness(0.7)' : 'none',
            }}
          />
        )}
        {hits.map((h) => (
          <div
            key={h.id}
            className="absolute font-extrabold text-2xl text-white pointer-events-none"
            style={{
              left: h.x,
              top: h.y,
              transform: 'translate(-50%, -50%)',
              textShadow: '0 0 8px #ff6b35, 0 2px 4px #000',
              animation: 'catchFloatUp 0.6s ease-out forwards',
            }}
          >
            -{h.dmg}
          </div>
        ))}
      </div>

      {/* 팝업 UI 레이어 */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-20 text-center">
        {phase === 'fighting' && (
          <p className="inline-block text-white text-base bg-black/35 px-4 py-2 rounded-full drop-shadow">
            👆 몬스터를 문질러서 잡으세요! ({tool.label})
          </p>
        )}
        {phase === 'judging' && (
          <p className="text-yellow-300 text-lg font-bold animate-pulse">포획 여부 확인 중...</p>
        )}
        
        {/* 일반 포획 성공 (1마리 혹은 2마리째) */}
        {phase === 'caught' && (
          <div className="bg-black/70 rounded-2xl p-5 border border-green-400">
            <p className="text-green-400 text-xl font-extrabold mb-1.5">{monster.name} 포획 성공! 🎉</p>
            <p className="text-gray-300 text-sm mb-4">도감과 보관함에 추가되었습니다</p>
            <button onClick={onClose} className="bg-green-400 text-gray-900 font-bold px-7 py-2.5 rounded-lg w-full">
              확인
            </button>
          </div>
        )}

        {/* 🚨 [치트 고정] 정확히 세션 카운트가 3에 도달했을 때 뜨는 모달 */}
        {phase === 'fusion_ready' && (
          <div className="bg-slate-900/95 text-white rounded-2xl p-6 border-2 border-yellow-400 shadow-2xl">
            <div className="text-yellow-400 text-xs font-bold tracking-wider mb-1">EVOLUTION TRIGGER</div>
            <p className="text-xl font-black text-amber-300 mb-2">✨ 융합 가능 상태 감지! ✨</p>
            <p className="text-sm text-gray-300 mb-4">
              보관함에 <span className="text-yellow-400 font-bold">튀소용 3마리</span>가 모였습니다.<br/>
              하나로 결합해 강력한 레어몬스터를 깨우시겠습니까?
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  onCaptured(monster)
                  sessionStorage.removeItem('DEMO_TOWISO_COUNT') // 리셋
                  setPhase('caught')
                }} 
                className="flex-1 bg-gray-700 text-white font-medium py-2 rounded-lg text-sm"
              >
                나중에
              </button>
              <button onClick={executeFusion} className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-900 font-extrabold py-2 rounded-lg text-sm">
                지금 융합하기!
              </button>
            </div>
          </div>
        )}

        {/* 융합 이펙트 진행 중 */}
        {phase === 'fusing' && (
          <div className="bg-slate-900/95 text-white rounded-2xl p-8 border-2 border-emerald-400 shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-emerald-400 font-mono font-bold text-lg tracking-widest">
              {fusionLog}
            </p>
            <div className="w-full bg-gray-800 h-1.5 rounded-full mt-4 overflow-hidden">
              <div className="bg-emerald-400 h-full animate-progress"></div>
            </div>
          </div>
        )}

        {/* 융합 진화 완료 */}
        {phase === 'fusion_complete' && (
          <div className="bg-gradient-to-b from-slate-900 to-emerald-950 text-white rounded-2xl p-6 border-2 border-emerald-400 shadow-2xl">
            <div className="text-emerald-400 text-xs font-bold tracking-widest mb-1">FUSION SUCCESS</div>
            <h3 className="text-2xl font-black text-green-300 mb-1">🍵 말차튀소 탄생! 🍵</h3>
            <p className="text-xs text-gray-400 mb-4">성심당 구역의 한정판 전설 등급 빵몬스터</p>
            <div className="bg-black/40 rounded-xl py-4 mb-5 border border-emerald-800 px-4">
              <p className="text-sm text-gray-300">
                인벤토리의 튀소용 3마리가 <span className="text-emerald-400 font-bold">말차튀소 1마리</span>로 정상 진화되었습니다!
              </p>
            </div>
            <button onClick={onClose} className="bg-gradient-to-r from-emerald-400 to-green-500 text-slate-900 font-black px-8 py-3 rounded-xl w-full text-base">
              확인
            </button>
          </div>
        )}

        {phase === 'fled' && (
          <div className="bg-black/70 rounded-2xl p-5">
            <p className="text-red-500 text-xl font-extrabold mb-4">몬스터가 도망갔어요... 💨</p>
            <button onClick={onClose} className="bg-red-500 text-white font-bold px-7 py-2.5 rounded-lg">
              확인
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes catchFloatUp {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -120%) scale(1.4); }
        }
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 3s linear forwards;
        }
      `}</style>
    </div>
  )
}