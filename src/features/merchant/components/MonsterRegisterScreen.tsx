import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import {
  callGenerateMonster,
  GeneratedMonster,
  RARITY_LABEL,
  RARITY_COLOR,
} from '../../../services/monsterAI'
import type { Shop } from '../../../types'

type Step =
  | 'idle'
  | 'analyzing'   // GPT 텍스트 생성 중
  | 'imaging'     // 이미지 생성 중
  | 'saving'      // Storage + Firestore 저장 중
  | 'preview'     // 완료 → 미리보기
  | 'error'

const STEP_LABEL: Record<string, string> = {
  analyzing: '🧠 가게 특징 분석 중...',
  imaging:   '🎨 몬스터 이미지 생성 중... (약 30초)',
  saving:    '💾 Firebase 저장 중...',
}

export default function MonsterRegisterScreen() {
  const [shops, setShops] = useState<Shop[]>([])
  const [selectedShopId, setSelectedShopId] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [monster, setMonster] = useState<GeneratedMonster | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    getDocs(collection(db, 'shops')).then((snap) => {
      setShops(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Shop))
    })
  }, [])

  const selectedShop = shops.find((s) => s.id === selectedShopId)

  const handleGenerate = async () => {
    if (!selectedShop) return
    setMonster(null)
    setErrorMsg('')

    // 단계 UI 타이머 — 실제 진행은 Cloud Function 내부에서 처리됨
    const imagingTimer = setTimeout(() => setStep('imaging'), 4000)
    const savingTimer  = setTimeout(() => setStep('saving'),  35000)

    try {
      setStep('analyzing')

      // 상점 근처 랜덤 좌표 (반경 ~30m)
      const lat = selectedShop.lat + (Math.random() - 0.5) * 0.0005
      const lng = selectedShop.lng + (Math.random() - 0.5) * 0.0005

      // Firebase Function 호출 — API 키는 서버에서만 사용, 프론트에 노출 없음
      const result = await callGenerateMonster({
        shopId:   selectedShop.id,
        shopName: selectedShop.name,
        category: selectedShop.category,
        lat,
        lng,
      })

      clearTimeout(imagingTimer)
      clearTimeout(savingTimer)

      setMonster(result)
      setStep('preview')
    } catch (e) {
      clearTimeout(imagingTimer)
      clearTimeout(savingTimer)
      setStep('error')
      setErrorMsg(e instanceof Error ? e.message : '몬스터 생성에 실패했습니다.')
    }
  }

  const handleReset = () => {
    setStep('idle')
    setMonster(null)
    setSelectedShopId('')
    setErrorMsg('')
  }

  const isLoading = step === 'analyzing' || step === 'imaging' || step === 'saving'

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold">몬스터 등록</h2>

      {/* 가게 선택 */}
      <div>
        <label className="text-sm text-gray-500 mb-1 block">가게 선택</label>
        <select
          value={selectedShopId}
          onChange={(e) => setSelectedShopId(e.target.value)}
          disabled={isLoading}
          className="border rounded p-2 w-full disabled:opacity-40"
        >
          <option value="">가게를 선택하세요</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.category})
            </option>
          ))}
        </select>
      </div>

      {/* 생성 버튼 */}
      {step !== 'preview' && (
        <button
          onClick={handleGenerate}
          disabled={!selectedShopId || isLoading}
          className="bg-gradient-to-r from-purple-500 to-yellow-400 text-white font-bold rounded-xl p-3 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="animate-spin text-lg">⚙️</span>
              {STEP_LABEL[step]}
            </>
          ) : (
            '✨ AI로 몬스터 생성'
          )}
        </button>
      )}

      {/* 단계 진행 표시 */}
      {isLoading && (
        <div className="flex flex-col gap-2 bg-gray-50 rounded-xl p-3">
          {(['analyzing', 'imaging', 'saving'] as const).map((s) => {
            const done =
              step === 'saving' ? s !== 'saving' :
              step === 'imaging' ? s === 'analyzing' : false
            const active = step === s
            return (
              <div key={s} className="flex items-center gap-2 text-sm">
                <span className={done ? 'text-green-500' : active ? 'text-yellow-500 animate-pulse' : 'text-gray-300'}>
                  {done ? '✅' : active ? '⏳' : '○'}
                </span>
                <span className={done ? 'text-gray-400 line-through' : active ? 'font-medium' : 'text-gray-300'}>
                  {STEP_LABEL[s]}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* 완성 몬스터 미리보기 */}
      {step === 'preview' && monster && (
        <div className="border-2 border-yellow-400 rounded-2xl overflow-hidden">
          {/* 이미지 */}
          <div className="aspect-square w-full bg-gradient-to-b from-purple-50 to-yellow-50 flex items-center justify-center">
            {monster.imageUrl ? (
              <img
                src={monster.imageUrl}
                alt={monster.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-6xl">🐉</span>
            )}
          </div>

          {/* 정보 */}
          <div className="p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xl font-bold">{monster.name}</p>
                <p className="text-sm text-gray-500">{monster.attribute} 속성 · {monster.category}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${RARITY_COLOR[monster.rarity]}`}>
                {RARITY_LABEL[monster.rarity]}
              </span>
            </div>
            <p className="text-sm text-gray-600">{monster.description}</p>
            <p className="text-xs text-green-600 bg-green-50 rounded p-2">
              ✅ Firestore 저장 완료 · status: approved · 지도에 즉시 반영됩니다
            </p>
          </div>

          {/* 액션 */}
          <div className="flex gap-2 p-4 pt-0">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 border border-gray-300 rounded-lg p-2 text-sm"
            >
              새 몬스터 등록
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              className="flex-1 bg-purple-100 text-purple-700 rounded-lg p-2 text-sm font-medium"
            >
              다시 생성
            </button>
          </div>
        </div>
      )}

      {/* 에러 */}
      {step === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col gap-2">
          <p className="text-red-600 text-sm font-medium">❌ {errorMsg}</p>
          <button
            type="button"
            onClick={() => setStep('idle')}
            className="text-xs text-gray-400 underline self-start"
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  )
}
