import { useState } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Shop } from '../../../types'

type ShopFormData = Omit<Shop, 'id'>

const CATEGORIES = ['음식', '카페', '전통공예', '의류', '기타']

export default function ShopRegisterForm() {
  const [form, setForm] = useState<ShopFormData>({
    name: '',
    category: '',
    image: '',
    lat: 0,
    lng: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'lat' || name === 'lng' ? parseFloat(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await addDoc(collection(db, 'shops'), form)
      setSuccess(true)
      setForm({ name: '', category: '', image: '', lat: 0, lng: 0 })
    } catch (err) {
      setError('가게 등록에 실패했습니다.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-bold">가게 등록</h2>

      <input
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="가게 이름"
        required
        className="border rounded p-2"
      />

      <select
        name="category"
        value={form.category}
        onChange={handleChange}
        required
        className="border rounded p-2"
      >
        <option value="">카테고리 선택</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <input
        name="image"
        value={form.image}
        onChange={handleChange}
        placeholder="이미지 URL"
        className="border rounded p-2"
      />

      <div className="flex gap-2">
        <input
          name="lat"
          type="number"
          step="any"
          value={form.lat || ''}
          onChange={handleChange}
          placeholder="위도 (lat)"
          required
          className="border rounded p-2 flex-1"
        />
        <input
          name="lng"
          type="number"
          step="any"
          value={form.lng || ''}
          onChange={handleChange}
          placeholder="경도 (lng)"
          required
          className="border rounded p-2 flex-1"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-500 text-sm">가게가 등록되었습니다!</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded p-2 disabled:opacity-50"
      >
        {loading ? '등록 중...' : '가게 등록'}
      </button>
    </form>
  )
}
