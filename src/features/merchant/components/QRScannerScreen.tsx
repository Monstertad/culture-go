import { useEffect, useRef, useState } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Coupon } from '../../../types'

type ScanStatus = 'idle' | 'scanning' | 'found' | 'confirmed' | 'error'

export default function QRScannerScreen() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [couponId, setCouponId] = useState('')
  const [coupon, setCoupon] = useState<Coupon | null>(null)
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [cameraOn, setCameraOn] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    if (cameraOn) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s
          if (videoRef.current) videoRef.current.srcObject = s
        })
        .catch(() => {
          setErrorMsg('카메라 접근 권한이 필요합니다.')
          setCameraOn(false)
        })
    }
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [cameraOn])

  const handleLookup = async (id: string) => {
    const trimmed = id.trim()
    if (!trimmed) return
    setStatus('scanning')
    setErrorMsg('')
    setCoupon(null)
    try {
      const snap = await getDoc(doc(db, 'coupons', trimmed))
      if (!snap.exists()) {
        setStatus('error')
        setErrorMsg('존재하지 않는 쿠폰입니다.')
        return
      }
      const data = snap.data()
      const c: Coupon = {
        id: snap.id,
        userId: data.userId,
        shopId: data.shopId,
        shopName: data.shopName,
        title: data.title,
        category: data.category,
        isUsed: data.isUsed,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
      }
      if (c.isUsed) {
        setStatus('error')
        setErrorMsg('이미 사용된 쿠폰입니다.')
        return
      }
      setCoupon(c)
      setStatus('found')
    } catch {
      setStatus('error')
      setErrorMsg('쿠폰 조회에 실패했습니다.')
    }
  }

  const handleConfirm = async () => {
    if (!coupon) return
    try {
      await updateDoc(doc(db, 'coupons', coupon.id), { isUsed: true })
      setCoupon((prev) => prev ? { ...prev, isUsed: true } : null)
      setStatus('confirmed')
    } catch {
      setStatus('error')
      setErrorMsg('쿠폰 처리에 실패했습니다.')
    }
  }

  const handleReset = () => {
    setStatus('idle')
    setCoupon(null)
    setCouponId('')
    setErrorMsg('')
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold">쿠폰 QR 스캔</h2>

      {/* 카메라 뷰 */}
      <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden">
        {cameraOn ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-4 border-yellow-400 rounded-lg" />
            </div>
            <p className="absolute bottom-2 left-0 right-0 text-center text-white text-xs">
              QR 코드를 네모 안에 맞춰주세요
            </p>
          </>
        ) : (
          <button
            onClick={() => setCameraOn(true)}
            className="w-full h-full flex flex-col items-center justify-center text-white gap-2"
          >
            <span className="text-4xl">📷</span>
            <span className="text-sm">카메라 열기</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="flex-1 h-px bg-gray-200" />
        또는 쿠폰 ID 직접 입력
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* 쿠폰 ID 수동 입력 */}
      <div className="flex gap-2">
        <input
          value={couponId}
          onChange={(e) => setCouponId(e.target.value)}
          placeholder="coupon_secure_uuid"
          className="border rounded p-2 flex-1 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleLookup(couponId)}
        />
        <button
          onClick={() => handleLookup(couponId)}
          disabled={status === 'scanning'}
          className="bg-gray-800 text-white rounded p-2 text-sm disabled:opacity-40"
        >
          조회
        </button>
      </div>

      {/* 쿠폰 정보 카드 */}
      {coupon && status === 'found' && (
        <div className="border-2 border-yellow-400 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-base">{coupon.title}</p>
              <p className="text-sm text-gray-500">{coupon.shopName}</p>
              <p className="text-xs text-gray-400">{coupon.category}</p>
            </div>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">미사용</span>
          </div>
          <p className="text-xs text-gray-400">
            발급일: {coupon.createdAt instanceof Date ? coupon.createdAt.toLocaleDateString('ko-KR') : ''}
          </p>
          <button
            onClick={handleConfirm}
            className="bg-yellow-400 font-bold rounded-lg p-3 text-base mt-1"
          >
            쿠폰 사용 처리
          </button>
        </div>
      )}

      {/* 완료 */}
      {status === 'confirmed' && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 text-center flex flex-col gap-3">
          <p className="text-2xl">✅</p>
          <p className="font-bold text-green-700">쿠폰이 정상 처리됐습니다</p>
          <button onClick={handleReset} className="text-sm text-gray-500 underline">다음 쿠폰 스캔</button>
        </div>
      )}

      {/* 에러 */}
      {status === 'error' && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-center flex flex-col gap-3">
          <p className="text-2xl">❌</p>
          <p className="text-red-600 font-medium">{errorMsg}</p>
          <button onClick={handleReset} className="text-sm text-gray-500 underline">다시 시도</button>
        </div>
      )}
    </div>
  )
}
