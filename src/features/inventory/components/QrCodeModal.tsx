import { QRCodeSVG } from 'qrcode.react'
import type { Coupon } from '../../../types'

interface Props {
  coupon:   Coupon
  onClose:  () => void
}

export default function QrCodeModal({ coupon, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-end z-20"
      onClick={onClose}
    >
      <div
        className="w-full bg-white rounded-t-3xl px-6 pt-5 pb-10 shadow-2xl flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full" />

        <div className="text-center">
          <h2 className="font-black text-lg text-gray-900">{coupon.title}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{coupon.shopName}</p>
        </div>

        {coupon.isUsed ? (
          <div className="bg-gray-50 rounded-2xl px-12 py-8 flex flex-col items-center gap-2 border border-gray-100">
            <span className="text-5xl">✅</span>
            <p className="font-bold text-gray-400 text-sm mt-1">사용 완료된 쿠폰입니다</p>
          </div>
        ) : (
          <>
            <div className="bg-amber-50 rounded-2xl p-5 border-2 border-amber-200">
              <QRCodeSVG value={coupon.id} size={180} />
            </div>
            <p className="text-xs text-gray-400 text-center">이 QR 코드를 상인에게 보여주세요</p>
          </>
        )}

        <p className="text-xs text-gray-300">쿠폰 ID: {coupon.id.slice(0, 12)}...</p>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-gray-100 font-semibold text-gray-600 text-sm"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
