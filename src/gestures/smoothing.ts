// Per-scalar One Euro smoothing of a GestureState (DEV_PLAN §10, Phase 2).
// position.x/y, depth, bloom, rotation get individual filters; discrete signals
// (fingerCount, isFist) pass through raw.

import { makeOneEuro } from './oneEuro'
import { ONE_EURO } from '../config'
import type { GestureState } from './types'

export interface GestureSmoother {
  smooth: (raw: GestureState, t: number) => GestureState
}

export function makeGestureSmoother(): GestureSmoother {
  const fx = makeOneEuro(ONE_EURO.position)
  const fy = makeOneEuro(ONE_EURO.position)
  const fd = makeOneEuro(ONE_EURO.depth)
  const fb = makeOneEuro(ONE_EURO.bloom)
  const fr = makeOneEuro(ONE_EURO.rotation)

  return {
    smooth(raw, t) {
      return {
        ...raw,
        position: { x: fx.filter(raw.position.x, t), y: fy.filter(raw.position.y, t) },
        depth: fd.filter(raw.depth, t),
        bloom: fb.filter(raw.bloom, t),
        rotation: fr.filter(raw.rotation, t),
      }
    },
  }
}
