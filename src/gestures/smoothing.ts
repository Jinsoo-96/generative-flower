// Per-scalar One Euro smoothing of a GestureState (DEV_PLAN §10, Phase 2).
// position.x/y, depth, bloom get individual filters; rotation is smoothed in
// sin/cos space so it survives the ±π wrap (a raw-angle filter would see the
// wrap as a huge velocity spike). Discrete signals (fingerCount, isFist) pass through.

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
  // Angle-safe: filter the unit vector (cos, sin) instead of the wrapping scalar.
  const fcos = makeOneEuro(ONE_EURO.rotation)
  const fsin = makeOneEuro(ONE_EURO.rotation)

  return {
    smooth(raw, t) {
      const c = fcos.filter(Math.cos(raw.rotation), t)
      const s = fsin.filter(Math.sin(raw.rotation), t)
      return {
        ...raw,
        position: { x: fx.filter(raw.position.x, t), y: fy.filter(raw.position.y, t) },
        depth: fd.filter(raw.depth, t),
        bloom: fb.filter(raw.bloom, t),
        rotation: Math.atan2(s, c),
      }
    },
  }
}
