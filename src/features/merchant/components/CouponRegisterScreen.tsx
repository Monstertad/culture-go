import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'

interface CouponSlot {
  title: string
  benefit: string
}

interface ApprovedCoupon {
  title: string
  benefit: string
}

interface Props {
  monsterId: string
  monsterName: string
  monsterImageUrl: string
  shopId: string
  shopName: string
  onComplete: () => void
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export default function CouponRegisterScreen({
  monsterId, monsterName, monsterImageUrl, shopId, shopName, onComplete,
}: Props) {
  const [coupons, setCoupons] = useState<CouponSlot[]>([
    { title: '', benefit: '' },
    { title: '', benefit: '' },
    { title: '', benefit: '' },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [approvedCoupons, setApprovedCoupons] = useState<ApprovedCoupon[]>([])
  const [showApprovalPopup, setShowApprovalPopup] = useState(false)

  const update = (idx: number, field: keyof CouponSlot, value: string) => {
    setCoupons((prev) => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  const handleRegister = async () => {
    const filled = coupons.filter((c) => c.title.trim() && c.benefit.trim())
    if (filled.length === 0) {
      setError('최소 1개의 쿠폰을 입력해주세요.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      // 쿠폰 저장 (모킹: status 즉시 'approved')
      await Promise.all(
        filled.map((coupon) =>
          addDoc(collection(db, 'coupons'), {
            monsterId,
            monsterName,
            shopId,
            shopName,
            title: coupon.title.trim(),
            benefit: coupon.benefit.trim(),
            isUsed: false,
            isActive: true,
            status: 'approved',
            createdAt: serverTimestamp(),
          })
        )
      )
      // 모킹: 관리자 승인 처리 딜레이
      await delay(1200)
      setApprovedCoupons(filled)
      setShowApprovalPopup(true)
    } catch {
      setError('쿠폰 등록 실패. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <img
          src={monsterImageUrl}
          alt={monsterName}
          className="w-14 h-14 object-contain rounded-xl bg-gradient-to-b from-purple-50 to-amber-50 p-1"
        />
        <div>
          <p className="text-xs font-bold text-amber-500">쿠폰 등록</p>
          <h2 className="text-lg font-black text-gray-900">{monsterName}</h2>
          <p className="text-xs text-gray-400">최대 3종 쿠폰을 등록할 수 있어요</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 bg-blue-50 rounded-xl px-4 py-3">
        💡 유저가 이 몬스터를 잡으면 쿠폰을 수령하고 매장에서 사용할 수 있어요.
      </p>

      {/* 쿠폰 3개 슬롯 */}
      {coupons.map((coupon, idx) => (
        <div key={idx} className="flex flex-col gap-2 border border-gray-100 rounded-2xl p-4">
          <p className="text-sm font-black text-gray-700">쿠폰 {idx + 1}</p>
          <input
            value={coupon.title}
            onChange={(e) => update(idx, 'title', e.target.value)}
            placeholder="쿠폰 이름 (예: 아메리카노 무료 쿠폰)"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400"
          />
          <input
            value={coupon.benefit}
            onChange={(e) => update(idx, 'benefit', e.target.value)}
            placeholder="혜택 내용 (예: 아메리카노 1잔 무료 증정)"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400"
          />
        </div>
      ))}

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">❌ {error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onComplete}
          disabled={isSubmitting}
          className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-bold text-gray-500 disabled:opacity-40"
        >
          건너뛰기
        </button>
        <button
          onClick={handleRegister}
          disabled={isSubmitting}
          className="flex-1 bg-amber-400 text-black font-black rounded-xl py-3 text-sm disabled:opacity-40"
        >
          {isSubmitting ? '⏳ 승인 처리 중...' : '🎫 쿠폰 등록 완료'}
        </button>
      </div>

      {/* 쿠폰 승인 팝업 */}
      {showApprovalPopup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-3xl overflow-y-auto max-h-[85vh]">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* 승인 배지 */}
            <div className="flex justify-center py-4">
              <span className="bg-green-500 text-white text-sm font-bold px-5 py-1.5 rounded-full shadow-md">
                ✅ 쿠폰이 승인되었습니다!
              </span>
            </div>

            {/* 몬스터 썸네일 */}
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-b from-purple-50 to-amber-50 flex items-center justify-center p-2">
                <img src={monsterImageUrl} alt={monsterName} className="w-full h-full object-contain" />
              </div>
            </div>
            <p className="text-center font-black text-gray-900 mt-2">{monsterName}의 쿠폰</p>

            {/* 승인된 쿠폰 목록 */}
            <div className="px-5 mt-4 flex flex-col gap-3">
              {approvedCoupons.map((c, i) => (
                <div key={i} className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl">🎫</span>
                  <div>
                    <p className="text-sm font-black text-gray-900">{c.title}</p>
                    <p className="text-xs text-amber-700 mt-0.5">{c.benefit}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 pb-8 mt-5">
              <p className="text-xs text-center text-gray-400 mb-4">
                유저가 {monsterName}을 잡으면 위 쿠폰 중 하나를 수령합니다
              </p>
              <button
                onClick={onComplete}
                className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl text-base"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
