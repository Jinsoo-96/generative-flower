import { useEffect, useRef } from 'react'
import { useTracking } from '../tracking/trackingContext'
import { HAND_CONNECTIONS, toCanvasPoint } from '../tracking/landmarks'

/**
 * Presentational debug PiP: the shared webcam <video> (CSS-mirrored, selfie)
 * with a <canvas> overlay drawing the 21 landmarks + skeleton from the shared
 * latest result. The canvas is NOT mirrored; x is flipped in toCanvasPoint
 * (DEV_PLAN §8). Owns no tracking — reads videoRef + lastResultRef from context.
 */
export function DebugOverlay({ className = '' }: { className?: string }) {
  const { videoRef, lastResultRef } = useTracking()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const canvas = canvasRef.current
      const video = videoRef.current
      if (!canvas || !video) return
      const w = video.videoWidth || 640
      const h = video.videoHeight || 480
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, w, h)
      const result = lastResultRef.current
      if (!result) return
      for (const lms of result.landmarks) {
        ctx.strokeStyle = '#7afcff'
        ctx.lineWidth = 2
        for (const [a, b] of HAND_CONNECTIONS) {
          const pa = toCanvasPoint(lms[a], w, h)
          const pb = toCanvasPoint(lms[b], w, h)
          ctx.beginPath()
          ctx.moveTo(pa.x, pa.y)
          ctx.lineTo(pb.x, pb.y)
          ctx.stroke()
        }
        ctx.fillStyle = '#ff7ae0'
        for (const lm of lms) {
          const p = toCanvasPoint(lm, w, h)
          ctx.beginPath()
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [videoRef, lastResultRef])

  return (
    <div className={`debug-pip ${className}`.trim()}>
      <video ref={videoRef} autoPlay muted playsInline className="debug-video" />
      <canvas ref={canvasRef} className="debug-canvas" />
    </div>
  )
}
