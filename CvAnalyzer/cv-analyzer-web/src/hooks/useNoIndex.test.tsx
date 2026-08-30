import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { useNoIndex } from './useNoIndex'

function Probe() {
  useNoIndex()
  return null
}

describe('useNoIndex', () => {
  let metaTag: HTMLMetaElement

  beforeEach(() => {
    metaTag = document.createElement('meta')
    metaTag.setAttribute('name', 'robots')
    metaTag.setAttribute('content', 'index, follow')
    document.head.appendChild(metaTag)
  })

  afterEach(() => {
    metaTag.remove()
  })

  it('sets the robots meta tag to noindex while mounted', () => {
    const { unmount } = render(<Probe />)

    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')

    unmount()
  })

  it('restores the previous robots content on unmount', () => {
    const { unmount } = render(<Probe />)
    unmount()

    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
  })
})
