// Normalized hand coordinates → Three.js world coordinates (DEV_PLAN §9.1).
// Pure functions, unit-tested with synthetic inputs (no camera).

import { clamp01, lerp } from '../lib/math'

export interface Frustum {
  /** Vertical field of view in degrees. */
  fovDeg: number
  /** width / height. */
  aspect: number
  /** Distance D from the camera to the flower plane. */
  distance: number
}

/** Half-extents (world units) visible on the plane at `distance`. */
export function frustumHalfExtents(f: Frustum): { halfW: number; halfH: number } {
  const halfH = Math.tan((f.fovDeg * Math.PI) / 180 / 2) * f.distance
  return { halfW: halfH * f.aspect, halfH }
}

/**
 * Map a MIRRORED screen-normalized coord (x,y ∈ [0,1], origin top-left, x→right,
 * y→down — i.e. GestureState.position) to world (x,y) on the flower plane.
 * y is flipped because screen-y grows downward but world/NDC-y grows upward.
 */
export function normalizedToWorld(
  mx: number,
  my: number,
  f: Frustum,
): { x: number; y: number } {
  const ndcX = mx * 2 - 1
  const ndcY = -(my * 2 - 1)
  const { halfW, halfH } = frustumHalfExtents(f)
  return { x: ndcX * halfW, y: ndcY * halfH }
}

/** Map depth 0…1 → flower scale [min,max] (DEV_PLAN §9.2 → scale). */
export function depthToScale(depth: number, min: number, max: number): number {
  return lerp(min, max, clamp01(depth))
}
