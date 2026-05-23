import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CameraPreview from '../../../components/CameraPreview'
import CatchCanvas from '../components/CatchCanvas'
import type { Monster } from '../../../types'

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

export default function ArCatchPage() {
  const navigate = useNavigate()
  const [monster, setMonster] = useState<Monster>(DUMMY_MONSTER)

  useEffect(() => {
    const raw = sessionStorage.getItem('catchTarget')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      setMonster({
        id:        parsed.id        ?? DUMMY_MONSTER.id,
        shopId:    parsed.shopId    ?? DUMMY_MONSTER.shopId,
        shopName:  parsed.shopName  ?? DUMMY_MONSTER.shopName,
        name:      parsed.name      ?? DUMMY_MONSTER.name,
        category:  parsed.category  ?? DUMMY_MONSTER.category,
        lat:       parsed.lat       ?? DUMMY_MONSTER.lat,
        lng:       parsed.lng       ?? DUMMY_MONSTER.lng,
        status:    'approved',
        imageUrl:  parsed.imageUrl  ?? DUMMY_MONSTER.imageUrl,
      })
    } catch {
      // 파싱 실패 시 더미 몬스터 유지
    }
  }, [])

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
        onClose={() => navigate('/map')}
      />
    </div>
  )
}
