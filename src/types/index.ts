// monsters 컬렉션 — 상인이 등록, status='approved'가 되면 유저 지도에 표시
export interface Monster {
  id: string
  shopId: string
  name: string
  category: string
  lat: number
  lng: number
  status: 'approved' | 'pending'
  imageUrl: string
}

// shops 컬렉션
export interface Shop {
  id: string
  name: string
  category: string
  image: string
  lat: number
  lng: number
}

// user_inventory 컬렉션
// B팀이 포획 성공 시 addDoc할 때 아래 필드를 모두 채워야 합니다.
export interface UserInventory {
  id: string
  userId: string
  monsterId: string
  shopId: string
  shopName: string
  monsterName: string
  monsterImageUrl: string
  category: string
  count: number    // 3 이상이면 융합 버튼 활성화
  isFused: boolean // 융합 완료 후 true
}

// coupons 컬렉션
export interface Coupon {
  id: string
  userId: string
  shopId: string
  shopName: string
  title: string
  category: string
  isUsed: boolean
  createdAt: Date
}

// AR 포획 화면에 넘길 몬스터 정보 (sessionStorage 키: 'catchTarget')
export interface CatchTarget {
  monsterId: string
  monsterName: string
  monsterImageUrl: string
  category: string
  shopId: string
  shopName: string
}
