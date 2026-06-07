import { useEffect, useState } from 'react'
import './styles.css'
import { TrackingProvider } from './tracking/TrackingProvider'
import { useTracking } from './tracking/trackingContext'
import { Stage } from './scene/Stage'
import { DebugOverlay } from './ui/DebugOverlay'
import { Onboarding } from './ui/Onboarding'
import { HUD } from './ui/HUD'
import { speciesForFingerCount, type SpeciesName } from './scene/flowerGeometry'
import { SplatMode } from './splat/SplatMode'
import { TONE } from './config'
import type { GestureState } from './gestures/types'

/**
 * ?preview=1 → static tone view (no camera/model). Optional ?fingers=1|2|3
 * (species) and ?bloom=0..1.
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

/** Phase 4: full scene — onboarding gate, HUD, Bloom/Debug toggles. */
function Scene() {
  const { camStatus, modelStatus, camError, modelError, start, gestureRef } = useTracking()
  const [bloomEnabled, setBloomEnabled] = useState<boolean>(TONE.bloom.enabled)
  const [showDebug, setShowDebug] = useState(false)
  const [species, setSpecies] = useState<SpeciesName>('rose')
  const [detected, setDetected] = useState(false)

  // Low-frequency HUD sync from the mutable gestureRef (no per-frame React state).
  useEffect(() => {
    const id = setInterval(() => {
      const g = gestureRef.current
      setDetected((p) => (p === g.detected ? p : g.detected))
      const next = speciesForFingerCount(g.fingerCount)
      setSpecies((p) => (p === next ? p : next))
    }, 200)
    return () => clearInterval(id)
  }, [gestureRef])

  const ready = camStatus === 'ready' && modelStatus === 'ready'

  return (
    <main className="app-stage">
      <Stage bloomEnabled={bloomEnabled} />
      {/* Always mounted (hosts the shared <video>); only visually toggled. */}
      <DebugOverlay visible={showDebug} />
      {ready && (
        <HUD
          species={species}
          detected={detected}
          bloomEnabled={bloomEnabled}
          onToggleBloom={() => setBloomEnabled((v) => !v)}
          showDebug={showDebug}
          onToggleDebug={() => setShowDebug((v) => !v)}
        />
      )}
      <Onboarding
        camStatus={camStatus}
        modelStatus={modelStatus}
        camError={camError}
        modelError={modelError}
        onStart={start}
      />
    </main>
  )
}

function App() {
  // ?mode=splat → standalone Gaussian-splat disperse mode (?auto=1 = no camera).
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search)
    if (q.get('mode') === 'splat') {
      const p = Number(q.get('p'))
      const num = (k: string) => (q.has(k) && Number.isFinite(Number(q.get(k))) ? Number(q.get(k)) : undefined)
      return (
        <SplatMode
          auto={q.get('auto') === '1'}
          fixedProgress={Number.isFinite(p) && q.has('p') ? p : undefined}
          tuning={{
            scale: num('scale'),
            disperse: {
              base: num('base'),
              grow: num('grow'),
              spread: num('spread'),
              opacityBoost: num('ob'),
            },
          }}
        />
      )
    }
  }

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
