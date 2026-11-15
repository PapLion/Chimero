import { useMemo, useState } from 'react'
import type { Entry, Tracker } from '@contracts/contracts'
import { ChevronLeft, ChevronRight, NotebookPen, Plus } from 'lucide-react'
import { api, assetUrl } from '@/lib/api'
import { cn } from '@/lib/cn'
import { addDays, fmt, parseDateStr, toDateStr, todayStr } from '@/lib/dates'
import { describeEntry } from '@/lib/entries'
import { plural } from '@/lib/format'
import { TrackerIcon } from '@/lib/icons'
import { useData, useOverview, usePreferences, useTags, useTrackers } from '@/lib/queries'
import { useApp } from '@/lib/store'
import { colorOf } from '@/lib/trackers'
import { PageShell } from '@/shell/PageHeader'
import { Button, Chip, Empty, IconButton, Segmented } from '@/ui/primitives'

function monthGrid(year: number, month: number, weekStartsOn: 0 | 1): string[] {
  const first = new Date(year, month - 1, 1)
  const offset = (first.getDay() - weekStartsOn + 7) % 7
  const start = toDateStr(new Date(year, month - 1, 1 - offset))
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7
  return Array.from({ length: cells }, (_, i) => addDays(start, i))
}

export function JournalPage() {
  const { selectedDate, setSelectedDate, openEntry } = useApp()
  const prefs = usePreferences()
  const { data: trackers = [] } = useTrackers()
  const [view, setView] = useState<'day' | 'month'>('day')
  const [hidden, setHidden] = useState<number[]>([])
  const [cursor, setCursor] = useState(() => ({ year: Number(selectedDate.slice(0, 4)), month: Number(selectedDate.slice(5, 7)) }))
  const today = todayStr()

  const grid = useMemo(() => monthGrid(cursor.year, cursor.month, prefs.weekStartsOn), [cursor, prefs.weekStartsOn])
  const from = grid[0]
  const to = grid[grid.length - 1]
  const monthPrefix = `${cursor.year}-${String(cursor.month).padStart(2, '0')}`
  const { data: overview } = useOverview(from, to)
  const { data: entries = [], isLoading } = useData(['entries', 'range', from, to], () => api.getEntries({ from, to, limit: 5000 }))

  const byId = useMemo(() => new Map(trackers.map((tracker) => [tracker.id, tracker])), [trackers])
  const visible = useMemo(() => entries.filter((entry) => byId.has(entry.trackerId) && !hidden.includes(entry.trackerId)), [entries, byId, hidden])
  const counts = useMemo(() => {
    const map = new Map<string, Map<number, number>>()
    for (const day of overview?.days ?? []) {
      const perTracker = new Map<number, number>()
      for (const [id, count] of Object.entries(day.byTracker)) if (byId.has(Number(id)) && !hidden.includes(Number(id))) perTracker.set(Number(id), count)
      if (perTracker.size > 0) map.set(day.date, perTracker)
    }
    return map
  }, [overview, byId, hidden])

  const move = (delta: number) => {
    const next = new Date(cursor.year, cursor.month - 1 + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() + 1 })
  }
  const pick = (date: string) => {
    setSelectedDate(date)
    setCursor({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) })
  }

  const weekdays = Array.from({ length: 7 }, (_, i) => fmt.weekdayShort(grid[i]))
  const dayEntries = visible.filter((entry) => entry.dateStr === selectedDate).sort((a, b) => a.timestamp - b.timestamp)
  const monthDays = useMemo(() => {
    const groups = new Map<string, Entry[]>()
    for (const entry of visible) if (entry.dateStr.startsWith(monthPrefix)) groups.set(entry.dateStr, [...(groups.get(entry.dateStr) ?? []), entry])
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [visible, monthPrefix])
  const active = trackers.filter((tracker) => entries.some((entry) => entry.trackerId === tracker.id))

  return (
    <PageShell
      title="Journal"
      subtitle="Every record, by day."
      actions={
        <Button variant="primary" icon={<Plus className="h-4 w-4" strokeWidth={2.5} />} onClick={() => openEntry({ date: selectedDate })}>
          Log on {fmt.relativeDay(selectedDate).toLowerCase()}
        </Button>
      }
      bodyClassName="flex flex-col"
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(420px,1.05fr)_minmax(340px,1fr)]">
        <section className="card flex min-h-[420px] flex-col p-4">
          <div className="mb-3 flex items-center gap-1">
            <h2 className="flex-1 text-xl font-semibold">{fmt.monthYear(cursor.year, cursor.month)}</h2>
            <Button variant="ghost" size="sm" onClick={() => pick(today)}>
              Today
            </Button>
            <IconButton label="Previous month" onClick={() => move(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <IconButton label="Next month" onClick={() => move(1)}>
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
          <div className="grid grid-cols-7 gap-1 pb-1">
            {weekdays.map((name) => (
              <span key={name} className="text-center text-xs text-faint">
                {name}
              </span>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-7 gap-1" style={{ gridTemplateRows: `repeat(${grid.length / 7}, minmax(52px, 1fr))` }} role="grid" aria-label={fmt.monthYear(cursor.year, cursor.month)}>
            {grid.map((date) => {
              const inMonth = date.startsWith(monthPrefix)
              const perTracker = counts.get(date)
              const total = perTracker ? [...perTracker.values()].reduce((sum, n) => sum + n, 0) : 0
              const ids = perTracker ? [...perTracker.keys()].sort((a, b) => (byId.get(a)?.order ?? 0) - (byId.get(b)?.order ?? 0)) : []
              return (
                <button
                  key={date}
                  type="button"
                  role="gridcell"
                  aria-selected={date === selectedDate}
                  aria-label={`${fmt.full(date)}, ${plural(total, 'record')}`}
                  data-date={date}
                  onClick={() => pick(date)}
                  className={cn(
                    'flex min-w-0 flex-col rounded-lg border p-1.5 text-left transition-colors',
                    date === selectedDate ? 'border-accent bg-accent/10' : 'border-transparent hover:border-line hover:bg-raised/60',
                    !inMonth && 'opacity-35',
                  )}
                >
                  <span className={cn('num grid h-5 min-w-5 place-items-center self-start rounded-full px-1 text-sm', date === today ? 'bg-accent font-semibold text-accent-ink' : date > today ? 'text-faint' : 'text-muted')}>{parseDateStr(date).getDate()}</span>
                  <span className="mt-auto flex flex-wrap gap-[3px]">
                    {ids.slice(0, 6).map((id) => (
                      <span key={id} className="h-1.5 w-1.5 rounded-full" style={{ background: colorOf(byId.get(id)) }} />
                    ))}
                    {ids.length > 6 && <span className="text-2xs leading-none text-faint">+{ids.length - 6}</span>}
                  </span>
                </button>
              )
            })}
          </div>
          {active.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line/60 pt-3">
              {active.map((tracker) => {
                const on = !hidden.includes(tracker.id)
                return (
                  <Chip key={tracker.id} color={on ? colorOf(tracker) : 'rgb(var(--faint))'} active={on} onClick={() => setHidden((ids) => (on ? [...ids, tracker.id] : ids.filter((id) => id !== tracker.id)))}>
                    {tracker.name}
                  </Chip>
                )
              })}
              {hidden.length > 0 && (
                <button type="button" onClick={() => setHidden([])} className="px-1 text-xs text-accent hover:underline">
                  Show all
                </button>
              )}
            </div>
          )}
        </section>

        <section className="card flex min-h-[420px] min-w-0 flex-col">
          <header className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-semibold">{view === 'day' ? `${fmt.weekday(selectedDate)}, ${fmt.dayMonth(selectedDate)}` : fmt.monthYear(cursor.year, cursor.month)}</h2>
              <p className="text-sm text-muted">{view === 'day' ? plural(dayEntries.length, 'record') : `${plural(monthDays.reduce((sum, [, list]) => sum + list.length, 0), 'record')} on ${plural(monthDays.length, 'day')}`}</p>
            </div>
            <Segmented size="sm" value={view} onChange={setView} options={[{ value: 'day', label: 'Day' }, { value: 'month', label: 'Month' }]} label="Show" />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            {view === 'day' ? (
              dayEntries.length === 0 ? (
                <Empty icon={<NotebookPen />} title={isLoading ? 'Loading…' : selectedDate > today ? 'Nothing planned' : 'Nothing recorded'} action={<Button onClick={() => openEntry({ date: selectedDate })}>Log something</Button>}>
                  {hidden.length > 0 ? 'Some trackers are filtered out below the calendar.' : selectedDate === today ? 'Today is still a blank page.' : undefined}
                </Empty>
              ) : (
                <ul>
                  {dayEntries.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} tracker={byId.get(entry.trackerId) as Tracker} />
                  ))}
                </ul>
              )
            ) : monthDays.length === 0 ? (
              <Empty icon={<NotebookPen />} title="Nothing recorded this month" />
            ) : (
              monthDays.map(([date, list]) => (
                <div key={date} className="mb-2">
                  <button type="button" onClick={() => { pick(date); setView('day') }} className="sticky top-0 z-10 flex w-full items-baseline gap-2 bg-surface px-2 py-1.5 text-left">
                    <span className="text-sm font-semibold">{fmt.relativeDay(date)}</span>
                    <span className="text-xs text-faint">{fmt.weekday(date)}</span>
                  </button>
                  <ul>
                    {[...list].sort((a, b) => a.timestamp - b.timestamp).map((entry) => (
                      <EntryRow key={entry.id} entry={entry} tracker={byId.get(entry.trackerId) as Tracker} compact />
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </PageShell>
  )
}

function EntryRow({ entry, tracker, compact }: { entry: Entry; tracker: Tracker; compact?: boolean }) {
  const prefs = usePreferences()
  const openEntry = useApp((state) => state.openEntry)
  const { data: tags = [] } = useTags()
  const { data: assets = [] } = useData(['assets'], () => api.getAssets({ limit: 500 }), { enabled: !!entry.assetId })
  const line = describeEntry(entry, tracker, prefs)
  const entryTags = (entry.tagIds ?? []).map((id) => tags.find((tag) => tag.id === id)).filter((tag) => !!tag)
  const asset = entry.assetId ? assets.find((item) => item.id === entry.assetId) : undefined
  return (
    <li>
      <button type="button" onClick={() => openEntry({ edit: { entryId: entry.id, trackerId: tracker.id } })} className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-raised">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `${colorOf(tracker)}22` }}>
          <TrackerIcon name={tracker.icon} color={colorOf(tracker)} className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-base font-medium">{line.title}</span>
            <span className="shrink-0 text-xs text-faint">{tracker.name}</span>
          </span>
          {line.detail && <span className={cn('block text-sm text-muted', compact ? 'truncate' : 'whitespace-pre-wrap break-words')}>{line.detail}</span>}
          {entryTags.length > 0 && (
            <span className="mt-1 flex flex-wrap gap-1">
              {entryTags.map((tag) => (
                <span key={tag.id} className="inline-flex items-center gap-1 rounded-full bg-raised px-1.5 py-px text-2xs text-muted">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: tag.color ?? colorOf(null) }} />
                  {tag.name}
                </span>
              ))}
            </span>
          )}
        </span>
        {asset && asset.type === 'image' && !compact && <img src={assetUrl(asset.thumbnailPath ?? asset.path) ?? ''} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
        <span className="shrink-0 pt-0.5 text-xs text-faint">{fmt.time(entry.timestamp, prefs.timeFormat)}</span>
      </button>
    </li>
  )
}
