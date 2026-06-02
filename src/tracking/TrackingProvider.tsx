import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { useWebcam } from './useWebcam'
import { useHandLandmarker } from './useHandLandmarker'
import { extractGesture } from '../gestures/extract'
import { makeGestureSmoother } from '../gestures/smoothing'
import { defaultGestureState, type GestureState } from '../gestures/types'
import { TrackingContext, type TrackingContextValue } from './trackingContext'

/**
 * Single source of truth for tracking: ONE webcam + ONE HandLandmarker feeding
 * a mutable `gestureRef` (no per-frame React state — DEV_PLAN §2, §3). The 3D
 * scene reads `gestureRef`; the debug overlay reads `videoRef` + `lastResultRef`.
 */
export function TrackingProvider({
  children,
  preview,
}: {
  children: ReactNode
  /** Static gesture for the `?preview=1` tone view — no webcam/model loaded. */
  preview?: GestureState
}) {
  const { videoRef, status: camStatus, error: camError, start, stop } = useWebcam()
  const active = !preview

  const gestureRef = useRef<GestureState>(preview ?? defaultGestureState())
  const lastResultRef = useRef<HandLandmarkerResult | null>(null)
  const smootherRef = useRef(makeGestureSmoother())

  // Keep the preview gesture pinned (set in an effect, not during render).
  useEffect(() => {
    if (preview) gestureRef.current = preview
  }, [preview])

  const onResults = useCallback((result: HandLandmarkerResult) => {
    lastResultRef.current = result
    const hand = result.landmarks[0]
    if (hand && hand.length >= 21) {
      const raw = extractGesture(hand)
      // Smooth continuous signals (position/depth/bloom/rotation) via One Euro.
      gestureRef.current = smootherRef.current.smooth(raw, performance.now() / 1000)
    } else {
      // Keep last pose, just flag undetected so the scene can settle (DEV_PLAN §14.9).
      gestureRef.current = { ...gestureRef.current, detected: false }
    }
  }, [])

  const { status: modelStatus, error: modelError } = useHandLandmarker({
    videoRef,
    enabled: active && camStatus === 'ready',
    load: active,
    onResults,
  })

  const value = useMemo<TrackingContextValue>(
    () => ({
      videoRef,
      gestureRef,
      lastResultRef,
      camStatus,
      camError,
      modelStatus,
      modelError,
      start: () => void start(),
      stop,
    }),
    [videoRef, camStatus, camError, modelStatus, modelError, start, stop],
  )

  return <TrackingContext value={value}>{children}</TrackingContext>
}
