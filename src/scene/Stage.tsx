import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { CAMERA, TONE } from '../config'
import { Flower } from './Flower'

/**
 * R3F stage: perspective camera + dark ambient/key lighting (DEV_PLAN §11 —
 * the flower is mostly self-lit via emissive; lights only shape it). The canvas
 * is transparent so the CSS radial-gradient background (TONE.background) shows
 * through. Bloom blooms the emissive petals (toggle/vignette/CA → Phase 4).
 */
export function Stage() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{
        fov: CAMERA.fovDeg,
        position: [CAMERA.position[0], CAMERA.position[1], CAMERA.position[2]],
      }}
    >
      <ambientLight intensity={TONE.lighting.ambientIntensity} color={TONE.lighting.ambientColor} />
      <directionalLight position={[2, 3, 4]} intensity={TONE.lighting.keyIntensity} color={TONE.lighting.keyColor} />
      <Flower />
      <EffectComposer>
        <Bloom
          intensity={TONE.bloom.intensity}
          luminanceThreshold={TONE.bloom.luminanceThreshold}
          luminanceSmoothing={TONE.bloom.luminanceSmoothing}
          mipmapBlur={TONE.bloom.mipmapBlur}
          radius={TONE.bloom.radius}
        />
      </EffectComposer>
    </Canvas>
  )
}
