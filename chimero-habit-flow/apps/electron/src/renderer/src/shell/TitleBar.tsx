import { useEffect, useState } from 'react'
import { ArrowLeft, Copy, Minus, Plus, Search, Square, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useApp } from '@/lib/store'
import { Button, IconButton, Kbd } from '@/ui/primitives'
import { Logo } from './Logo'

const isMac = api.platform === 'darwin'

export function TitleBar() {
  const { openEntry, setPaletteOpen, back, history, route } = useApp()
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    void api.isWindowMaximized().then(setMaximized)
    return api.onWindowState((state) => setMaximized(state.maximized))
  }, [])

  return (
    <header className="drag-region flex h-11 shrink-0 items-center gap-3 border-b border-line/70 bg-bg pl-3" onDoubleClick={() => void api.toggleMaximizeWindow()}>
      <div className={isMac ? 'w-[68px]' : 'flex w-[196px] items-center gap-2'}>
        {!isMac && (
          <>
            <Logo />
            <span className="font-display text-lg font-semibold tracking-tight">Chimero</span>
          </>
        )}
      </div>
      <div className="no-drag">
        <IconButton label="Back" onClick={back} disabled={history.length === 0}>
          <ArrowLeft className="h-4 w-4" />
        </IconButton>
      </div>
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        onDoubleClick={(event) => event.stopPropagation()}
        className="no-drag mx-auto flex h-7 w-[min(420px,40vw)] items-center gap-2 rounded-control border border-line bg-surface/70 px-2.5 text-sm text-faint transition-colors hover:border-faint/60 hover:text-muted"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <Kbd>{isMac ? '⌘K' : 'Ctrl K'}</Kbd>
      </button>
      <div className="no-drag flex items-center gap-2" onDoubleClick={(event) => event.stopPropagation()}>
        <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" strokeWidth={2.5} />} onClick={() => openEntry(route.page === 'tracker' ? { trackerId: route.id } : {})} title="Log something (Alt+Q)">
          Log
        </Button>
        {!isMac && (
          <div className="ml-1 flex h-11 items-stretch">
            <button className="grid w-11 place-items-center text-muted hover:bg-raised hover:text-text" onClick={() => void api.minimizeWindow()} aria-label="Minimize">
              <Minus className="h-4 w-4" />
            </button>
            <button className="grid w-11 place-items-center text-muted hover:bg-raised hover:text-text" onClick={() => void api.toggleMaximizeWindow()} aria-label={maximized ? 'Restore' : 'Maximize'}>
              {maximized ? <Copy className="h-3.5 w-3.5 -scale-x-100" /> : <Square className="h-3.5 w-3.5" />}
            </button>
            <button className="grid w-11 place-items-center text-muted hover:bg-bad hover:text-white" onClick={() => void api.closeWindow()} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {isMac && <div className="w-2" />}
      </div>
    </header>
  )
}
