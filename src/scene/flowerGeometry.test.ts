import { describe, it, expect } from 'vitest'
import {
  GOLDEN,
  phyllotaxis,
  speciesForFingerCount,
  buildPetalSlots,
  petalCount,
  SPECIES,
  MAX_PETALS,
} from './flowerGeometry'

describe('phyllotaxis (DEV_PLAN §9.6)', () => {
  it('golden angle ≈ 137.5°', () => {
    expect((GOLDEN * 180) / Math.PI).toBeCloseTo(137.5, 1)
  })
  it('produces n points with radius growing as sqrt(i)', () => {
    const pts = phyllotaxis(50, 0.1)
    expect(pts).toHaveLength(50)
    expect(pts[0].x).toBeCloseTo(0, 6)
    expect(pts[0].y).toBeCloseTo(0, 6)
    const r9 = Math.hypot(pts[9].x, pts[9].y)
    const r36 = Math.hypot(pts[36].x, pts[36].y)
    // r ∝ sqrt(i): r(36)/r(9) = sqrt(36/9) = 2
    expect(r36 / r9).toBeCloseTo(2, 1)
  })
})

describe('speciesForFingerCount (DEV_PLAN §6)', () => {
  it('maps finger counts to the three species', () => {
    expect(speciesForFingerCount(1)).toBe('rose')
    expect(speciesForFingerCount(2)).toBe('daisy')
    expect(speciesForFingerCount(3)).toBe('lotus')
  })
  it('clamps out-of-range counts', () => {
    expect(speciesForFingerCount(0)).toBe('rose')
    expect(speciesForFingerCount(4)).toBe('lotus')
    expect(speciesForFingerCount(5)).toBe('lotus')
  })
})

describe('buildPetalSlots', () => {
  it('always returns MAX_PETALS slots, padding with inactive', () => {
    for (const def of Object.values(SPECIES)) {
      const slots = buildPetalSlots(def)
      expect(slots).toHaveLength(MAX_PETALS)
      const active = slots.filter((s) => s.active === 1).length
      expect(active).toBe(petalCount(def))
      expect(active).toBeLessThanOrEqual(MAX_PETALS)
    }
  })
  it('rose has the most petals, lotus/daisy fewer', () => {
    expect(petalCount(SPECIES.rose)).toBeGreaterThan(petalCount(SPECIES.lotus))
    expect(petalCount(SPECIES.daisy)).toBeGreaterThan(0)
  })
})
