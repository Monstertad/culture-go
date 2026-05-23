import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Coupon, Shop } from '../../../types'
import ShopRegisterForm from '../components/ShopRegisterForm'
import QrScanner from '../components/QrScanner'
import { useAuth } from '../../auth/AuthContext'

type Tab = 'register' | 'scan' | 'coupons'

export default function MerchantDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('register')
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [shop, setShop] = useState<Shop | null>(null)

  useEffect(() => {
    if (!user) return
    const fetchShop = async () => {
      const q = query(collection(db, 'shops'), where('merchantId', '==', user.id))
      const snap = await getDocs(q)
      if (!snap.empty) setShop({ id: snap.docs[0].id, ...snap.docs[0].data() } as Shop)
    }
    fetchShop()
  }, [user])

  useEffect(() => {
    if (tab !== 'coupons' || !shop) return
    const fetchCoupons = async () => {
      const q = query(collection(db, 'coupons'), where('shopId', '==', shop.id))
      const snap = await getDocs(q)
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      })) as Coupon[]
      data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      setCoupons(data)
    }
    fetchCoupons()
  }, [tab, shop])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'register', label: '가게 등록' },
    { key: 'scan', label: 'QR 스캔' },
    { key: 'coupons', label: '쿠폰 현황' },
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 헤더 */}
      <header className="px-5 pt-12 pb-4 shrink-0">
        <h1 className="text-2xl font-black text-gray-900">상인 대시보드</h1>
        {shop ? (
          <p className="text-sm text-amber-500 font-semibold mt-0.5">📍 {shop.name}</p>
        ) : (
          <p className="text-sm text-gray-400 mt-0.5">가게를 등록해주세요</p>
        )}
      </header>

      {/* 탭 */}
      <nav className="flex px-5 gap-1 shrink-0 border-b border-gray-100">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative flex-1 py-3 text-sm font-bold transition-colors ${
              tab === key ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            {label}
            {tab === key && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'register' && <ShopRegisterForm />}
        {tab === 'scan' && <QrScanner />}
        {tab === 'coupons' && (
          <div className="p-5 flex flex-col gap-2.5">
            {coupons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                <span className="text-5xl">🎟️</span>
                <p className="font-bold text-gray-600 mt-2">발급된 쿠폰이 없어요</p>
                <p className="text-xs text-gray-400">고객이 몬스터를 융합하면 여기에 표시됩니다.</p>
              </div>
            ) : (
              coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className={`flex items-center gap-3.5 border rounded-2xl p-3.5 shadow-sm ${
                    coupon.isUsed ? 'bg-gray-50 border-gray-100' : 'bg-white border-amber-100'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    coupon.isUsed ? 'bg-gray-100' : 'bg-amber-50'
                  }`}>
                    {coupon.isUsed ? '✅' : '🎟️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${coupon.isUsed ? 'text-gray-400' : 'text-gray-900'}`}>
                      {coupon.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {coupon.createdAt instanceof Date ? coupon.createdAt.toLocaleDateString('ko-KR') : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
                    coupon.isUsed
                      ? 'bg-gray-100 text-gray-400 border-gray-200'
                      : 'bg-green-50 text-green-600 border-green-100'
                  }`}>
                    {coupon.isUsed ? '사용됨' : '미사용'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
