// Flower-form math (DEV_PLAN §9.6). Pure & unit-tested — no three.js here.

/** Golden angle ≈ 137.5° (DEV_PLAN §9.6). */
export const GOLDEN = Math.PI * (3 - Math.sqrt(5))

export interface Vec2 {
  x: number
  y: number
}

/** Phyllotaxis seed placement: n points on a sunflower spiral, spacing c. */
export function phyllotaxis(n: number, c: number): Vec2[] {
  const out: Vec2[] = []
  for (let i = 0; i < n; i++) {
    const theta = i * GOLDEN
    const r = c * Math.sqrt(i)
    out.push({ x: r * Math.cos(theta), y: r * Math.sin(theta) })
  }
  return out
}

export type SpeciesName = 'rose' | 'daisy' | 'lotus'

/** One ring of petals. */
export interface PetalLayer {
  count: number
  radius: number // base offset from center at full bloom
  len: number // petal length
  width: number // petal width
  phase: number // phase offset (0..1) → opens slightly later; per-layer variety
}

export interface SpeciesDef {
  name: SpeciesName
  layers: PetalLayer[]
  coreScale: number // phyllotaxis seed cluster radius
  seedCount: number // phyllotaxis seed count
}

export const SPECIES: Record<SpeciesName, SpeciesDef> = {
  // 장미형: 여러 겹 (층마다 위상 오프셋), 좁은 꽃잎.
  rose: {
    name: 'rose',
    layers: [
      { count: 8, radius: 0.12, len: 0.46, width: 0.46, phase: 0.0 },
      { count: 8, radius: 0.24, len: 0.54, width: 0.5, phase: 0.25 },
      { count: 8, radius: 0.38, len: 0.6, width: 0.5, phase: 0.5 },
      { count: 6, radius: 0.5, len: 0.58, width: 0.46, phase: 0.75 },
    ],
    coreScale: 0.16,
    seedCount: 24,
  },
  // 데이지형: phyllotaxis 중심 + 홑꽃잎 한 겹(가늘게).
  daisy: {
    name: 'daisy',
    layers: [{ count: 13, radius: 0.5, len: 0.82, width: 0.16, phase: 0.0 }],
    coreScale: 0.42,
    seedCount: 90,
  },
  // 연꽃형: 넓고 적은 꽃잎.
  lotus: {
    name: 'lotus',
    layers: [
      { count: 8, radius: 0.24, len: 0.7, width: 0.5, phase: 0.0 },
      { count: 6, radius: 0.44, len: 0.72, width: 0.55, phase: 0.4 },
    ],
    coreScale: 0.26,
    seedCount: 30,
  },
}

/** Max petals across species (instance budget). rose = 30. */
export const MAX_PETALS = 32

/** fingerCount → species (DEV_PLAN §6). ≤1 rose, 2 daisy, ≥3 lotus. */
export function speciesForFingerCount(n: number): SpeciesName {
  if (n <= 1) return 'rose'
  if (n === 2) return 'daisy'
  return 'lotus'
}

/** A fixed-length petal slot (per instance). `active` 0 = hidden (scale 0). */
export interface PetalSlot {
  angle: number
  radius: number
  len: number
  width: number
  phase: number
  active: number
}

/** Flatten a species' layers into MAX_PETALS slots (extras inactive). */
export function buildPetalSlots(def: SpeciesDef): PetalSlot[] {
  const slots: PetalSlot[] = []
  for (const layer of def.layers) {
    for (let k = 0; k < layer.count; k++) {
      slots.push({
        angle: (k / layer.count) * Math.PI * 2 + layer.phase * Math.PI * 2,
        radius: layer.radius,
        len: layer.len,
        width: layer.width,
        phase: layer.phase,
        active: 1,
      })
    }
  }
  while (slots.length < MAX_PETALS) {
    slots.push({ angle: 0, radius: 0, len: 0, width: 0, phase: 0, active: 0 })
  }
  return slots.slice(0, MAX_PETALS)
}

/** Total active petals for a species. */
export function petalCount(def: SpeciesDef): number {
  return def.layers.reduce((a, l) => a + l.count, 0)
}
