import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { Vector2 } from 'three'
import { CAMERA, TONE } from '../config'
import { Flower } from './Flower'
import { Petals } from './Petals'

/**
 * R3F stage: perspective camera + dark ambient/key lighting (DEV_PLAN §11 —
 * the flower is mostly self-lit via emissive). Transparent canvas → CSS radial
 * gradient (TONE.background) shows through. Bloom is the heaviest pass and is
 * toggleable from the HUD; subtle vignette + chromatic aberration stay on.
 */
export function Stage({ bloomEnabled = true }: { bloomEnabled?: boolean }) {
  const caOffset = useMemo(
    () => new Vector2(TONE.post.chromaticAberration.offset, TONE.post.chromaticAberration.offset),
    [],
  )

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
      <Petals />
      <EffectComposer>
        <>
          {bloomEnabled && (
            <Bloom
              intensity={TONE.bloom.intensity}
              luminanceThreshold={TONE.bloom.luminanceThreshold}
              luminanceSmoothing={TONE.bloom.luminanceSmoothing}
              mipmapBlur={TONE.bloom.mipmapBlur}
              radius={TONE.bloom.radius}
            />
          )}
          {TONE.post.chromaticAberration.enabled && (
            <ChromaticAberration offset={caOffset} radialModulation={false} modulationOffset={0} />
          )}
          {TONE.post.vignette.enabled && (
            <Vignette offset={TONE.post.vignette.offset} darkness={TONE.post.vignette.darkness} />
          )}
        </>
      </EffectComposer>
    </Canvas>
  )
}
