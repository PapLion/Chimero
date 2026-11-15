import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Bell, CalendarDays, FlaskConical, Image, LayoutGrid, Moon, Plus, Search, Settings, SlidersHorizontal, Sun, Tags, User, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { todayStr } from '@/lib/dates'
import { TrackerIcon } from '@/lib/icons'
import { useAction, useContacts, usePreferences, useTrackers } from '@/lib/queries'
import { useApp } from '@/lib/store'
import { colorOf } from '@/lib/trackers'

interface Command {
  id: string
  label: string
  group: string
  icon: ReactNode
  keywords?: string
  run: () => void
}

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, navigate, openEntry, setSelectedDate } = useApp()
  const { data: trackers = [] } = useTrackers()
  const { data: contacts = [] } = useContacts()
  const prefs = usePreferences()
  const run = useAction()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (paletteOpen) {
      setQuery('')
      setIndex(0)
    }
  }, [paletteOpen])

  const commands = useMemo<Command[]>(() => {
    const go = (label: string, icon: ReactNode, page: Parameters<typeof navigate>[0]): Command => ({ id: `go-${label}`, label, group: 'Go to', icon, run: () => navigate(page) })
    return [
      ...trackers.map<Command>((t) => ({ id: `log-${t.id}`, label: `Log ${t.name}`, group: 'Log', icon: <Plus />, keywords: 'add new entry record', run: () => openEntry({ trackerId: t.id }) })),
      go('Today', <LayoutGrid />, { page: 'today' }),
      go('Journal', <CalendarDays />, { page: 'journal' }),
      go('Insights', <FlaskConical />, { page: 'insights' }),
      go('People', <Users />, { page: 'people' }),
      go('Tags', <Tags />, { page: 'tags' }),
      go('Reminders', <Bell />, { page: 'reminders' }),
      go('Files', <Image />, { page: 'files' }),
      go('Manage trackers', <SlidersHorizontal />, { page: 'trackers' }),
      go('Settings', <Settings />, { page: 'settings' }),
      ...trackers.map<Command>((t) => ({ id: `open-${t.id}`, label: t.name, group: 'Trackers', icon: <TrackerIcon name={t.icon} color={colorOf(t)} />, run: () => navigate({ page: 'tracker', id: t.id }) })),
      ...contacts.map<Command>((c) => ({ id: `contact-${c.id}`, label: c.name, group: 'People', icon: <User />, run: () => navigate({ page: 'people', id: c.id }) })),
      {
        id: 'jump-today',
        label: 'Jump to today',
        group: 'Actions',
        icon: <CalendarDays />,
        run: () => {
          setSelectedDate(todayStr())
          navigate({ page: 'today' })
        },
      },
      {
        id: 'theme',
        label: prefs.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme',
        group: 'Actions',
        icon: prefs.theme === 'light' ? <Moon /> : <Sun />,
        keywords: 'appearance mode',
        run: () => {
          setPaletteOpen(false)
          void run(() => api.updatePreferences({ theme: prefs.theme === 'light' ? 'dark' : 'light' }))
        },
      },
    ]
  }, [trackers, contacts, prefs.theme, navigate, openEntry, setSelectedDate, setPaletteOpen, run])

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return commands.filter((c) => c.group !== 'People').slice(0, 40)
    return commands.filter((c) => words.every((w) => `${c.label} ${c.group} ${c.keywords ?? ''}`.toLowerCase().includes(w))).slice(0, 40)
  }, [commands, query])

  useEffect(() => setIndex(0), [query])
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [index])

  let lastGroup = ''
  return (
    <DialogPrimitive.Root open={paletteOpen} onOpenChange={setPaletteOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] animate-fade bg-black/50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[14vh] z-[80] w-[min(560px,calc(100vw-48px))] -translate-x-1/2 animate-pop overflow-hidden rounded-2xl border border-line bg-surface shadow-lift"
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setIndex((i) => Math.min(results.length - 1, i + 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setIndex((i) => Math.max(0, i - 1))
            } else if (event.key === 'Enter' && results[index]) {
              event.preventDefault()
              setPaletteOpen(false)
              results[index].run()
            }
          }}
        >
          <DialogPrimitive.Title className="sr-only">Search and commands</DialogPrimitive.Title>
          <div className="flex items-center gap-2.5 border-b border-line/70 px-4">
            <Search className="h-4 w-4 text-faint" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search trackers, people and actions" className="h-12 flex-1 bg-transparent text-lg outline-none placeholder:text-faint" />
          </div>
          <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
            {results.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">Nothing matches “{query}”.</p>}
            {results.map((command, i) => {
              const header = command.group !== lastGroup
              lastGroup = command.group
              return (
                <div key={command.id}>
                  {header && <p className="px-2.5 pb-1 pt-2 text-xs font-medium text-faint">{command.group}</p>}
                  <button
                    type="button"
                    data-index={i}
                    onMouseMove={() => setIndex(i)}
                    onClick={() => {
                      setPaletteOpen(false)
                      command.run()
                    }}
                    className={cn('flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-base [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted', i === index ? 'bg-raised text-text' : 'text-muted')}
                  >
                    {command.icon}
                    <span className="truncate">{command.label}</span>
                  </button>
                </div>
              )
            })}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
