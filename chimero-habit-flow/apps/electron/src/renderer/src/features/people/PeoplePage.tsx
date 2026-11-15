import { useEffect, useMemo, useState } from 'react'
import type { Contact, ContactProfileBlock, ContactSortBy } from '@contracts/contracts'
import { ArrowDown, ArrowUp, Cake, CalendarClock, MessageCirclePlus, Plus, Search, Trash2, Users } from 'lucide-react'
import { api, must } from '@/lib/api'
import { cn } from '@/lib/cn'
import { fmt, toDateStr, todayStr } from '@/lib/dates'
import { initials, plural } from '@/lib/format'
import { lastTalkedText, nextBirthday, nudgesFor, useContactSettings } from '@/lib/people'
import { useAction, useData, usePreferences, useTrackers } from '@/lib/queries'
import { useApp } from '@/lib/store'
import { identityOf } from '@/lib/trackers'
import { PageShell, Section } from '@/shell/PageHeader'
import { ConfirmDialog } from '@/ui/dialog'
import { Button, Chip, Empty, Field, IconButton, Input, Select, Switch, Textarea } from '@/ui/primitives'

const SORTS: Array<{ value: ContactSortBy; label: string }> = [
  { value: 'name', label: 'Name' },
  { value: 'most-recently-talked-to', label: 'Recently talked' },
  { value: 'most-talked-to', label: 'Most talked to' },
  { value: 'least-talked-to', label: 'Least talked to' },
]

const IMPACT: Record<string, { label: string; className: string }> = {
  positive: { label: 'Lifted me', className: 'text-good' },
  neutral: { label: 'Neutral', className: 'text-muted' },
  negative: { label: 'Drained me', className: 'text-bad' },
}

export function PeoplePage({ initialId }: { initialId?: number }) {
  const run = useAction()
  const [sort, setSort] = useState<ContactSortBy>('name')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number | null>(initialId ?? null)
  const { data: contacts = [], isLoading } = useData(['contacts', sort], () => api.getContacts({ sortBy: sort }))
  const { data: settings } = useContactSettings()

  useEffect(() => {
    if (initialId) setSelected(initialId)
  }, [initialId])

  const needle = query.trim().toLowerCase()
  const shown = contacts.filter((contact) => !needle || contact.name.toLowerCase().includes(needle))
  const current = contacts.find((contact) => contact.id === selected) ?? (selected == null ? shown[0] : undefined)
  const exact = contacts.some((contact) => contact.name.toLowerCase() === needle)

  const add = async () => {
    const name = query.trim()
    if (!name || exact) return
    const created = await run(() => must(api.createContact({ name }), 'The person was not added'))
    if (created) {
      setSelected(created.id)
      setQuery('')
    }
  }

  return (
    <PageShell title="People" subtitle="Who matters to you, what to remember about them, and when you last talked." bodyClassName="flex flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)] gap-4">
        <aside className="card flex min-h-0 flex-col">
          <form
            className="flex flex-col gap-2 p-3"
            onSubmit={(event) => {
              event.preventDefault()
              void add()
            }}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find or add a person" aria-label="Find or add a person" className="pl-8" />
            </div>
            {needle && !exact ? (
              <Button type="submit" size="sm" variant="primary" icon={<Plus className="h-3.5 w-3.5" />}>
                Add “{query.trim()}”
              </Button>
            ) : (
              <Select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value as ContactSortBy)} className="h-7 text-sm">
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </Select>
            )}
          </form>
          <ul className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
            {shown.map((contact) => {
              const nudge = nudgesFor(contact, settings?.get(contact.id))[0]
              return (
                <li key={contact.id}>
                  <button type="button" onClick={() => setSelected(contact.id)} aria-current={current?.id === contact.id} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left', current?.id === contact.id ? 'bg-accent/15' : 'hover:bg-raised')}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-raised text-xs font-semibold text-muted">{initials(contact.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-medium">{contact.name}</span>
                      <span className={cn('flex items-center gap-1 truncate text-xs', nudge ? 'text-warn' : 'text-faint')}>
                        {nudge && (nudge.kind === 'birthday' ? <Cake className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />)}
                        {nudge ? nudge.text : lastTalkedText(contact)}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
            {shown.length === 0 && !isLoading && <li className="px-3 py-6 text-center text-sm text-muted">{contacts.length === 0 ? 'Type a name above to add your first person.' : 'Nobody matches. Press Enter to add them.'}</li>}
          </ul>
        </aside>

        <div className="min-h-0 overflow-y-auto">
          {current ? (
            <PersonDetail key={current.id} contact={current} onDeleted={() => setSelected(null)} />
          ) : (
            <div className="card h-full">
              <Empty icon={<Users />} title="Nobody here yet">
                Add the people you want to stay close to. Log time together from the Social tracker and it shows up here.
              </Empty>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}

function PersonDetail({ contact, onDeleted }: { contact: Contact; onDeleted: () => void }) {
  const run = useAction()
  const prefs = usePreferences()
  const { openEntry } = useApp()
  const { data: trackers = [] } = useTrackers()
  const social = trackers.find((tracker) => identityOf(tracker) === 'social')
  const { data: interactions = [] } = useData(['contact-interactions', contact.id], () => api.getContactInteractions(contact.id))
  const [removing, setRemoving] = useState(false)
  const [name, setName] = useState(contact.name)
  const [notes, setNotes] = useState(contact.notes ?? '')
  const [kidsNotes, setKidsNotes] = useState(contact.kidsNotes ?? '')
  const update = (patch: Parameters<typeof api.updateContact>[1]) => run(() => must(api.updateContact(contact.id, patch), 'The change was not saved'))
  const birthday = nextBirthday(contact.birthday)
  const history = useMemo(() => [...interactions].sort((a, b) => b.timestamp - a.timestamp), [interactions])

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex items-center gap-4 p-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-raised font-display text-xl font-semibold text-muted">{initials(contact.name)}</span>
        <div className="min-w-0 flex-1">
          <input
            aria-label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => {
              if (name.trim() && name.trim() !== contact.name) void update({ name: name.trim() })
              else setName(contact.name)
            }}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            className="-ml-1.5 w-full rounded-md border border-transparent bg-transparent px-1.5 font-display text-2xl font-semibold hover:border-line focus:border-accent focus:outline-none"
          />
          <p className="text-sm text-muted">
            {[lastTalkedText(contact), birthday && `birthday ${birthday.inDays === 0 ? 'today' : fmt.dayMonth(birthday.date)}`, contact.age != null && `${contact.age} years old`].filter(Boolean).join(' · ')}
          </p>
        </div>
        {social && (
          <Button variant="primary" icon={<MessageCirclePlus className="h-4 w-4" />} onClick={() => openEntry({ trackerId: social.id, contactId: contact.id })}>
            Log time together
          </Button>
        )}
        <IconButton label="Delete person" tone="danger" onClick={() => setRemoving(true)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title="About">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Birthday">{(id) => <Input id={id} type="date" max={todayStr()} value={contact.birthday ?? ''} onChange={(event) => void update({ birthday: event.target.value || null })} />}</Field>
            <Field label="Met on">{(id) => <Input id={id} type="date" max={todayStr()} value={contact.dateMet ?? ''} onChange={(event) => void update({ dateMet: event.target.value || null })} />}</Field>
            <label className="col-span-2 flex items-center justify-between rounded-control border border-line px-3 py-2 text-sm">
              Has kids
              <Switch checked={!!contact.hasKids} onChange={(hasKids) => void update({ hasKids })} label="Has kids" />
            </label>
            {contact.hasKids && (
              <Field label="About the kids" className="col-span-2">
                {(id) => <Input id={id} value={kidsNotes} onChange={(event) => setKidsNotes(event.target.value)} onBlur={() => kidsNotes !== (contact.kidsNotes ?? '') && void update({ kidsNotes: kidsNotes.trim() || null })} placeholder="Names, ages, what they are into" />}
              </Field>
            )}
            <Field label="Notes" className="col-span-2">
              {(id) => <Textarea id={id} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} onBlur={() => notes !== (contact.notes ?? '') && void update({ notes: notes.trim() || null })} placeholder="Anything worth remembering" />}
            </Field>
          </div>
        </Section>

        <Section title="What they are like">
          <div className="flex flex-col gap-4">
            <ChipList label="Traits" items={contact.traits ?? []} placeholder="Funny, direct, night owl…" onChange={(traits) => void update({ traits })} />
            <ChipList label="Likes" items={contact.likes ?? []} placeholder="Climbing, ramen, sci-fi…" onChange={(likes) => void update({ likes })} />
            <ChipList label="Dislikes" items={contact.dislikes ?? []} placeholder="Crowds, coriander…" onChange={(dislikes) => void update({ dislikes })} />
          </div>
        </Section>

        <Reminders contact={contact} />
        <Blocks contactId={contact.id} />
      </div>

      <Section title="Time together" hint={history.length > 0 ? plural(history.length, 'interaction') : undefined}>
        {history.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet. Use “Log time together”, or pick {contact.name.split(' ')[0]} when logging in the Social tracker.</p>
        ) : (
          <ul className="-mx-2">
            {history.slice(0, 60).map((interaction) => {
              const impact = IMPACT[interaction.moodImpact] ?? IMPACT.neutral
              const date = toDateStr(new Date(interaction.timestamp))
              const row = (
                <>
                  <span className="w-24 shrink-0 text-sm text-muted">{fmt.relativeDay(date)}</span>
                  <span className="w-20 shrink-0 text-sm capitalize">{interaction.method ? interaction.method.replace('-', ' ') : '—'}</span>
                  <span className={cn('w-24 shrink-0 text-sm', impact.className)}>{impact.label}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted">{interaction.notes}</span>
                  <span className="shrink-0 text-xs text-faint">{fmt.time(interaction.timestamp, prefs.timeFormat)}</span>
                </>
              )
              return (
                <li key={interaction.id}>
                  {interaction.entryId && social ? (
                    <button type="button" onClick={() => openEntry({ edit: { entryId: interaction.entryId as number, trackerId: social.id } })} className="flex w-full items-baseline gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-raised">
                      {row}
                    </button>
                  ) : (
                    <div className="flex items-baseline gap-3 px-2 py-1.5">{row}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <ConfirmDialog
        open={removing}
        onClose={() => setRemoving(false)}
        title={`Delete ${contact.name}?`}
        onConfirm={() => {
          setRemoving(false)
          void run(() => must(api.deleteContact(contact.id).then((result) => result.success), 'The person was not deleted')).then((done) => done && onDeleted())
        }}
      >
        Their profile and reminders are deleted. Social records that mention them stay in your history without their name.
      </ConfirmDialog>
    </div>
  )
}

function ChipList({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const [value, setValue] = useState('')
  const add = () => {
    const next = value.trim()
    setValue('')
    if (next && !items.some((item) => item.toLowerCase() === next.toLowerCase())) onChange([...items, next])
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((item) => (
          <Chip key={item} onRemove={() => onChange(items.filter((other) => other !== item))}>
            {item}
          </Chip>
        ))}
        <input
          aria-label={`Add to ${label.toLowerCase()}`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={add}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              add()
            }
          }}
          placeholder={items.length === 0 ? placeholder : 'Add…'}
          className="h-6 min-w-[90px] flex-1 bg-transparent text-sm placeholder:text-faint focus:outline-none"
        />
      </div>
    </div>
  )
}

function Reminders({ contact }: { contact: Contact }) {
  const run = useAction()
  const { data: settings } = useData(['contact-reminder', contact.id], () => api.getContactReminderSettings(contact.id))
  const save = (patch: Omit<Parameters<typeof api.upsertContactReminderSettings>[0], 'contactId'>) => void run(() => must(api.upsertContactReminderSettings({ contactId: contact.id, ...patch }), 'The reminder was not saved'))
  const days = (value: string, max: number) => Math.max(1, Math.min(max, Math.round(Number(value) || 1)))
  return (
    <Section title="Nudges" hint="Shown on Today and at the top of this list. No notifications are sent.">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Switch checked={!!settings?.checkInReminderEnabled} label="Catch-up nudge" onChange={(on) => save({ checkInReminderEnabled: on, checkInAfterDays: settings?.checkInAfterDays ?? 30 })} />
          <span className="flex-1 text-sm">Nudge me to catch up after</span>
          <Input type="number" min={1} max={365} aria-label="Days without talking" disabled={!settings?.checkInReminderEnabled} value={settings?.checkInAfterDays ?? 30} onChange={(event) => save({ checkInReminderEnabled: true, checkInAfterDays: days(event.target.value, 365) })} className="h-8 w-16 text-center" />
          <span className="text-sm text-muted">days</span>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={!!settings?.birthdayReminderEnabled} disabled={!contact.birthday} label="Birthday heads-up" onChange={(on) => save({ birthdayReminderEnabled: on, birthdayReminderDaysBefore: settings?.birthdayReminderDaysBefore ?? 14 })} />
          <span className="flex-1 text-sm">{contact.birthday ? 'Show their birthday this early' : 'Add a birthday to get a heads-up'}</span>
          <Input type="number" min={1} max={60} aria-label="Days before the birthday" disabled={!settings?.birthdayReminderEnabled} value={settings?.birthdayReminderDaysBefore ?? 14} onChange={(event) => save({ birthdayReminderEnabled: true, birthdayReminderDaysBefore: days(event.target.value, 60) })} className="h-8 w-16 text-center" />
          <span className="text-sm text-muted">days</span>
        </div>
        {!settings?.birthdayReminderEnabled && contact.birthday && <p className="text-xs text-faint">Without this, birthdays appear a week ahead.</p>}
      </div>
    </Section>
  )
}

function Blocks({ contactId }: { contactId: number }) {
  const run = useAction()
  const { data: blocks = [] } = useData(['contact-blocks', contactId], () => api.getContactProfileBlocks(contactId))
  const sorted = [...blocks].sort((a, b) => a.orderIndex - b.orderIndex)
  const move = (index: number, delta: number) => {
    const ids = sorted.map((block) => block.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    void run(() => api.reorderContactProfileBlocks(contactId, ids), { failure: 'The order was not saved' })
  }
  return (
    <Section
      title="Your own sections"
      hint="Gift ideas, how you met, things to ask about next time."
      actions={
        <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => void run(() => must(api.createContactProfileBlock({ contactId, title: 'New section', body: '', blockType: 'note' }), 'The section was not added'))}>
          Add
        </Button>
      }
    >
      {sorted.length === 0 ? (
        <p className="text-sm text-muted">No sections yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((block, index) => (
            <Block key={block.id} block={block} first={index === 0} last={index === sorted.length - 1} onMove={(delta) => move(index, delta)} />
          ))}
        </div>
      )}
    </Section>
  )
}

function Block({ block, first, last, onMove }: { block: ContactProfileBlock; first: boolean; last: boolean; onMove: (delta: number) => void }) {
  const run = useAction()
  const [title, setTitle] = useState(block.title)
  const [body, setBody] = useState(block.body)
  const save = () => {
    if (title.trim() === block.title && body === block.body) return
    void run(() => must(api.updateContactProfileBlock(block.id, { contactId: block.contactId, title: title.trim() || 'Untitled', body }), 'The section was not saved'))
  }
  return (
    <div className="group rounded-control border border-line p-2.5">
      <div className="flex items-center gap-1">
        <input aria-label="Section title" value={title} onChange={(event) => setTitle(event.target.value)} onBlur={save} className="min-w-0 flex-1 bg-transparent text-sm font-semibold focus:outline-none" />
        <IconButton label="Move up" size="sm" disabled={first} onClick={() => onMove(-1)}>
          <ArrowUp className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="Move down" size="sm" disabled={last} onClick={() => onMove(1)}>
          <ArrowDown className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="Delete section" size="sm" tone="danger" onClick={() => void run(() => must(api.deleteContactProfileBlock(block.id, block.contactId), 'The section was not deleted'))}>
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </div>
      <textarea aria-label={`${block.title} text`} value={body} onChange={(event) => setBody(event.target.value)} onBlur={save} rows={Math.min(8, Math.max(2, body.split('\n').length))} placeholder="Write anything" className="mt-1 w-full resize-none bg-transparent text-sm leading-relaxed text-muted placeholder:text-faint focus:outline-none" />
    </div>
  )
}
