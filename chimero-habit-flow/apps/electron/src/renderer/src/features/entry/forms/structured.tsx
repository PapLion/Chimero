import { useMemo, useState } from 'react'
import type { BookActivityType, Contact, SocialMethod, SocialMoodImpact } from '@contracts/contracts'
import { Check, Plus } from 'lucide-react'
import { api, must } from '@/lib/api'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'
import { useAction, useContacts, useData } from '@/lib/queries'
import { useApp } from '@/lib/store'
import { Field, Input, Segmented } from '@/ui/primitives'
import { EntryForm, ExtrasFields, NoteField, Suggestions, useExtras, when, type EntryFormProps } from '../shared'

const ACTIVITIES: Array<{ value: BookActivityType; label: string }> = [
  { value: 'read', label: 'Read' },
  { value: 'started', label: 'Started' },
  { value: 'finished', label: 'Finished' },
]

const ACTIVITY_HINT: Record<BookActivityType, string> = {
  read: 'Counts one reading day for this book.',
  started: 'Moves the book to your Reading shelf.',
  finished: 'Moves the book to Finished and records the date.',
}

const RATINGS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

export function BookForm(props: EntryFormProps) {
  const { tracker, entry, onDone } = props
  const extras = useExtras(entry)
  const editing = entry?.book
  const { data: books = [] } = useData(['books'], () => api.getBooks())
  const [title, setTitle] = useState(editing?.title ?? '')
  const [activity, setActivity] = useState<BookActivityType>(editing?.activityType ?? 'read')
  const [rating, setRating] = useState<number | null>(null)

  const key = title.trim().toLowerCase()
  const match = books.find((book) => (editing ? book.id === editing.bookId : book.title.trim().toLowerCase() === key))
  const shown = rating ?? (match?.ratingTenths != null ? match.ratingTenths / 10 : null)
  const suggestions = useMemo(() => {
    const order = { reading: 0, tbr: 1, paused: 2, finished: 3, dropped: 4 } as Record<string, number>
    return [...books]
      .filter((book) => !key || book.title.toLowerCase().includes(key))
      .sort((a, b) => (order[a.shelf] ?? 9) - (order[b.shelf] ?? 9) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, 8)
  }, [books, key])

  const save = async () => {
    const stamp = { timestamp: when(props), tagIds: extras.tagIds, assetId: extras.assetId }
    if (editing) {
      // Only reading days can move in time; started and finished follow the book itself.
      if (editing.activityType === 'read') await must(api.updateBookReadActivity(entry.id, stamp), 'The reading day was not saved')
      if (rating != null) await must(api.updateBook(editing.bookId, { ratingTenths: Math.round(rating * 10) }), 'The rating was not saved')
      return
    }
    const bookId = match?.id ?? (await must(api.createBook({ title: title.trim() }), 'The book was not created')).book.id
    const request = { trackerId: tracker.id, bookId, ...stamp }
    const call = activity === 'started' ? api.startBook : activity === 'finished' ? api.finishBook : api.readBook
    await must(call(request), 'The reading record was not saved')
    if (activity === 'finished' && rating != null) await must(api.updateBook(bookId, { ratingTenths: Math.round(rating * 10) }), 'The rating was not saved')
  }

  return (
    <EntryForm onDone={onDone} valid={!!title.trim()} save={save}>
      {editing ? (
        <div className="rounded-control border border-line p-3">
          <p className="text-base font-medium">{editing.title}</p>
          <p className="mt-0.5 text-sm text-muted">
            {editing.activityType === 'read' ? 'Reading day. Change the date above to move it.' : `${editing.activityType === 'started' ? 'Started' : 'Finished'} on this day. Delete the record to undo it.`}
          </p>
        </div>
      ) : (
        <>
          <Field label="Book" hint={title.trim() && !match ? 'New book. It is added to your library when you save.' : undefined}>
            {(id) => <Input id={id} autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />}
          </Field>
          <Suggestions items={suggestions} label={key ? 'In your library' : 'Your library'} onPick={(book) => setTitle(book.title)} render={(book) => book.title} active={(book) => book.id === match?.id} />
          <div className="flex flex-col gap-1.5">
            <Segmented value={activity} onChange={setActivity} options={ACTIVITIES} label="What happened" className="self-start" />
            <p className="text-xs text-faint">{ACTIVITY_HINT[activity]}</p>
          </div>
        </>
      )}
      {(editing ? editing.activityType === 'finished' : activity === 'finished') && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">Rating</span>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Rating out of 5">
            {RATINGS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={shown === value}
                onClick={() => setRating(value)}
                className={cn('num h-8 min-w-[2.6rem] rounded-control border px-2 text-sm font-semibold transition-colors', shown === value ? 'border-accent bg-accent/15 text-text' : 'border-line text-muted hover:border-faint hover:text-text')}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="text-xs text-faint">Optional, out of 5.</p>
        </div>
      )}
      {(!editing || editing.activityType === 'read') && <ExtrasFields extras={extras} />}
    </EntryForm>
  )
}

const METHODS: Array<{ value: SocialMethod; label: string }> = [
  { value: 'in-person', label: 'In person' },
  { value: 'call', label: 'Call' },
  { value: 'text', label: 'Text' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Other' },
]

const IMPACTS: Array<{ value: SocialMoodImpact; label: string }> = [
  { value: 'positive', label: 'Lifted me' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Drained me' },
]

export function SocialForm(props: EntryFormProps) {
  const { tracker, entry, onDone } = props
  const extras = useExtras(entry)
  const run = useAction()
  const { data: contacts = [] } = useContacts()
  const first = entry?.socialInteractions?.[0]
  const [selected, setSelected] = useState<number[]>(() => entry?.socialInteractions?.map((i) => i.contactId) ?? (useApp.getState().entry?.contactId ? [useApp.getState().entry?.contactId as number] : []))
  const [method, setMethod] = useState<SocialMethod>(first?.method ?? 'in-person')
  const [impact, setImpact] = useState<SocialMoodImpact>(first?.moodImpact ?? 'positive')
  const [note, setNote] = useState(entry?.note ?? '')
  const [query, setQuery] = useState('')

  const needle = query.trim().toLowerCase()
  const visible = useMemo(() => {
    // People you talk to most recently come first; the ones already picked stay visible.
    const sorted = [...contacts].sort((a, b) => (b.lastTalkedAt ?? 0) - (a.lastTalkedAt ?? 0) || a.name.localeCompare(b.name))
    return sorted.filter((contact) => selected.includes(contact.id) || !needle || contact.name.toLowerCase().includes(needle)).slice(0, needle ? 40 : 18)
  }, [contacts, needle, selected])
  const exact = contacts.some((contact) => contact.name.trim().toLowerCase() === needle)

  const toggle = (contact: Contact) => setSelected((ids) => (ids.includes(contact.id) ? ids.filter((id) => id !== contact.id) : [...ids, contact.id]))
  const addPerson = async () => {
    const name = query.trim()
    if (!name) return
    const created = await run(() => must(api.createContact({ name }), 'The person was not added'))
    if (created) {
      setSelected((ids) => [...ids, created.id])
      setQuery('')
    }
  }

  return (
    <EntryForm
      onDone={onDone}
      valid={selected.length > 0}
      save={() => {
        const payload = {
          value: selected.length,
          note: note.trim() || null,
          timestamp: when(props),
          tagIds: extras.tagIds,
          assetId: extras.assetId,
          socialInteractions: selected.map((contactId) => ({ contactId, method, moodImpact: impact, notes: note.trim() || null })),
        }
        return entry ? must(api.updateEntry(entry.id, payload), 'The interaction was not saved') : must(api.addEntry({ trackerId: tracker.id, ...payload }), 'The interaction was not saved')
      }}
    >
      <div className="flex flex-col gap-2">
        <Field label="Who">
          {(id) => (
            <Input
              id={id}
              autoFocus={contacts.length > 8 || contacts.length === 0}
              value={query}
              placeholder={contacts.length === 0 ? 'Type a name and press Enter to add them' : 'Find someone or add a new person'}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || !needle) return
                // Enter here picks or adds a person instead of saving the record.
                event.preventDefault()
                const hit = contacts.find((contact) => contact.name.toLowerCase().includes(needle) && !selected.includes(contact.id))
                if (exact || (hit && visible.filter((c) => !selected.includes(c.id)).length === 1)) {
                  if (hit) toggle(hit)
                  setQuery('')
                } else void addPerson()
              }}
            />
          )}
        </Field>
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {visible.map((contact) => {
            const on = selected.includes(contact.id)
            return (
              <button
                key={contact.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(contact)}
                className={cn('inline-flex h-8 items-center gap-2 rounded-full border pl-1 pr-3 text-sm transition-colors', on ? 'border-accent/70 bg-accent/15 text-text' : 'border-line text-muted hover:border-faint hover:text-text')}
              >
                <span className={cn('grid h-6 w-6 place-items-center rounded-full text-2xs font-semibold', on ? 'bg-accent text-accent-ink' : 'bg-raised text-muted')}>{on ? <Check className="h-3.5 w-3.5" /> : contact.initials || initials(contact.name)}</span>
                {contact.name}
              </button>
            )
          })}
          {needle && !exact && (
            <button type="button" onClick={() => void addPerson()} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-line px-3 text-sm text-accent hover:border-accent/60">
              <Plus className="h-3.5 w-3.5" />
              Add “{query.trim()}”
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">How</span>
          <Segmented value={method} onChange={setMethod} options={METHODS} label="How you talked" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">How it left you</span>
          <Segmented value={impact} onChange={setImpact} options={IMPACTS} label="How it left you" />
        </div>
      </div>
      <NoteField value={note} onChange={setNote} placeholder="What you talked about, what to remember next time" />
      <ExtrasFields extras={extras} />
    </EntryForm>
  )
}
