import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Coupon, Monster } from '../../../types'

// README 수수료 테이블 기준
function calculateFee(usedCount: number): number {
  if (usedCount <= 30) return 0
  if (usedCount <= 100) return (usedCount - 30) * 100
  if (usedCount <= 300) return 70 * 100 + (usedCount - 100) * 70
  return 70 * 100 + 200 * 70 + (usedCount - 300) * 50
}

function feeRate(usedCount: number): string {
  if (usedCount <= 30) return '무료 구간'
  if (usedCount <= 100) return '건당 100원'
  if (usedCount <= 300) return '건당 70원'
  return '건당 50원'
}

interface MonsterStat {
  monsterName: string
  total: number
  used: number
}

// TODO: auth 연동 후 실제 merchantId 기반 shopId로 교체
const MOCK_SHOP_ID = 'shop_sungsimdang'

export default function MerchantStatsScreen() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [monsterStats, setMonsterStats] = useState<MonsterStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        // 이 가게의 쿠폰 전체 조회
        const couponSnap = await getDocs(
          query(collection(db, 'coupons'), where('shopId', '==', MOCK_SHOP_ID))
        )
        const couponList = couponSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
        })) as Coupon[]
        setCoupons(couponList)

        // 이 가게의 몬스터 조회 → 카테고리별 통계
        const monsterSnap = await getDocs(
          query(collection(db, 'monsters'), where('shopId', '==', MOCK_SHOP_ID))
        )
        const monsters = monsterSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Monster[]

        const statsMap: Record<string, MonsterStat> = {}
        for (const m of monsters) {
          statsMap[m.name] = { monsterName: m.name, total: 0, used: 0 }
        }
        for (const c of couponList) {
          // 쿠폰 title에서 몬스터 이름 매칭
          const matched = monsters.find((m) => c.title.includes(m.name))
          const key = matched ? matched.name : '기타'
          if (!statsMap[key]) statsMap[key] = { monsterName: key, total: 0, used: 0 }
          statsMap[key].total += 1
          if (c.isUsed) statsMap[key].used += 1
        }
        setMonsterStats(Object.values(statsMap))
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const totalIssued = coupons.length
  const totalUsed = coupons.filter((c) => c.isUsed).length
  const totalFee = calculateFee(totalUsed)
  const currentRate = feeRate(totalUsed)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400">
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold">통계</h2>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalIssued}</p>
          <p className="text-xs text-gray-500 mt-1">총 발급 쿠폰</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{totalUsed}</p>
          <p className="text-xs text-gray-500 mt-1">사용된 쿠폰</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-orange-500">{totalIssued - totalUsed}</p>
          <p className="text-xs text-gray-500 mt-1">미사용 쿠폰</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-purple-600">
            {totalFee === 0 ? '무료' : `${totalFee.toLocaleString()}원`}
          </p>
          <p className="text-xs text-gray-500 mt-1">누적 수수료</p>
        </div>
      </div>

      {/* 수수료 구간 안내 */}
      <div className="bg-gray-50 rounded-xl p-3">
        <p className="text-xs font-bold text-gray-600 mb-2">현재 수수료 구간</p>
        <div className="flex flex-col gap-1">
          {[
            { range: '1 – 30회', rate: '무료', active: totalUsed <= 30 },
            { range: '31 – 100회', rate: '건당 100원', active: totalUsed > 30 && totalUsed <= 100 },
            { range: '101 – 300회', rate: '건당 70원', active: totalUsed > 100 && totalUsed <= 300 },
            { range: '301회 이상', rate: '건당 50원', active: totalUsed > 300 },
          ].map(({ range, rate, active }) => (
            <div
              key={range}
              className={`flex justify-between text-xs px-2 py-1 rounded ${
                active ? 'bg-yellow-100 font-bold text-yellow-800' : 'text-gray-400'
              }`}
            >
              <span>{range}</span>
              <span>{rate}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">현재: {currentRate} ({totalUsed}회 사용)</p>
      </div>

      {/* 몬스터별 통계 */}
      <div>
        <p className="text-sm font-bold mb-2">몬스터별 쿠폰 사용</p>
        {monsterStats.length === 0 ? (
          <p className="text-sm text-gray-400">데이터가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {monsterStats.map((stat) => (
              <div key={stat.monsterName} className="border rounded-xl p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm">{stat.monsterName}</span>
                  <span className="text-xs text-gray-500">{stat.used} / {stat.total}건 사용</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all"
                    style={{ width: stat.total > 0 ? `${(stat.used / stat.total) * 100}%` : '0%' }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  사용률 {stat.total > 0 ? Math.round((stat.used / stat.total) * 100) : 0}%
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
