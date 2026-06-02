// Small pure math helpers shared by gesture extraction and scene mapping.

/** Clamp to [0,1]. */
export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/** Clamp to [min,max]. */
export function clamp(x: number, min: number, max: number): number {
  return x < min ? min : x > max ? max : x
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Inverse lerp: where does `x` sit in [a,b] as a 0..1 fraction (unclamped). */
export function invLerp(a: number, b: number, x: number): number {
  return a === b ? 0 : (x - a) / (b - a)
}

/** GLSL-style smoothstep: 0 below edge0, 1 above edge1, smooth in between. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01(invLerp(edge0, edge1, x))
  return t * t * (3 - 2 * t)
}
