import { create } from 'zustand'
import { todayStr } from './dates'

export type Route =
  | { page: 'today' }
  | { page: 'journal' }
  | { page: 'insights'; a?: string; b?: string; lagDays?: number }
  | { page: 'trackers' }
  | { page: 'tracker'; id: number }
  | { page: 'people'; id?: number }
  | { page: 'tags' }
  | { page: 'reminders' }
  | { page: 'files' }
  | { page: 'settings' }

/** What the entry dialog should open on. `edit` carries the record being changed. */
export interface EntryRequest {
  trackerId?: number
  date?: string
  /** Social: start with this person selected. */
  contactId?: number
  edit?: { entryId: number; trackerId: number }
}

interface AppState {
  route: Route
  history: Route[]
  navigate: (route: Route) => void
  back: () => void
  selectedDate: string
  setSelectedDate: (date: string) => void
  entry: EntryRequest | null
  openEntry: (request?: EntryRequest) => void
  closeEntry: () => void
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
}

export const useApp = create<AppState>((set, get) => ({
  route: { page: 'today' },
  history: [],
  navigate: (route) => set((state) => ({ route, history: [...state.history.slice(-30), state.route], paletteOpen: false })),
  back: () => {
    const history = get().history
    if (history.length === 0) return
    set({ route: history[history.length - 1], history: history.slice(0, -1) })
  },
  selectedDate: todayStr(),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  entry: null,
  openEntry: (request = {}) => set({ entry: request, paletteOpen: false }),
  closeEntry: () => set({ entry: null }),
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
}))
