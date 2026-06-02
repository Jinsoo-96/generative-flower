import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { DoubleSide, type Group, type Mesh } from 'three'
import { useTracking } from '../tracking/trackingContext'
import { normalizedToWorld, depthToScale } from './mapping'
import { CAMERA, FLOWER, FLOWER_PLANE_DISTANCE, MOTION } from '../config'
import { lerp } from '../lib/math'

const PETALS = 5
const PETAL_RADIUS_BUD = 0.12
const PETAL_RADIUS_OPEN = 0.55
const PETAL_PITCH_BUD = -1.1 // folded up (radians)
const PETAL_PITCH_OPEN = 0.0 // laid flat

/**
 * Phase 2 placeholder flower: a glowing core + 5 plane petals that open with
 * `bloom` (pinch) and roll with `rotation`, following the hand via `position`
 * and scaling with `depth`. All driven from the smoothed gestureRef; an extra
 * render-loop lerp keeps motion buttery. Real generative geometry → Phase 3.
 */
export function Flower() {
  const { gestureRef } = useTracking()
  const group = useRef<Group>(null)
  const petalRefs = useRef<(Mesh | null)[]>([])
  const bloomDisp = useRef(0)
  const { size } = useThree()

  useFrame(() => {
    const g = group.current
    if (!g) return
    const gesture = gestureRef.current
    const aspect = size.height > 0 ? size.width / size.height : 1

    // Position (hand → world) + depth → scale.
    const target = normalizedToWorld(gesture.position.x, gesture.position.y, {
      fovDeg: CAMERA.fovDeg,
      aspect,
      distance: FLOWER_PLANE_DISTANCE,
    })
    g.position.x = lerp(g.position.x, target.x, MOTION.positionLerp)
    g.position.y = lerp(g.position.y, target.y, MOTION.positionLerp)

    const targetScale = depthToScale(gesture.depth, FLOWER.minScale, FLOWER.maxScale)
    g.scale.setScalar(lerp(g.scale.x, targetScale, MOTION.scaleLerp))

    // Roll.
    g.rotation.z = lerp(g.rotation.z, gesture.rotation, MOTION.rotationLerp)

    // Bloom → petal spread + pitch (extra lerp on top of One Euro).
    bloomDisp.current = lerp(bloomDisp.current, gesture.bloom, MOTION.bloomLerp)
    const b = bloomDisp.current
    const radius = lerp(PETAL_RADIUS_BUD, PETAL_RADIUS_OPEN, b)
    const pitch = lerp(PETAL_PITCH_BUD, PETAL_PITCH_OPEN, b)
    for (let i = 0; i < PETALS; i++) {
      const m = petalRefs.current[i]
      if (!m) continue
      const a = (i / PETALS) * Math.PI * 2
      m.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0)
      m.rotation.set(pitch, 0, a)
    }
  })

  return (
    <group ref={group} position={[0, 0, CAMERA.planeZ]}>
      {Array.from({ length: PETALS }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            petalRefs.current[i] = el
          }}
        >
          <planeGeometry args={[0.5, 0.95]} />
          <meshStandardMaterial
            color="#3a0a4a"
            emissive="#ff7ae0"
            emissiveIntensity={0.9}
            roughness={0.35}
            metalness={0}
            side={DoubleSide}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial color="#ffd86b" emissive="#ffd86b" emissiveIntensity={1.1} />
      </mesh>
    </group>
  )
}
