import { useState } from 'react'
import type { MetricDescriptor, PairAnalysis, ScanFinding } from '@contracts/contracts'
import { WIDGET_SIZE_RULES } from '@contracts/contracts'
import { addItem } from '@contracts/domain/grid'
import { ArrowLeftRight, FlaskConical, Pin } from 'lucide-react'
import { Scatter } from '@/charts/Scatter'
import { TimeChart } from '@/charts/TimeChart'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { RANGE_PRESETS, resolveRange, todayStr } from '@/lib/dates'
import { num, pValue, percent, plural, signed } from '@/lib/format'
import { RELIABILITY_TEXT, describePair, lagPhrase, shortFinding, strengthLabel } from '@/lib/insight'
import { useAction, useData, useMetrics, useOverview } from '@/lib/queries'
import type { Route } from '@/lib/store'
import { FALLBACK_COLOR } from '@/lib/trackers'
import { PageShell, Section } from '@/shell/PageHeader'
import { Button, Empty, IconButton, Segmented, Spinner, Stat } from '@/ui/primitives'
import { MetricSelect } from '../dashboard/AddWidgetDialog'
import { useSeries } from '../dashboard/data'

const LAGS = [
  { value: 0, label: 'Same day' },
  { value: 1, label: 'Next day' },
  { value: 2, label: '2 days later' },
  { value: 3, label: '3 days later' },
]

const colorOf = (metric: MetricDescriptor | undefined, fallback = FALLBACK_COLOR) => metric?.color || fallback

export function InsightsPage({ initial }: { initial: Extract<Route, { page: 'insights' }> }) {
  const run = useAction()
  const { data: metrics = [], isLoading: loadingMetrics } = useMetrics()
  const [rangeId, setRangeId] = useState('90d')
  const [a, setA] = useState(initial.a ?? '')
  const [b, setB] = useState(initial.b ?? '')
  const [lag, setLag] = useState(initial.lagDays ?? 0)
  const { data: all } = useOverview('2000-01-01', todayStr())
  const range = resolveRange(rangeId, all?.firstEntryDate ?? null)

  const { data: scan, isLoading: scanning } = useData(['scan', range.from, range.to], () => api.scanRelationships({ from: range.from, to: range.to, lags: [0, 1] }), { enabled: metrics.length >= 2 })
  // Until two metrics are chosen, the explorer opens on the strongest finding.
  const top = scan?.findings[0]
  const suggested = !a && !b && top ? top : null
  const idA = a || suggested?.a.id || ''
  const idB = b || suggested?.b.id || ''
  const lagDays = suggested ? suggested.lagDays : lag
  const ready = !!idA && !!idB && idA !== idB

  const { data: analysis, isLoading: analysing } = useData(['pair', idA, idB, lagDays, range.from, range.to], () => api.analyzePair({ a: idA, b: idB, lagDays, from: range.from, to: range.to }), { enabled: ready, placeholderData: (previous) => previous })
  const { data: seriesData } = useSeries(ready ? [idA, idB] : [], range.from, range.to)
  const seriesA = seriesData?.series.find((item) => item.metric.id === idA)
  const seriesB = seriesData?.series.find((item) => item.metric.id === idB)

  const choose = (finding: ScanFinding) => {
    setA(finding.a.id)
    setB(finding.b.id)
    setLag(finding.lagDays)
  }
  const pick = (side: 'a' | 'b', id: string) => {
    // Choosing by hand takes over from the suggestion on both sides.
    if (side === 'a') {
      setA(id)
      if (!b) setB(suggested && suggested.b.id !== id ? suggested.b.id : '')
    } else {
      setB(id)
      if (!a) setA(suggested && suggested.a.id !== id ? suggested.a.id : '')
    }
    if (suggested) setLag(suggested.lagDays)
  }

  const pin = () =>
    run(
      async () => {
        const layout = await api.getDashboardLayout()
        const rule = WIDGET_SIZE_RULES.insight
        const widgets = addItem(layout.widgets, { id: `insight-${Date.now().toString(36)}`, type: 'insight', w: rule.defaultW, h: rule.defaultH, pair: { a: idA, b: idB, lagDays } })
        return api.saveDashboardLayout({ version: 2, widgets })
      },
      { success: 'Pinned to Today', failure: 'It could not be pinned' },
    )

  return (
    <PageShell
      title="Insights"
      subtitle="How the things you track move together. These are patterns in your records, not proof of cause."
      toolbar={<Segmented size="sm" value={rangeId} onChange={setRangeId} options={RANGE_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))} label="Period" />}
    >
      {metrics.length < 2 ? (
        loadingMetrics ? (
          <div className="grid h-40 place-items-center">
            <Spinner />
          </div>
        ) : (
          <Empty icon={<FlaskConical />} title="Not enough to compare yet">
            Insights needs at least two things recorded — for example mood and a workout. Keep logging and come back in a week or two.
          </Empty>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-4">
            <section className="card p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
                <MetricSelect label="When this happens or goes up…" value={idA} onChange={(id) => pick('a', id)} metrics={metrics} exclude={idB} />
                <IconButton
                  label="Swap"
                  className="mb-0.5"
                  disabled={!ready}
                  onClick={() => {
                    setA(idB)
                    setB(idA)
                    setLag(lagDays)
                  }}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </IconButton>
                <MetricSelect label="…what happens to this?" value={idB} onChange={(id) => pick('b', id)} metrics={metrics} exclude={idA} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Segmented
                  size="sm"
                  value={lagDays}
                  onChange={(value) => {
                    setA(idA)
                    setB(idB)
                    setLag(value)
                  }}
                  options={LAGS}
                  label="Timing"
                />
                <span className="text-xs text-faint">Compares the first on a day with the second {lagPhrase(lagDays)}.</span>
              </div>
            </section>

            {!ready ? (
              <section className="card">
                <Empty icon={<FlaskConical />} title="Pick two things to compare">
                  {scanning ? 'Looking through your records for patterns…' : 'Choose a metric on each side, or pick a pattern from the list.'}
                </Empty>
              </section>
            ) : !analysis ? (
              <section className="card grid h-48 place-items-center">{analysing ? <Spinner /> : <Empty title="These two cannot be compared">One of them has no records in this period.</Empty>}</section>
            ) : (
              <>
                <Result analysis={analysis} onPin={() => void pin()} suggested={!!suggested} />
                {analysis.points.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Section title="Day by day" hint={`Each dot is one day. Across: ${analysis.a.label}. Up: ${analysis.b.label}${lagDays ? ` ${lagPhrase(lagDays)}` : ''}.`}>
                      <div className="h-64">
                        <Scatter points={analysis.points} fit={analysis.status === 'ok' && analysis.strength !== 'none' ? analysis.fit : null} xLabel={label(analysis.a)} yLabel={label(analysis.b)} color={colorOf(analysis.b)} />
                      </div>
                    </Section>
                    <Section title="Over time" hint="Both metrics on the same calendar.">
                      <div className="flex h-64 flex-col gap-2">
                        {[seriesA, seriesB].map(
                          (series, index) =>
                            series && (
                              <div key={series.metric.id} className="min-h-0 flex-1">
                                <p className="mb-0.5 truncate text-xs text-muted">{label(series.metric)}</p>
                                <div className="h-[calc(100%-18px)]">
                                  <TimeChart
                                    series={[{ id: series.metric.id, label: series.metric.label, color: colorOf(series.metric, index === 0 ? '#7c9cff' : FALLBACK_COLOR), points: series.points, unit: series.metric.unit, mode: series.metric.kind === 'measure' ? 'line' : 'bars' }]}
                                    from={range.from}
                                    to={range.to}
                                  />
                                </div>
                              </div>
                            ),
                        )}
                      </div>
                    </Section>
                  </div>
                )}
              </>
            )}
          </div>

          <Section title="Patterns found" hint={scan ? `${plural(scan.pairsTested, 'comparison')} across ${plural(scan.metricsConsidered, 'metric')}` : undefined} className="self-start">
            {scanning ? (
              <div className="grid h-24 place-items-center">
                <Spinner />
              </div>
            ) : !scan || scan.findings.length === 0 ? (
              <p className="text-sm text-muted">Nothing stands out in this period. That is a normal result: it needs at least 10 days in common and a clear, consistent pattern. Try a longer period.</p>
            ) : (
              <>
                <ul className="-mx-2 flex flex-col">
                  {scan.findings.map((finding) => {
                    const current = finding.a.id === idA && finding.b.id === idB && finding.lagDays === lagDays
                    return (
                      <li key={`${finding.a.id}|${finding.b.id}|${finding.lagDays}`}>
                        <button type="button" onClick={() => choose(finding)} aria-current={current} className={cn('flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-raised', current && 'bg-accent/10')}>
                          <span className={cn('num mt-0.5 w-11 shrink-0 text-right text-sm font-semibold', finding.rho > 0 ? 'text-good' : 'text-bad')}>{signed(finding.rho, 2)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm">{shortFinding(finding.a, finding.b, finding.rho, finding.lagDays)}</span>
                            <span className="block text-xs text-faint">
                              {finding.strength} · {plural(finding.n, 'day')}
                              {finding.reliability === 'preliminary' ? ' · early read' : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-3 border-t border-line/60 pt-3 text-xs text-faint">
                  Listed when the rank correlation is at least ±0.30 over 14 or more shared days, and it still holds after correcting for all {scan.pairsTested.toLocaleString('en')} comparisons (false discovery rate 5%). A tag is not compared with the items it labels. Some of these can still be coincidences — treat them as questions worth testing, not answers.
                </p>
              </>
            )}
          </Section>
        </div>
      )}
    </PageShell>
  )
}

function label(metric: MetricDescriptor): string {
  return metric.unit ? `${metric.label} (${metric.unit})` : metric.label
}

function chance(p: number | null | undefined): string {
  if (p == null) return ''
  if (p < 0.001) return 'A pattern this strong would be very unusual if the two were unrelated.'
  const times = Math.max(1, Math.round(p * 100))
  return `If the two were unrelated, a pattern at least this strong would still turn up about ${times} ${times === 1 ? 'time' : 'times'} in 100.`
}

function Result({ analysis, onPin, suggested }: { analysis: PairAnalysis; onPin: () => void; suggested: boolean }) {
  const ok = analysis.status === 'ok'
  const split = analysis.split
  const tone = !ok || analysis.strength === 'none' ? 'text-muted' : analysis.direction === 'positive' ? 'text-good' : 'text-bad'
  const format = (value: number, metric: MetricDescriptor) => (split?.outcomeIsRate ? percent(value) : `${num(value, value >= 100 ? 0 : 1)}${metric.unit ? ` ${metric.unit}` : ''}`)
  const top = split ? Math.max(Math.abs(split.high.mean), Math.abs(split.low.mean)) || 1 : 1
  return (
    <section className="card p-5" data-testid="insight-result">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {suggested && <p className="mb-1 text-xs text-accent">Strongest pattern in this period</p>}
          <h2 className={cn('text-2xl font-semibold', tone)}>{strengthLabel(analysis)}</h2>
          <p className="selectable mt-2 max-w-[70ch] text-base leading-relaxed">{describePair(analysis)}</p>
        </div>
        <Button size="sm" icon={<Pin className="h-3.5 w-3.5" />} onClick={onPin} disabled={analysis.n === 0}>
          Pin to Today
        </Button>
      </div>

      {split && (
        <div className="mt-5 flex flex-col gap-2.5">
          {[
            { name: split.mode === 'occurrence' ? `Days with ${analysis.a.label}` : `Days above ${num(split.threshold)}${analysis.a.unit ? ` ${analysis.a.unit}` : ''}`, group: split.high, strong: true },
            { name: split.mode === 'occurrence' ? 'Days without' : 'The other days', group: split.low, strong: false },
          ].map((row) => (
            <div key={row.name} className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] items-center gap-3">
              <span className="truncate text-sm text-muted">
                {row.name} <span className="text-faint">· {plural(row.group.n, 'day')}</span>
              </span>
              <div className="h-2.5 overflow-hidden rounded-full bg-line/60">
                <div className="h-full rounded-full" style={{ width: `${Math.max(2, (Math.abs(row.group.mean) / top) * 100)}%`, background: colorOf(analysis.b), opacity: row.strong ? 1 : 0.45 }} />
              </div>
              <span className="num w-24 text-right text-base font-semibold">{format(row.group.mean, analysis.b)}</span>
            </div>
          ))}
          <p className="text-xs text-faint">
            {split.outcomeIsRate ? `Share of days with “${analysis.b.label}”` : `Average “${analysis.b.label}”`}
            {analysis.lagDays ? `, ${lagPhrase(analysis.lagDays)}` : ''}. Difference {split.outcomeIsRate ? `${signed(split.diff * 100, 0)} points` : signed(split.diff)}
            {split.p != null ? `, p ${split.p < 0.001 ? '' : '= '}${pValue(split.p)}` : ''}.
          </p>
        </div>
      )}

      {ok && (
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line/60 pt-4 md:grid-cols-4">
          <Stat label="Days compared" value={num(analysis.n, 0)} sub={analysis.reliability === 'solid' ? 'Solid sample' : analysis.reliability === 'fair' ? 'Reasonable sample' : 'Early read'} />
          <Stat label="Rank correlation" value={signed(analysis.spearman?.value, 2)} sub="Spearman ρ, from −1 to +1" />
          <Stat label="p-value" value={pValue(analysis.spearman?.p)} sub="Lower is less likely chance" />
          <Stat label="Linear correlation" value={signed(analysis.pearson?.value, 2)} sub="Pearson r" />
        </div>
      )}
      <p className="mt-4 text-xs leading-relaxed text-faint">
        {ok ? `${RELIABILITY_TEXT[analysis.reliability]}. ${chance(analysis.spearman?.p)} ` : ''}
        Only days where both are known are compared. Two things moving together does not show that one causes the other — something else may drive both.
      </p>
    </section>
  )
}
