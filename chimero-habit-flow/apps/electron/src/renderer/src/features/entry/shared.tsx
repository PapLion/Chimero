import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import type { Entry, Tag, Tracker } from '@contracts/contracts'
import { ImagePlus, Plus, X } from 'lucide-react'
import { api, assetUrl, must } from '@/lib/api'
import { cn } from '@/lib/cn'
import { timestampFor } from '@/lib/dates'
import { useAction, useData, useTags } from '@/lib/queries'
import { Popover } from '@/ui/menu'
import { Button, Chip, Field, Input, Textarea } from '@/ui/primitives'

export const ENTRY_FORM_ID = 'entry-form'

export interface EntryFormProps {
  tracker: Tracker
  date: string
  time: string
  /** Present when editing an existing record. */
  entry?: Entry
  onDone: () => void
}

/** Tags and attachment travel with every kind of entry. */
export function useExtras(entry?: Entry) {
  const [tagIds, setTagIds] = useState<number[]>(entry?.tagIds ?? [])
  const [assetId, setAssetId] = useState<number | null>(entry?.assetId ?? null)
  return { tagIds, setTagIds, assetId, setAssetId }
}

export type Extras = ReturnType<typeof useExtras>

/**
 * Wraps a tracker form: submits on Enter, saves through `save`, and closes when
 * the write succeeded. A thrown error becomes a toast and the dialog stays open.
 */
export function EntryForm({ onDone, save, children, valid = true }: { onDone: () => void; save: () => Promise<unknown>; children: ReactNode; valid?: boolean }) {
  const run = useAction()
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    const result = await run(async () => {
      await save()
      return true
    })
    setBusy(false)
    if (result) onDone()
  }
  return (
    <form id={ENTRY_FORM_ID} onSubmit={submit} className="flex flex-col gap-4" data-valid={valid} data-busy={busy}>
      {children}
    </form>
  )
}

export function when(props: Pick<EntryFormProps, 'date' | 'time' | 'entry'>): number {
  return timestampFor(props.date, props.time)
}

export function NoteField({ value, onChange, placeholder = 'Anything worth remembering', label = 'Note' }: { value: string; onChange: (value: string) => void; placeholder?: string; label?: string }) {
  return (
    <Field label={label}>
      {(id) => (
        <Textarea
          id={id}
          rows={2}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            // Enter saves; Shift+Enter adds a line.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
        />
      )}
    </Field>
  )
}

export function TagPicker({ value, onChange, label = 'Tags', hint }: { value: number[]; onChange: (ids: number[]) => void; label?: string; hint?: string }) {
  const { data: tags = [] } = useTags()
  const run = useAction()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const byId = new Map(tags.map((tag) => [tag.id, tag]))
  const selected = value.map((id) => byId.get(id)).filter((tag): tag is Tag => !!tag)
  const matches = tags.filter((tag) => !value.includes(tag.id) && tag.name.toLowerCase().includes(query.trim().toLowerCase()))
  const exact = tags.some((tag) => tag.name.toLowerCase() === query.trim().toLowerCase())

  const create = async () => {
    const name = query.trim()
    if (!name) return
    const tag = await run(() => must(api.createTag({ name }), 'The tag was not created'))
    if (tag) {
      onChange([...value, tag.id])
      setQuery('')
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((tag) => (
          <Chip key={tag.id} color={tag.color ?? '#a080ff'} onRemove={() => onChange(value.filter((id) => id !== tag.id))}>
            {tag.name}
          </Chip>
        ))}
        <Popover
          open={open}
          onOpenChange={setOpen}
          className="w-64 p-2"
          trigger={
            <button type="button" className="inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-line px-2 text-xs text-muted hover:border-faint hover:text-text">
              <Plus className="h-3 w-3" />
              Add tag
            </button>
          }
        >
          <Input
            autoFocus
            value={query}
            placeholder="Find or create a tag"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              event.stopPropagation()
              if (matches.length > 0 && (exact || !query.trim())) onChange([...value, matches[0].id])
              else if (matches.length === 1) onChange([...value, matches[0].id])
              else if (!exact) void create()
              setQuery('')
            }}
          />
          <div className="mt-2 flex max-h-44 flex-col overflow-y-auto">
            {matches.slice(0, 30).map((tag) => (
              <button key={tag.id} type="button" onClick={() => onChange([...value, tag.id])} className="flex h-7 items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-line/60">
                <span className="h-2 w-2 rounded-full" style={{ background: tag.color ?? '#a080ff' }} />
                <span className="truncate">{tag.name}</span>
              </button>
            ))}
            {query.trim() && !exact && (
              <button type="button" onClick={() => void create()} className="flex h-7 items-center gap-2 rounded-md px-2 text-left text-sm text-accent hover:bg-line/60">
                <Plus className="h-3.5 w-3.5" />
                Create “{query.trim()}”
              </button>
            )}
            {matches.length === 0 && !query.trim() && <p className="px-2 py-2 text-xs text-faint">{tags.length === 0 ? 'No tags yet. Type a name to create one.' : 'Every tag is already added.'}</p>}
          </div>
        </Popover>
      </div>
      {hint && <p className="text-xs text-faint">{hint}</p>}
    </div>
  )
}

export function AttachmentField({ value, onChange }: { value: number | null; onChange: (assetId: number | null) => void }) {
  const run = useAction()
  const { data: assets = [] } = useData(['assets'], () => api.getAssets({ limit: 500 }))
  const asset = assets.find((a) => a.id === value)
  const pick = async () => {
    const { path } = await api.openFileDialog()
    if (!path) return
    const uploaded = await run(() => must(api.uploadAsset(path), 'The file could not be attached'))
    if (uploaded) onChange(uploaded.id)
  }
  if (value && asset) {
    return (
      <div className="flex items-center gap-2.5 rounded-control border border-line p-1.5">
        {asset.type === 'image' ? <img src={assetUrl(asset.thumbnailPath ?? asset.path) ?? ''} alt="" className="h-9 w-9 rounded-md object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-md bg-raised text-2xs text-muted">file</span>}
        <span className="min-w-0 flex-1 truncate text-sm text-muted">{asset.originalName ?? asset.filename}</span>
        <button type="button" aria-label="Remove attachment" onClick={() => onChange(null)} className="grid h-6 w-6 place-items-center rounded-md text-faint hover:bg-raised hover:text-text">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }
  return (
    <Button variant="ghost" size="sm" className="self-start" icon={<ImagePlus className="h-4 w-4" />} onClick={() => void pick()}>
      Attach a photo or video
    </Button>
  )
}

/** Tags + attachment block used at the bottom of most forms. */
export function ExtrasFields({ extras, tagLabel, tagHint }: { extras: Extras; tagLabel?: string; tagHint?: string }) {
  return (
    <>
      <TagPicker value={extras.tagIds} onChange={extras.setTagIds} label={tagLabel} hint={tagHint} />
      <AttachmentField value={extras.assetId} onChange={extras.setAssetId} />
    </>
  )
}

/** One-tap suggestions built from what was logged before. */
export function Suggestions<T>({ items, label, onPick, render, active }: { items: T[]; label: string; onPick: (item: T) => void; render: (item: T) => string; active?: (item: T) => boolean }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-faint">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <Chip key={i} onClick={() => onPick(item)} active={active?.(item)}>
            {render(item)}
          </Chip>
        ))}
      </div>
    </div>
  )
}

export function NumberInput({ value, onChange, className, ...rest }: { value: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return <Input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value.replace(',', '.').replace(/[^0-9.-]/g, ''))} className={cn('num text-lg', className)} {...rest} />
}

export function parseNumber(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * A row of scores that works fully from the keyboard: it takes focus when it
 * opens, digits pick a score (0 is 10), arrows move, and Enter saves the form.
 */
export function ScalePicker({ value, onChange, min, max, color, label, autoFocus = true }: { value: number | null; onChange: (value: number) => void; min: number; max: number; color: (score: number) => string; label: (score: number) => string; autoFocus?: boolean }) {
  const scores = Array.from({ length: max - min + 1 }, (_, i) => i + min)
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const resting = value ?? Math.round((min + max) / 2)
  const pick = (score: number) => {
    const next = Math.max(min, Math.min(max, score))
    onChange(next)
    buttons.current[next - min]?.focus()
  }
  useEffect(() => {
    if (autoFocus) buttons.current[resting - min]?.focus()
    // Only when the picker first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, score: number) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key]
    if (step) {
      event.preventDefault()
      pick(score + step)
    } else if (/^[0-9]$/.test(event.key)) {
      const typed = event.key === '0' ? 10 : Number(event.key)
      if (typed >= min && typed <= max) {
        event.preventDefault()
        pick(typed)
      }
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const form = event.currentTarget.closest('form')
      if (value !== score) onChange(score)
      // Let the new score render before the form reads it.
      setTimeout(() => form?.requestSubmit(), 0)
    }
  }
  return (
    <div>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Score">
        {scores.map((score) => (
          <button
            key={score}
            ref={(element) => {
              buttons.current[score - min] = element
            }}
            type="button"
            role="radio"
            aria-checked={value === score}
            aria-label={`${score}, ${label(score)}`}
            tabIndex={score === resting ? 0 : -1}
            onClick={() => onChange(score)}
            onKeyDown={(event) => onKeyDown(event, score)}
            className={cn('num h-11 min-w-0 flex-1 rounded-control text-lg font-semibold transition-[transform,opacity]', value === score ? 'scale-105 text-black/85 shadow-pop' : 'text-black/70 opacity-40 hover:opacity-80')}
            style={{ background: color(score) }}
          >
            {score}
          </button>
        ))}
      </div>
      <p className="mt-2 h-5 text-sm text-muted">{value != null ? label(value) : 'Pick a score'}</p>
    </div>
  )
}
