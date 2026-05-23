import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Monster, CatchTarget } from '../../../types'
import { getDistance, DEMO_LOCATION, CATCH_RADIUS_M } from '../../../utils/distance'
import KakaoMap from '../components/KakaoMap'

export default function UserMainMap() {
  const navigate = useNavigate()
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [userLocation, setUserLocation] = useState(DEMO_LOCATION)
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null)
  // 데모 모드: true면 거리 제한 무시 (발표용)
  const [demoMode, setDemoMode] = useState(false)

  // Firestore 실시간 리스너 — approved 몬스터만 구독
  useEffect(() => {
    const q = query(collection(db, 'monsters'), where('status', '==', 'approved'))
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Monster))
      setMonsters(data)
    })
    return unsub
  }, [])

  // GPS 위치 획득 (실패 시 성심당 좌표 유지)
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {/* GPS 실패 → DEMO_LOCATION 유지 */},
      { timeout: 5000 }
    )
  }, [])

  const handleMonsterClick = useCallback((monster: Monster) => {
    setSelectedMonster(monster)
  }, [])

  const handleCatch = () => {
    if (!selectedMonster) return

    const dist = getDistance(
      userLocation.lat, userLocation.lng,
      selectedMonster.lat, selectedMonster.lng
    )

    if (!demoMode && dist > CATCH_RADIUS_M) {
      alert(`몬스터가 너무 멀리 있습니다! (${Math.round(dist)}m)\n좀 더 가까이 걸어가세요. 📍`)
      return
    }

    // 포획 화면에 필요한 데이터를 sessionStorage에 저장
    const target: CatchTarget = {
      monsterId: selectedMonster.id,
      monsterName: selectedMonster.name,
      monsterImageUrl: selectedMonster.imageUrl,
      category: selectedMonster.category,
      shopId: selectedMonster.shopId,
      shopName: '', // 상점명은 B팀이 catch 성공 후 shops 컬렉션에서 조회
    }
    sessionStorage.setItem('catchTarget', JSON.stringify(target))
    navigate('/catch')
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 py-3 bg-yellow-400 shrink-0">
        <h1 className="text-lg font-black tracking-tight">🐾 Culture Go</h1>
        <button
          onClick={() => setDemoMode((v) => !v)}
          className={`text-xs px-2 py-1 rounded-full font-bold border transition-colors ${
            demoMode
              ? 'bg-red-500 text-white border-red-500'
              : 'bg-white text-gray-600 border-gray-300'
          }`}
        >
          {demoMode ? '🎮 데모ON' : '🎮 데모'}
        </button>
      </header>

      {/* 지도 영역 */}
      <div className="flex-1 relative overflow-hidden">
        <KakaoMap
          monsters={monsters}
          userLocation={userLocation}
          onMonsterClick={handleMonsterClick}
        />

        {/* 내 위치 표시 오버레이 */}
        <div className="absolute bottom-4 right-4 bg-white rounded-full shadow-md px-3 py-1.5 text-xs text-gray-500 pointer-events-none">
          📍 {demoMode ? '데모 위치' : 'GPS'}
        </div>
      </div>

      {/* 몬스터 정보 바텀시트 */}
      {selectedMonster && (
        <div
          className="absolute inset-0 bg-black/40 flex items-end z-10"
          onClick={() => setSelectedMonster(null)}
        >
          <div
            className="w-full bg-white rounded-t-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-full border-3 border-yellow-400 overflow-hidden bg-amber-50 flex items-center justify-center shrink-0">
                {selectedMonster.imageUrl ? (
                  <img src={selectedMonster.imageUrl} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">🐾</span>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-black">{selectedMonster.name}</h2>
                <span className="inline-block mt-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  {selectedMonster.category}
                </span>
                <p className="text-xs text-gray-400 mt-1">
                  📍 {selectedMonster.lat.toFixed(4)}, {selectedMonster.lng.toFixed(4)}
                </p>
              </div>
            </div>

            {!demoMode && (
              <p className="text-xs text-gray-400 text-center mb-3">
                반경 {CATCH_RADIUS_M}m 이내에서 포획 가능합니다
              </p>
            )}

            <button
              onClick={handleCatch}
              className="w-full bg-yellow-400 hover:bg-yellow-500 active:scale-95 transition-all text-black font-black text-lg py-4 rounded-2xl shadow-md"
            >
              🎯 포획하기!
            </button>

            <button
              onClick={() => setSelectedMonster(null)}
              className="w-full mt-2 py-2 text-gray-400 text-sm"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
