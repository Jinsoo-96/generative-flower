import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark'
import { MathUtils } from 'three'
import { makeDisperseModifier, type DisperseModifier, type DisperseOpts } from './disperseModifier'
import { useTracking } from '../tracking/trackingContext'

const SPLAT_URL = `${import.meta.env.BASE_URL}splat.spz` // compressed (3.4MB vs 17.8MB)
const ROT_GAIN = 2.5 // hand-roll → model-yaw (left/right) amplification
const PITCH_GAIN = 3 // hand-tilt angle → model-pitch (top/bottom) amplification

interface SplatObjects {
  spark: SparkRenderer
  splat: SplatMesh
  disperse: DisperseModifier
}

/**
 * Renders the Gaussian splat (Spark) with the disperse/gather objectModifier.
 * Spark objects are created imperatively and added to the R3F scene (not via
 * <primitive>), keeping them out of React's render path. `progress` is driven by
 * continuous hand openness (fingerCount/5, damped), an auto ping-pong, or a
 * fixed value for screenshots.
 */
export function SplatScene({
  auto = false,
  fixedProgress,
  scale = 2,
  disperse,
  onLoaded,
}: {
  auto?: boolean
  fixedProgress?: number
  /** Splat world scale. */
  scale?: number
  /** Disperse modifier tuning (base/grow/spread/opacityBoost). */
  disperse?: DisperseOpts
  onLoaded?: () => void
}) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const { gestureRef, lastResultRef } = useTracking()
  // Capture tuning once at mount (URL-driven, constant per session) so the
  // create-effect doesn't re-run (and reload the 17MB asset) on re-render.
  const [tuning] = useState(() => ({ scale, disperse }))

  const objsRef = useRef<SplatObjects | null>(null)
  const progressDisp = useRef(0)
  const yawDisp = useRef(0)
  const pitchDisp = useRef(0)
  const onLoadedRef = useRef(onLoaded)
  useEffect(() => {
    onLoadedRef.current = onLoaded
  })

  useEffect(() => {
    const spark = new SparkRenderer({ renderer: gl })
    const disperse = makeDisperseModifier(tuning.disperse)
    const splat = new SplatMesh({ url: SPLAT_URL, onLoad: () => onLoadedRef.current?.() })
    splat.objectModifier = disperse.modifier
    splat.updateGenerator()
    // Place into our frame (PLY ~1-unit, origin-centered; flip for three axes).
    splat.position.set(0, 0, 0)
    splat.scale.setScalar(tuning.scale)
    splat.rotation.set(Math.PI, 0, 0)

    scene.add(spark)
    scene.add(splat)
    objsRef.current = { spark, splat, disperse }

    return () => {
      scene.remove(spark)
      scene.remove(splat)
      ;(splat as { dispose?: () => void }).dispose?.()
      ;(spark as { dispose?: () => void }).dispose?.()
      objsRef.current = null
    }
  }, [gl, scene, tuning])

  useFrame((state, dtRaw) => {
    const o = objsRef.current
    if (!o) return
    const dt = Math.min(dtRaw, 0.05)
    let target: number
    if (fixedProgress != null) {
      target = fixedProgress
    } else if (auto) {
      target = 0.5 - 0.5 * Math.cos(state.clock.elapsedTime * 0.8)
    } else {
      const g = gestureRef.current
      // Binary, no middle stage: fist → gathered original, open hand → fog.
      // When the hand isn't tracked (e.g. briefly while rotating), settle to
      // gathered so it never drifts into fog on its own (isFist is robust to roll).
      target = g.detected ? (g.isFist ? 0 : 1) : 0
    }
    progressDisp.current = MathUtils.damp(progressDisp.current, target, 4, dt)
    o.disperse.progress.value = progressDisp.current
    // The objectModifier is only re-evaluated when the generator is marked dirty.
    // Without this the splats stay baked from the first frame (static image).
    o.splat.generatorDirty = true

    // Two-axis orbit by ROTATING the hand (not moving it), independent of disperse:
    //   twist hand (roll)            → yaw   (spin left/right to see the sides)
    //   tilt hand fwd/back (z depth) → pitch (tip fingers toward camera → top/bottom)
    let yawTarget = 0
    let pitchTarget = 0
    const lm = lastResultRef.current?.landmarks?.[0]
    if (fixedProgress == null && !auto && gestureRef.current.detected && lm) {
      yawTarget = -gestureRef.current.rotation * ROT_GAIN
      // Pitch from the wrist(0)→middle-MCP(9) tilt out of the image plane (z).
      const w = lm[0]
      const m = lm[9]
      const planar = Math.hypot(m.x - w.x, m.y - w.y) || 1e-3
      const tilt = Math.atan2(-((m.z ?? 0) - (w.z ?? 0)), planar)
      pitchTarget = tilt * PITCH_GAIN
    }
    yawDisp.current = MathUtils.damp(yawDisp.current, yawTarget, 5, dt)
    // Pitch from z-depth is noisier → smooth a bit more (lower rate).
    pitchDisp.current = MathUtils.damp(pitchDisp.current, pitchTarget, 3.5, dt)
    o.splat.rotation.y = yawDisp.current
    o.splat.rotation.x = Math.PI + pitchDisp.current // Math.PI = base PLY→three flip
  })

  return null
}
