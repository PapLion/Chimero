import { useState } from 'react'
import type { DashboardLayoutV2, DashboardWidget } from '@contracts/contracts'
import { addItem, removeItem } from '@contracts/domain/grid'
import { useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, LayoutDashboard, Plus, RotateCcw, Undo2, X } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { addDays, fmt, todayStr } from '@/lib/dates'
import { useData, useTrackers } from '@/lib/queries'
import { useApp } from '@/lib/store'
import { ConfirmDialog } from '@/ui/dialog'
import { Button, Empty, IconButton, Spinner } from '@/ui/primitives'
import { toast } from '@/ui/toast'
import { AddWidgetDialog } from './AddWidgetDialog'
import { DayStrip } from './DayStrip'
import { GridCanvas } from './GridCanvas'
import { TrackerWidget } from './widgets/TrackerWidget'
import { DayLogWidget, HeatmapWidget, InsightWidget, NoteWidget, PeopleWidget, RemindersWidget, StreakWidget, TrendWidget } from './widgets/OtherWidgets'

const LAYOUT_KEY = ['dashboard-layout']

const WIDGET_NAMES: Record<string, string> = { trend: 'Trend chart', heatmap: 'Activity heatmap', streak: 'Logging streak', 'day-log': 'Day log', reminders: 'Reminders', people: 'People', insight: 'Insight', note: 'Note' }

export function TodayPage() {
  const { selectedDate, setSelectedDate } = useApp()
  const client = useQueryClient()
  const { data: trackers = [] } = useTrackers()
  const { data: layout, isLoading } = useData(LAYOUT_KEY, () => api.getDashboardLayout())
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [undo, setUndo] = useState<DashboardWidget[][]>([])
  const today = todayStr()
  const widgets = layout?.widgets ?? []
  const trackerById = new Map(trackers.map((t) => [t.id, t]))

  /** Show the new arrangement immediately, persist it, and roll back if saving fails. */
  const commit = (next: DashboardWidget[], remember = true) => {
    const previous = widgets
    if (remember) setUndo((stack) => [...stack.slice(-19), previous])
    client.setQueryData<DashboardLayoutV2>(LAYOUT_KEY, { version: 2, widgets: next })
    api.saveDashboardLayout({ version: 2, widgets: next }).then(
      (saved) => client.setQueryData(LAYOUT_KEY, saved),
      (error) => {
        client.setQueryData<DashboardLayoutV2>(LAYOUT_KEY, { version: 2, widgets: previous })
        toast.error('The layout was not saved', errorMessage(error))
      },
    )
  }

  const label = (widget: DashboardWidget) => (widget.type === 'tracker' ? (trackerById.get(widget.trackerId ?? -1)?.name ?? 'Tracker') : WIDGET_NAMES[widget.type]) + ' widget'

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 px-7 pt-5">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-3xl font-semibold">{selectedDate === today ? 'Today' : fmt.weekday(selectedDate)}</h1>
            <p className="mt-0.5 text-sm text-muted">{selectedDate === today ? `${fmt.weekday(selectedDate)}, ${fmt.dayMonth(selectedDate)}` : fmt.full(selectedDate)}</p>
          </div>
          {editing ? (
            <>
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
                Add widget
              </Button>
              <Button
                icon={<Undo2 className="h-4 w-4" />}
                disabled={undo.length === 0}
                onClick={() => {
                  const previous = undo[undo.length - 1]
                  setUndo((stack) => stack.slice(0, -1))
                  commit(previous, false)
                }}
              >
                Undo
              </Button>
              <Button icon={<RotateCcw className="h-4 w-4" />} onClick={() => setResetting(true)}>
                Reset
              </Button>
              <Button
                variant="primary"
                icon={<Check className="h-4 w-4" strokeWidth={2.5} />}
                onClick={() => {
                  setEditing(false)
                  setUndo([])
                }}
              >
                Done
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center">
                <IconButton label="Previous day (Alt+←)" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </IconButton>
                <Button variant="ghost" size="sm" disabled={selectedDate === today} onClick={() => setSelectedDate(today)}>
                  Today
                </Button>
                <IconButton label="Next day (Alt+→)" disabled={selectedDate >= today} onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </IconButton>
              </div>
              <Button icon={<LayoutDashboard className="h-4 w-4" />} onClick={() => setEditing(true)}>
                Edit layout
              </Button>
            </>
          )}
        </div>
        <div className="mt-3 border-b border-line/70 pb-2">
          {editing ? (
            <p className="flex h-[58px] items-center text-sm text-muted">Drag a widget to move it, drag its corner to resize. With a widget focused, arrow keys move it and Shift+arrows resize it. Changes save as you go.</p>
          ) : (
            <DayStrip />
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-10 pt-5">
        {isLoading ? (
          <div className="grid h-40 place-items-center">
            <Spinner />
          </div>
        ) : widgets.length === 0 ? (
          <Empty
            icon={<LayoutDashboard />}
            title="Your dashboard is empty"
            action={
              <Button
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditing(true)
                  setAdding(true)
                }}
              >
                Add a widget
              </Button>
            }
          >
            Put the trackers and charts you care about here, sized and arranged the way you like.
          </Empty>
        ) : (
          <GridCanvas
            widgets={widgets}
            editing={editing}
            onCommit={commit}
            label={label}
            controls={(widget) => (
              <button
                type="button"
                aria-label={`Remove ${label(widget)}`}
                onClick={() => commit(removeItem(widgets, widget.id))}
                className="grid h-6 w-6 place-items-center rounded-full border border-line bg-raised text-muted shadow-pop hover:bg-bad hover:text-white"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            )}
          >
            {(widget) => {
              switch (widget.type) {
                case 'tracker': {
                  const tracker = trackerById.get(widget.trackerId ?? -1)
                  return tracker ? <TrackerWidget widget={widget} tracker={tracker} date={selectedDate} /> : <div className="card h-full" />
                }
                case 'trend':
                  return <TrendWidget widget={widget} date={selectedDate} />
                case 'heatmap':
                  return <HeatmapWidget widget={widget} date={selectedDate} />
                case 'streak':
                  return <StreakWidget widget={widget} date={selectedDate} />
                case 'day-log':
                  return <DayLogWidget widget={widget} date={selectedDate} />
                case 'reminders':
                  return <RemindersWidget widget={widget} date={selectedDate} />
                case 'people':
                  return <PeopleWidget widget={widget} date={selectedDate} />
                case 'insight':
                  return <InsightWidget widget={widget} date={selectedDate} />
                case 'note':
                  return <NoteWidget widget={widget} date={selectedDate} onChange={(patch) => commit(widgets.map((w) => (w.id === widget.id ? { ...w, ...patch } : w)), false)} />
              }
            }}
          </GridCanvas>
        )}
      </div>

      <AddWidgetDialog open={adding} onClose={() => setAdding(false)} widgets={widgets} trackers={trackers} onAdd={(widget) => commit(addItem(widgets, widget as DashboardWidget))} />
      <ConfirmDialog
        open={resetting}
        onClose={() => setResetting(false)}
        title="Reset the dashboard?"
        confirmLabel="Reset layout"
        onConfirm={() => {
          setResetting(false)
          void api.getDefaultDashboardLayout().then((defaults) => commit(defaults.widgets))
        }}
      >
        Every widget goes back to the default arrangement. Your records are not affected, and Undo brings this layout back.
      </ConfirmDialog>
    </div>
  )
}
