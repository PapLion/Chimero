import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  useAppStoreMock: vi.fn(),
  useContactsMock: vi.fn(),
  useAssetsMock: vi.fn(),
  setCurrentPageMock: vi.fn(),
  setSelectedContactIdMock: vi.fn(),
  onSelectionChangeMock: vi.fn(),
}))

vi.mock('@shared/store', () => ({
  useAppStore: mocks.useAppStoreMock,
}))

vi.mock('@shared/queries', () => ({
  useContacts: mocks.useContactsMock,
  useAssets: mocks.useAssetsMock,
}))

import { ContactBubblesGrid } from '../../../apps/electron/src/renderer/src/features/contacts/components/ContactBubblesGrid'

describe('ContactBubblesGrid', () => {
  beforeEach(() => {
    mocks.useAppStoreMock.mockReturnValue({
      setCurrentPage: mocks.setCurrentPageMock,
      setSelectedContactId: mocks.setSelectedContactIdMock,
    })
    mocks.useContactsMock.mockReturnValue({
      data: [
        { id: 1, name: 'Jack Robert', avatarAssetId: 11 },
        { id: 2, name: 'Annabelle', avatarAssetId: null },
      ],
      isLoading: false,
    })
    mocks.useAssetsMock.mockReturnValue({
      data: [
        {
          id: 11,
          thumbnailUrl: 'https://example.com/jack-thumb.png',
          assetUrl: 'https://example.com/jack.png',
        },
      ],
    })
    mocks.onSelectionChangeMock.mockClear()
    mocks.setCurrentPageMock.mockClear()
    mocks.setSelectedContactIdMock.mockClear()
  })

  it('renders selected contact mood controls and updates each contact independently', () => {
    render(<ContactBubblesGrid onSelectionChange={mocks.onSelectionChangeMock} />)

    fireEvent.click(screen.getByRole('button', { name: /jack robert, not selected/i }))

    expect(mocks.onSelectionChangeMock).toHaveBeenLastCalledWith([
      { contactId: 1, moodImpact: 'neutral' },
    ])
    expect(screen.getByText('Selected contacts')).toBeTruthy()

    expect(screen.getByRole('button', { name: 'Neutral' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Positive' }))

    expect(mocks.onSelectionChangeMock).toHaveBeenLastCalledWith([
      { contactId: 1, moodImpact: 'positive' },
    ])
    expect(screen.getByRole('button', { name: 'Positive' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: /annabelle, not selected/i }))

    expect(mocks.onSelectionChangeMock).toHaveBeenLastCalledWith([
      { contactId: 1, moodImpact: 'positive' },
      { contactId: 2, moodImpact: 'neutral' },
    ])
    expect(screen.getByText('Annabelle')).toBeTruthy()
  })
})
