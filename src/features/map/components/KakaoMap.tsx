import { useEffect, useRef, useState } from 'react'
import type { Monster } from '../../../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KakaoSDK = any

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined

interface Props {
  monsters: Monster[]
  userLocation: { lat: number; lng: number }
  onMonsterClick: (monster: Monster) => void
}

export default function KakaoMap({ monsters, userLocation, onMonsterClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<KakaoSDK>(null)
  const overlaysRef = useRef<KakaoSDK[]>([])
  const onClickRef = useRef(onMonsterClick)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  // 콜백 ref로 stale closure 방지
  useEffect(() => {
    onClickRef.current = onMonsterClick
  }, [onMonsterClick])

  // Kakao SDK 로드 및 지도 초기화
  useEffect(() => {
    if (!KAKAO_APP_KEY || !containerRef.current) return

    const kakao: KakaoSDK = (window as KakaoSDK).kakao

    const initMap = () => {
      const k: KakaoSDK = (window as KakaoSDK).kakao
      k.maps.load(() => {
        if (!containerRef.current) return
        const center = new k.maps.LatLng(userLocation.lat, userLocation.lng)
        mapRef.current = new k.maps.Map(containerRef.current, { center, level: 3 })
        setMapReady(true)
      })
    }

    if (kakao?.maps) {
      initMap()
    } else {
      const script = document.createElement('script')
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`
      script.async = true
      script.onload = initMap
      script.onerror = () => {
        console.error('[KakaoMap] SDK 로드 실패. API 키와 도메인 설정을 확인하세요.')
        setMapError('지도를 불러오지 못했습니다.\nKakao 콘솔에서 localhost 도메인을 등록했는지 확인하세요.')
      }
      document.head.appendChild(script)
    }
  // userLocation은 최초 1회만 사용
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 지도 준비되면 중심 좌표 업데이트
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const k: KakaoSDK = (window as KakaoSDK).kakao
    mapRef.current.setCenter(new k.maps.LatLng(userLocation.lat, userLocation.lng))
  }, [mapReady, userLocation])

  // 몬스터 마커(CustomOverlay) 업데이트
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const k: KakaoSDK = (window as KakaoSDK).kakao

    // 기존 마커 제거
    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    monsters.forEach((monster) => {
      const position = new k.maps.LatLng(monster.lat, monster.lng)

      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'cursor:pointer;display:flex;flex-direction:column;align-items:center'
      wrapper.innerHTML = `
        <div style="
          background:white;border:2.5px solid #fbbf24;border-radius:50%;
          width:52px;height:52px;display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,0.25);overflow:hidden;
        ">
          ${
            monster.imageUrl
              ? `<img src="${monster.imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"
                   onerror="this.style.display='none'" />`
              : `<span style="font-size:26px">🐾</span>`
          }
        </div>
        <div style="
          margin-top:3px;font-size:11px;font-weight:700;background:white;
          padding:1px 5px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.15);
          white-space:nowrap;
        ">${monster.name}</div>
      `
      wrapper.addEventListener('click', () => onClickRef.current(monster))

      const overlay = new k.maps.CustomOverlay({ position, content: wrapper, yAnchor: 1.2 })
      overlay.setMap(mapRef.current)
      overlaysRef.current.push(overlay)
    })
  }, [mapReady, monsters])

  // API 키 없으면 목록 폴백 (개발/데모 환경)
  if (!KAKAO_APP_KEY) {
    return (
      <div className="w-full h-full bg-amber-50 flex flex-col overflow-y-auto">
        {/* 안내 배너 — 상단 고정, 작게 */}
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-100 border-b border-amber-200 shrink-0">
          <span className="text-2xl">🗺️</span>
          <div>
            <p className="font-bold text-xs text-amber-800">지도 미리보기 모드</p>
            <p className="text-xs text-amber-600">.env에 VITE_KAKAO_MAP_KEY 설정 시 실제 지도 표시</p>
          </div>
        </div>

        {/* 몬스터 목록 */}
        <div className="px-4 pt-4 pb-4 flex flex-col gap-2">
          <p className="text-xs font-bold text-gray-500 mb-1">📍 근처 몬스터</p>
          {monsters.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
              <span className="text-4xl">🐾</span>
              <p className="text-sm">등록된 몬스터가 없습니다.</p>
              <p className="text-xs">상인이 몬스터를 등록하면 여기에 표시됩니다.</p>
            </div>
          ) : (
            monsters.map((m) => (
              <button
                key={m.id}
                onClick={() => onMonsterClick(m)}
                className="flex items-center gap-3 bg-white border border-amber-200 rounded-xl p-3 text-left shadow-sm active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 rounded-full border-2 border-amber-300 overflow-hidden bg-amber-50 flex items-center justify-center shrink-0">
                  {m.imageUrl ? (
                    <img src={m.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🐾</span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.category}</p>
                </div>
                <span className="ml-auto text-yellow-500 text-lg">›</span>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  if (mapError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-red-50 px-6 text-center">
        <span className="text-4xl">⚠️</span>
        <p className="text-sm font-bold text-red-600 whitespace-pre-line">{mapError}</p>
        <p className="text-xs text-gray-400">브라우저 콘솔(F12)에서 상세 오류를 확인하세요.</p>
      </div>
    )
  }

  // absolute inset-0: flex 높이 계산 없이 positioned 부모를 꽉 채움
  return <div ref={containerRef} className="absolute inset-0" />
}
