import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Object3D, Color, type Group, type InstancedMesh } from 'three'
import { useTracking } from '../tracking/trackingContext'
import { normalizedToWorld, depthToScale } from './mapping'
import { CAMERA, FLOWER, FLOWER_PLANE_DISTANCE, MOTION, TONE } from '../config'
import { clamp, clamp01, lerp, smoothstep } from '../lib/math'
import {
  SPECIES,
  MAX_PETALS,
  buildPetalSlots,
  phyllotaxis,
  speciesForFingerCount,
  type SpeciesName,
  type PetalSlot,
} from './flowerGeometry'
import { makePetalGeometry, makePetalMaterial } from './petalMaterial'

const SEED_MAX = 90
const TRANSITION_S = 0.45 // species crossfade time
const PITCH_BUD = 1.15 // petals stand up (radians) when closed
const PITCH_OPEN = 0.0 // petals lie flat (facing camera) when open

const dummy = /* shared scratch */ new Object3D()

/** Per-layer opening offset: higher-phase layers open slightly later. */
function layerBloom(bloom: number, phase: number): number {
  return smoothstep(phase * 0.3, 1, bloom)
}

/**
 * Phase 3 generative flower: instanced petals (phyllotaxis core + radial petal
 * rings) with a self-lit gradient/fresnel shader. `bloom` opens the petals,
 * `fingerCount` morphs species (rose/daisy/lotus) via crossfade, `rotation`
 * rolls, `position`/`depth` place and scale it. Tone from TONE (DEV_PLAN §11).
 */
export function Flower() {
  const { gestureRef } = useTracking()
  const group = useRef<Group>(null)
  const petalsRef = useRef<InstancedMesh>(null)
  const seedsRef = useRef<InstancedMesh>(null)
  const { size } = useThree()

  const petalGeo = useMemo(() => makePetalGeometry(), [])
  const petalMat = useMemo(() => makePetalMaterial(TONE.species.rose), [])

  // Cached petal slots + seed positions (unit disk) + species colors.
  const slots = useMemo<Record<SpeciesName, PetalSlot[]>>(
    () => ({
      rose: buildPetalSlots(SPECIES.rose),
      daisy: buildPetalSlots(SPECIES.daisy),
      lotus: buildPetalSlots(SPECIES.lotus),
    }),
    [],
  )
  const seedPos = useMemo(() => phyllotaxis(SEED_MAX, 1 / Math.sqrt(SEED_MAX)), [])
  const colors = useMemo(
    () => ({
      rose: { base: new Color(TONE.species.rose.base), tip: new Color(TONE.species.rose.tip), rim: new Color(TONE.species.rose.rim) },
      daisy: { base: new Color(TONE.species.daisy.base), tip: new Color(TONE.species.daisy.tip), rim: new Color(TONE.species.daisy.rim) },
      lotus: { base: new Color(TONE.species.lotus.base), tip: new Color(TONE.species.lotus.tip), rim: new Color(TONE.species.lotus.rim) },
    }),
    [],
  )

  // Mutable transition + display state (no React state per frame).
  const trans = useRef({ from: 'rose' as SpeciesName, to: 'rose' as SpeciesName, blend: 1 })
  const bloomDisp = useRef(0)
  const inited = useRef(false)
  // Base (un-swayed) placement, so idle drift doesn't compound through the lerp.
  const base = useRef({ x: 0, y: 0, rot: 0 })

  useFrame((state, deltaRaw) => {
    const g = group.current
    const petals = petalsRef.current
    const seeds = seedsRef.current
    if (!g || !petals || !seeds) return
    const dt = clamp(deltaRaw, 0, 0.05)
    const gesture = gestureRef.current

    if (!inited.current) {
      petals.frustumCulled = false
      seeds.frustumCulled = false
      inited.current = true
    }

    // ── Whole-flower placement ──
    const aspect = size.height > 0 ? size.width / size.height : 1
    const target = normalizedToWorld(gesture.position.x, gesture.position.y, {
      fovDeg: CAMERA.fovDeg,
      aspect,
      distance: FLOWER_PLANE_DISTANCE,
    })
    base.current.x = lerp(base.current.x, target.x, MOTION.positionLerp)
    base.current.y = lerp(base.current.y, target.y, MOTION.positionLerp)
    base.current.rot = lerp(base.current.rot, gesture.rotation, MOTION.rotationLerp)

    // Idle "floating" drift/sway (DEV_PLAN §11 motion) — subtle, life-like.
    const time = state.clock.elapsedTime
    const w = TONE.motion.idleFreqHz * Math.PI * 2
    const sway = (TONE.motion.idleSwayDeg * Math.PI) / 180
    g.position.x = base.current.x + Math.sin(time * w) * TONE.motion.idleDriftWorld
    g.position.y = base.current.y + Math.cos(time * w * 0.8) * TONE.motion.idleDriftWorld
    g.rotation.z = base.current.rot + Math.sin(time * w * 1.1) * sway
    g.scale.setScalar(
      lerp(g.scale.x, depthToScale(gesture.depth, FLOWER.minScale, FLOWER.maxScale), MOTION.scaleLerp),
    )

    // ── Species crossfade ──
    const desired = gesture.detected ? speciesForFingerCount(gesture.fingerCount) : trans.current.to
    if (desired !== trans.current.to) {
      trans.current.from = trans.current.to
      trans.current.to = desired
      trans.current.blend = 0
    }
    trans.current.blend = clamp01(trans.current.blend + dt / TRANSITION_S)
    const t = smoothstep(0, 1, trans.current.blend)
    const from = trans.current.from
    const to = trans.current.to
    const fromSlots = slots[from]
    const toSlots = slots[to]

    // ── Bloom ──
    bloomDisp.current = lerp(bloomDisp.current, gesture.bloom, MOTION.bloomLerp)
    const bloom = bloomDisp.current

    // ── Petals ──
    for (let i = 0; i < MAX_PETALS; i++) {
      const a = fromSlots[i]
      const b = toSlots[i]
      const active = lerp(a.active, b.active, t)
      const angle = lerp(a.angle, b.angle, t)
      const phase = lerp(a.phase, b.phase, t)
      const baseRadius = lerp(a.radius, b.radius, t)
      const len = lerp(a.len, b.len, t)
      const width = lerp(a.width, b.width, t)

      const pb = layerBloom(bloom, phase)
      const radiusEff = baseRadius * lerp(0.3, 1.0, pb)
      const pitch = lerp(PITCH_BUD, PITCH_OPEN, pb)
      const s = active

      dummy.position.set(Math.cos(angle) * radiusEff, Math.sin(angle) * radiusEff, 0)
      dummy.quaternion.identity()
      dummy.rotation.set(0, 0, 0)
      dummy.rotateZ(angle - Math.PI / 2)
      dummy.rotateX(-pitch)
      dummy.scale.set(width * s, len * s, Math.max(0.0001, s))
      dummy.updateMatrix()
      petals.setMatrixAt(i, dummy.matrix)
    }
    petals.instanceMatrix.needsUpdate = true

    // petal colors lerp from→to
    ;(petalMat.uniforms.uBase.value as Color).lerpColors(colors[from].base, colors[to].base, t)
    ;(petalMat.uniforms.uTip.value as Color).lerpColors(colors[from].tip, colors[to].tip, t)
    ;(petalMat.uniforms.uRim.value as Color).lerpColors(colors[from].rim, colors[to].rim, t)

    // ── Phyllotaxis seed core ──
    const coreScale = lerp(SPECIES[from].coreScale, SPECIES[to].coreScale, t)
    const seedActiveFrom = SPECIES[from].seedCount
    const seedActiveTo = SPECIES[to].seedCount
    const seedSize = coreScale * 0.16
    for (let i = 0; i < SEED_MAX; i++) {
      const aOn = i < seedActiveFrom ? 1 : 0
      const bOn = i < seedActiveTo ? 1 : 0
      const on = lerp(aOn, bOn, t)
      dummy.position.set(seedPos[i].x * coreScale, seedPos[i].y * coreScale, 0.03)
      dummy.quaternion.identity()
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(Math.max(0.0001, seedSize * on))
      dummy.updateMatrix()
      seeds.setMatrixAt(i, dummy.matrix)
    }
    seeds.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={group} position={[0, 0, CAMERA.planeZ]}>
      <instancedMesh ref={petalsRef} args={[petalGeo, petalMat, MAX_PETALS]} />
      <instancedMesh ref={seedsRef} args={[undefined, undefined, SEED_MAX]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial
          color={TONE.species.core}
          emissive={TONE.species.core}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  )
}
