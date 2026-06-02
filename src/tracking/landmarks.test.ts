import { describe, it, expect } from 'vitest'
import {
  dist2D,
  mirrorX,
  toCanvasPoint,
  HAND_CONNECTIONS,
  FINGER_TIPS,
  LM,
} from './landmarks'

describe('dist2D', () => {
  it('is zero for identical points', () => {
    expect(dist2D({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 })).toBe(0)
  })
  it('computes a 3-4-5 triangle hypotenuse', () => {
    expect(dist2D({ x: 0, y: 0 }, { x: 0.3, y: 0.4 })).toBeCloseTo(0.5, 6)
  })
})

describe('mirrorX (DEV_PLAN §8)', () => {
  it('flips around 0.5', () => {
    expect(mirrorX(0)).toBe(1)
    expect(mirrorX(1)).toBe(0)
    expect(mirrorX(0.5)).toBe(0.5)
    expect(mirrorX(0.2)).toBeCloseTo(0.8, 6)
  })
})

describe('toCanvasPoint', () => {
  it('mirrors x and scales to pixels, leaves y unmirrored', () => {
    // landmark at left of source (x=0.2) → right of mirrored screen
    const p = toCanvasPoint({ x: 0.2, y: 0.25 }, 640, 480)
    expect(p.x).toBeCloseTo(0.8 * 640, 6) // (1-0.2)*640 = 512
    expect(p.y).toBeCloseTo(0.25 * 480, 6) // 120
  })
  it('a hand moving source-left→right makes screen point move right→left mirror-correctly', () => {
    const a = toCanvasPoint({ x: 0.1, y: 0.5 }, 100, 100) // screen x = 90
    const b = toCanvasPoint({ x: 0.9, y: 0.5 }, 100, 100) // screen x = 10
    // moving the real hand to its right (source x decreasing in mirror sense)
    // is validated end-to-end with a camera; here we lock the transform itself.
    expect(a.x).toBeCloseTo(90, 6)
    expect(b.x).toBeCloseTo(10, 6)
  })
})

describe('hand topology constants', () => {
  it('has 21 skeleton connections with in-range indices', () => {
    expect(HAND_CONNECTIONS).toHaveLength(21)
    for (const [a, b] of HAND_CONNECTIONS) {
      expect(a).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(20)
      expect(a).not.toBe(b)
    }
  })
  it('finger tips are the canonical 4,8,12,16,20', () => {
    expect([...FINGER_TIPS]).toEqual([4, 8, 12, 16, 20])
    expect(LM.THUMB_TIP).toBe(4)
    expect(LM.PINKY_TIP).toBe(20)
    expect(LM.MIDDLE_MCP).toBe(9)
  })
})
