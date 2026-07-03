import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateVeniceKey } from './validate-venice-key'

describe('validateVeniceKey', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns ok when the auth-gated endpoint responds 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
    const result = await validateVeniceKey('sk-valid')
    expect(result).toEqual({ ok: true })
  })

  it('returns invalid message on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    const result = await validateVeniceKey('sk-bogus')
    expect(result).toEqual({ ok: false, message: 'Invalid API key' })
  })

  it('returns generic message on unexpected status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    const result = await validateVeniceKey('sk-valid')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('500')
  })

  it('returns network error message when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const result = await validateVeniceKey('sk-valid')
    expect(result).toEqual({ ok: false, message: 'Could not reach Venice' })
  })

  it('sends the candidate key as a Bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)
    await validateVeniceKey('sk-my-key')
    expect(fetchMock).toHaveBeenCalledWith('/venice/api/v1/api_keys/rate_limits', {
      headers: { Authorization: 'Bearer sk-my-key' },
    })
  })
})
