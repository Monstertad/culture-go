import { useRef } from 'react'
import { collection, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { UserInventory } from '../../../types'
import { getUserId } from '../../../utils/userId'

const EVOLVED_IMAGE = '/monsters/evolved.png'

export function useFusion() {
  const isFusing = useRef(false)
  const userId   = getUserId()

  const executeFusion = async (item: UserInventory): Promise<boolean> => {
    if (isFusing.current) return false
    isFusing.current = true
    try {
      // 1. 기존 인벤토리 항목 → isFused
      await updateDoc(doc(db, 'user_inventory', item.id), { count: 0, isFused: true })

      // 2. 말차튀소 도감에 추가
      await addDoc(collection(db, 'user_inventory'), {
        userId,
        monsterId:       `evolved_${item.monsterId}`,
        monsterName:     '말차튀소',
        category:        item.category,
        monsterImageUrl: EVOLVED_IMAGE,
        imageUrl:        EVOLVED_IMAGE,
        shopId:          item.shopId,
        shopName:        item.shopName,
        count:           1,
        isFused:         false,
        capturedAt:      new Date(),
      })

      // 3. 쿠폰 발급 (monsterId 포함 → 쿠폰함 QR로 확인 가능)
      await addDoc(collection(db, 'coupons'), {
        userId,
        monsterId:  item.monsterId,
        shopId:     item.shopId,
        shopName:   item.shopName || '상점',
        title:      `${item.monsterName} 융합 쿠폰`,
        category:   item.category,
        isUsed:     false,
        createdAt:  serverTimestamp(),
      })

      return true
    } catch (err) {
      console.error('융합 에러:', err)
      return false
    } finally {
      isFusing.current = false
    }
  }

  return { executeFusion }
}
