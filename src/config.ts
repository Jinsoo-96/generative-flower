// Tunable thresholds & coefficients in one place (DEV_PLAN §1.9, §9).
// The visual TONE token block (DEV_PLAN §11) is added in Phase 3.

/** Perspective camera + the plane the flower lives on. */
export const CAMERA = {
  fovDeg: 50,
  position: [0, 0, 5] as const,
  /** World z of the flower plane → distance D = position.z - planeZ. */
  planeZ: 0,
} as const

/** Distance D from camera to flower plane (DEV_PLAN §9.1). */
export const FLOWER_PLANE_DISTANCE = CAMERA.position[2] - CAMERA.planeZ

/**
 * Hand "depth" mapping (DEV_PLAN §9.2). depth = clamp01((handScale - min)/(max - min)),
 * where handScale = normalized distance between wrist(0) and middle-MCP(9).
 * Empirical range; tuned at the final camera test.
 */
export const DEPTH = {
  nearMin: 0.1, // hand far → smaller wrist–MCP distance
  nearMax: 0.4, // hand close → larger
} as const

/** Flower scale range driven by depth. */
export const FLOWER = {
  minScale: 0.55,
  maxScale: 1.7,
} as const

/**
 * Per-frame interpolation factors (render loop lerp on top of One Euro).
 * Phase 3+ may switch to time-based damp (DEV_PLAN §11 motion.dampSmoothTime).
 */
export const MOTION = {
  positionLerp: 0.18,
  scaleLerp: 0.18,
  bloomLerp: 0.2,
  rotationLerp: 0.2,
} as const

/**
 * Pinch → bloom (DEV_PLAN §9.3). pinch = dist(thumbTip,indexTip)/handScale,
 * then smoothstep(closed, open). closed = fingers together (bud, 0),
 * open = spread (full bloom, 1).
 */
export const PINCH = {
  closed: 0.25,
  open: 1.1,
} as const

/**
 * Finger extension (DEV_PLAN §9.4). A finger is extended when its tip is
 * farther from the wrist than its PIP, by this ratio. Thumb uses a separate
 * lateral test against the index MCP.
 */
export const FINGER = {
  extRatio: 1.05,
  thumbExtRatio: 1.25,
} as const

/**
 * Fist (DEV_PLAN §9.4): the four non-thumb fingers folded AND their tips close
 * to the palm center, within this fraction of handScale.
 */
export const FIST = {
  tipToPalmRatio: 0.85,
} as const

/** One Euro Filter start points (DEV_PLAN §10). Tuned at the final camera test. */
export const ONE_EURO = {
  position: { minCutoff: 1.0, beta: 0.02, dCutoff: 1.0 },
  depth: { minCutoff: 1.0, beta: 0.02, dCutoff: 1.0 },
  bloom: { minCutoff: 1.0, beta: 0.015, dCutoff: 1.0 },
  rotation: { minCutoff: 1.0, beta: 0.02, dCutoff: 1.0 },
} as const

// ── VISUAL TONE: "Bioluminescent / Ethereal" (발광·몽환) ──────────────────
// ⚠️ Single source of truth for tone (DEV_PLAN §11). All visual components read
// color/values from here only. petalMaterial.emissiveIntensity is the master
// dial for Bloom glow.
export const TONE = {
  mood: '밤의 심해 · 발광 해파리 · 야광 정원. 어둠 속에서 안에서부터 빛나는, 느리고 부유하는.',
  refKeywords: ['bioluminescent jellyfish', 'glowing flower in the dark', 'deep sea light'],

  // 배경: 수직/방사형 그라데이션 (어두운 보라/인디고). 순흑·단색 회색 금지.
  background: {
    top: '#080115',
    bottom: '#1a0838',
    glow: '#2a0f55',
  },

  // 꽃 종류별 꽃잎 그라데이션: base(안쪽/어두움) → tip(바깥/발광) + emissive 틴트 + rim 색
  species: {
    rose: { base: '#3a0a4a', tip: '#ff5fd2', emissive: '#ff7ae0', rim: '#ffb0ee' },
    daisy: { base: '#06283d', tip: '#52f0ff', emissive: '#7afcff', rim: '#c4ffff' },
    lotus: { base: '#1a0840', tip: '#9b7bff', emissive: '#b89bff', rim: '#dcccff' },
    core: '#ffd86b', // 중심부 씨앗 = 따뜻한 골드 발광
  },

  // 꽃잎 머티리얼
  petalMaterial: {
    roughness: 0.35,
    metalness: 0.0,
    emissiveIntensity: 1.6, // ★ Bloom 구동 마스터 다이얼 (1.2~2.2)
    opacity: 0.88,
    transparent: true,
    fresnelPower: 2.5,
    fresnelIntensity: 1.2,
  },

  // 조명: 어둡게. 꽃은 대부분 self-lit.
  lighting: {
    ambientColor: '#1a1030',
    ambientIntensity: 0.3,
    keyColor: '#6a4cff',
    keyIntensity: 0.6,
  },

  // Bloom
  bloom: {
    enabled: true,
    intensity: 1.15,
    luminanceThreshold: 0.2,
    luminanceSmoothing: 0.9,
    mipmapBlur: true,
    radius: 0.6,
  },

  // 모션
  motion: {
    dampSmoothTime: 0.3,
    idleSwayDeg: 2.5,
    idleDriftWorld: 0.04,
    idleFreqHz: 0.3,
  },

  // 파티클
  particles: {
    burstCount: 60,
    burstSize: 0.06,
    burstLifetime: 2.2,
    burstGravity: -0.2,
    burstFade: true,
    ambientMotes: 40,
    ambientMoteOpacity: 0.25,
  },

  // 부가 후처리
  post: {
    vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
    chromaticAberration: { enabled: true, offset: 0.0008 },
    grain: { enabled: false, opacity: 0.04 },
  },
} as const
