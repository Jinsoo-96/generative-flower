import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Object3D, Vector3, type InstancedMesh } from 'three'
import { useTracking } from '../tracking/trackingContext'
import { normalizedToWorld } from './mapping'
import { CAMERA, FLOWER_PLANE_DISTANCE, TONE } from '../config'
import { clamp } from '../lib/math'

const P = TONE.particles
const BURST = P.burstCount
const MOTES = P.ambientMotes

// Module-level scratch (set fully before each use; one Petals instance).
const scratch = new Object3D()

// Mutation lives inside methods (not direct property assignment in the render
// module scope), which keeps the React Compiler lint happy.
class BurstParticle {
  pos = new Vector3()
  vel = new Vector3()
  life = 0
  spawn(cx: number, cy: number, cz: number) {
    const speed = 0.6 + Math.random() * 1.2
    this.pos.set(cx, cy, cz)
    this.vel
      .set(Math.random() - 0.5, Math.random() - 0.5, (Math.random() - 0.5) * 0.5)
      .normalize()
      .multiplyScalar(speed)
    this.life = P.burstLifetime * (0.7 + Math.random() * 0.3)
  }
  /** Advance and return the current render scale (0 = dead). */
  step(dt: number): number {
    if (this.life <= 0) return 0
    this.life -= dt
    this.vel.y += P.burstGravity * dt
    this.pos.addScaledVector(this.vel, dt)
    const k = Math.max(0, this.life / P.burstLifetime)
    return P.burstSize * (P.burstFade ? k : 1)
  }
}

interface Mote {
  base: Vector3
  phase: number
  speed: number
  amp: number
}

/**
 * Phase 4 particles (DEV_PLAN §11 particles):
 *  - burst: glowing petal-fragment motes spawned on the fist rising-edge,
 *    rising in near-zero gravity and fading (scale → 0).
 *  - ambient motes: slow floating "spores" for atmosphere.
 * Mutable particle state lives in refs (mutated in useFrame), seeded in an
 * effect — never created/mutated during render.
 */
export function Petals() {
  const { gestureRef } = useTracking()
  const burstRef = useRef<InstancedMesh>(null)
  const motesRef = useRef<InstancedMesh>(null)
  const { size } = useThree()
  const wasFist = useRef(false)
  const burst = useRef<BurstParticle[]>([])
  const motes = useRef<Mote[]>([])

  // Seed particle state once (Math.random in an effect, not during render).
  useEffect(() => {
    burst.current = Array.from({ length: BURST }, () => new BurstParticle())
    motes.current = Array.from({ length: MOTES }, () => ({
      base: new Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2 - 0.5),
      phase: Math.random() * Math.PI * 2,
      speed: 0.2 + Math.random() * 0.3,
      amp: 0.1 + Math.random() * 0.2,
    }))
  }, [])

  useFrame((state, dtRaw) => {
    const b = burstRef.current
    const m = motesRef.current
    if (!b || !m || burst.current.length === 0 || motes.current.length === 0) return
    const dt = clamp(dtRaw, 0, 0.05)
    const g = gestureRef.current

    // Fist rising edge → spawn a burst from the flower's mapped position.
    if (g.isFist && !wasFist.current) {
      const aspect = size.height > 0 ? size.width / size.height : 1
      const c = normalizedToWorld(g.position.x, g.position.y, {
        fovDeg: CAMERA.fovDeg,
        aspect,
        distance: FLOWER_PLANE_DISTANCE,
      })
      for (const p of burst.current) p.spawn(c.x, c.y, CAMERA.planeZ)
    }
    wasFist.current = g.isFist

    // Update burst particles.
    for (let i = 0; i < BURST; i++) {
      const p = burst.current[i]
      const s = p.step(dt)
      scratch.position.copy(p.pos)
      scratch.scale.setScalar(Math.max(0.0001, s))
      scratch.updateMatrix()
      b.setMatrixAt(i, scratch.matrix)
    }
    b.instanceMatrix.needsUpdate = true

    // Drift ambient motes.
    const t = state.clock.elapsedTime
    for (let i = 0; i < MOTES; i++) {
      const mo = motes.current[i]
      scratch.position.set(
        mo.base.x + Math.sin(t * mo.speed + mo.phase) * mo.amp,
        mo.base.y + Math.cos(t * mo.speed * 0.8 + mo.phase) * mo.amp,
        mo.base.z,
      )
      scratch.scale.setScalar(0.02)
      scratch.updateMatrix()
      m.setMatrixAt(i, scratch.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={burstRef} args={[undefined, undefined, BURST]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color={TONE.species.rose.rim} transparent opacity={0.9} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={motesRef} args={[undefined, undefined, MOTES]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial
          color={TONE.species.lotus.rim}
          transparent
          opacity={P.ambientMoteOpacity}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  )
}
