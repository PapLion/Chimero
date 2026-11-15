import { useState, type ReactNode } from 'react'
import type { DashboardWidget, MetricDescriptor, Tracker, WidgetType } from '@contracts/contracts'
import { WIDGET_SIZE_RULES } from '@contracts/contracts'
import { Bell, Flame, FlaskConical, Grid3x3, LineChart, ListChecks, StickyNote, Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import { TrackerIcon } from '@/lib/icons'
import { useMetrics } from '@/lib/queries'
import { colorOf } from '@/lib/trackers'
import { Dialog } from '@/ui/dialog'
import { Button, Field, Select } from '@/ui/primitives'

type NewWidget = Omit<DashboardWidget, 'x' | 'y'>

const EXTRAS: Array<{ type: WidgetType; label: string; blurb: string; icon: ReactNode; single: boolean }> = [
  { type: 'trend', label: 'Trend chart', blurb: 'Any metric over time', icon: <LineChart />, single: false },
  { type: 'insight', label: 'Insight', blurb: 'A relationship between two metrics', icon: <FlaskConical />, single: false },
  { type: 'heatmap', label: 'Activity heatmap', blurb: 'A year of logging at a glance', icon: <Grid3x3 />, single: true },
  { type: 'day-log', label: 'Day log', blurb: 'Everything recorded on the selected day', icon: <ListChecks />, single: true },
  { type: 'streak', label: 'Logging streak', blurb: 'Consecutive days with a record', icon: <Flame />, single: true },
  { type: 'reminders', label: 'Reminders', blurb: 'What is scheduled for the day', icon: <Bell />, single: true },
  { type: 'people', label: 'People', blurb: 'Birthdays and who to catch up with', icon: <Users />, single: true },
  { type: 'note', label: 'Note', blurb: 'Free text pinned to the dashboard', icon: <StickyNote />, single: false },
]

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.round(Math.random() * 1e4).toString(36)}`

function size(type: WidgetType) {
  const rule = WIDGET_SIZE_RULES[type]
  return { w: rule.defaultW, h: rule.defaultH }
}

export function AddWidgetDialog({ open, onClose, onAdd, widgets, trackers }: { open: boolean; onClose: () => void; onAdd: (widget: NewWidget) => void; widgets: DashboardWidget[]; trackers: Tracker[] }) {
  const { data: metrics = [] } = useMetrics()
  const [configuring, setConfiguring] = useState<'trend' | 'insight' | null>(null)
  const [metricId, setMetricId] = useState('')
  const [pairA, setPairA] = useState('')
  const [pairB, setPairB] = useState('')
  const [lag, setLag] = useState(0)
  const [days, setDays] = useState(90)

  const shownTrackers = new Set(widgets.filter((w) => w.type === 'tracker').map((w) => w.trackerId))
  const shownTypes = new Set(widgets.map((w) => w.type))
  const close = () => {
    setConfiguring(null)
    onClose()
  }
  const add = (widget: NewWidget) => {
    onAdd(widget)
    close()
  }

  return (
    <Dialog open={open} onClose={close} title={configuring === 'trend' ? 'Trend chart' : configuring === 'insight' ? 'Insight' : 'Add a widget'} width={620}>
      {configuring === 'trend' ? (
        <div className="flex flex-col gap-4">
          <MetricSelect label="Metric" value={metricId} onChange={setMetricId} metrics={metrics} />
          <DaysSelect value={days} onChange={setDays} />
          <Actions onBack={() => setConfiguring(null)} disabled={!metricId} onConfirm={() => add({ id: uid('trend'), type: 'trend', metricId, days, ...size('trend') })} />
        </div>
      ) : configuring === 'insight' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">Pin one comparison, or leave both empty to always show the strongest pattern in your records.</p>
          <MetricSelect label="When this happens…" value={pairA} onChange={setPairA} metrics={metrics} allowEmpty />
          <MetricSelect label="…what happens to this?" value={pairB} onChange={setPairB} metrics={metrics} allowEmpty />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Compared with">
              {(id) => (
                <Select id={id} value={lag} onChange={(event) => setLag(Number(event.target.value))}>
                  <option value={0}>The same day</option>
                  <option value={1}>The next day</option>
                  <option value={2}>Two days later</option>
                </Select>
              )}
            </Field>
            <DaysSelect value={days} onChange={setDays} />
          </div>
          <Actions
            onBack={() => setConfiguring(null)}
            disabled={(!!pairA || !!pairB) && (!pairA || !pairB || pairA === pairB)}
            onConfirm={() => add({ id: uid('insight'), type: 'insight', days, ...(pairA && pairB ? { pair: { a: pairA, b: pairB, lagDays: lag } } : {}), ...size('insight') })}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Trackers</p>
            <div className="grid grid-cols-3 gap-2">
              {trackers.map((tracker) => {
                const shown = shownTrackers.has(tracker.id)
                return (
                  <button
                    key={tracker.id}
                    type="button"
                    disabled={shown}
                    onClick={() => add({ id: uid(`tracker-${tracker.id}`), type: 'tracker', trackerId: tracker.id, ...size('tracker') })}
                    className={cn('flex h-10 items-center gap-2 rounded-control border border-line px-2.5 text-left text-sm transition-colors', shown ? 'opacity-40' : 'hover:border-faint hover:bg-raised')}
                  >
                    <TrackerIcon name={tracker.icon} color={colorOf(tracker)} className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{tracker.name}</span>
                    {shown && <span className="text-2xs text-faint">added</span>}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-muted">More</p>
            <div className="grid grid-cols-2 gap-2">
              {EXTRAS.map((extra) => {
                const taken = extra.single && shownTypes.has(extra.type)
                return (
                  <button
                    key={extra.type}
                    type="button"
                    disabled={taken}
                    onClick={() => (extra.type === 'trend' || extra.type === 'insight' ? setConfiguring(extra.type) : add({ id: uid(extra.type), type: extra.type, ...size(extra.type) }))}
                    className={cn('flex items-center gap-3 rounded-control border border-line p-2.5 text-left transition-colors', taken ? 'opacity-40' : 'hover:border-faint hover:bg-raised')}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-raised text-muted [&>svg]:h-4 [&>svg]:w-4">{extra.icon}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{extra.label}</span>
                      <span className="block truncate text-xs text-muted">{taken ? 'Already on the dashboard' : extra.blurb}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  )
}

function Actions({ onBack, onConfirm, disabled }: { onBack: () => void; onConfirm: () => void; disabled: boolean }) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <Button variant="ghost" onClick={onBack}>
        Back
      </Button>
      <Button variant="primary" disabled={disabled} onClick={onConfirm}>
        Add to dashboard
      </Button>
    </div>
  )
}

function DaysSelect({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <Field label="Looking back">
      {(id) => (
        <Select id={id} value={value} onChange={(event) => onChange(Number(event.target.value))}>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
          <option value={182}>6 months</option>
          <option value={365}>1 year</option>
        </Select>
      )}
    </Field>
  )
}

export function MetricSelect({ label, value, onChange, metrics, allowEmpty, exclude }: { label: string; value: string; onChange: (id: string) => void; metrics: MetricDescriptor[]; allowEmpty?: boolean; exclude?: string }) {
  const groups = new Map<string, MetricDescriptor[]>()
  for (const metric of metrics) groups.set(metric.group, [...(groups.get(metric.group) ?? []), metric])
  return (
    <Field label={label} hint={metrics.length === 0 ? 'Metrics appear here once trackers have records.' : undefined}>
      {(id) => (
        <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{allowEmpty ? 'Automatic' : 'Choose a metric'}</option>
          {[...groups.entries()].map(([group, items]) => (
            <optgroup key={group} label={group}>
              {items.map((metric) => (
                <option key={metric.id} value={metric.id} disabled={metric.id === exclude}>
                  {metric.label}
                  {metric.unit ? ` (${metric.unit})` : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      )}
    </Field>
  )
}
