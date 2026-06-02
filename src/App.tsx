import './styles.css'
import { TrackingProvider } from './tracking/TrackingProvider'
import { useTracking } from './tracking/trackingContext'
import { Stage } from './scene/Stage'
import { DebugOverlay } from './ui/DebugOverlay'

/**
 * Phase 1: R3F flower scene driven by the shared gestureRef, with the webcam
 * landmark debug overlay kept as a small PiP. A minimal start card requests
 * the camera (full onboarding/HUD arrive in Phase 4).
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
  return (
    <TrackingProvider>
      <Scene />
    </TrackingProvider>
  )
}

export default App
