import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { CyberpunkSelect } from '../../../apps/electron/src/renderer/src/features/tracking/components/CyberpunkSelect'

describe('CyberpunkSelect', () => {
  it('opens its menu and lets the user choose an option', async () => {
    const onValueChange = vi.fn()

    function Harness() {
      const [value, setValue] = useState<string | number | null>(null)
      return (
        <CyberpunkSelect
          value={value}
          onValueChange={(next) => {
            onValueChange(next)
            setValue(next)
          }}
          placeholder="Choose one"
          options={[
            { value: 'alpha', label: 'Alpha' },
            { value: 'beta', label: 'Beta' },
          ]}
        />
      )
    }

    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Choose one' }))

    fireEvent.click(await screen.findByRole('option', { name: 'Beta' }))

    expect(onValueChange).toHaveBeenCalledWith('beta')
    expect(screen.getByRole('button', { name: /Beta/ })).toBeTruthy()
  })
})
