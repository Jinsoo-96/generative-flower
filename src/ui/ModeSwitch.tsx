const BASE = import.meta.env.BASE_URL

/** Top toggle between the splat (root) and flower (?mode=flower) experiences. */
export function ModeSwitch({ current }: { current: 'splat' | 'flower' }) {
  const go = (mode: 'splat' | 'flower') => {
    window.location.href = mode === 'flower' ? `${BASE}?mode=flower` : BASE
  }
  return (
    <div className="mode-switch">
      <button type="button" aria-pressed={current === 'splat'} onClick={() => go('splat')}>
        🌫️ Splat
      </button>
      <button type="button" aria-pressed={current === 'flower'} onClick={() => go('flower')}>
        🌸 Flower
      </button>
    </div>
  )
}
