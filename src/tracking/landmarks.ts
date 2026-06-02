// MediaPipe Hand 21-landmark index reference + pure geometry helpers.
// See docs/DEV_PLAN.md §7 (indices) and §8 (mirroring).
//
// Helpers here are intentionally pure and structurally typed ({x,y}) so they
// can be unit-tested with synthetic landmarks — no camera, no MediaPipe types.

/** A 2D point in normalized image coordinates (x,y ∈ [0,1], origin top-left). */
export interface Point2 {
  x: number
  y: number
}

/** Landmark indices (DEV_PLAN §7). TIPs are 4,8,12,16,20. */
export const LM = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const

/** Finger tip indices. */
export const FINGER_TIPS = [4, 8, 12, 16, 20] as const

/** Standard MediaPipe hand skeleton edges (21 points → 21 connections). */
export const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  // thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // middle
  [5, 9], [9, 10], [10, 11], [11, 12],
  // ring
  [9, 13], [13, 14], [14, 15], [15, 16],
  // pinky
  [13, 17], [17, 18], [18, 19], [19, 20],
  // palm base
  [0, 17],
]

/** Euclidean distance in the normalized 2D plane. */
export function dist2D(a: Point2, b: Point2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

/**
 * Mirror the x of a normalized coordinate for selfie display (DEV_PLAN §8).
 * The <video> is CSS-mirrored (scaleX(-1)); MediaPipe landmarks are in the
 * un-mirrored source frame, so screen-space x must be flipped to `1 - x`.
 */
export function mirrorX(x: number): number {
  return 1 - x
}

/**
 * Project a normalized landmark to canvas pixel coordinates for the (un-mirrored)
 * overlay canvas drawn on top of the mirrored video: x is flipped, y unchanged.
 */
export function toCanvasPoint(lm: Point2, width: number, height: number): Point2 {
  return { x: mirrorX(lm.x) * width, y: lm.y * height }
}
