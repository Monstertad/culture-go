import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Shop } from '../../../types'

const DISCOUNT_PRESETS = [
  '10% 할인 쿠폰',
  '15% 할인 쿠폰',
  '20% 할인 쿠폰',
  '음료 1잔 무료',
  '2+1 쿠폰',
  '직접 입력',
]

export default function CouponTemplateScreen() {
  const [shops, setShops] = useState<Shop[]>([])
  const [selectedShopId, setSelectedShopId] = useState('')
  const [presetIndex, setPresetIndex] = useState<number | null>(null)
  const [customTitle, setCustomTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    getDocs(collection(db, 'shops')).then((snap) => {
      setShops(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Shop))
    })
  }, [])

  const selectedShop = shops.find((s) => s.id === selectedShopId)
  const isCustom = presetIndex === DISCOUNT_PRESETS.length - 1
  const title = isCustom ? customTitle : (presetIndex !== null ? DISCOUNT_PRESETS[presetIndex] : '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedShop || !title) return
    setIsSubmitting(true)
    setMessage(null)
    try {
      await addDoc(collection(db, 'coupons'), {
        userId: '',           // 융합 시 유저 ID가 채워짐
        shopId: selectedShopId,
        shopName: selectedShop.name,
        title: selectedShop.name + ' ' + title,
        category: selectedShop.category,
        isUsed: false,
        createdAt: serverTimestamp(),
      })
      setMessage({ type: 'success', text: '쿠폰 템플릿이 등록됐습니다!' })
      setSelectedShopId('')
      setPresetIndex(null)
      setCustomTitle('')
    } catch {
      setMessage({ type: 'error', text: '쿠폰 등록에 실패했습니다.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold">쿠폰 템플릿 등록</h2>
      <p className="text-sm text-gray-400">유저가 몬스터를 융합할 때 자동 발급될 쿠폰 내용을 설정합니다.</p>

      {/* 가게 선택 */}
      <div>
        <label className="text-sm text-gray-500 mb-1 block">가게 선택</label>
        <select
          value={selectedShopId}
          onChange={(e) => setSelectedShopId(e.target.value)}
          required
          className="border rounded p-2 w-full"
        >
          <option value="">가게를 선택하세요</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
          ))}
        </select>
      </div>

      {/* 할인 프리셋 */}
      <div>
        <label className="text-sm text-gray-500 mb-2 block">할인 내용</label>
        <div className="grid grid-cols-2 gap-2">
          {DISCOUNT_PRESETS.map((preset, i) => (
            <button
              key={preset}
              type="button"
              onClick={() => setPresetIndex(i)}
              className={`border rounded-lg p-2 text-sm text-left transition-colors ${
                presetIndex === i
                  ? 'border-yellow-400 bg-yellow-50 font-bold'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* 직접 입력 */}
      {isCustom && (
        <div>
          <label className="text-sm text-gray-500 mb-1 block">직접 입력</label>
          <input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="예: 튀김소보로 1개 무료 증정"
            required={isCustom}
            className="border rounded p-2 w-full"
          />
        </div>
      )}

      {/* 미리보기 */}
      {selectedShop && title && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">쿠폰 미리보기</p>
          <p className="font-bold">{selectedShop.name} {title}</p>
          <p className="text-xs text-gray-500 mt-1">{selectedShop.category} · 미사용</p>
        </div>
      )}

      {message && (
        <p className={`text-sm rounded p-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !selectedShopId || !title}
        className="bg-yellow-400 font-bold rounded p-2 disabled:opacity-40"
      >
        {isSubmitting ? '등록 중...' : '쿠폰 템플릿 저장'}
      </button>
    </form>
  )
}
