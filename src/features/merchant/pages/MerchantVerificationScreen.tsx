import { useState } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { useAuth } from '../../auth/AuthContext'
import KakaoPlaceSearch, { type SelectedPlace } from '../components/KakaoPlaceSearch'

interface Props {
  onVerified: () => void
}

export default function MerchantVerificationScreen({ onVerified }: Props) {
  const { user } = useAuth()
  const [place, setPlace] = useState<SelectedPlace | null>(null)
  const [businessNumber, setBusinessNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !place) return
    setIsSubmitting(true)
    setError('')
    try {
      await setDoc(doc(db, 'merchants', user.id), {
        uid: user.id,
        shopName: place.name,
        shopId: place.id,
        category: place.category,
        lat: place.lat,
        lng: place.lng,
        businessNumber,
        status: 'verified', // 데모: 즉시 인증 처리
        createdAt: serverTimestamp(),
      })
      onVerified()
    } catch {
      setError('인증 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="px-5 pt-12 pb-6 shrink-0">
        <p className="text-xs font-bold text-amber-500 mb-1">상인 시스템</p>
        <h1 className="text-2xl font-black text-gray-900">가게 인증</h1>
        <p className="text-sm text-gray-400 mt-1">
          최초 1회 인증 후 상인 대시보드를 이용하실 수 있습니다.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 flex flex-col gap-5 pb-8">
        {/* 가게 검색 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            가게 검색 <span className="text-red-400">*</span>
          </label>
          <KakaoPlaceSearch onSelect={setPlace} />
          {place && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="font-bold text-sm text-gray-900">{place.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {place.category} · {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
              </p>
            </div>
          )}
        </div>

        {/* 사업자번호 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            사업자번호 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={businessNumber}
            onChange={(e) => setBusinessNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
            placeholder="숫자 10자리 (예: 1234567890)"
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
          />
          <p className="text-xs text-gray-400 mt-1">하이픈(-) 없이 숫자만 입력</p>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={!place || businessNumber.length !== 10 || isSubmitting}
          className="w-full bg-amber-400 text-black font-black py-4 rounded-2xl text-base disabled:opacity-40 disabled:cursor-not-allowed mt-auto"
        >
          {isSubmitting ? '인증 처리 중...' : '가게 인증 완료'}
        </button>

        <p className="text-xs text-center text-gray-300">
          데모 버전: 제출 즉시 인증이 완료됩니다
        </p>
      </form>
    </div>
  )
}
