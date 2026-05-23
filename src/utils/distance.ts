// 하버사인 공식 — 두 위경도 좌표 간 직선 거리(미터) 반환
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 성심당 본점 — GPS 미지원 환경의 데모 기본 좌표
export const DEMO_LOCATION = { lat: 36.3276, lng: 127.4272 }

// 포획 가능 반경 (미터)
export const CATCH_RADIUS_M = 50
