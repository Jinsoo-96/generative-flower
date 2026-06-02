import {
  Shape,
  ShapeGeometry,
  ShaderMaterial,
  Color,
  DoubleSide,
  type BufferGeometry,
} from 'three'
import { TONE } from '../config'

/**
 * A unit petal: base at origin (y=0), tip at y=1, width ≈ 0.36. ShapeGeometry
 * sets uv = (x,y), so uv.y runs base→tip for the gradient. Scaled per-instance.
 */
export function makePetalGeometry(): BufferGeometry {
  const s = new Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(0.24, 0.18, 0.2, 0.86, 0, 1)
  s.bezierCurveTo(-0.2, 0.86, -0.24, 0.18, 0, 0)
  return new ShapeGeometry(s, 24)
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vPosV;
  void main() {
    vUv = uv;
    mat4 instance = mat4(1.0);
    #ifdef USE_INSTANCING
      instance = instanceMatrix;
    #endif
    vec3 transformed = (instance * vec4(position, 1.0)).xyz;
    vec3 objNormal = mat3(instance) * normal;
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    vPosV = mvPosition.xyz;
    vNormalV = normalize(normalMatrix * objNormal);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uTip;
  uniform vec3 uRim;
  uniform float uEmissive;
  uniform float uFresnelPower;
  uniform float uFresnelIntensity;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vPosV;
  void main() {
    // base (inner) → tip (outer, glowing) gradient along the petal length.
    vec3 grad = mix(uBase, uTip, smoothstep(0.0, 1.0, vUv.y));
    // fresnel rim: view-facing edges glow (back-light translucency feel).
    vec3 V = normalize(-vPosV);
    float ndv = max(dot(normalize(vNormalV), V), 0.0);
    float fres = pow(1.0 - ndv, uFresnelPower);
    vec3 col = grad * uEmissive + uRim * (fres * uFresnelIntensity);
    gl_FragColor = vec4(col, uOpacity);
  }
`

export type SpeciesColors = { base: string; tip: string; emissive: string; rim: string }

/** Self-lit petal material (emissive drives Bloom). Colors set via uniforms. */
export function makePetalMaterial(colors: SpeciesColors): ShaderMaterial {
  const m = TONE.petalMaterial
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uBase: { value: new Color(colors.base) },
      uTip: { value: new Color(colors.tip) },
      uRim: { value: new Color(colors.rim) },
      uEmissive: { value: m.emissiveIntensity },
      uFresnelPower: { value: m.fresnelPower },
      uFresnelIntensity: { value: m.fresnelIntensity },
      uOpacity: { value: m.opacity },
    },
    vertexShader,
    fragmentShader,
  })
}
