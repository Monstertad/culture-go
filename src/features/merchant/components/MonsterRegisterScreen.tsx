import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Shop, Monster } from '../../../types'

type MonsterForm = Omit<Monster, 'id'>

const CATEGORIES = ['빵', '음식', '카페', '전통공예', '의류', '기타']

// 데모용: API 키는 .env에 VITE_ANTHROPIC_API_KEY로 설정
async function generateMonsterWithAI(shopName: string, category: string): Promise<{ name: string; description: string }> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY가 설정되지 않았습니다.')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `충청도 로컬 AR 게임 "컬쳐GO"용 귀여운 몬스터를 만들어줘.
가게명: ${shopName}
카테고리: ${category}

조건:
- 이름: 가게/지역 특색을 반영한 귀여운 한국어 이름 (예: 튀소용, 밤비노)
- 설명: 1문장, 몬스터 특징 묘사

반드시 아래 JSON만 응답해:
{"name": "몬스터이름", "description": "특징 설명"}`,
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`AI 요청 실패: ${res.status}`)
  const data = await res.json()
  const text: string = data.content[0].text.trim()
  return JSON.parse(text)
}

export default function MonsterRegisterScreen() {
  const [shops, setShops] = useState<Shop[]>([])
  const [form, setForm] = useState<MonsterForm>({
    shopId: '',
    name: '',
    category: '',
    lat: 0,
    lng: 0,
    status: 'approved',
    imageUrl: '',
  })
  const [aiDesc, setAiDesc] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    getDocs(collection(db, 'shops')).then((snap) => {
      setShops(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Shop))
    })
  }, [])

  const selectedShop = shops.find((s) => s.id === form.shopId)

  const handleShopSelect = (shopId: string) => {
    const shop = shops.find((s) => s.id === shopId)
    if (!shop) return
    setForm((prev) => ({
      ...prev,
      shopId,
      category: shop.category,
      // 상점 좌표 근처 랜덤 오프셋 (반경 ~30m)
      lat: shop.lat + (Math.random() - 0.5) * 0.0005,
      lng: shop.lng + (Math.random() - 0.5) * 0.0005,
    }))
  }

  const handleAiGenerate = async () => {
    if (!selectedShop) {
      setMessage({ type: 'error', text: '먼저 가게를 선택해주세요.' })
      return
    }
    setIsGenerating(true)
    setMessage(null)
    try {
      const result = await generateMonsterWithAI(selectedShop.name, selectedShop.category)
      setForm((prev) => ({ ...prev, name: result.name }))
      setAiDesc(result.description)
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'AI 생성 실패' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.shopId || !form.name) return
    setIsSubmitting(true)
    setMessage(null)
    try {
      await addDoc(collection(db, 'monsters'), {
        ...form,
        // 소수점 6자리로 정리
        lat: parseFloat(form.lat.toFixed(6)),
        lng: parseFloat(form.lng.toFixed(6)),
      })
      setMessage({ type: 'success', text: `"${form.name}" 몬스터가 등록됐습니다!` })
      setForm({ shopId: '', name: '', category: '', lat: 0, lng: 0, status: 'approved', imageUrl: '' })
      setAiDesc('')
    } catch {
      setMessage({ type: 'error', text: '몬스터 등록에 실패했습니다.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold">몬스터 등록</h2>

      {/* 가게 선택 */}
      <div>
        <label className="text-sm text-gray-500 mb-1 block">연결할 가게</label>
        <select
          value={form.shopId}
          onChange={(e) => handleShopSelect(e.target.value)}
          required
          className="border rounded p-2 w-full"
        >
          <option value="">가게 선택</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
          ))}
        </select>
      </div>

      {/* 카테고리 (자동 입력 or 수동) */}
      <div>
        <label className="text-sm text-gray-500 mb-1 block">카테고리</label>
        <select
          value={form.category}
          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
          required
          className="border rounded p-2 w-full"
        >
          <option value="">카테고리 선택</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* AI 생성 버튼 */}
      <button
        type="button"
        onClick={handleAiGenerate}
        disabled={isGenerating || !form.shopId}
        className="bg-purple-500 text-white rounded p-2 font-bold disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <span className="animate-spin">⚙️</span> AI 생성 중...
          </>
        ) : (
          '✨ AI로 몬스터 이름 자동 생성'
        )}
      </button>

      {/* 몬스터 이름 */}
      <div>
        <label className="text-sm text-gray-500 mb-1 block">몬스터 이름</label>
        <input
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="예: 튀소용"
          required
          className="border rounded p-2 w-full"
        />
        {aiDesc && (
          <p className="text-xs text-purple-600 mt-1 bg-purple-50 rounded p-2">{aiDesc}</p>
        )}
      </div>

      {/* 이미지 URL */}
      <div>
        <label className="text-sm text-gray-500 mb-1 block">이미지 URL</label>
        <input
          value={form.imageUrl}
          onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
          placeholder="https://..."
          className="border rounded p-2 w-full"
        />
      </div>

      {/* 좌표 (가게 선택 시 자동 입력) */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-sm text-gray-500 mb-1 block">위도</label>
          <input
            type="number"
            step="any"
            value={form.lat || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, lat: parseFloat(e.target.value) }))}
            placeholder="36.3278"
            required
            className="border rounded p-2 w-full"
          />
        </div>
        <div className="flex-1">
          <label className="text-sm text-gray-500 mb-1 block">경도</label>
          <input
            type="number"
            step="any"
            value={form.lng || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, lng: parseFloat(e.target.value) }))}
            placeholder="127.4275"
            required
            className="border rounded p-2 w-full"
          />
        </div>
      </div>

      <p className="text-xs text-gray-400">* 가게 선택 시 근처 좌표가 자동 입력됩니다. status는 즉시 approved로 저장됩니다.</p>

      {message && (
        <p className={`text-sm rounded p-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-yellow-400 font-bold rounded p-2 disabled:opacity-40"
      >
        {isSubmitting ? '등록 중...' : '몬스터 등록'}
      </button>
    </form>
  )
}
