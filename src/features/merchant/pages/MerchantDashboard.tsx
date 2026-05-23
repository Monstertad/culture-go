import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Coupon, Shop } from '../../../types'
import ShopRegisterForm from '../components/ShopRegisterForm'
import QrScanner from '../components/QrScanner'

type Tab = 'register' | 'scan' | 'coupons'

// TODO: auth 연동 후 실제 merchantId로 교체
const MOCK_MERCHANT_SHOP_ID = 'shop_001'

export default function MerchantDashboard() {
  const [tab, setTab] = useState<Tab>('register')
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [shop, setShop] = useState<Shop | null>(null)

  useEffect(() => {
    if (tab !== 'coupons') return

    const fetchCoupons = async () => {
      const q = query(
        collection(db, 'coupons'),
        where('shopId', '==', MOCK_MERCHANT_SHOP_ID)
      )
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      })) as Coupon[]
      setCoupons(data)
    }

    fetchCoupons()
  }, [tab])

  useEffect(() => {
    const fetchShop = async () => {
      const q = query(
        collection(db, 'shops'),
        where('__name__', '==', MOCK_MERCHANT_SHOP_ID)
      )
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        setShop({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Shop)
      }
    }
    fetchShop()
  }, [])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'register', label: '가게 등록' },
    { key: 'scan', label: 'QR 스캔' },
    { key: 'coupons', label: '쿠폰 현황' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <header className="p-4 bg-yellow-400">
        <h1 className="text-lg font-bold">상인 대시보드</h1>
        {shop && <p className="text-sm">{shop.name}</p>}
      </header>

      {/* 탭 */}
      <nav className="flex border-b">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-sm font-medium ${
              tab === key ? 'border-b-2 border-yellow-400 text-yellow-600' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'register' && <ShopRegisterForm />}
        {tab === 'scan' && <QrScanner />}
        {tab === 'coupons' && (
          <div className="p-4 flex flex-col gap-3">
            <h2 className="font-bold">발급된 쿠폰 목록</h2>
            {coupons.length === 0 ? (
              <p className="text-gray-400 text-sm">발급된 쿠폰이 없습니다.</p>
            ) : (
              coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="border rounded p-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{coupon.title}</p>
                    <p className="text-xs text-gray-500">{coupon.category}</p>
                    <p className="text-xs text-gray-400">
                      {coupon.createdAt instanceof Date
                        ? coupon.createdAt.toLocaleDateString()
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      coupon.isUsed ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'
                    }`}
                  >
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
