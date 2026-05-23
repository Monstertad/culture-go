import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Monster } from '../../../types'
import { getDistance, DEMO_LOCATION, CATCH_RADIUS_M } from '../../../utils/distance'
import KakaoMap from '../components/KakaoMap'

export default function UserMainMap() {
  const navigate = useNavigate()
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [userLocation, setUserLocation] = useState(DEMO_LOCATION)
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null)
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'monsters'), where('status', '==', 'approved'))
    const unsub = onSnapshot(q, (snap) => {
      setMonsters(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Monster)))
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 }
    )
  }, [])

  const handleMonsterClick = useCallback((monster: Monster) => {
    setSelectedMonster(monster)
  }, [])

  const handleCatch = () => {
    if (!selectedMonster) return
    const dist = getDistance(userLocation.lat, userLocation.lng, selectedMonster.lat, selectedMonster.lng)
    if (!demoMode && dist > CATCH_RADIUS_M) {
      alert(`몬스터가 너무 멀리 있습니다! (${Math.round(dist)}m)\n좀 더 가까이 걸어가세요. 📍`)
      return
    }

    // 🎯 [지민님 AR 융합 로직 연동을 위한 핵심 수정본]
    // 지민님의 CatchCanvas가 긁어다 쓰는 monster 객체 규격과 100% 일치시켰습니다.
    const target = {
      id: selectedMonster.id,
      name: selectedMonster.name,
      imageUrl: selectedMonster.imageUrl, 
      category: selectedMonster.category,
      shopId: selectedMonster.shopId,
      lat: selectedMonster.lat,
      lng: selectedMonster.lng,
    }

    sessionStorage.setItem('catchTarget', JSON.stringify(target))
    navigate('/catch')
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center">
            <span className="text-sm">🐾</span>
          </div>
          <h1 className="text-base font-black text-gray-900 tracking-tight">Culture Go</h1>
        </div>
        <button
          onClick={() => setDemoMode((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
            demoMode
              ? 'bg-amber-400 text-gray-900'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {demoMode ? '데모 ON' : '데모'}
        </button>
      </header>

      {/* 지도 영역 */}
      <div className="flex-1 relative overflow-hidden">
        <KakaoMap
          monsters={monsters}
          userLocation={userLocation}
          onMonsterClick={handleMonsterClick}
        />

        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-full shadow-sm px-3 py-1.5 text-xs text-gray-500 pointer-events-none border border-gray-100">
          📍 {demoMode ? '데모 위치' : 'GPS'}
        </div>
      </div>

      {/* 몬스터 바텀시트 */}
      {selectedMonster && (
        <div
          className="absolute inset-0 bg-black/30 flex items-end z-10"
          onClick={() => setSelectedMonster(null)}
        >
          <div
            className="w-full bg-white rounded-t-3xl px-6 pt-5 pb-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 드래그 핸들 */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            <div className="flex items-center gap-4 mb-5">
              {/* 🎨 테일윈드 사각형 레이아웃을 둥글고 시원하게 정돈 */}
              <div className="w-20 h-20 rounded-2xl border-2 border-amber-200 overflow-hidden bg-amber-50 flex items-center justify-center shrink-0 shadow-inner">
                {selectedMonster.imageUrl ? (
                  <img src={selectedMonster.imageUrl} className="w-full h-full object-cover" alt={selectedMonster.name} />
                ) : (
                  <span className="text-4xl">🐾</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-gray-900 truncate">{selectedMonster.name}</h2>
                <span className="inline-block mt-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full font-semibold">
                  {selectedMonster.category}
                </span>
                {!demoMode && (
                  <p className="text-xs text-gray-400 mt-2">
                    반경 {CATCH_RADIUS_M}m 이내에서 포획 가능
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleCatch}
              className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-[0.98] transition-all font-black text-gray-900 text-base shadow-sm shadow-amber-200"
            >
              🎯 포획하기!
            </button>

            <button
              onClick={() => setSelectedMonster(null)}
              className="w-full mt-3 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}