// monsters 컬렉션
export interface Monster {
  id: string
  shopId: string
  name: string
  category: string
  lat: number
  lng: number
  status: 'active' | 'inactive'
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
export interface UserInventory {
  id: string
  userId: string
  monsterName: string
  category: string
  count: number
  isFused: boolean
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
