import { describe, it, expect } from 'vitest'
import { makeGestureSmoother } from './smoothing'
import { defaultGestureState, type GestureState } from './types'

const withRotation = (rotation: number): GestureState => ({
  ...defaultGestureState(),
  detected: true,
  rotation,
})

/** Wrapped angular difference in [-π, π]. */
function angDiff(a: number, b: number): number {
  let d = a - b
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}

describe('gesture smoothing — rotation across the ±π wrap (review fix #1)', () => {
  it('never produces a ~2π discontinuity when rotation wraps', () => {
    const sm = makeGestureSmoother()
    const angles = [3.0, 3.1, Math.PI - 0.001, -Math.PI + 0.001, -3.1, -3.0] // tiny real motion across wrap
    let prev: number | null = null
    let maxStep = 0
    let t = 0
    for (const a of angles) {
      const out = sm.smooth(withRotation(a), t).rotation
      if (prev !== null) maxStep = Math.max(maxStep, Math.abs(angDiff(out, prev)))
      prev = out
      t += 1 / 60
    }
    // A raw-scalar filter would spike toward ~2π here; the sin/cos filter stays small.
    expect(maxStep).toBeLessThan(1.0)
  })

  it('converges to a steady input angle', () => {
    const sm = makeGestureSmoother()
    let out = 0
    let t = 0
    for (let i = 0; i < 120; i++) {
      out = sm.smooth(withRotation(2.5), t).rotation
      t += 1 / 60
    }
    expect(out).toBeCloseTo(2.5, 2)
  })

  it('smooths position jitter (sanity: still reduces variance)', () => {
    const sm = makeGestureSmoother()
    const raw: number[] = []
    const filtered: number[] = []
    let t = 0
    for (let i = 0; i < 100; i++) {
      const x = 0.5 + (i % 2 === 0 ? 0.06 : -0.06)
      raw.push(x)
      filtered.push(sm.smooth({ ...defaultGestureState(), detected: true, position: { x, y: 0.5 } }, t).position.x)
      t += 1 / 60
    }
    const variance = (xs: number[]) => {
      const m = xs.reduce((a, b) => a + b, 0) / xs.length
      return xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length
    }
    expect(variance(filtered.slice(20))).toBeLessThan(variance(raw.slice(20)))
  })
})
