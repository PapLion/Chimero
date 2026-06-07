import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { Entry } from '@shared/store'

const mocks = vi.hoisted(() => ({
  useBookMock: vi.fn(),
  useDeleteBookReadActivityMutationMock: vi.fn(),
  useUpdateBookMutationMock: vi.fn(),
  useUpdateBookReadActivityMutationMock: vi.fn(),
  useToastMock: vi.fn(),
}))

vi.mock('@shared/queries', () => ({
  useBook: mocks.useBookMock,
  useDeleteBookReadActivityMutation: mocks.useDeleteBookReadActivityMutationMock,
  useUpdateBookMutation: mocks.useUpdateBookMutationMock,
  useUpdateBookReadActivityMutation: mocks.useUpdateBookReadActivityMutationMock,
}))

vi.mock('@shared/components/toast', () => ({
  formatToastError: (value: unknown) => String(value),
  useToast: mocks.useToastMock,
}))

import { BookEntryDialog } from '../../../apps/electron/src/renderer/src/features/books/components/BookEntryDialog'

describe('BookEntryDialog', () => {
  beforeEach(() => {
    mocks.useBookMock.mockReset()
    mocks.useDeleteBookReadActivityMutationMock.mockReset()
    mocks.useUpdateBookMutationMock.mockReset()
    mocks.useUpdateBookReadActivityMutationMock.mockReset()
    mocks.useToastMock.mockReset()

    mocks.useToastMock.mockReturnValue({
      success: vi.fn(),
      destructive: vi.fn(),
      error: vi.fn(),
    })
    mocks.useDeleteBookReadActivityMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    })
    mocks.useUpdateBookMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    })
    mocks.useUpdateBookReadActivityMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    })
  })

  it('shows the finished book rating as 4.3 / 5.0', () => {
    const timestamp = Date.UTC(2026, 4, 22, 10, 0, 0)
    const entry: Entry = {
      id: 99,
      trackerId: 5,
      value: null,
      note: 'Book smoke final',
      metadata: {
        trackerKind: 'books',
        bookId: 42,
        activityType: 'finished',
      },
      timestamp,
      dateStr: '2026-05-22',
      book: {
        structured: true,
        bookId: 42,
        title: 'Book smoke final',
        titleKey: 'book smoke final',
        activityType: 'finished',
      },
    }

    mocks.useBookMock.mockReturnValue({
      data: {
        book: {
          id: 42,
          title: 'Book smoke final',
          titleKey: 'book smoke final',
          shelf: 'finished',
          status: 'completed',
          startedDate: '2026-05-20',
          finishedDate: '2026-05-22',
          ratingTenths: 43,
          createdAt: 1,
          updatedAt: 2,
        },
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })

    render(
      <BookEntryDialog entry={entry} open={true} onOpenChange={vi.fn()} />,
    )

    expect(within(screen.getByRole('dialog')).getByText('4.3 / 5.0')).toBeTruthy()
  })

  it('does not render a fake rating when the finished book rating is null', () => {
    const timestamp = Date.UTC(2026, 4, 22, 10, 0, 0)
    const entry: Entry = {
      id: 100,
      trackerId: 5,
      value: null,
      note: 'Book smoke unrated',
      metadata: {
        trackerKind: 'books',
        bookId: 43,
        activityType: 'finished',
      },
      timestamp,
      dateStr: '2026-05-22',
      book: {
        structured: true,
        bookId: 43,
        title: 'Book smoke unrated',
        titleKey: 'book smoke unrated',
        activityType: 'finished',
      },
    }

    mocks.useBookMock.mockReturnValue({
      data: {
        book: {
          id: 43,
          title: 'Book smoke unrated',
          titleKey: 'book smoke unrated',
          shelf: 'finished',
          status: 'completed',
          startedDate: '2026-05-20',
          finishedDate: '2026-05-22',
          ratingTenths: null,
          createdAt: 1,
          updatedAt: 2,
        },
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })

    render(
      <BookEntryDialog entry={entry} open={true} onOpenChange={vi.fn()} />,
    )

    expect(within(screen.getByRole('dialog')).queryByText('4.3 / 5.0')).toBeNull()
  })

  it('does not render a structured rating for legacy book entries', () => {
    const timestamp = Date.UTC(2026, 4, 22, 10, 0, 0)
    const entry: Entry = {
      id: 101,
      trackerId: 5,
      value: null,
      note: 'Legacy book smoke',
      metadata: {},
      timestamp,
      dateStr: '2026-05-22',
    }

    render(
      <BookEntryDialog entry={entry} open={true} onOpenChange={vi.fn()} />,
    )

    expect(within(screen.getByRole('dialog')).queryByText('4.3 / 5.0')).toBeNull()
  })
})
