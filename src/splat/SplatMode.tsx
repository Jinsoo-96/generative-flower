import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { TrackingProvider } from '../tracking/TrackingProvider'
import { useTracking } from '../tracking/trackingContext'
import { defaultGestureState } from '../gestures/types'
import { SplatScene } from './SplatScene'

function SplatInner({ auto, fixedProgress }: { auto: boolean; fixedProgress?: number }) {
  const { camStatus, start } = useTracking()
  const [loaded, setLoaded] = useState(false)
  const started = camStatus === 'starting' || camStatus === 'ready'

  return (
    <main className="app-stage">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: true }}
        camera={{ fov: 50, position: [0, 0, 5] }}
      >
        <SplatScene auto={auto} fixedProgress={fixedProgress} onLoaded={() => setLoaded(true)} />
      </Canvas>

      {!loaded && (
        <div className="start-card">
          <div className="spinner" aria-label="loading" />
          <p className="muted">splat 로딩 중… (≈17MB)</p>
        </div>
      )}

      {loaded && !auto && fixedProgress == null && !started && (
        <div className="start-card">
          <h1>🌫️ Splat — 흩어졌다 모이기</h1>
          <p>손을 펼치면 연기처럼 흩어지고, 주먹을 쥐면 다시 모입니다</p>
          <button type="button" onClick={start}>
            카메라 시작
          </button>
        </div>
      )}
    </main>
  )
}

/**
 * Standalone splat mode (`?mode=splat`). Isolated from the production flower.
 * `auto` (headless/?auto=1) runs the disperse without a camera; otherwise the
 * camera drives it via hand openness.
 */
export function SplatMode({ auto = false, fixedProgress }: { auto?: boolean; fixedProgress?: number }) {
  const headless = auto || fixedProgress != null
  return headless ? (
    <TrackingProvider preview={defaultGestureState()}>
      <SplatInner auto={auto} fixedProgress={fixedProgress} />
    </TrackingProvider>
  ) : (
    <TrackingProvider>
      <SplatInner auto={false} />
    </TrackingProvider>
  )
}
