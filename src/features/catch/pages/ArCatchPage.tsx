// [B 작업 영역] AR 포획 페이지 — B팀 구현 예정
import CameraPreview from '../../../components/CameraPreview'
import CatchCanvas from '../components/CatchCanvas'

export default function ArCatchPage() {
  return (
    <div className="relative w-full h-full">
      <CameraPreview />
      <CatchCanvas />
    </div>
  )
}
