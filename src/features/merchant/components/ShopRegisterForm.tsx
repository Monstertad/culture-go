import { useState } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Shop } from '../../../types'
import KakaoPlaceSearch, { type SelectedPlace } from './KakaoPlaceSearch'

type ShopFormData = Omit<Shop, 'id'>

const CATEGORIES = ['음식', '카페', '전통공예', '의류', '기타']

export default function ShopRegisterForm() {
  const [form, setForm] = useState<ShopFormData>({ name: '', category: '', image: '', lat: 0, lng: 0 })
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handlePlaceSelect = (place: SelectedPlace) => {
    setSelectedPlace(place)
    setForm((prev) => ({ ...prev, name: place.name, lat: place.lat, lng: place.lng }))
  }

  const clearPlace = () => {
    setSelectedPlace(null)
    setForm((prev) => ({ ...prev, name: '', lat: 0, lng: 0 }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlace) { setError('가게 위치를 검색해서 선택해주세요.'); return }
    if (!form.category) { setError('카테고리를 선택해주세요.'); return }
    setLoading(true)
    setError(null)
    try {
      await addDoc(collection(db, 'shops'), form)
      setSuccess(true)
      setForm({ name: '', category: '', image: '', lat: 0, lng: 0 })
      setSelectedPlace(null)
    } catch (err) {
      console.error(err)
      setError('가게 등록에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-6">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
          <span className="text-3xl">✅</span>
        </div>
        <p className="font-black text-lg text-gray-900">가게가 등록됐습니다!</p>
        <p className="text-sm text-gray-400 text-center">관리자 승인 후 지도에 표시됩니다.</p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-2 px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 font-bold text-sm text-gray-900 transition-colors"
        >
          다른 가게 등록하기
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 pt-6 pb-8">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500">가게 위치 검색</label>
        {selectedPlace ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
            <span className="text-base">📍</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-900 truncate">{selectedPlace.name}</p>
              <p className="text-xs text-gray-400 truncate">{selectedPlace.address}</p>
            </div>
            <button
              type="button"
              onClick={clearPlace}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-200 text-amber-700 hover:bg-amber-300 transition-colors shrink-0 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        ) : (
          <KakaoPlaceSearch onSelect={handlePlaceSelect} />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500">가게 이름</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="가게 이름 (검색 선택 시 자동 입력)"
          required
          className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 border border-transparent text-sm placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500">카테고리</label>
        <select
          value={form.category}
          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
          required
          className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 border border-transparent text-sm text-gray-700 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors appearance-none"
        >
          <option value="">카테고리 선택</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500">이미지 URL (선택)</label>
        <input
          type="url"
          value={form.image}
          onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
          placeholder="https://..."
          className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 border border-transparent text-sm placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
        />
      </div>

      {error && (
        <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-100">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50 font-bold text-gray-900 text-sm transition-all shadow-sm shadow-amber-200 mt-1"
      >
        {loading ? '등록 중...' : '가게 등록하기'}
      </button>
    </form>
  )
}
