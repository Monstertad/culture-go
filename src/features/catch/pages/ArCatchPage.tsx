import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import CameraPreview from '../../../components/CameraPreview'
import CatchCanvas from '../components/CatchCanvas'
import ToolSelector, { type ToolKey } from '../components/ToolSelector'
import type { Monster } from '../../../types'
import { getUserId } from '../../../utils/userId'

const DUMMY_MONSTER: Monster = {
  id: 'monster_demo_1',
  shopId: 'shop_sungsimdang',
  shopName: '성심당 본점',
  name: '튀소용',
  category: '빵',
  lat: 36.3278,
  lng: 127.4275,
  status: 'approved',
  imageUrl: '/monsters/mock.png',
}

type PagePhase = 'selecting' | 'catching'

export default function ArCatchPage() {
  const navigate = useNavigate()
  const [monster, setMonster]       = useState<Monster>(DUMMY_MONSTER)
  const [toolKey, setToolKey]       = useState<ToolKey>('basicNet')
  const [pagePhase, setPagePhase]   = useState<PagePhase>('selecting')
  const isSaving = useRef(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('catchTarget')
    if (!raw) return
    try {
      const p = JSON.parse(raw)
      setMonster({
        id:       p.id       ?? DUMMY_MONSTER.id,
        shopId:   p.shopId   ?? DUMMY_MONSTER.shopId,
        shopName: p.shopName ?? DUMMY_MONSTER.shopName,
        name:     p.name     ?? DUMMY_MONSTER.name,
        category: p.category ?? DUMMY_MONSTER.category,
        lat:      p.lat      ?? DUMMY_MONSTER.lat,
        lng:      p.lng      ?? DUMMY_MONSTER.lng,
        status:   'approved',
        imageUrl: p.imageUrl ?? DUMMY_MONSTER.imageUrl,
      })
    } catch {
      // 파싱 실패 시 더미 유지
    }
  }, [])

  const saveToInventory = async (m: Monster) => {
    if (isSaving.current) return
    isSaving.current = true
    const userId = getUserId()
    try {
      const q = query(
        collection(db, 'user_inventory'),
        where('userId',    '==', userId),
        where('monsterId', '==', m.id),
        where('isFused',   '==', false),
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        const ref      = snap.docs[0]
        const newCount = (ref.data().count ?? 0) + 1
        await updateDoc(doc(db, 'user_inventory', ref.id), { count: newCount })
      } else {
        await addDoc(collection(db, 'user_inventory'), {
          userId,
          monsterId:       m.id,
          monsterName:     m.name,
          category:        m.category,
          monsterImageUrl: m.imageUrl,
          imageUrl:        m.imageUrl,
          shopId:          m.shopId,
          shopName:        m.shopName,
          count:           1,
          isFused:         false,
          capturedAt:      new Date(),
        })
      }
    } catch (err) {
      console.error('도감 저장 실패:', err)
    } finally {
      isSaving.current = false
    }
  }

  return (
    <div
      className="overflow-hidden bg-black"
      style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '28rem',
        height: '100vh',
        zIndex: 50,
      }}
    >
      <CameraPreview />

      {pagePhase === 'selecting' && (
        <div className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none">
          {/* 상단: 몬스터 미리보기 */}
          <div className="pointer-events-auto p-5 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent">
            <div className="w-14 h-14 rounded-xl border border-amber-300 overflow-hidden bg-amber-50 shrink-0">
              <img src={monster.imageUrl} alt={monster.name} className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-white font-black text-lg drop-shadow">{monster.name}</p>
              <p className="text-amber-300 text-xs font-semibold">{monster.shopName} · {monster.category}</p>
            </div>
          </div>

          {/* 하단: 도구 선택 */}
          <div className="pointer-events-auto bg-gradient-to-t from-black/80 to-transparent pb-2 pt-6">
            <p className="text-center text-white/80 text-xs mb-2">포획 도구를 선택하세요</p>
            <ToolSelector selected={toolKey} onChange={setToolKey} />
            <div className="px-4 pb-6">
              <button
                onClick={() => setPagePhase('catching')}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 font-black text-base shadow-lg active:scale-95 transition-all"
              >
                🎯 포획 시작!
              </button>
            </div>
          </div>
        </div>
      )}

      {pagePhase === 'catching' && (
        <CatchCanvas
          monster={monster}
          onCaptured={() => saveToInventory(monster)}
          onClose={() => navigate('/map')}
        />
      )}
    </div>
  )
}
