import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { TrackingProvider } from '../tracking/TrackingProvider'
import { useTracking } from '../tracking/trackingContext'
import { defaultGestureState } from '../gestures/types'
import { ModeSwitch } from '../ui/ModeSwitch'
import { DebugOverlay } from '../ui/DebugOverlay'
import { SplatScene } from './SplatScene'
import type { DisperseOpts } from './disperseModifier'

export interface SplatTuning {
  scale?: number
  disperse?: DisperseOpts
}

function SplatInner({
  auto,
  fixedProgress,
  tuning,
}: {
  auto: boolean
  fixedProgress?: number
  tuning?: SplatTuning
}) {
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
        <SplatScene
          auto={auto}
          fixedProgress={fixedProgress}
          scale={tuning?.scale}
          disperse={tuning?.disperse}
          onLoaded={() => setLoaded(true)}
        />
      </Canvas>

      {/* Hosts the shared <video> (so the webcam actually attaches) + shows the
          hand-tracking PiP once the camera is on. Only in interactive mode. */}
      {!auto && fixedProgress == null && <DebugOverlay visible={started} />}
      {!auto && fixedProgress == null && <ModeSwitch current="splat" />}

      {!loaded && (
        <div className="start-card">
          <div className="spinner" aria-label="loading" />
          <p className="muted">splat 로딩 중… (≈3.4MB, 첫 진입만)</p>
        </div>
      )}

      {/* Non-obscuring prompt so the drifting smoke is visible behind it. */}
      {loaded && !auto && fixedProgress == null && !started && (
        <div className="splat-prompt">
          <span>손을 펼치면 흩어지고, 주먹을 쥐면 모입니다</span>
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
export function SplatMode({
  auto = false,
  fixedProgress,
  tuning,
}: {
  auto?: boolean
  fixedProgress?: number
  tuning?: SplatTuning
}) {
  const headless = auto || fixedProgress != null
  return headless ? (
    <TrackingProvider preview={defaultGestureState()}>
      <SplatInner auto={auto} fixedProgress={fixedProgress} tuning={tuning} />
    </TrackingProvider>
  ) : (
    <TrackingProvider>
      <SplatInner auto={false} tuning={tuning} />
    </TrackingProvider>
  )
}
