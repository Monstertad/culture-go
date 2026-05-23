import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import CameraPreview from '../../../components/CameraPreview'
import CatchCanvas from '../components/CatchCanvas'
import type { Monster } from '../../../types'

export default function ArCatchPage() {
  const navigate = useNavigate()
  const [monster, setMonster] = useState<Monster | null>(null)

  useEffect(() => {
    const sessionTarget = sessionStorage.getItem('catchTarget')
    if (!sessionTarget) { navigate('/map', { replace: true }); return }

    try {
      const parsed = JSON.parse(sessionTarget)
      const monsterId: string = parsed.id

      // Firestore Monster 컬렉션에서 실제 데이터 조회
      getDoc(doc(db, 'Monster', monsterId)).then((snap) => {
        if (snap.exists()) {
          setMonster({ id: snap.id, ...snap.data() } as Monster)
        } else {
          // 문서가 없으면 세션 데이터로 폴백
          setMonster({
            id: parsed.id,
            shopId: parsed.shopId || '',
            shopName: parsed.shopName || '',
            name: parsed.name,
            category: parsed.category,
            lat: parsed.lat || 0,
            lng: parsed.lng || 0,
            status: 'approved',
            imageUrl: parsed.imageUrl,
          })
        }
      })
    } catch (e) {
      console.error('catchTarget 파싱 실패:', e)
      navigate('/map', { replace: true })
    }
  }, [])

  const handleClose = () => navigate('/map')

  if (!monster) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <span className="text-5xl animate-bounce">🐾</span>
      </div>
    )
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
      <CatchCanvas
        monster={monster}
        toolKey="basicNet"
        onCaptured={() => {}}
        onClose={handleClose}
      />
    </div>
  )
}
