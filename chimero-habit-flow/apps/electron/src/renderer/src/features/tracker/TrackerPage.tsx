import { useMemo, useState } from 'react'
import type { Entry, MetricDescriptor, MetricSummary, Tracker } from '@contracts/contracts'
import { EyeOff, FlaskConical, MoreHorizontal, Pencil, Plus } from 'lucide-react'
import { TimeChart, type ChartSeries } from '@/charts/TimeChart'
import { movingAverage } from '@/charts/scale'
import { api, must } from '@/lib/api'
import { cn } from '@/lib/cn'
import { RANGE_PRESETS, fmt, resolveRange } from '@/lib/dates'
import { describeEntry } from '@/lib/entries'
import { num, percent, plural, signed } from '@/lib/format'
import { TrackerIcon } from '@/lib/icons'
import { useAction, useData, useMetrics, useOverview, usePreferences, useTracker } from '@/lib/queries'
import { useApp } from '@/lib/store'
import { IDENTITY_BLURB, colorOf, identityOf } from '@/lib/trackers'
import { PageShell, Section } from '@/shell/PageHeader'
import { Menu } from '@/ui/menu'
import { Button, Chip, Empty, IconButton, Segmented, Select, Spinner, Stat } from '@/ui/primitives'
import { primaryMetricId, useSeries } from '../dashboard/data'
import { TrackerDialog } from '../trackers/TrackerDialog'
import { BookLibrary, RoutineList, WeightGoal, useWeightGoal } from './extras'

const DETAIL = /^t:\d+:(game|food|symptom|item|contact):/
const HISTORY_PAGE = 60

export function TrackerPage({ trackerId }: { trackerId: number }) {
  const tracker = useTracker(trackerId)
  const { isLoading } = useData(['trackers'], () => api.getTrackers())
  if (!tracker) {
    return isLoading ? (
      <div className="grid h-full place-items-center">
        <Spinner />
      </div>
    ) : (
      <Empty title="This tracker is hidden or gone">Restore it from the Trackers page to see it again.</Empty>
    )
  }
  return <TrackerView tracker={tracker} />
}

function TrackerView({ tracker }: { tracker: Tracker }) {
  const { navigate, openEntry, setSelectedDate } = useApp()
  const prefs = usePreferences()
  const run = useAction()
  const identity = identityOf(tracker)
  const color = colorOf(tracker)
  const [rangeId, setRangeId] = useState('90d')
  const [editing, setEditing] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [shown, setShown] = useState(HISTORY_PAGE)

  const { data: all } = useOverview('2000-01-01', resolveRange('30d', null).to)
  const range = resolveRange(rangeId, all?.firstEntryDate ?? null)
  const { data: metrics = [] } = useMetrics()
  const mine = useMemo(() => metrics.filter((metric) => metric.trackerId === tracker.id), [metrics, tracker.id])
  const main = mine.filter((metric) => !DETAIL.test(metric.id))
  const detail = mine.filter((metric) => DETAIL.test(metric.id))
  const fallback = main.find((metric) => metric.id === primaryMetricId(tracker)) ?? main[0]
  const metric = mine.find((item) => item.id === picked) ?? fallback

  const { data: seriesData } = useSeries(metric ? [metric.id] : [], range.from, range.to)
  const series = seriesData?.series.find((item) => item.metric.id === metric?.id)
  const summary = seriesData?.summaries.find((item) => item.metric.id === metric?.id)
  const { data: detailData } = useSeries(detail.slice(0, 40).map((item) => item.id), range.from, range.to)
  const { data: entries = [], isLoading: loadingEntries } = useData(['entries', 'tracker', tracker.id, range.from, range.to], () => api.getEntries({ trackerId: tracker.id, from: range.from, to: range.to, limit: 2000 }))
  const goal = useWeightGoal(identity === 'weight' ? tracker.id : null, prefs.weightUnit)

  const chart: ChartSeries[] = []
  if (series && metric) {
    const bars = metric.kind !== 'measure'
    chart.push({ id: metric.id, label: metric.label, color, points: series.points, unit: metric.unit, mode: bars ? 'bars' : 'line' })
    if (!bars && series.points.length >= 14) chart.push({ id: 'avg', label: '7-day average', color: 'rgb(var(--muted))', points: movingAverage(series.points, 7), unit: metric.unit, subtle: true })
  }
  const reference =
    metric?.id === `t:${tracker.id}:weight` && goal.value != null
      ? { value: goal.value, label: 'Goal' }
      : metric?.id === `t:${tracker.id}:value` && tracker.config.goal != null
        ? { value: tracker.config.goal, label: 'Goal' }
        : null

  const ranked = (detailData?.summaries ?? [])
    .filter((item) => (item.total ?? 0) > 0)
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
    .slice(0, 8)

  const days = useMemo(() => {
    const groups: Array<{ date: string; entries: Entry[] }> = []
    for (const entry of entries.slice(0, shown)) {
      const last = groups[groups.length - 1]
      if (last?.date === entry.dateStr) last.entries.push(entry)
      else groups.push({ date: entry.dateStr, entries: [entry] })
    }
    return groups
  }, [entries, shown])

  return (
    <PageShell
      icon={
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: `${color}22` }}>
          <TrackerIcon name={tracker.icon} color={color} className="h-[22px] w-[22px]" />
        </span>
      }
      title={tracker.name}
      subtitle={tracker.config.description || IDENTITY_BLURB[identity]}
      actions={
        <>
          <Menu
            trigger={
              <IconButton label="More">
                <MoreHorizontal className="h-4 w-4" />
              </IconButton>
            }
            items={[
              { label: 'Edit tracker', icon: <Pencil />, onSelect: () => setEditing(true) },
              ...(metric ? [{ label: 'Explore in Insights', icon: <FlaskConical />, onSelect: () => navigate({ page: 'insights', a: metric.id }) }] : []),
              {
                label: 'Hide tracker',
                icon: <EyeOff />,
                separatorBefore: true,
                onSelect: () => void run(() => must(api.updateTracker(tracker.id, { archived: true }), 'The tracker was not hidden'), { success: `${tracker.name} hidden. Restore it from Trackers.` }).then((done) => done && navigate({ page: 'trackers' })),
              },
            ]}
          />
          <Button variant="primary" icon={<Plus className="h-4 w-4" strokeWidth={2.5} />} onClick={() => openEntry({ trackerId: tracker.id })} data-testid="tracker-log">
            Log
          </Button>
        </>
      }
      toolbar={<Segmented size="sm" value={rangeId} onChange={setRangeId} options={RANGE_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))} label="Period" />}
    >
      <div className="flex flex-col gap-4">
        <section className="card p-5">
          {main.length === 0 ? (
            <Empty title="Nothing recorded yet" action={<Button variant="primary" onClick={() => openEntry({ trackerId: tracker.id })}>Log the first one</Button>}>
              Charts and statistics appear here as soon as there is something to show.
            </Empty>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                {main.map((item) => (
                  <Chip key={item.id} onClick={() => setPicked(item.id)} active={item.id === metric?.id}>
                    {item.label}
                  </Chip>
                ))}
                {detail.length > 0 && (
                  <Select aria-label="More metrics" value={metric && DETAIL.test(metric.id) ? metric.id : ''} onChange={(event) => setPicked(event.target.value || null)} className={cn('h-6 w-auto max-w-[220px] rounded-full py-0 pl-2.5 text-xs', metric && DETAIL.test(metric.id) ? 'border-accent/60 text-text' : 'text-muted')}>
                    <option value="">More…</option>
                    {detail.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
              {metric && summary && <Stats metric={metric} summary={summary} goal={metric.id === `t:${tracker.id}:weight` ? goal.value : null} />}
              <div className="mt-5 h-64">
                {series && series.points.length > 0 ? (
                  <TimeChart series={chart} from={range.from} to={range.to} reference={reference} onPickDate={(date) => { setSelectedDate(date); navigate({ page: 'journal' }) }} />
                ) : (
                  <Empty title="Nothing in this period">Pick a longer period, or log something new.</Empty>
                )}
              </div>
              {metric && (
                <p className="mt-3 text-xs text-faint">
                  {metric.kind === 'measure' ? 'Days without a record are left out, not counted as zero.' : 'Days without a record count as zero from the first day this tracker was used.'}
                </p>
              )}
            </>
          )}
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Section title="History" hint={entries.length > 0 ? `${plural(entries.length, 'record')} in this period` : undefined} className="min-w-0">
            {loadingEntries ? (
              <div className="grid h-24 place-items-center">
                <Spinner />
              </div>
            ) : entries.length === 0 ? (
              <Empty title="No records in this period" />
            ) : (
              <div className="flex flex-col gap-3">
                {days.map((day) => (
                  <div key={day.date} className="grid grid-cols-[104px_minmax(0,1fr)] gap-3">
                    <div className="pt-1.5">
                      <p className="text-sm font-medium">{fmt.relativeDay(day.date)}</p>
                      <p className="text-xs text-faint">{fmt.weekdayShort(day.date)}</p>
                    </div>
                    <ul className="min-w-0">
                      {day.entries.map((entry) => {
                        const line = describeEntry(entry, tracker, prefs)
                        return (
                          <li key={entry.id}>
                            <button type="button" onClick={() => openEntry({ edit: { entryId: entry.id, trackerId: tracker.id } })} className="flex w-full items-baseline gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-raised">
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-base">{line.title}</span>
                                {line.detail && <span className="block truncate text-sm text-muted">{line.detail}</span>}
                              </span>
                              <span className="shrink-0 text-xs text-faint">{fmt.time(entry.timestamp, prefs.timeFormat)}</span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
                {entries.length > shown && (
                  <Button variant="ghost" size="sm" className="self-center" onClick={() => setShown(shown + HISTORY_PAGE * 2)}>
                    Show older records
                  </Button>
                )}
              </div>
            )}
          </Section>

          <div className="flex min-w-0 flex-col gap-4">
            {identity === 'weight' && <WeightGoal tracker={tracker} />}
            {identity === 'books' && <BookLibrary />}
            {identity === 'exercise' && <RoutineList tracker={tracker} />}
            {ranked.length > 0 && (
              <Section title="Most logged" hint="In this period">
                <ul className="flex flex-col gap-2.5">
                  {ranked.map((item) => (
                    <li key={item.metric.id}>
                      <button type="button" onClick={() => setPicked(item.metric.id)} className="group block w-full text-left">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate group-hover:text-accent">{item.metric.label.replace(/^(Ate|Took|Time with) /, '').replace(/ hours$/, '')}</span>
                          <span className="num shrink-0 text-muted">{item.metric.kind === 'flag' ? plural(item.total ?? 0, 'day') : `${num(item.total)}${item.metric.unit ? ` ${item.metric.unit}` : ''}`}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/60">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(3, ((item.total ?? 0) / (ranked[0].total ?? 1)) * 100)}%`, background: color }} />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        </div>
      </div>
      {editing && <TrackerDialog tracker={tracker} onClose={() => setEditing(false)} />}
    </PageShell>
  )
}

function Stats({ metric, summary, goal }: { metric: MetricDescriptor; summary: MetricSummary; goal: number | null }) {
  const unit = metric.unit ? ` ${metric.unit}` : ''
  const value = (v: number | null, digits = 1) => (v == null ? '—' : `${num(v, digits)}${unit}`)
  if (summary.days === 0) return null
  if (metric.kind === 'measure') {
    const change = summary.first && summary.last && summary.days > 1 ? summary.last.value - summary.first.value : null
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-5">
        <Stat label="Latest" value={value(summary.last?.value ?? null)} sub={summary.last ? fmt.relativeDay(summary.last.date) : undefined} />
        <Stat label="Average" value={value(summary.mean)} sub={`${plural(summary.days, 'day')} recorded`} />
        <Stat label="Range" value={`${num(summary.min)} – ${num(summary.max)}`} sub={metric.unit ?? undefined} />
        <Stat label="Change" value={change == null ? '—' : `${signed(change)}${unit}`} sub={summary.trendPerDay != null ? `${signed(summary.trendPerDay * 7, 2)}${unit} per week` : undefined} />
        {goal != null && summary.last ? <Stat label="To goal" value={`${signed(goal - summary.last.value)}${unit}`} sub={`Goal ${num(goal)}${unit}`} /> : <Stat label="Typical swing" value={summary.sd == null ? '—' : `±${num(summary.sd)}${unit}`} sub="Standard deviation" />}
      </div>
    )
  }
  if (metric.kind === 'flag') {
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
        <Stat label="Days" value={num(summary.total, 0)} sub={`of ${plural(summary.days, 'day')}`} />
        <Stat label="Share of days" value={percent(summary.mean)} />
        <Stat label="Per week" value={summary.mean == null ? '—' : num(summary.mean * 7)} sub="On average" />
        <Stat label="Last time" value={summary.last && lastActive(summary) ? fmt.relativeDay(lastActive(summary) as string) : '—'} />
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
      <Stat label="Total" value={value(summary.total, summary.total != null && summary.total >= 100 ? 0 : 1)} sub={`over ${plural(summary.days, 'day')}`} />
      <Stat label="Daily average" value={value(summary.mean)} sub="Counting empty days" />
      <Stat label="Active days" value={num(summary.recordedDays, 0)} sub={summary.days > 0 ? `${percent(summary.recordedDays / summary.days)} of days` : undefined} />
      <Stat label="Biggest day" value={value(summary.max)} />
    </div>
  )
}

/** The series ends today; for flags the interesting date is the last day it happened. */
function lastActive(summary: MetricSummary): string | null {
  return summary.last && summary.last.value > 0 ? summary.last.date : null
}
