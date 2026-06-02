// One Euro Filter — the core of jitter removal (DEV_PLAN §10).
// One instance per scalar signal; vectors filtered per-axis.
//
// NOTE: tsconfig has `erasableSyntaxOnly: true`, which forbids constructor
// parameter properties — fields are declared and assigned explicitly.

const alpha = (cutoff: number, dt: number): number => {
  const r = 2 * Math.PI * cutoff * dt
  return r / (r + 1)
}

class LowPass {
  private s = 0
  private init = false
  filter(x: number, a: number): number {
    this.s = this.init ? a * x + (1 - a) * this.s : x
    this.init = true
    return this.s
  }
}

export interface OneEuroParams {
  minCutoff?: number
  beta?: number
  dCutoff?: number
}

export class OneEuro {
  private xF = new LowPass()
  private dxF = new LowPass()
  private lastTime: number | null = null
  private lastRaw = 0
  private minCutoff: number
  private beta: number
  private dCutoff: number

  constructor(minCutoff = 1.0, beta = 0.02, dCutoff = 1.0) {
    this.minCutoff = minCutoff
    this.beta = beta
    this.dCutoff = dCutoff
  }

  /** `t` is in seconds (e.g. performance.now() / 1000). */
  filter(x: number, t: number): number {
    if (this.lastTime == null) {
      this.lastTime = t
      this.lastRaw = x
      return x
    }
    const dt = Math.max(1e-6, t - this.lastTime)
    this.lastTime = t
    const dx = (x - this.lastRaw) / dt
    this.lastRaw = x
    const edx = this.dxF.filter(dx, alpha(this.dCutoff, dt))
    const cutoff = this.minCutoff + this.beta * Math.abs(edx)
    return this.xF.filter(x, alpha(cutoff, dt))
  }
}

/** Convenience: build a OneEuro from a params object (config.ts). */
export function makeOneEuro(p: OneEuroParams): OneEuro {
  return new OneEuro(p.minCutoff, p.beta, p.dCutoff)
}
