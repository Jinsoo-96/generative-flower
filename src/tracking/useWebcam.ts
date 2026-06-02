import { useCallback, useEffect, useRef, useState } from 'react'

export type WebcamStatus =
  | 'idle' // not started yet (waiting for user gesture)
  | 'starting' // getUserMedia in flight
  | 'ready' // stream attached & playing
  | 'denied' // user rejected permission
  | 'unsupported' // no getUserMedia (insecure context / old browser)
  | 'error' // other failure

/** Is getUserMedia available (secure context / modern browser)? */
export function isMediaSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

/**
 * Map a getUserMedia rejection to a fallback UI state + Korean message.
 * Pure → unit-tested without a camera (DEV_PLAN Phase 4 DoD).
 */
export function classifyMediaError(e: unknown): { status: WebcamStatus; error: string } {
  const name = e instanceof DOMException ? e.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return { status: 'denied', error: '카메라 권한이 거부되었습니다. 브라우저 설정에서 허용 후 다시 시도하세요.' }
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return { status: 'error', error: '사용 가능한 카메라를 찾지 못했습니다.' }
  }
  return { status: 'error', error: e instanceof Error ? e.message : String(e) }
}

export interface UseWebcamResult {
  videoRef: React.RefObject<HTMLVideoElement | null>
  status: WebcamStatus
  error: string | null
  start: () => Promise<void>
  stop: () => void
}

/**
 * getUserMedia → <video> wiring with explicit lifecycle (DEV_PLAN §0-B.11).
 * 640×480, facingMode 'user'. Permission is requested only when `start()` is
 * called (from a user gesture) — never automatically (DEV_PLAN §13.4).
 * Tracks are stopped on `stop()` and on unmount.
 */
export function useWebcam(): UseWebcamResult {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<WebcamStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    const v = videoRef.current
    if (v) v.srcObject = null
    setStatus('idle')
  }, [])

  const start = useCallback(async () => {
    if (!isMediaSupported()) {
      setStatus('unsupported')
      setError('이 브라우저/컨텍스트에서는 카메라를 사용할 수 없습니다 (HTTPS 필요).')
      return
    }
    setStatus('starting')
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      const v = videoRef.current
      if (v) {
        v.srcObject = stream
        await v.play().catch(() => {
          /* autoplay race; the muted+playsInline video resumes on its own */
        })
      }
      setStatus('ready')
    } catch (e) {
      const { status: s, error: msg } = classifyMediaError(e)
      setStatus(s)
      setError(msg)
    }
  }, [])

  // Stop tracks on unmount.
  useEffect(() => stop, [stop])

  return { videoRef, status, error, start, stop }
}
