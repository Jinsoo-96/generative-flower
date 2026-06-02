import { describe, it, expect } from 'vitest'
import { OneEuro, makeOneEuro } from './oneEuro'

function variance(xs: number[]): number {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  return xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length
}

describe('OneEuro (DEV_PLAN §10)', () => {
  it('passes the first sample through unchanged', () => {
    const f = new OneEuro()
    expect(f.filter(0.42, 0)).toBe(0.42)
  })

  it('reduces variance of a noisy constant signal (jitter removal)', () => {
    const f = new OneEuro(1.0, 0.02, 1.0)
    const raw: number[] = []
    const filtered: number[] = []
    for (let i = 0; i < 120; i++) {
      // constant 0.5 with deterministic ±0.08 alternating jitter
      const x = 0.5 + (i % 2 === 0 ? 0.08 : -0.08)
      raw.push(x)
      filtered.push(f.filter(x, i / 60)) // 60 fps timestamps
    }
    // compare steady-state (skip warm-up)
    expect(variance(filtered.slice(20))).toBeLessThan(variance(raw.slice(20)) * 0.5)
  })

  it('still tracks a slow ramp (does not over-smooth signal)', () => {
    const f = makeOneEuro({ minCutoff: 1.0, beta: 0.02, dCutoff: 1.0 })
    let last = 0
    for (let i = 0; i < 120; i++) {
      const x = i / 120 // ramp 0 → ~1
      last = f.filter(x, i / 60)
    }
    // final output should be close to the final input (lag is small)
    expect(last).toBeGreaterThan(0.9)
    expect(last).toBeLessThanOrEqual(1)
  })

  it('higher beta reduces lag on fast motion', () => {
    const slow = new OneEuro(1.0, 0.0, 1.0)
    const fast = new OneEuro(1.0, 1.0, 1.0)
    let slowOut = 0
    let fastOut = 0
    for (let i = 0; i < 30; i++) {
      const x = i < 5 ? 0 : 1 // step input
      slowOut = slow.filter(x, i / 60)
      fastOut = fast.filter(x, i / 60)
    }
    // the high-beta filter should have caught up more after the step
    expect(fastOut).toBeGreaterThan(slowOut)
  })
})
