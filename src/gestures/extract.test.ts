import { describe, it, expect } from 'vitest'
import {
  extractGesture,
  countFingers,
  isFist,
  bloomFromPinch,
  rotationAngle,
  type Landmark,
} from './extract'

// ── Synthetic hand builder ───────────────────────────────────────────────
// Normalized coords (x→right, y→down), origin top-left. The hand points "up"
// (fingers toward -y) with the wrist at the bottom. Geometry is consistent with
// the extraction heuristics so we can dial finger states deterministically.

type Pt = { x: number; y: number }
const WRIST: Pt = { x: 0.5, y: 0.8 }
const L = 0.085 // finger segment length

const MCP = {
  index: { x: 0.44, y: 0.58 },
  middle: { x: 0.5, y: 0.57 },
  ring: { x: 0.56, y: 0.58 },
  pinky: { x: 0.61, y: 0.61 },
}

function finger(mcp: Pt, extended: boolean): [Pt, Pt, Pt, Pt] {
  if (extended) {
    return [
      mcp,
      { x: mcp.x, y: mcp.y - L },
      { x: mcp.x, y: mcp.y - 2 * L },
      { x: mcp.x, y: mcp.y - 3 * L },
    ]
  }
  // folded: PIP at the knuckle (farthest from wrist), tip curls back near palm
  return [
    mcp,
    { x: mcp.x, y: mcp.y - L },
    { x: mcp.x, y: mcp.y - 0.3 * L },
    { x: mcp.x, y: mcp.y + 0.15 * L },
  ]
}

function thumb(extended: boolean): [Pt, Pt, Pt, Pt] {
  // [CMC(1), MCP(2), IP(3), TIP(4)]
  if (extended) {
    return [
      { x: 0.45, y: 0.75 },
      { x: 0.4, y: 0.7 },
      { x: 0.34, y: 0.65 },
      { x: 0.29, y: 0.6 },
    ]
  }
  return [
    { x: 0.46, y: 0.74 },
    { x: 0.45, y: 0.7 },
    { x: 0.48, y: 0.69 },
    { x: 0.5, y: 0.68 },
  ]
}

interface HandOpts {
  thumb?: boolean
  index?: boolean
  middle?: boolean
  ring?: boolean
  pinky?: boolean
  /** Place thumb tip(4) exactly this far (normalized) from index tip(8). */
  pinchDist?: number
  /** Translate the whole hand in x (source frame). */
  shiftX?: number
}

function buildHand(o: HandOpts = {}): Landmark[] {
  const [c1, m2, i3, t4] = thumb(o.thumb ?? false)
  const [i5, p6, d7, t8] = finger(MCP.index, o.index ?? false)
  const [m9, p10, d11, t12] = finger(MCP.middle, o.middle ?? false)
  const [r13, p14, d15, r16] = finger(MCP.ring, o.ring ?? false)
  const [k17, p18, d19, k20] = finger(MCP.pinky, o.pinky ?? false)
  const pts: Pt[] = [
    WRIST, c1, m2, i3, t4, i5, p6, d7, t8, m9, p10, d11, t12, r13, p14, d15, r16,
    k17, p18, d19, k20,
  ]

  if (o.pinchDist != null) {
    const it = pts[8]
    const tt = pts[4]
    let dx = tt.x - it.x
    let dy = tt.y - it.y
    const len = Math.hypot(dx, dy) || 1
    dx /= len
    dy /= len
    pts[4] = { x: it.x + dx * o.pinchDist, y: it.y + dy * o.pinchDist }
  }
  if (o.shiftX) {
    for (const p of pts) p.x += o.shiftX
  }
  return pts.map((p) => ({ x: p.x, y: p.y }))
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('countFingers (DEV_PLAN §9.4)', () => {
  it('open hand → 5', () => {
    expect(
      countFingers(buildHand({ thumb: true, index: true, middle: true, ring: true, pinky: true })),
    ).toBe(5)
  })
  it('fist → 0', () => {
    expect(countFingers(buildHand({}))).toBe(0)
  })
  it('index only → 1', () => {
    expect(countFingers(buildHand({ index: true }))).toBe(1)
  })
  it('index+middle → 2', () => {
    expect(countFingers(buildHand({ index: true, middle: true }))).toBe(2)
  })
  it('index+middle+ring → 3 (species selection range)', () => {
    expect(countFingers(buildHand({ index: true, middle: true, ring: true }))).toBe(3)
  })
})

describe('isFist (DEV_PLAN §9.4)', () => {
  it('all fingers folded → fist', () => {
    expect(isFist(buildHand({}))).toBe(true)
  })
  it('any finger extended → not a fist', () => {
    expect(isFist(buildHand({ index: true }))).toBe(false)
    expect(isFist(buildHand({ index: true, middle: true, ring: true, pinky: true }))).toBe(false)
  })
})

describe('bloomFromPinch (DEV_PLAN §9.3)', () => {
  it('closed pinch → ~0 (bud)', () => {
    expect(bloomFromPinch(buildHand({ index: true, pinchDist: 0.04 }))).toBeLessThan(0.05)
  })
  it('wide spread → ~1 (full bloom)', () => {
    expect(bloomFromPinch(buildHand({ index: true, pinchDist: 0.3 }))).toBeGreaterThan(0.95)
  })
  it('mid pinch → in between', () => {
    const b = bloomFromPinch(buildHand({ index: true, pinchDist: 0.155 }))
    expect(b).toBeGreaterThan(0.2)
    expect(b).toBeLessThan(0.8)
  })
  it('is monotonic in pinch distance', () => {
    const small = bloomFromPinch(buildHand({ index: true, pinchDist: 0.06 }))
    const mid = bloomFromPinch(buildHand({ index: true, pinchDist: 0.15 }))
    const big = bloomFromPinch(buildHand({ index: true, pinchDist: 0.28 }))
    expect(small).toBeLessThan(mid)
    expect(mid).toBeLessThan(big)
  })
})

describe('position + mirroring (DEV_PLAN §8)', () => {
  it('hand at source-left maps to larger screen x than source-right (selfie)', () => {
    const left = extractGesture(buildHand({ shiftX: -0.2 })).position
    const right = extractGesture(buildHand({ shiftX: 0.2 })).position
    expect(left.x).toBeGreaterThan(right.x)
  })
  it('position is the mirrored palm center', () => {
    const p = extractGesture(buildHand({})).position
    // palm center x ≈ mean(0.5,0.44,0.5,0.61)=0.5125 → mirrored 1-0.5125
    expect(p.x).toBeCloseTo(1 - 0.5125, 3)
  })
})

describe('rotationAngle (DEV_PLAN §9.5)', () => {
  const zeros = (): Landmark[] => Array.from({ length: 21 }, () => ({ x: 0, y: 0 }))
  it('upright hand (middle-MCP directly above wrist) → -π/2', () => {
    const lm = zeros()
    lm[0] = { x: 0.5, y: 0.8 }
    lm[9] = { x: 0.5, y: 0.5 }
    expect(rotationAngle(lm)).toBeCloseTo(-Math.PI / 2, 5)
  })
  it('tilting the hand changes the angle sign/value', () => {
    const lm = zeros()
    lm[0] = { x: 0.5, y: 0.8 }
    lm[9] = { x: 0.3, y: 0.8 } // MCP to source-left of wrist, same height
    // vx = x0 - x9 = 0.2, vy = 0 → atan2(0, 0.2) = 0
    expect(rotationAngle(lm)).toBeCloseTo(0, 5)
  })
})

describe('extractGesture integration', () => {
  it('returns not-detected default for incomplete landmarks', () => {
    const g = extractGesture([{ x: 0, y: 0 }])
    expect(g.detected).toBe(false)
  })
  it('produces a full detected state for a valid hand', () => {
    const g = extractGesture(buildHand({ index: true, middle: true }))
    expect(g.detected).toBe(true)
    expect(g.fingerCount).toBe(2)
    expect(g.depth).toBeGreaterThanOrEqual(0)
    expect(g.depth).toBeLessThanOrEqual(1)
    expect(g.bloom).toBeGreaterThanOrEqual(0)
    expect(g.bloom).toBeLessThanOrEqual(1)
  })
})
