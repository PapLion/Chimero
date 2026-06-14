import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  useExerciseDbStatusMock: vi.fn(),
  useSearchExercisesMock: vi.fn(),
  useAllExercisesMock: vi.fn(),
}))

vi.mock('@shared/queries', () => ({
  useExerciseDbStatus: mocks.useExerciseDbStatusMock,
  useSearchExercises: mocks.useSearchExercisesMock,
  useAllExercises: mocks.useAllExercisesMock,
}))

import { ExerciseSearch } from '../../../apps/electron/src/renderer/src/features/exercises/components/ExerciseSearch'

describe('ExerciseSearch', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('keeps the selected exercise form visible after picking a result and submits the snapshot', async () => {
    vi.useFakeTimers()

    const onExerciseSelect = vi.fn()
    mocks.useExerciseDbStatusMock.mockReturnValue({ data: { status: 'ready', count: 1 } })
    mocks.useSearchExercisesMock.mockReturnValue({
      data: [
        {
          id: 'bench-press',
          name: 'Barbell Bench Press - Medium Grip',
          category: 'strength',
          level: 'intermediate',
          equipment: 'barbell',
          primaryMuscles: ['chest'],
          secondaryMuscles: ['triceps', 'shoulders'],
          force: 'push',
          mechanic: 'compound',
        },
      ],
    })
    mocks.useAllExercisesMock.mockReturnValue({
      data: [
        {
          id: 'bench-press',
          name: 'Barbell Bench Press - Medium Grip',
          category: 'strength',
          level: 'intermediate',
          equipment: 'barbell',
          primaryMuscles: ['chest'],
          secondaryMuscles: ['triceps', 'shoulders'],
          force: 'push',
          mechanic: 'compound',
        },
      ],
    })

    render(
      <ExerciseSearch
        onExerciseSelect={onExerciseSelect}
        selectedExercises={[]}
        loadUnit="kg"
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Search exercises...'), { target: { value: 'Bench Press' } })
    await act(async () => {
      vi.advanceTimersByTime(350)
    })

    const resultButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('Barbell Bench Press - Medium Grip'))
    expect(resultButton).toBeTruthy()
    fireEvent.click(resultButton!)
    expect(screen.getByText('Add exercise')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('3'), { target: { value: '3' } })
    fireEvent.change(screen.getByPlaceholderText('8'), { target: { value: '8' } })
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add exercise' }))

    expect(onExerciseSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseId: 'bench-press',
        name: 'Barbell Bench Press - Medium Grip',
        sets: 3,
        reps: 8,
        weight: 80,
      }),
    )
  })
})
