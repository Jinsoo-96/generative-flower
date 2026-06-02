import './styles.css'
import { TrackingProvider } from './tracking/TrackingProvider'
import { useTracking } from './tracking/trackingContext'
import { Stage } from './scene/Stage'
import { DebugOverlay } from './ui/DebugOverlay'
import type { GestureState } from './gestures/types'

/**
 * ?preview=1 → static tone view (no camera/model), for eyeballing TONE.
 * Optional ?fingers=1|2|3 (species) and ?bloom=0..1 to explore.
 */
function previewGesture(): GestureState | null {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search)
  if (q.get('preview') !== '1') return null
  const fingers = Number(q.get('fingers'))
  const bloom = Number(q.get('bloom'))
  const fc = (Number.isFinite(fingers) && fingers >= 0 && fingers <= 5 ? fingers : 1) as GestureState['fingerCount']
  return {
    detected: true,
    position: { x: 0.5, y: 0.5 },
    depth: 0.6,
    bloom: Number.isFinite(bloom) && bloom >= 0 && bloom <= 1 ? bloom : 0.85,
    fingerCount: fc,
    rotation: 0,
    isFist: false,
  }
}

/**
 * Phase 3: generative flower scene driven by the shared gestureRef, with the
 * webcam landmark debug overlay as a PiP. A minimal start card requests the
 * camera (full onboarding/HUD arrive in Phase 4).
 */
function Scene() {
  const { camStatus, modelStatus, camError, modelError, start } = useTracking()
  const started = camStatus === 'starting' || camStatus === 'ready'

  return (
    <main className="app-stage">
      <Stage />
      <DebugOverlay className="pip" />

      {!started && (
        <div className="start-card">
          <h1>🌸 Generative Flower</h1>
          <p>손동작 기반 제너러티브 꽃 미디어아트</p>
          <button type="button" onClick={start}>
            카메라 시작
          </button>
          <p className="muted">
            cam: {camStatus} · model: {modelStatus}
          </p>
          {(camError || modelError) && (
            <p className="debug-error">{camError ?? modelError}</p>
          )}
        </div>
      )}
    </main>
  )
}

function App() {
  const preview = previewGesture()
  if (preview) {
    return (
      <TrackingProvider preview={preview}>
        <main className="app-stage">
          <Stage />
        </main>
      </TrackingProvider>
    )
  }
  return (
    <TrackingProvider>
      <Scene />
    </TrackingProvider>
  )
}

export default App
