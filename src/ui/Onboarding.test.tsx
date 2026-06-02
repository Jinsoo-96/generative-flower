// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Onboarding } from './Onboarding'
import { onboardingPhase } from './onboardingPhase'

afterEach(cleanup)

describe('onboardingPhase', () => {
  it('hidden only when both camera and model are ready', () => {
    expect(onboardingPhase('ready', 'ready')).toBe('hidden')
    expect(onboardingPhase('ready', 'loading')).toBe('loading')
  })
  it('error for denied / unsupported / error camera states', () => {
    expect(onboardingPhase('denied', 'ready')).toBe('error')
    expect(onboardingPhase('unsupported', 'ready')).toBe('error')
    expect(onboardingPhase('error', 'ready')).toBe('error')
  })
  it('error when the model fails to load even if the camera is ready (review fix #5)', () => {
    expect(onboardingPhase('ready', 'error')).toBe('error')
    expect(onboardingPhase('idle', 'error')).toBe('error')
  })
  it('loading while starting', () => {
    expect(onboardingPhase('starting', 'loading')).toBe('loading')
  })
  it('intro when idle', () => {
    expect(onboardingPhase('idle', 'loading')).toBe('intro')
  })
})

describe('<Onboarding> (camera-free fallback render)', () => {
  const base = { camStatus: 'idle', modelStatus: 'loading', camError: null, modelError: null } as const

  it('intro shows the start button and fires onStart', () => {
    const onStart = vi.fn()
    render(<Onboarding {...base} onStart={onStart} />)
    const btn = screen.getByRole('button', { name: '카메라 시작' })
    fireEvent.click(btn)
    expect(onStart).toHaveBeenCalledOnce()
  })

  it('permission denied falls back to an error message + retry (no crash)', () => {
    const onStart = vi.fn()
    render(
      <Onboarding
        camStatus="denied"
        modelStatus="ready"
        camError="카메라 권한이 거부되었습니다."
        modelError={null}
        onStart={onStart}
      />,
    )
    expect(screen.getByText(/권한이 거부/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onStart).toHaveBeenCalledOnce()
  })

  it('renders nothing when fully ready', () => {
    const { container } = render(
      <Onboarding camStatus="ready" modelStatus="ready" camError={null} modelError={null} onStart={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
