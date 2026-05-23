import { useState } from 'react'
import MonsterRegisterScreen from '../components/MonsterRegisterScreen'
import QRScannerScreen from '../components/QRScannerScreen'
import CouponTemplateScreen from '../components/CouponTemplateScreen'
import MerchantStatsScreen from '../components/MerchantStatsScreen'

type Tab = 'monster' | 'qr' | 'coupon' | 'stats'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'monster', label: '몬스터 등록', icon: '🐉' },
  { key: 'qr',      label: 'QR 스캔',    icon: '📷' },
  { key: 'coupon',  label: '쿠폰 등록',  icon: '🎟️' },
  { key: 'stats',   label: '통계',        icon: '📊' },
]

export default function MerchantDashboard() {
  const [tab, setTab] = useState<Tab>('monster')

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <header className="px-4 py-3 bg-yellow-400 flex items-center gap-2">
        <span className="text-xl">🏪</span>
        <h1 className="text-lg font-bold">상인 대시보드</h1>
      </header>

      {/* 탭 */}
      <nav className="flex border-b bg-white sticky top-0 z-10">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
              tab === key
                ? 'border-b-2 border-yellow-400 text-yellow-600'
                : 'text-gray-400'
            }`}
          >
            <span className="text-base">{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'monster' && <MonsterRegisterScreen />}
        {tab === 'qr'      && <QRScannerScreen />}
        {tab === 'coupon'  && <CouponTemplateScreen />}
        {tab === 'stats'   && <MerchantStatsScreen />}
      </div>
    </div>
  )
}
