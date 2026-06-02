// The data contract between tracking and the visual layer (DEV_PLAN §3).
// The visual layer consumes ONLY GestureState — MediaPipe types never leak in.

export interface GestureState {
  /** Is a hand currently visible. */
  detected: boolean
  /** Screen-normalized position [0,1], mirroring already applied (DEV_PLAN §8). */
  position: { x: number; y: number }
  /** Hand-size based 0 (far) … 1 (near). */
  depth: number
  /** Bloom amount 0 (bud) … 1 (full) — derived from pinch. */
  bloom: number
  /** Count of extended fingers. */
  fingerCount: 0 | 1 | 2 | 3 | 4 | 5
  /** In-plane (roll) rotation in radians. */
  rotation: number
  /** Closed fist. */
  isFist: boolean
}

/** A neutral GestureState used before any hand is seen. */
export function defaultGestureState(): GestureState {
  return {
    detected: false,
    position: { x: 0.5, y: 0.5 },
    depth: 0.5,
    bloom: 0,
    fingerCount: 0,
    rotation: 0,
    isFist: false,
  }
}
