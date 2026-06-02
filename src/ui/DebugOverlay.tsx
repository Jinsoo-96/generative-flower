import { useCallback, useRef } from 'react'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { useWebcam } from '../tracking/useWebcam'
import { useHandLandmarker } from '../tracking/useHandLandmarker'
import { HAND_CONNECTIONS, toCanvasPoint } from '../tracking/landmarks'

/**
 * Phase 0-B debug view: webcam <video> (CSS-mirrored, selfie) with a <canvas>
 * overlay drawing the 21 landmarks + skeleton. The canvas is NOT CSS-mirrored;
 * we flip x in `toCanvasPoint` instead (DEV_PLAN §8) so points land on the hand.
 *
 * Per DEV_PLAN principle 2, the camera is not auto-tested during development —
 * this view exists so a human can verify tracking from the live URL whenever
 * they want (start button → permission prompt on user gesture).
 */
export function DebugOverlay() {
  const { videoRef, status: camStatus, error: camError, start } = useWebcam()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const draw = useCallback(
    (result: HandLandmarkerResult, video: HTMLVideoElement) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const w = video.videoWidth || 640
      const h = video.videoHeight || 480
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, w, h)
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
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    },
    [],
  )

  const { status: hlStatus, error: hlError } = useHandLandmarker({
    videoRef,
    enabled: camStatus === 'ready',
    onResults: draw,
  })

  const showStart = camStatus === 'idle' || camStatus === 'denied' || camStatus === 'error'

  return (
    <div className="debug-stage">
      <div className="debug-frame">
        <video ref={videoRef} autoPlay muted playsInline className="debug-video" />
        <canvas ref={canvasRef} className="debug-canvas" />
      </div>

      <div className="debug-hud">
        <span>cam: {camStatus}</span>
        <span>model: {hlStatus}</span>
        {showStart && (
          <button type="button" onClick={() => void start()}>
            카메라 시작
          </button>
        )}
      </div>

      {(camError || hlError) && (
        <p className="debug-error">{camError ?? hlError}</p>
      )}
    </div>
  )
}
