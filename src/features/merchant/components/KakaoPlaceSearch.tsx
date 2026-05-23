import { useState, useEffect, useRef } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KakaoSDK = any

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined

interface KakaoPlace {
  id: string
  place_name: string
  address_name: string
  road_address_name: string
  x: string // lng
  y: string // lat
}

export interface SelectedPlace {
  name: string
  address: string
  lat: number
  lng: number
}

interface Props {
  onSelect: (place: SelectedPlace) => void
}

export default function KakaoPlaceSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<KakaoPlace[]>([])
  const [sdkReady, setSdkReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Kakao SDK (services 포함) 로드
  useEffect(() => {
    if (!KAKAO_APP_KEY) return
    const k: KakaoSDK = (window as KakaoSDK).kakao
    if (k?.maps?.services) {
      setSdkReady(true)
      return
    }
    const init = () => {
      const k2: KakaoSDK = (window as KakaoSDK).kakao
      k2.maps.load(() => setSdkReady(true))
    }
    if (k?.maps) {
      init()
    } else {
      const existing = document.querySelector('script[src*="dapi.kakao.com"]')
      if (existing) {
        existing.addEventListener('load', init)
        return
      }
      const script = document.createElement('script')
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false&libraries=services`
      script.async = true
      script.onload = init
      document.head.appendChild(script)
    }
  }, [])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleInput = (value: string) => {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!value.trim() || !sdkReady) {
      setResults([])
      setOpen(false)
      return
    }
    timerRef.current = setTimeout(() => {
      const k: KakaoSDK = (window as KakaoSDK).kakao
      const ps = new k.maps.services.Places()
      setLoading(true)
      ps.keywordSearch(value, (data: KakaoPlace[], status: string) => {
        setLoading(false)
        if (status === k.maps.services.Status.OK) {
          setResults(data.slice(0, 6))
          setOpen(true)
        } else {
          setResults([])
          setOpen(false)
        }
      })
    }, 350)
  }

  const handleSelect = (place: KakaoPlace) => {
    const selected: SelectedPlace = {
      name: place.place_name,
      address: place.road_address_name || place.address_name,
      lat: parseFloat(place.y),
      lng: parseFloat(place.x),
    }
    onSelect(selected)
    setQuery(place.place_name)
    setResults([])
    setOpen(false)
  }

  if (!KAKAO_APP_KEY) return null

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="가게 이름으로 검색 (예: 성심당)"
          className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 border border-transparent text-sm placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors pr-10"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden z-50">
          {results.map((place) => (
            <button
              key={place.id}
              type="button"
              onClick={() => handleSelect(place)}
              className="w-full flex flex-col px-4 py-3 text-left hover:bg-amber-50 border-b border-gray-50 last:border-0 transition-colors"
            >
              <span className="font-semibold text-sm text-gray-900">{place.place_name}</span>
              <span className="text-xs text-gray-400 mt-0.5">
                {place.road_address_name || place.address_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
