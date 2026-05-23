import { getFunctions, httpsCallable } from 'firebase/functions'
import { initializeApp, getApps } from 'firebase/app'

// firebase.ts 에서 이미 초기화된 app 재사용
const app = getApps()[0]
const functions = getFunctions(app, 'asia-northeast3') // 서울 리전

export interface GenerateMonsterParams {
  shopId: string
  shopName: string
  category: string
  lat: number
  lng: number
}

export interface GeneratedMonster {
  id: string
  shopId: string
  name: string
  category: string
  description: string
  attribute: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  imageUrl: string
  lat: number
  lng: number
  status: 'approved'
}

// Firebase Function 호출 — API 키는 서버(Functions)에서만 사용
export async function callGenerateMonster(
  params: GenerateMonsterParams
): Promise<GeneratedMonster> {
  const fn = httpsCallable<GenerateMonsterParams, GeneratedMonster>(
    functions,
    'generateMonster'
  )
  const result = await fn(params)
  return result.data
}

export const RARITY_LABEL: Record<GeneratedMonster['rarity'], string> = {
  common: '커먼',
  rare: '레어',
  epic: '에픽',
  legendary: '레전더리',
}

export const RARITY_COLOR: Record<GeneratedMonster['rarity'], string> = {
  common:    'bg-gray-100 text-gray-600',
  rare:      'bg-blue-100 text-blue-700',
  epic:      'bg-purple-100 text-purple-700',
  legendary: 'bg-yellow-100 text-yellow-700',
}
