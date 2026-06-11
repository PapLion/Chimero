import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  useContactsMock: vi.fn(),
  setCurrentPageMock: vi.fn(),
  setSelectedContactIdMock: vi.fn(),
}))

vi.mock('@shared/queries', () => ({
  useContacts: mocks.useContactsMock,
}))

vi.mock('@shared/store', () => ({
  useAppStore: () => ({
    setCurrentPage: mocks.setCurrentPageMock,
    setSelectedContactId: mocks.setSelectedContactIdMock,
  }),
}))

import { ContactBubblesGrid } from '../../../apps/electron/src/renderer/src/features/contacts/components/ContactBubblesGrid'

describe('ContactBubblesGrid', () => {
  beforeEach(() => {
    mocks.useContactsMock.mockReturnValue({
      data: [
        { id: 1, name: 'Jack Robert', avatarAssetId: null },
        { id: 2, name: 'Ana Maria', avatarAssetId: null },
      ],
      isLoading: false,
    })
    mocks.setCurrentPageMock.mockClear()
    mocks.setSelectedContactIdMock.mockClear()
  })

  it('keeps an Add Contact path visible when contacts already exist', async () => {
    render(<ContactBubblesGrid onSelectionChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /add contact/i }))

    expect(mocks.setSelectedContactIdMock).toHaveBeenCalledWith(null)
    expect(mocks.setCurrentPageMock).toHaveBeenCalledWith('contact')
  })
})
