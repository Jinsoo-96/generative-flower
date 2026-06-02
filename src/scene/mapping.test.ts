import { describe, it, expect } from 'vitest'
import { frustumHalfExtents, normalizedToWorld, depthToScale } from './mapping'
import { mirrorX } from '../tracking/landmarks'

const F90 = { fovDeg: 90, aspect: 1, distance: 1 } // tan(45°)=1 → halfH=1

describe('frustumHalfExtents', () => {
  it('fov 90 / aspect 1 / D 1 → half-extents of 1', () => {
    const { halfW, halfH } = frustumHalfExtents(F90)
    expect(halfH).toBeCloseTo(1, 6)
    expect(halfW).toBeCloseTo(1, 6)
  })
  it('scales width by aspect and height by distance', () => {
    const { halfW, halfH } = frustumHalfExtents({ fovDeg: 90, aspect: 2, distance: 3 })
    expect(halfH).toBeCloseTo(3, 6)
    expect(halfW).toBeCloseTo(6, 6)
  })
})

describe('normalizedToWorld (DEV_PLAN §9.1)', () => {
  it('center maps to origin', () => {
    const p = normalizedToWorld(0.5, 0.5, F90)
    expect(p.x).toBeCloseTo(0, 6)
    expect(p.y).toBeCloseTo(0, 6)
  })
  it('flips y: screen-top → world-up (+), screen-bottom → world-down (-)', () => {
    expect(normalizedToWorld(0.5, 0, F90).y).toBeCloseTo(1, 6)
    expect(normalizedToWorld(0.5, 1, F90).y).toBeCloseTo(-1, 6)
  })
  it('right of mirrored screen → world +x', () => {
    expect(normalizedToWorld(1, 0.5, F90).x).toBeCloseTo(1, 6)
    expect(normalizedToWorld(0, 0.5, F90).x).toBeCloseTo(-1, 6)
  })
})

describe('mirroring direction (landmarks.mirrorX ∘ normalizedToWorld)', () => {
  it('a hand at source-left lands on world +x (selfie), source-right on -x', () => {
    // source x small (hand near left edge of raw frame) → mirror → screen right → world +x
    const left = normalizedToWorld(mirrorX(0.1), 0.5, F90)
    const right = normalizedToWorld(mirrorX(0.9), 0.5, F90)
    expect(left.x).toBeCloseTo(0.8, 6) // mirror(0.1)=0.9 → ndc 0.8
    expect(right.x).toBeCloseTo(-0.8, 6)
    expect(left.x).toBeGreaterThan(right.x)
  })
})

describe('depthToScale (DEV_PLAN §9.2)', () => {
  it('maps endpoints and midpoint', () => {
    expect(depthToScale(0, 0.5, 1.5)).toBeCloseTo(0.5, 6)
    expect(depthToScale(1, 0.5, 1.5)).toBeCloseTo(1.5, 6)
    expect(depthToScale(0.5, 0.5, 1.5)).toBeCloseTo(1.0, 6)
  })
  it('clamps out-of-range depth', () => {
    expect(depthToScale(-2, 0.5, 1.5)).toBeCloseTo(0.5, 6)
    expect(depthToScale(5, 0.5, 1.5)).toBeCloseTo(1.5, 6)
  })
})
