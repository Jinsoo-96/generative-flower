import type { SpeciesName } from '../scene/flowerGeometry'

export interface HudProps {
  species: SpeciesName
  detected: boolean
  bloomEnabled: boolean
  onToggleBloom: () => void
  showDebug: boolean
  onToggleDebug: () => void
}

const SPECIES_LABEL: Record<SpeciesName, string> = {
  rose: '장미',
  daisy: '데이지',
  lotus: '연꽃',
}

/**
 * HUD (DEV_PLAN §4 HUD): current species + Bloom toggle + debug-overlay toggle.
 * Minimal, translucent, prop-driven (testable in jsdom).
 */
export function HUD({ species, detected, bloomEnabled, onToggleBloom, showDebug, onToggleDebug }: HudProps) {
  return (
    <div className="hud">
      <span className="hud-species">
        {detected ? SPECIES_LABEL[species] : '손을 보여주세요'}
      </span>
      <button type="button" className="hud-btn" aria-pressed={bloomEnabled} onClick={onToggleBloom}>
        Bloom {bloomEnabled ? 'ON' : 'OFF'}
      </button>
      <button type="button" className="hud-btn" aria-pressed={showDebug} onClick={onToggleDebug}>
        Debug {showDebug ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}
