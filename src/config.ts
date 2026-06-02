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
 * Per-frame interpolation factors (render loop lerp on top of One Euro).
 * Phase 3+ may switch to time-based damp (DEV_PLAN §11 motion.dampSmoothTime).
 */
export const MOTION = {
  positionLerp: 0.18,
  scaleLerp: 0.18,
  bloomLerp: 0.2,
  rotationLerp: 0.2,
} as const

/**
 * Pinch → bloom (DEV_PLAN §9.3). pinch = dist(thumbTip,indexTip)/handScale,
 * then smoothstep(closed, open). closed = fingers together (bud, 0),
 * open = spread (full bloom, 1).
 */
export const PINCH = {
  closed: 0.25,
  open: 1.1,
} as const

/**
 * Finger extension (DEV_PLAN §9.4). A finger is extended when its tip is
 * farther from the wrist than its PIP, by this ratio. Thumb uses a separate
 * lateral test against the index MCP.
 */
export const FINGER = {
  extRatio: 1.05,
  thumbExtRatio: 1.25,
} as const

/**
 * Fist (DEV_PLAN §9.4): the four non-thumb fingers folded AND their tips close
 * to the palm center, within this fraction of handScale.
 */
export const FIST = {
  tipToPalmRatio: 0.85,
} as const

/** One Euro Filter start points (DEV_PLAN §10). Tuned at the final camera test. */
export const ONE_EURO = {
  position: { minCutoff: 1.0, beta: 0.02, dCutoff: 1.0 },
  depth: { minCutoff: 1.0, beta: 0.02, dCutoff: 1.0 },
  bloom: { minCutoff: 1.0, beta: 0.015, dCutoff: 1.0 },
  rotation: { minCutoff: 1.0, beta: 0.02, dCutoff: 1.0 },
} as const
