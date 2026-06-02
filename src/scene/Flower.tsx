import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { DoubleSide, type Group } from 'three'
import { useTracking } from '../tracking/trackingContext'
import { normalizedToWorld, depthToScale } from './mapping'
import { CAMERA, FLOWER, FLOWER_PLANE_DISTANCE, MOTION } from '../config'
import { lerp } from '../lib/math'

const PETALS = 5

/**
 * Phase 1 placeholder flower: a glowing core sphere + 5 plane petals.
 * Reads the shared gestureRef each frame and lerps toward the hand-mapped
 * world position and depth-driven scale (DEV_PLAN §9.1). Real generative
 * geometry/species arrive in Phase 3.
 */
export function Flower() {
  const { gestureRef } = useTracking()
  const group = useRef<Group>(null)
  const { size } = useThree()

  useFrame(() => {
    const g = group.current
    if (!g) return
    const gesture = gestureRef.current
    const aspect = size.height > 0 ? size.width / size.height : 1

    const target = normalizedToWorld(gesture.position.x, gesture.position.y, {
      fovDeg: CAMERA.fovDeg,
      aspect,
      distance: FLOWER_PLANE_DISTANCE,
    })
    g.position.x = lerp(g.position.x, target.x, MOTION.positionLerp)
    g.position.y = lerp(g.position.y, target.y, MOTION.positionLerp)

    const targetScale = depthToScale(gesture.depth, FLOWER.minScale, FLOWER.maxScale)
    const next = lerp(g.scale.x, targetScale, MOTION.scaleLerp)
    g.scale.setScalar(next)
  })

  return (
    <group ref={group} position={[0, 0, CAMERA.planeZ]}>
      {Array.from({ length: PETALS }, (_, i) => {
        const a = (i / PETALS) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0]}
            rotation={[0, 0, a]}
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
        )
      })}
      <mesh>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial color="#ffd86b" emissive="#ffd86b" emissiveIntensity={1.1} />
      </mesh>
    </group>
  )
}
