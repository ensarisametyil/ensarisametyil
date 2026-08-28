import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestJson } from './httpClient'
import { onUnauthorized } from './authEvents'
import { clearToken, setToken } from './tokenStorage'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('httpClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    clearToken()
  })

  it('attaches an Authorization header when a token is stored', async () => {
    setToken('abc123')
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    await requestJson('https://api.test/x')

    const [, init] = fetchMock.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Bearer abc123')
  })

  it('never attaches an Authorization header when skipAuth is set, even with a stored token', async () => {
    setToken('abc123')
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    await requestJson('https://api.test/x', { skipAuth: true })

    const [, init] = fetchMock.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBeNull()
  })

  it('emits an "unauthorized" event on a 401 for a request that carried a token (session expired/invalid)', async () => {
    setToken('abc123')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(401, { code: 'X', message: 'nope' })))
    const listener = vi.fn()
    const unsubscribe = onUnauthorized(listener)

    await expect(requestJson('https://api.test/x')).rejects.toThrow()
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
  })

  it('does not emit "unauthorized" for a 401 on a request without a token (e.g. wrong-password login attempt)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse(401, { code: 'INVALID_CREDENTIALS', message: 'E-posta veya parola hatalı.' })),
    )
    const listener = vi.fn()
    const unsubscribe = onUnauthorized(listener)

    await expect(requestJson('https://api.test/x', { skipAuth: true })).rejects.toThrow()
    expect(listener).not.toHaveBeenCalled()

    unsubscribe()
  })
})
