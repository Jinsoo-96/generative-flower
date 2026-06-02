// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { HUD } from './HUD'

afterEach(cleanup)

const base = {
  species: 'daisy' as const,
  detected: true,
  bloomEnabled: true,
  showDebug: false,
  onToggleBloom: () => {},
  onToggleDebug: () => {},
}

describe('<HUD>', () => {
  it('shows the current species label when a hand is detected', () => {
    render(<HUD {...base} />)
    expect(screen.getByText('데이지')).toBeTruthy()
  })

  it('prompts to show a hand when not detected', () => {
    render(<HUD {...base} detected={false} />)
    expect(screen.getByText('손을 보여주세요')).toBeTruthy()
  })

  it('toggles bloom and debug via their buttons', () => {
    const onToggleBloom = vi.fn()
    const onToggleDebug = vi.fn()
    render(<HUD {...base} onToggleBloom={onToggleBloom} onToggleDebug={onToggleDebug} />)
    fireEvent.click(screen.getByRole('button', { name: /Bloom/ }))
    fireEvent.click(screen.getByRole('button', { name: /Debug/ }))
    expect(onToggleBloom).toHaveBeenCalledOnce()
    expect(onToggleDebug).toHaveBeenCalledOnce()
  })

  it('reflects bloom on/off in the button label + aria-pressed', () => {
    render(<HUD {...base} bloomEnabled={false} />)
    const btn = screen.getByRole('button', { name: /Bloom OFF/ })
    expect(btn.getAttribute('aria-pressed')).toBe('false')
  })
})
