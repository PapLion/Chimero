import { useState } from 'react'
import type { CustomField, CustomFieldType, Tracker, TrackerConfig } from '@contracts/contracts'
import { Plus, Trash2 } from 'lucide-react'
import { api, must } from '@/lib/api'
import { cn } from '@/lib/cn'
import { TRACKER_ICON_NAMES, TrackerIcon } from '@/lib/icons'
import { useAction } from '@/lib/queries'
import { IDENTITY_BLURB, PALETTE, colorOf, identityOf, kindOf } from '@/lib/trackers'
import { Dialog } from '@/ui/dialog'
import { Popover } from '@/ui/menu'
import { Button, Chip, Field, IconButton, Input, Segmented, Select } from '@/ui/primitives'
import { parseNumber } from '../entry/shared'
import { KIND_HINT, KIND_LABEL, TEMPLATES, type TrackerKind, type TrackerTemplate } from './templates'

interface Draft {
  name: string
  icon: string
  color: string
  type: TrackerKind
  unit: string
  valueKind: 'measure' | 'activity'
  aggregate: 'sum' | 'mean' | 'last'
  goal: string
  goalDirection: 'atLeast' | 'atMost'
  quickValues: string
  min: string
  max: string
  options: string
  description: string
  /** `stored` fields keep their key when renamed, so existing records still match. */
  fields: Array<CustomField & { optionsText: string; stored?: boolean }>
}

const text = (value: number | undefined) => (value == null ? '' : String(value))

function draftFrom(source: { name: string; icon: string | null; color: string | null; type: TrackerKind; config: TrackerConfig }): Draft {
  const c = source.config
  return {
    name: source.name,
    icon: source.icon ?? 'sparkles',
    color: source.color ?? PALETTE[0],
    type: source.type,
    unit: c.unit ?? '',
    valueKind: c.valueKind ?? 'activity',
    aggregate: c.aggregate ?? (source.type === 'range' ? 'mean' : 'sum'),
    goal: text(c.goal),
    goalDirection: c.goalDirection ?? 'atLeast',
    quickValues: (c.quickValues ?? []).join(', '),
    min: text(c.min ?? 1),
    max: text(c.max ?? 10),
    options: (c.options ?? []).join(', '),
    description: c.description ?? '',
    fields: (c.fields ?? []).map((field) => ({ ...field, optionsText: (field.options ?? []).join(', '), stored: true })),
  }
}

const list = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)

function configOf(draft: Draft, base: TrackerConfig): TrackerConfig {
  // Start from the stored config so identity and anything this form does not edit survive.
  const { unit: _u, valueKind: _v, aggregate: _a, goal: _g, goalDirection: _d, quickValues: _q, min: _mi, max: _ma, options: _o, description: _de, fields: _f, ...kept } = base
  const config: TrackerConfig = { ...kept }
  if (draft.description.trim()) config.description = draft.description.trim()
  if (draft.type === 'numeric') {
    if (draft.unit.trim()) config.unit = draft.unit.trim()
    config.valueKind = draft.valueKind
    config.aggregate = draft.aggregate
    const goal = parseNumber(draft.goal)
    if (goal != null) {
      config.goal = goal
      config.goalDirection = draft.goalDirection
    }
    const quick = list(draft.quickValues).map(Number).filter((value) => Number.isFinite(value))
    if (quick.length > 0) config.quickValues = quick
  }
  if (draft.type === 'range') {
    config.min = parseNumber(draft.min) ?? 1
    config.max = parseNumber(draft.max) ?? 10
    config.aggregate = 'mean'
    config.valueKind = 'measure'
  }
  if (draft.type === 'text' && list(draft.options).length > 0) config.options = list(draft.options)
  const fields = draft.fields
    .filter((field) => field.label.trim())
    .map(({ optionsText, stored: _stored, ...field }) => ({
      ...field,
      label: field.label.trim(),
      unit: field.type === 'number' && field.unit?.trim() ? field.unit.trim() : undefined,
      options: field.type === 'select' ? list(optionsText) : undefined,
    }))
  if (fields.length > 0) config.fields = fields
  return config
}

export function TrackerDialog({ tracker, onClose, onSaved }: { tracker?: Tracker; onClose: () => void; onSaved?: (tracker: Tracker) => void }) {
  const run = useAction()
  const builtIn = !!tracker && identityOf(tracker) !== 'generic'
  const [template, setTemplate] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(() =>
    tracker ? draftFrom({ name: tracker.name, icon: tracker.icon, color: colorOf(tracker), type: kindOf(tracker), config: tracker.config }) : draftFrom({ name: '', icon: 'sparkles', color: PALETTE[0], type: 'numeric', config: {} }),
  )
  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }))
  const rangeOk = draft.type !== 'range' || ((parseNumber(draft.min) ?? NaN) < (parseNumber(draft.max) ?? NaN) && (parseNumber(draft.max) ?? 0) - (parseNumber(draft.min) ?? 0) <= 11)
  const valid = !!draft.name.trim() && rangeOk

  const applyTemplate = (choice: TrackerTemplate | null) => {
    setTemplate(choice?.id ?? null)
    setDraft(choice ? draftFrom(choice) : draftFrom({ name: draft.name, icon: 'sparkles', color: draft.color, type: 'numeric', config: {} }))
  }

  const setField = (index: number, patch: Partial<Draft['fields'][number]>) => set({ fields: draft.fields.map((field, i) => (i === index ? { ...field, ...patch } : field)) })

  const save = async () => {
    if (!valid) return
    const saved = await run(() => {
      if (tracker) {
        const base = { name: draft.name.trim(), icon: draft.icon, color: draft.color }
        return must(api.updateTracker(tracker.id, builtIn ? base : { ...base, config: configOf(draft, tracker.config) }), 'The tracker was not saved')
      }
      return must(api.createTracker({ name: draft.name.trim(), type: draft.type, icon: draft.icon, color: draft.color, config: configOf(draft, { isCustom: true }) }), 'The tracker was not created')
    })
    if (saved) {
      onSaved?.(saved)
      onClose()
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      width={600}
      title={tracker ? `Edit ${tracker.name}` : 'New tracker'}
      description={builtIn && tracker ? IDENTITY_BLURB[identityOf(tracker)] : tracker ? undefined : 'Track any variable of your own. It gets a widget, history, charts and a place in Insights.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="tracker-form" disabled={!valid}>
            {tracker ? 'Save changes' : 'Create tracker'}
          </Button>
        </>
      }
    >
      <form
        id="tracker-form"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        {!tracker && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted">Start from</span>
            <div className="flex flex-wrap gap-1.5">
              <Chip onClick={() => applyTemplate(null)} active={template === null}>
                Blank
              </Chip>
              {TEMPLATES.map((choice) => (
                <Chip key={choice.id} color={choice.color} onClick={() => applyTemplate(choice)} active={template === choice.id}>
                  {choice.name}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end gap-3">
          <IconPicker icon={draft.icon} color={draft.color} onPick={(icon) => set({ icon })} />
          <Field label="Name" className="flex-1">
            {(id) => <Input id={id} autoFocus value={draft.name} maxLength={60} onChange={(event) => set({ name: event.target.value })} placeholder="Sleep, water, pages read…" />}
          </Field>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">Colour</span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Colour">
            {PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={draft.color === color}
                aria-label={color}
                onClick={() => set({ color })}
                className={cn('h-6 w-6 rounded-full transition-transform hover:scale-110', draft.color === color && 'ring-2 ring-text ring-offset-2 ring-offset-surface')}
                style={{ background: color }}
              />
            ))}
          </div>
        </div>

        {!builtIn && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-muted">What you record</span>
              {tracker ? (
                <p className="text-sm text-muted">
                  {KIND_LABEL[draft.type]}. The type is fixed once a tracker exists, so its history keeps its meaning.
                </p>
              ) : (
                <>
                  <Segmented value={draft.type} onChange={(type) => set({ type })} options={(Object.keys(KIND_LABEL) as TrackerKind[]).map((value) => ({ value, label: KIND_LABEL[value] }))} label="Type" className="self-start" />
                  <p className="text-xs text-faint">{KIND_HINT[draft.type]}</p>
                </>
              )}
            </div>

            {draft.type === 'numeric' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit">{(id) => <Input id={id} value={draft.unit} maxLength={16} onChange={(event) => set({ unit: event.target.value })} placeholder="h, min, glasses…" />}</Field>
                <Field label="Several records in one day">
                  {(id) => (
                    <Select id={id} value={draft.aggregate} onChange={(event) => set({ aggregate: event.target.value as Draft['aggregate'] })}>
                      <option value="sum">Add them up</option>
                      <option value="mean">Average them</option>
                      <option value="last">Keep the latest</option>
                    </Select>
                  )}
                </Field>
                <Field label="A day with no record means" className="col-span-2" hint={draft.valueKind === 'activity' ? 'Right for things you do: an empty day really was zero.' : 'Right for readings: an empty day is left out of averages and charts.'}>
                  {() => (
                    <Segmented value={draft.valueKind} onChange={(valueKind) => set({ valueKind })} options={[{ value: 'activity', label: 'Zero' }, { value: 'measure', label: 'Unknown' }]} label="Days with no record" className="self-start" />
                  )}
                </Field>
                <Field label="Daily goal" hint="Optional">
                  {(id) => (
                    <div className="flex gap-2">
                      <Select aria-label="Goal direction" value={draft.goalDirection} onChange={(event) => set({ goalDirection: event.target.value as Draft['goalDirection'] })} className="w-[120px] shrink-0">
                        <option value="atLeast">At least</option>
                        <option value="atMost">At most</option>
                      </Select>
                      <Input id={id} inputMode="decimal" value={draft.goal} onChange={(event) => set({ goal: event.target.value })} placeholder="—" />
                    </div>
                  )}
                </Field>
                <Field label="One-tap amounts" hint="Comma separated, shown as buttons when logging.">
                  {(id) => <Input id={id} value={draft.quickValues} onChange={(event) => set({ quickValues: event.target.value })} placeholder="1, 2, 3" />}
                </Field>
              </div>
            )}

            {draft.type === 'range' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Lowest score">{(id) => <Input id={id} inputMode="numeric" value={draft.min} onChange={(event) => set({ min: event.target.value })} />}</Field>
                <Field label="Highest score" error={rangeOk ? null : 'Use a span of at most 12 steps, lowest below highest.'}>
                  {(id) => <Input id={id} inputMode="numeric" value={draft.max} onChange={(event) => set({ max: event.target.value })} />}
                </Field>
              </div>
            )}

            {draft.type === 'text' && (
              <Field label="Suggested answers" hint="Optional, comma separated. Shown as one-tap choices.">
                {(id) => <Input id={id} value={draft.options} onChange={(event) => set({ options: event.target.value })} placeholder="Home, office, travelling" />}
              </Field>
            )}

            <div className="flex flex-col gap-2">
              <div>
                <span className="text-sm font-medium text-muted">Extra fields</span>
                <p className="text-xs text-faint">Recorded with every entry. Number and yes/no fields become their own metrics in Insights.</p>
              </div>
              {draft.fields.map((field, index) => (
                <div key={index} className="grid grid-cols-[1fr_124px_1fr_24px] items-center gap-2">
                  <Input aria-label="Field name" value={field.label} maxLength={40} onChange={(event) => setField(index, { label: event.target.value, key: tracker && field.stored ? field.key : event.target.value })} placeholder="Name" />
                  <Select aria-label="Field type" value={field.type} onChange={(event) => setField(index, { type: event.target.value as CustomFieldType })}>
                    <option value="number">Number</option>
                    <option value="text">Text</option>
                    <option value="select">Choice</option>
                    <option value="boolean">Yes or no</option>
                  </Select>
                  {field.type === 'number' ? (
                    <Input aria-label="Field unit" value={field.unit ?? ''} onChange={(event) => setField(index, { unit: event.target.value })} placeholder="Unit (optional)" />
                  ) : field.type === 'select' ? (
                    <Input aria-label="Field choices" value={field.optionsText} onChange={(event) => setField(index, { optionsText: event.target.value })} placeholder="Choices, comma separated" />
                  ) : (
                    <span />
                  )}
                  <IconButton label="Remove field" size="sm" tone="danger" onClick={() => set({ fields: draft.fields.filter((_, i) => i !== index) })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              ))}
              {draft.fields.length < 12 && (
                <Button variant="ghost" size="sm" className="self-start" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => set({ fields: [...draft.fields, { key: '', label: '', type: 'number', optionsText: '' }] })}>
                  Add a field
                </Button>
              )}
            </div>

            <Field label="Description" hint="Optional. A reminder of what and how you record.">
              {(id) => <Input id={id} value={draft.description} maxLength={200} onChange={(event) => set({ description: event.target.value })} />}
            </Field>
          </>
        )}
      </form>
    </Dialog>
  )
}

function IconPicker({ icon, color, onPick }: { icon: string; color: string; onPick: (icon: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className="w-[304px] p-2"
      trigger={
        <button type="button" aria-label="Choose an icon" className="grid h-9 w-9 shrink-0 place-items-center rounded-control border border-line hover:border-faint" style={{ background: `${color}22` }}>
          <TrackerIcon name={icon} color={color} className="h-[18px] w-[18px]" />
        </button>
      }
    >
      <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto">
        {TRACKER_ICON_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            aria-label={name}
            title={name}
            onClick={() => {
              onPick(name)
              setOpen(false)
            }}
            className={cn('grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-line/70 hover:text-text', name === icon && 'bg-accent/20 text-accent')}
          >
            <TrackerIcon name={name} className="h-4 w-4" />
          </button>
        ))}
      </div>
    </Popover>
  )
}
