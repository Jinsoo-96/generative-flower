import { createContext, useContext } from 'react'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import type { WebcamStatus } from './useWebcam'
import type { LandmarkerStatus } from './useHandLandmarker'
import type { GestureState } from '../gestures/types'

/**
 * Tracking context shape. Split into its own module (no component exports) so
 * the provider file stays Fast-Refresh-clean (react-refresh/only-export-components).
 */
export interface TrackingContextValue {
  videoRef: React.RefObject<HTMLVideoElement | null>
  /** Smoothed gesture state, updated every detection. Read in useFrame. */
  gestureRef: React.RefObject<GestureState>
  /** Latest raw landmarker result, for the debug overlay. */
  lastResultRef: React.RefObject<HandLandmarkerResult | null>
  camStatus: WebcamStatus
  camError: string | null
  modelStatus: LandmarkerStatus
  modelError: string | null
  start: () => void
  stop: () => void
}

export const TrackingContext = createContext<TrackingContextValue | null>(null)

export function useTracking(): TrackingContextValue {
  const ctx = useContext(TrackingContext)
  if (!ctx) throw new Error('useTracking must be used within <TrackingProvider>')
  return ctx
}
