import { Canvas } from '@react-three/fiber'
import { CAMERA } from '../config'
import { Flower } from './Flower'

/**
 * R3F stage: perspective camera + dark ambient/key lighting (DEV_PLAN §11 —
 * the flower is mostly self-lit via emissive; lights only shape it slightly).
 * Bloom/postprocessing is added in Phase 4. Fills its parent.
 */
export function Stage() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{
        fov: CAMERA.fovDeg,
        position: [CAMERA.position[0], CAMERA.position[1], CAMERA.position[2]],
      }}
    >
      <color attach="background" args={['#080115']} />
      <ambientLight intensity={0.3} color="#1a1030" />
      <directionalLight position={[2, 3, 4]} intensity={0.6} color="#6a4cff" />
      <Flower />
    </Canvas>
  )
}
