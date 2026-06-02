// Tunable thresholds & coefficients in one place (DEV_PLAN §1.9, §9).
// The visual TONE token block (DEV_PLAN §11) is added in Phase 3.

/** Perspective camera + the plane the flower lives on. */
export const CAMERA = {
  fovDeg: 50,
  position: [0, 0, 5] as const,
  /** World z of the flower plane → distance D = position.z - planeZ. */
  planeZ: 0,
} as const

/** Distance D from camera to flower plane (DEV_PLAN §9.1). */
export const FLOWER_PLANE_DISTANCE = CAMERA.position[2] - CAMERA.planeZ

/**
 * Hand "depth" mapping (DEV_PLAN §9.2). depth = clamp01((handScale - min)/(max - min)),
 * where handScale = normalized distance between wrist(0) and middle-MCP(9).
 * Empirical range; tuned at the final camera test.
 */
export const DEPTH = {
  nearMin: 0.1, // hand far → smaller wrist–MCP distance
  nearMax: 0.4, // hand close → larger
} as const

/** Flower scale range driven by depth. */
export const FLOWER = {
  minScale: 0.55,
  maxScale: 1.7,
} as const

/**
 * Per-frame interpolation. Phase 1 uses simple lerp factors; Phase 2 switches
 * the render loop to time-based damp (DEV_PLAN §11 motion.dampSmoothTime).
 */
export const MOTION = {
  positionLerp: 0.18,
  scaleLerp: 0.18,
} as const
