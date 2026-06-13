import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  useContactsMock: vi.fn(),
  useAssetsMock: vi.fn(),
  setCurrentPageMock: vi.fn(),
  setSelectedContactIdMock: vi.fn(),
}))

vi.mock('@shared/queries', () => ({
  useContacts: mocks.useContactsMock,
  useAssets: mocks.useAssetsMock,
}))

vi.mock('@shared/store', () => ({
  useAppStore: () => ({
    setCurrentPage: mocks.setCurrentPageMock,
    setSelectedContactId: mocks.setSelectedContactIdMock,
  }),
}))

import { ContactsPage } from '../../../apps/electron/src/renderer/src/features/contacts/page'

describe('ContactsPage', () => {
  beforeEach(() => {
    mocks.useContactsMock.mockReturnValue({
      data: [
        { id: 1, name: 'Jack Robert', avatarAssetId: 10, dateLastTalked: null, birthday: null },
      ],
      isLoading: false,
    })
    mocks.useAssetsMock.mockReturnValue({
      data: [
        { id: 10, thumbnailUrl: 'https://example.com/jack-thumb.png', assetUrl: 'https://example.com/jack.png' },
      ],
    })
    mocks.setCurrentPageMock.mockClear()
    mocks.setSelectedContactIdMock.mockClear()
  })

  it('renders the contact image in the workspace list when an avatar asset exists', () => {
    render(<ContactsPage />)

    expect(screen.getAllByAltText('Jack Robert').length).toBeGreaterThan(0)
  })
})
