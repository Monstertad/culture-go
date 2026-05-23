import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Coupon } from '../../../types'

function calcFee(used: number): number {
  if (used <= 30)  return 0
  if (used <= 100) return (used - 30) * 100
  if (used <= 300) return 70 * 100 + (used - 100) * 70
  return 70 * 100 + 200 * 70 + (used - 300) * 50
}

function feeRange(used: number): string {
  if (used <= 30)  return '무료 구간 (1~30회)'
  if (used <= 100) return '건당 100원 (31~100회)'
  if (used <= 300) return '건당 70원 (101~300회)'
  return '건당 50원 (301회+)'
}

interface Props { shopId: string }

export default function CouponDashboard({ shopId }: Props) {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'coupons'), where('shopId', '==', shopId))
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id, ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      })) as Coupon[]
      data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      setCoupons(data)
      setLoading(false)
    })
    return unsub
  }, [shopId])

  const total   = coupons.length
  const used    = coupons.filter((c) => c.isUsed).length
  const unused  = total - used
  const fee     = calcFee(used)

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-300 text-sm">불러오는 중...</div>
  )

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <h2 className="text-lg font-black text-gray-900">쿠폰 현황</h2>
        <p className="text-xs text-gray-400 mt-0.5">실시간 발급 및 사용 통계</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: '총 발급',  value: total,  color: 'bg-blue-50 text-blue-600' },
          { label: '사용 완료', value: used,   color: 'bg-green-50 text-green-600' },
          { label: '미사용',   value: unused, color: 'bg-amber-50 text-amber-600' },
          { label: '누적 수수료', value: fee === 0 ? '무료' : `${fee.toLocaleString()}원`, color: 'bg-purple-50 text-purple-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`${color} rounded-2xl p-4 text-center`}>
            <p className="text-2xl font-black">{value}</p>
            <p className="text-xs mt-0.5 opacity-70">{label}</p>
          </div>
        ))}
      </div>

      {/* 수수료 구간 */}
      <div className="bg-gray-50 rounded-2xl p-4">
        <p className="text-xs font-bold text-gray-500 mb-3">수수료 구간</p>
        {[
          { range: '1 – 30회',   rate: '무료',       active: used <= 30 },
          { range: '31 – 100회', rate: '100원/건',   active: used > 30 && used <= 100 },
          { range: '101 – 300회',rate: '70원/건',    active: used > 100 && used <= 300 },
          { range: '301회+',     rate: '50원/건',    active: used > 300 },
        ].map(({ range, rate, active }) => (
          <div key={range} className={`flex justify-between text-xs px-3 py-2 rounded-xl mb-1 ${
            active ? 'bg-amber-100 font-bold text-amber-800' : 'text-gray-400'
          }`}>
            <span>{range}</span><span>{rate}</span>
          </div>
        ))}
        <p className="text-xs text-gray-400 mt-2">현재: {feeRange(used)}</p>
      </div>

      {/* 쿠폰 목록 */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-3">최근 발급 쿠폰</p>
        {coupons.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2 text-center">
            <span className="text-4xl">🎟️</span>
            <p className="text-sm font-bold text-gray-400">발급된 쿠폰이 없습니다</p>
            <p className="text-xs text-gray-300">유저가 몬스터 3마리를 융합하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {coupons.map((c) => (
              <div key={c.id} className={`flex items-center gap-3 p-3.5 rounded-2xl border ${
                c.isUsed ? 'bg-gray-50 border-gray-100' : 'bg-white border-amber-100'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                  c.isUsed ? 'bg-gray-100' : 'bg-amber-50'
                }`}>{c.isUsed ? '✅' : '🎟️'}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${c.isUsed ? 'text-gray-400' : 'text-gray-900'}`}>{c.title}</p>
                  <p className="text-xs text-gray-400">{c.createdAt instanceof Date ? c.createdAt.toLocaleDateString('ko-KR') : ''}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                  c.isUsed ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-green-50 text-green-600 border-green-100'
                }`}>{c.isUsed ? '사용됨' : '미사용'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
