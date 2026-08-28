import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Explicit rather than relying on @testing-library/react's auto-cleanup detection, since this
// project doesn't enable Vitest's `globals` option (afterEach is only available via explicit
// import here, not as an ambient global testing-library can detect).
afterEach(() => {
  cleanup()
})
