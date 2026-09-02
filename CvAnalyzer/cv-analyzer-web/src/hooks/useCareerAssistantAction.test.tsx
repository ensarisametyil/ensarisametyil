import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useCareerAssistantAction } from './useCareerAssistantAction'
import { I18nProvider } from '../context/I18nContext'
import { ApiError } from '../api/ApiError'

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>
}

describe('useCareerAssistantAction', () => {
  it('starts idle and transitions to loading then success, storing the resolved data', async () => {
    const { result } = renderHook(() => useCareerAssistantAction((value: string) => Promise.resolve({ echoed: value })), { wrapper })

    expect(result.current.status).toBe('idle')

    await act(async () => {
      await result.current.run('hello')
    })

    expect(result.current.status).toBe('success')
    expect(result.current.data).toEqual({ echoed: 'hello' })
    expect(result.current.errorMessage).toBeNull()
    expect(result.current.isPremiumRequired).toBe(false)
  })

  it('sets isPremiumRequired (not errorMessage) for a PREMIUM_FEATURE_REQUIRED ApiError', async () => {
    const { result } = renderHook(
      () => useCareerAssistantAction(() => Promise.reject(new ApiError(403, 'nope', 'PREMIUM_FEATURE_REQUIRED'))),
      { wrapper },
    )

    await act(async () => {
      await result.current.run()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.isPremiumRequired).toBe(true)
    expect(result.current.errorMessage).toBeNull()
  })

  it('sets a localized errorMessage (not isPremiumRequired) for any other error', async () => {
    const { result } = renderHook(
      () => useCareerAssistantAction(() => Promise.reject(new ApiError(429, 'nope', 'AI_RATE_LIMITED'))),
      { wrapper },
    )

    await act(async () => {
      await result.current.run()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.isPremiumRequired).toBe(false)
    expect(result.current.errorMessage).toBe('AI servisi şu anda yoğun, lütfen daha sonra tekrar deneyin.')
  })

  it('reset() clears data, error state, and returns to idle', async () => {
    const { result } = renderHook(() => useCareerAssistantAction(() => Promise.resolve('ok')), { wrapper })

    await act(async () => {
      await result.current.run()
    })
    expect(result.current.status).toBe('success')

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.data).toBeNull()
    expect(result.current.errorMessage).toBeNull()
    expect(result.current.isPremiumRequired).toBe(false)
  })
})
