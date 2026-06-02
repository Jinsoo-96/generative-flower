import { useEffect, useRef, useState } from 'react'
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision'

/**
 * ⚠️ Must EXACTLY match the installed @mediapipe/tasks-vision version, otherwise
 * the jsdelivr WASM and the npm package mismatch → runtime error (DEV_PLAN §2, Phase 0).
 */
export const MP_VERSION = '0.10.35'

const WASM_PATH = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`
const MODEL_PATH = `${import.meta.env.BASE_URL}models/hand_landmarker.task`

/**
 * Create a single-hand video HandLandmarker. Tries GPU delegate first and falls
 * back to CPU if GPU init fails (robustness on the final camera test machine).
 */
export async function createHandLandmarker(): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
  const baseOptions = { modelAssetPath: MODEL_PATH } as const
  try {
    return await HandLandmarker.createFromOptions(vision, {
      baseOptions: { ...baseOptions, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 1,
    })
  } catch {
    return await HandLandmarker.createFromOptions(vision, {
      baseOptions: { ...baseOptions, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numHands: 1,
    })
  }
}

export type LandmarkerStatus = 'loading' | 'ready' | 'error'

export interface UseHandLandmarkerOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  /** Run the detection loop only when true (e.g. webcam is ready). */
  enabled: boolean
  /** Called on each fresh detection with the result and the source video. */
  onResults?: (result: HandLandmarkerResult, video: HTMLVideoElement) => void
  /** Detection throttle target (DEV_PLAN §12: ~30fps, separate from 60fps render). */
  detectFps?: number
}

export interface UseHandLandmarkerResult {
  status: LandmarkerStatus
  error: string | null
}

/**
 * Loads the model once, then runs a throttled requestAnimationFrame detection
 * loop (DEV_PLAN §3 "인식 루프"). Results go to `onResults` only — this hook
 * never touches React state per frame (no re-render storms).
 */
export function useHandLandmarker({
  videoRef,
  enabled,
  onResults,
  detectFps = 30,
}: UseHandLandmarkerOptions): UseHandLandmarkerResult {
  // Starts at 'loading': the model-load effect runs on mount, so the initial
  // state already reflects it (avoids a synchronous setState inside the effect,
  // which eslint-plugin-react-hooks v7 forbids).
  const [status, setStatus] = useState<LandmarkerStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastVideoTime = useRef(-1)
  const lastDetect = useRef(0)

  // Keep the latest callback without re-subscribing the loop each render.
  const onResultsRef = useRef(onResults)
  useEffect(() => {
    onResultsRef.current = onResults
  })

  // Load model once.
  useEffect(() => {
    let cancelled = false
    createHandLandmarker()
      .then((l) => {
        if (cancelled) {
          l.close()
          return
        }
        landmarkerRef.current = l
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setStatus('error')
        setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
      landmarkerRef.current?.close()
      landmarkerRef.current = null
    }
  }, [])

  // Detection loop (throttled rAF).
  useEffect(() => {
    if (!enabled || status !== 'ready') return
    const minInterval = 1000 / detectFps

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick)
      const video = videoRef.current
      const landmarker = landmarkerRef.current
      if (!video || !landmarker || video.readyState < 2) return

      const now = performance.now()
      if (now - lastDetect.current < minInterval) return
      // Only run on a new video frame.
      if (video.currentTime === lastVideoTime.current) return
      lastVideoTime.current = video.currentTime
      lastDetect.current = now

      const result = landmarker.detectForVideo(video, now)
      onResultsRef.current?.(result, video)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [enabled, status, detectFps, videoRef])

  return { status, error }
}
