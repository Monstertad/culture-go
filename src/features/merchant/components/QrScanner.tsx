import { useEffect, useRef, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'

interface QrScannerProps {
  onScanSuccess?: (couponId: string) => void
}

export default function QrScanner({ onScanSuccess }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let stream: MediaStream | null = null

    if (status === 'scanning') {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s
          if (videoRef.current) {
            videoRef.current.srcObject = s
          }
        })
        .catch(() => {
          setStatus('error')
          setMessage('카메라 접근에 실패했습니다.')
        })
    }

    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [status])

  const handleManualInput = async (couponId: string) => {
    if (!couponId.trim()) return
    try {
      const couponRef = doc(db, 'coupons', couponId)
      await updateDoc(couponRef, { isUsed: true })
      setStatus('success')
      setMessage('쿠폰이 정상 처리되었습니다.')
      onScanSuccess?.(couponId)
    } catch {
      setStatus('error')
      setMessage('유효하지 않은 쿠폰입니다.')
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h2 className="text-xl font-bold">쿠폰 QR 스캔</h2>

      {status === 'scanning' ? (
        <div className="relative w-full aspect-square max-w-xs bg-black rounded overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute inset-0 border-4 border-yellow-400 rounded pointer-events-none" />
        </div>
      ) : (
        <button
          onClick={() => setStatus('scanning')}
          className="bg-yellow-400 font-bold rounded p-3 w-full max-w-xs"
        >
          QR 스캔 시작
        </button>
      )}

      {/* 테스트용 수동 입력 */}
      <div className="flex gap-2 w-full max-w-xs">
        <input
          id="coupon-id-input"
          placeholder="쿠폰 ID 직접 입력"
          className="border rounded p-2 flex-1 text-sm"
        />
        <button
          onClick={() => {
            const input = document.getElementById('coupon-id-input') as HTMLInputElement
            handleManualInput(input.value)
          }}
          className="bg-gray-200 rounded p-2 text-sm"
        >
          확인
        </button>
      </div>

      {message && (
        <p className={status === 'success' ? 'text-green-600' : 'text-red-500'}>
          {message}
        </p>
      )}
    </div>
  )
}
