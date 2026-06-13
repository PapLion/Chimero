import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Minimal Vitest setup for backend and renderer unit tests.
afterEach(() => {
  cleanup()
})
