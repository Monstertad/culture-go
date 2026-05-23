import { useEffect, useState } from 'react'
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { QRCodeSVG } from 'qrcode.react'
import { db } from '../../../config/firebase'
import type { UserInventory, Coupon } from '../../../types'
import { getUserId } from '../../../utils/userId'

type Tab = 'monsters' | 'coupons'

const FUSION_REQUIRED = 3 // 융합에 필요한 몬스터 수

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('monsters')
  const [inventory, setInventory] = useState<UserInventory[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [fusingId, setFusingId] = useState<string | null>(null)
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const userId = getUserId()

  // 도감 실시간 구독
  useEffect(() => {
    const q = query(collection(db, 'user_inventory'), where('userId', '==', userId))
    return onSnapshot(q, (snap) => {
      setInventory(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserInventory)))
    })
  }, [userId])

  // 쿠폰함 실시간 구독
  useEffect(() => {
    const q = query(collection(db, 'coupons'), where('userId', '==', userId))
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      })) as Coupon[]
      // 최신순 정렬
      data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      setCoupons(data)
    })
  }, [userId])

  const handleFusion = async (item: UserInventory) => {
    if (item.count < FUSION_REQUIRED || item.isFused || fusingId) return
    setFusingId(item.id)
    try {
      // 쿠폰 생성
      await addDoc(collection(db, 'coupons'), {
        userId,
        shopId: item.shopId,
        shopName: item.shopName || '상점',
        title: `${item.monsterName} 융합 쿠폰 — 특별 할인`,
        category: item.category,
        isUsed: false,
        createdAt: serverTimestamp(),
      })
      // 인벤토리 융합 처리
      await updateDoc(doc(db, 'user_inventory', item.id), { isFused: true })
      setTab('coupons')
    } catch (err) {
      console.error('fusion error', err)
      alert('융합 중 오류가 발생했습니다.')
    } finally {
      setFusingId(null)
    }
  }

  const unusedCount = coupons.filter((c) => !c.isUsed).length

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <header className="px-4 py-3 bg-yellow-400 shrink-0">
        <h1 className="text-lg font-black">🎒 도감 & 쿠폰함</h1>
      </header>

      {/* 탭 */}
      <nav className="flex border-b bg-white shrink-0">
        {([
          { key: 'monsters', label: '🐾 도감', badge: inventory.length },
          { key: 'coupons', label: '🎟️ 쿠폰함', badge: unusedCount },
        ] as { key: Tab; label: string; badge: number }[]).map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
              tab === key
                ? 'border-b-2 border-yellow-400 text-yellow-600'
                : 'text-gray-400'
            }`}
          >
            {label}
            {badge > 0 && (
              <span className="bg-yellow-400 text-black text-xs rounded-full px-1.5 py-0.5 leading-none font-black">
                {badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {/* 도감 탭 */}
        {tab === 'monsters' && (
          <div className="p-4 flex flex-col gap-3">
            {inventory.length === 0 ? (
              <EmptyState emoji="🐾" message="아직 잡은 몬스터가 없어요!" sub="지도로 나가서 몬스터를 포획해보세요." />
            ) : (
              inventory.map((item) => (
                <MonsterCard
                  key={item.id}
                  item={item}
                  onFuse={handleFusion}
                  isFusing={fusingId === item.id}
                />
              ))
            )}
          </div>
        )}

        {/* 쿠폰함 탭 */}
        {tab === 'coupons' && (
          <div className="p-4 flex flex-col gap-3">
            {coupons.length === 0 ? (
              <EmptyState emoji="🎟️" message="보유한 쿠폰이 없어요!" sub="몬스터 3마리를 융합하면 쿠폰이 발급됩니다." />
            ) : (
              coupons.map((coupon) => (
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  onClick={() => setSelectedCoupon(coupon)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* QR 코드 모달 */}
      {selectedCoupon && (
        <div
          className="absolute inset-0 bg-black/50 flex items-end z-20"
          onClick={() => setSelectedCoupon(null)}
        >
          <div
            className="w-full bg-white rounded-t-3xl p-6 flex flex-col items-center gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-black text-lg text-center">{selectedCoupon.title}</h2>
            <p className="text-sm text-gray-500">{selectedCoupon.shopName}</p>

            {selectedCoupon.isUsed ? (
              <div className="bg-gray-100 rounded-2xl p-8 flex flex-col items-center gap-2">
                <span className="text-5xl">✅</span>
                <p className="font-bold text-gray-500">사용 완료된 쿠폰입니다</p>
              </div>
            ) : (
              <>
                <div className="bg-amber-50 rounded-2xl p-4 border-2 border-amber-200">
                  <QRCodeSVG value={selectedCoupon.id} size={180} />
                </div>
                <p className="text-xs text-gray-400 text-center">
                  이 QR 코드를 상인에게 보여주세요
                </p>
              </>
            )}

            <p className="text-xs text-gray-300">
              쿠폰 ID: {selectedCoupon.id.slice(0, 12)}...
            </p>
            <button
              onClick={() => setSelectedCoupon(null)}
              className="w-full py-3 bg-gray-100 rounded-xl font-bold text-gray-600"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 서브 컴포넌트 ────────────────────────────────────────────────

function MonsterCard({
  item,
  onFuse,
  isFusing,
}: {
  item: UserInventory
  onFuse: (item: UserInventory) => void
  isFusing: boolean
}) {
  const canFuse = item.count >= FUSION_REQUIRED && !item.isFused

  return (
    <div className={`flex items-center gap-3 bg-white border rounded-2xl p-3 shadow-sm ${item.isFused ? 'opacity-50' : ''}`}>
      <div className="w-14 h-14 rounded-full border-2 border-amber-300 overflow-hidden bg-amber-50 flex items-center justify-center shrink-0">
        {item.monsterImageUrl ? (
          <img src={item.monsterImageUrl} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl">🐾</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{item.monsterName}</p>
        <p className="text-xs text-gray-400">{item.category}</p>
        {item.isFused ? (
          <span className="text-xs text-purple-500 font-bold">✨ 융합 완료</span>
        ) : (
          <div className="flex items-center gap-1 mt-1">
            {Array.from({ length: FUSION_REQUIRED }).map((_, i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-full border-2 text-xs flex items-center justify-center font-black ${
                  i < item.count
                    ? 'bg-yellow-400 border-yellow-400 text-white'
                    : 'bg-gray-100 border-gray-200 text-gray-300'
                }`}
              >
                {i < item.count ? '★' : '☆'}
              </div>
            ))}
            <span className="text-xs text-gray-400 ml-1">{item.count}/{FUSION_REQUIRED}</span>
          </div>
        )}
      </div>

      {canFuse && (
        <button
          onClick={() => onFuse(item)}
          disabled={isFusing}
          className="bg-purple-500 hover:bg-purple-600 active:scale-95 transition-all text-white text-xs font-black px-3 py-2 rounded-xl disabled:opacity-50 shrink-0"
        >
          {isFusing ? '융합중...' : '✨ 융합!'}
        </button>
      )}
    </div>
  )
}

function CouponCard({ coupon, onClick }: { coupon: Coupon; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 border rounded-2xl p-3 text-left shadow-sm active:scale-95 transition-all ${
        coupon.isUsed ? 'bg-gray-50 border-gray-200' : 'bg-white border-amber-200'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
        coupon.isUsed ? 'bg-gray-100' : 'bg-amber-50'
      }`}>
        {coupon.isUsed ? '✅' : '🎟️'}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm truncate ${coupon.isUsed ? 'text-gray-400' : ''}`}>
          {coupon.title}
        </p>
        <p className="text-xs text-gray-400">{coupon.shopName}</p>
        <p className="text-xs text-gray-300 mt-0.5">
          {coupon.createdAt instanceof Date ? coupon.createdAt.toLocaleDateString('ko-KR') : ''}
        </p>
      </div>
      {!coupon.isUsed && (
        <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded-full shrink-0">
          미사용
        </span>
      )}
    </button>
  )
}

function EmptyState({ emoji, message, sub }: { emoji: string; message: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
      <span className="text-5xl">{emoji}</span>
      <p className="font-bold text-gray-600 mt-2">{message}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  )
}
