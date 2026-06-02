// landmarks → GestureState(raw), a pure function (DEV_PLAN §3, §9).
// Synthetic-input unit tests live in extract.test.ts (no camera).

import { LM, dist2D, mirrorX, type Point2 } from '../tracking/landmarks'
import { clamp01, smoothstep } from '../lib/math'
import { DEPTH, PINCH, FINGER, FIST } from '../config'
import { defaultGestureState, type GestureState } from './types'

/** Structural landmark (MediaPipe NormalizedLandmark is assignable). */
export interface Landmark extends Point2 {
  z?: number
}

/** Palm center = mean of wrist(0), index-MCP(5), middle-MCP(9), pinky-MCP(17). */
export function palmCenter(lm: readonly Landmark[]): Point2 {
  const ids = [LM.WRIST, LM.INDEX_MCP, LM.MIDDLE_MCP, LM.PINKY_MCP]
  let x = 0
  let y = 0
  for (const i of ids) {
    x += lm[i].x
    y += lm[i].y
  }
  return { x: x / ids.length, y: y / ids.length }
}

/** Normalized hand size: wrist(0)–middle-MCP(9) distance (DEV_PLAN §9.2). */
export function handScale(lm: readonly Landmark[]): number {
  return dist2D(lm[LM.WRIST], lm[LM.MIDDLE_MCP])
}

/** handScale → depth 0..1, robust to camera distance. */
export function depthFromHandScale(scale: number): number {
  return clamp01((scale - DEPTH.nearMin) / (DEPTH.nearMax - DEPTH.nearMin))
}

/** Pinch ratio = thumbTip(4)–indexTip(8) distance / handScale (DEV_PLAN §9.3). */
export function pinchRatio(lm: readonly Landmark[]): number {
  const scale = handScale(lm)
  if (scale <= 0) return PINCH.open
  return dist2D(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]) / scale
}

/** Pinch → bloom 0 (closed/bud) … 1 (open/full). */
export function bloomFromPinch(lm: readonly Landmark[]): number {
  return smoothstep(PINCH.closed, PINCH.open, pinchRatio(lm))
}

/** A finger (non-thumb) is extended when its tip is farther from the wrist
 *  than its PIP, scaled by extRatio (DEV_PLAN §9.4). */
export function isFingerExtended(
  lm: readonly Landmark[],
  tip: number,
  pip: number,
): boolean {
  return dist2D(lm[tip], lm[0]) > dist2D(lm[pip], lm[0]) * FINGER.extRatio
}

/** Thumb extension: thumb tip(4) farther from the wrist than the thumb MCP(2),
 *  scaled by thumbExtRatio (handedness-free approximation, DEV_PLAN §9.4). */
export function isThumbExtended(lm: readonly Landmark[]): boolean {
  return dist2D(lm[LM.THUMB_TIP], lm[0]) > dist2D(lm[LM.THUMB_MCP], lm[0]) * FINGER.thumbExtRatio
}

const NON_THUMB: ReadonlyArray<readonly [number, number]> = [
  [LM.INDEX_TIP, LM.INDEX_PIP],
  [LM.MIDDLE_TIP, LM.MIDDLE_PIP],
  [LM.RING_TIP, LM.RING_PIP],
  [LM.PINKY_TIP, LM.PINKY_PIP],
]

/** Count of extended fingers, 0..5 (thumb + four fingers). */
export function countFingers(lm: readonly Landmark[]): GestureState['fingerCount'] {
  let n = isThumbExtended(lm) ? 1 : 0
  for (const [tip, pip] of NON_THUMB) {
    if (isFingerExtended(lm, tip, pip)) n++
  }
  return Math.min(5, n) as GestureState['fingerCount']
}

/** In-plane (roll) rotation in radians (DEV_PLAN §9.5, mirroring applied). */
export function rotationAngle(lm: readonly Landmark[]): number {
  // v from wrist(0) to middle-MCP(9) in mirrored-x / screen-y space.
  const vx = lm[LM.WRIST].x - lm[LM.MIDDLE_MCP].x // (1-x9)-(1-x0) = x0-x9
  const vy = lm[LM.MIDDLE_MCP].y - lm[LM.WRIST].y
  return Math.atan2(vy, vx)
}

/** Fist: the four non-thumb fingers folded AND their tips near the palm. */
export function isFist(lm: readonly Landmark[]): boolean {
  for (const [tip, pip] of NON_THUMB) {
    if (isFingerExtended(lm, tip, pip)) return false
  }
  const center = palmCenter(lm)
  const scale = handScale(lm)
  if (scale <= 0) return false
  const tips = [LM.INDEX_TIP, LM.MIDDLE_TIP, LM.RING_TIP, LM.PINKY_TIP]
  let sum = 0
  for (const t of tips) sum += dist2D(lm[t], center)
  return sum / tips.length < FIST.tipToPalmRatio * scale
}

/**
 * Extract a raw GestureState from one hand's 21 landmarks. Returns a
 * not-detected default if the landmark array is incomplete.
 */
export function extractGesture(lm: readonly Landmark[]): GestureState {
  if (lm.length < 21) return defaultGestureState()

  const center = palmCenter(lm)
  return {
    detected: true,
    // position is mirrored for selfie display (DEV_PLAN §8): x → 1 - x.
    position: { x: mirrorX(center.x), y: center.y },
    depth: depthFromHandScale(handScale(lm)),
    bloom: bloomFromPinch(lm),
    fingerCount: countFingers(lm),
    rotation: rotationAngle(lm),
    isFist: isFist(lm),
  }
}
