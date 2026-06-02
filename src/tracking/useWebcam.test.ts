import { describe, it, expect } from 'vitest'
import { classifyMediaError } from './useWebcam'

describe('classifyMediaError (DEV_PLAN Phase 4 — camera-free fallback)', () => {
  it('permission denied → denied state with guidance', () => {
    const r = classifyMediaError(new DOMException('x', 'NotAllowedError'))
    expect(r.status).toBe('denied')
    expect(r.error).toMatch(/권한/)
  })
  it('security error (insecure context) → denied', () => {
    expect(classifyMediaError(new DOMException('x', 'SecurityError')).status).toBe('denied')
  })
  it('no camera device → error', () => {
    expect(classifyMediaError(new DOMException('x', 'NotFoundError')).status).toBe('error')
    expect(classifyMediaError(new DOMException('x', 'OverconstrainedError')).status).toBe('error')
  })
  it('unknown error → error with the message', () => {
    const r = classifyMediaError(new Error('boom'))
    expect(r.status).toBe('error')
    expect(r.error).toBe('boom')
  })
  it('non-error value → error with stringified message', () => {
    expect(classifyMediaError('nope').status).toBe('error')
  })
})
