import { dyno, type GsplatModifier } from '@sparkjsdev/spark'

export interface DisperseModifier {
  modifier: GsplatModifier
  /** Uniform updated each frame: 0 = gathered, 1 = fully dispersed. */
  progress: ReturnType<typeof dyno.dynoFloat>
}

export interface DisperseOpts {
  /** Base splat-scale multiplier (visible even when gathered). */
  base?: number
  /** Extra scale added at full disperse. */
  grow?: number
  /** World-units of outward travel at full disperse. */
  spread?: number
  /** Opacity multiplier (this asset's native opacity is ~0.1–3%). */
  opacityBoost?: number
}

/**
 * Spark objectModifier that disperses each splat from its home toward a
 * per-splat pseudo-random direction as `progress` 0→1, growing + fading it
 * like smoke. progress is a uniform (no graph rebuild per frame).
 *
 * Each splat deterministically leaves from its home (hash of center), so splat
 * identity/index is stable and depth-sort stays coherent under smooth progress.
 */
export function makeDisperseModifier(o: DisperseOpts = {}): DisperseModifier {
  const progress = dyno.dynoFloat(0)
  const ONE = dyno.dynoFloat(1)
  const TWO = dyno.dynoFloat(2)
  const SPREAD = dyno.dynoFloat(o.spread ?? 2.2) // world-units of travel at full disperse
  // This asset's native splat scales are tiny + opacity very low (~0.1–3%), and
  // fully-gathered (coincident) splats barely accumulate. BASE/GROW puff them up;
  // OPACITY_BOOST lifts them out of near-transparency. All tunable via URL.
  // base = 1 so progress 0 (fist) is the pristine original (home positions,
  // native scale). GROW puffs only as it disperses. OPACITY_BOOST is uniform
  // (shape-preserving) — this asset's native opacity is ~0.1–3%.
  const BASE = dyno.dynoFloat(o.base ?? 1) // native scale when gathered
  const GROW = dyno.dynoFloat(o.grow ?? 3) // extra scale at full disperse
  const OPACITY_BOOST = dyno.dynoFloat(o.opacityBoost ?? 22)

  const modifier = dyno.dynoBlock(
    { gsplat: dyno.Gsplat },
    { gsplat: dyno.Gsplat },
    ({ gsplat }) => {
      if (!gsplat) throw new Error('disperseModifier: missing gsplat input')
      const s = dyno.splitGsplat(gsplat).outputs
      const center = s.center

      // Per-splat unit direction from a hash of the home position (stable).
      const h = dyno.hashVec3(center) // vec3 in [0,1)
      const dir = dyno.normalize(dyno.sub(dyno.mul(h, dyno.vec3(TWO)), dyno.vec3(ONE)))

      const outward = dyno.mul(dir, dyno.vec3(dyno.mul(progress, SPREAD)))
      const newCenter = dyno.add(center, outward)
      const newScales = dyno.mul(s.scales, dyno.vec3(dyno.add(BASE, dyno.mul(progress, GROW))))
      const boosted = dyno.min(dyno.mul(s.opacity, OPACITY_BOOST), ONE)
      const newOpacity = dyno.mul(boosted, dyno.sub(ONE, progress))

      return {
        gsplat: dyno.combineGsplat({
          gsplat,
          center: newCenter,
          scales: newScales,
          opacity: newOpacity,
        }),
      }
    },
  )

  return { modifier, progress }
}
