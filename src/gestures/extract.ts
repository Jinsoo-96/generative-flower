// landmarks → GestureState(raw), a pure function (DEV_PLAN §3, §9).
//
// Phase 1 populates `position` (palm center, mirrored) and `depth` (hand size).
// Phase 2 completes `bloom` / `fingerCount` / `rotation` / `isFist` here.

import { LM, dist2D, mirrorX, type Point2 } from '../tracking/landmarks'
import { clamp01 } from '../lib/math'
import { DEPTH } from '../config'
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

/**
 * Extract a raw GestureState from one hand's 21 landmarks. Returns a
 * not-detected default if the landmark array is incomplete.
 */
export function extractGesture(lm: readonly Landmark[]): GestureState {
  if (lm.length < 21) return defaultGestureState()

  const center = palmCenter(lm)
  return {
    ...defaultGestureState(),
    detected: true,
    // position is mirrored for selfie display (DEV_PLAN §8): x → 1 - x.
    position: { x: mirrorX(center.x), y: center.y },
    depth: depthFromHandScale(handScale(lm)),
  }
}
