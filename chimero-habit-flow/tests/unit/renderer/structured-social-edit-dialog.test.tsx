import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Entry, Tracker } from '@shared/store'

const mocks = vi.hoisted(() => ({
  useContactsMock: vi.fn(),
  useAssetsMock: vi.fn(),
  useTagsMock: vi.fn(),
  useUpdateEntryMutationMock: vi.fn(),
  useCreateTagMutationMock: vi.fn(),
  useToastMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  openFileDialogMock: vi.fn(),
  uploadAssetMock: vi.fn(),
}))

vi.mock('@shared/queries', () => ({
  useContacts: mocks.useContactsMock,
  useAssets: mocks.useAssetsMock,
  useTags: mocks.useTagsMock,
  useUpdateEntryMutation: mocks.useUpdateEntryMutationMock,
  useCreateTagMutation: mocks.useCreateTagMutationMock,
  queryKeys: {
    assetsRoot: ['assets'],
  },
}))

vi.mock('@shared/components/toast', () => ({
  formatToastError: (value: unknown) => String(value),
  useToast: mocks.useToastMock,
}))

vi.mock('@shared/api', () => ({
  api: {
    openFileDialog: mocks.openFileDialogMock,
    uploadAsset: mocks.uploadAssetMock,
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: mocks.useQueryClientMock,
}))

import { StructuredSocialEditDialog } from '../../../apps/electron/src/renderer/src/features/entry/modals/StructuredSocialEditDialog'

const tracker: Tracker = {
  id: 7,
  name: 'Social',
  type: 'numeric',
  icon: 'users',
  color: '#8b5cf6',
  order: 1,
  config: { identity: 'social' },
  archived: false,
  createdAt: null,
}

const entry: Entry = {
  id: 91,
  trackerId: tracker.id,
  value: null,
  note: 'Planning the weekend',
  metadata: {},
  timestamp: Date.UTC(2026, 5, 11, 18, 0),
  dateStr: '2026-06-11',
  assetId: 42,
  tagIds: [55],
  socialInteractions: [
    {
      contactId: 1,
      contactName: 'Jack Robert',
      contactInitials: 'JR',
      method: 'call',
      moodImpact: 'positive',
      note: 'Planning the weekend',
    },
    {
      contactId: 2,
      contactName: 'Annabelle',
      contactInitials: 'A',
      method: 'call',
      moodImpact: 'neutral',
      note: 'Planning the weekend',
    },
  ],
}

const contacts = [
  { id: 1, name: 'Jack Robert', avatarAssetId: 91, initials: 'JR' },
  { id: 2, name: 'Annabelle', avatarAssetId: null, initials: 'A' },
  { id: 3, name: 'Maya Chen', avatarAssetId: null, initials: 'MC' },
]

const assets = [
  {
    id: 42,
    thumbnailUrl: 'https://example.com/weekend-thumb.png',
    assetUrl: 'https://example.com/weekend.png',
    originalName: 'Weekend photo',
    path: 'assets/weekend.png',
  },
  {
    id: 91,
    thumbnailUrl: 'https://example.com/jack-avatar.png',
    assetUrl: 'https://example.com/jack-avatar.png',
    originalName: 'Jack avatar',
    path: 'assets/jack-avatar.png',
  },
]

const tags = [
  { id: 55, name: 'Weekend', color: null },
]

describe('StructuredSocialEditDialog', () => {
  beforeEach(() => {
    mocks.useContactsMock.mockReturnValue({ data: contacts })
    mocks.useAssetsMock.mockReturnValue({ data: assets })
    mocks.useTagsMock.mockReturnValue({ data: tags })
    mocks.useUpdateEntryMutationMock.mockReturnValue({ mutateAsync: mocks.mutateAsyncMock, isPending: false })
    mocks.useCreateTagMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useToastMock.mockReturnValue({
      info: vi.fn(),
      success: vi.fn(),
      destructive: vi.fn(),
      error: vi.fn(),
    })
    mocks.useQueryClientMock.mockReturnValue({
      invalidateQueries: mocks.invalidateQueriesMock,
    })
    mocks.invalidateQueriesMock.mockClear()
    mocks.mutateAsyncMock.mockReset()
    mocks.openFileDialogMock.mockReset()
    mocks.uploadAssetMock.mockReset()
  })

  it('preloads structured Social fields and changes method with a normal click', async () => {
    render(
      <StructuredSocialEditDialog
        entry={entry}
        tracker={tracker}
        open
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Jack Robert')).toBeTruthy()
    expect(screen.getByText('Annabelle')).toBeTruthy()
    expect(screen.getByText('Current method: Call')).toBeTruthy()
    expect(screen.getByDisplayValue('2026-06-11')).toBeTruthy()
    expect(screen.getByDisplayValue((content, element) => element?.getAttribute('type') === 'time' && /^\d{2}:\d{2}$/.test(content))).toBeTruthy()
    expect(screen.getByDisplayValue('Planning the weekend')).toBeTruthy()
    expect(screen.getByText('Weekend')).toBeTruthy()
    expect(screen.getByText('Weekend photo')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Call' }))
    fireEvent.click(screen.getByRole('option', { name: 'Video' }))

    expect(screen.getByText('Current method: Video')).toBeTruthy()
  })

  it('saves the canonical structured Social payload once and keeps the draft visible on failure', async () => {
    let resolveSave: (() => void) | null = null
    mocks.mutateAsyncMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSave = resolve
      }),
    )

    const onOpenChange = vi.fn()
    render(
      <StructuredSocialEditDialog
        entry={entry}
        tracker={tracker}
        open
        onOpenChange={onOpenChange}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Negative' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /remove/i })[1])
    fireEvent.click(screen.getByRole('button', { name: 'Call' }))
    fireEvent.click(screen.getByRole('option', { name: 'Video' }))
    fireEvent.change(screen.getByPlaceholderText('What did you talk about?'), {
      target: { value: 'Weekend plan changed' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mocks.mutateAsyncMock).toHaveBeenCalledTimes(1)
    })

    expect(mocks.mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 91,
        updates: expect.objectContaining({
          timestamp: entry.timestamp,
          note: 'Weekend plan changed',
          assetId: 42,
          tagIds: [55],
          socialInteractions: [
            expect.objectContaining({
              contactId: 1,
              method: 'video',
              moodImpact: 'negative',
              notes: 'Weekend plan changed',
            }),
          ],
        }),
      }),
    )

    expect(screen.getByDisplayValue('Weekend plan changed')).toBeTruthy()
    expect(screen.getByText('Current method: Video')).toBeTruthy()
    expect(screen.getByText('Jack Robert')).toBeTruthy()
    expect(screen.getByText('1 selected')).toBeTruthy()

    await act(async () => {
      resolveSave?.()
    })

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('blocks duplicate saves while the first structured Social update is pending', async () => {
    let resolveSave: (() => void) | null = null
    mocks.mutateAsyncMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSave = resolve
      }),
    )

    render(
      <StructuredSocialEditDialog
        entry={entry}
        tracker={tracker}
        open
        onOpenChange={vi.fn()}
      />,
    )

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(saveButton)
    expect(screen.getByRole('button', { name: /saving/i })).toBeTruthy()
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mocks.mutateAsyncMock).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      resolveSave?.()
    })
  })

  it('shows an actionable error and preserves the draft when save fails', async () => {
    mocks.mutateAsyncMock.mockRejectedValue(new Error('save failed'))

    render(
      <StructuredSocialEditDialog
        entry={entry}
        tracker={tracker}
        open
        onOpenChange={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('What did you talk about?'), {
      target: { value: 'Draft should survive' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Error: save failed')).toBeTruthy()
    })

    expect(screen.getByDisplayValue('Draft should survive')).toBeTruthy()
    expect(screen.getByText('Jack Robert')).toBeTruthy()
    expect(screen.getByText('Annabelle')).toBeTruthy()
  })
})
