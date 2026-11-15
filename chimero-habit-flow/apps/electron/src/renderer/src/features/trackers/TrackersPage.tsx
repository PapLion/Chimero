import { useState } from 'react'
import type { Tracker } from '@contracts/contracts'
import { ArchiveRestore, ArrowDown, ArrowUp, EyeOff, GripVertical, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { api, must } from '@/lib/api'
import { cn } from '@/lib/cn'
import { TrackerIcon } from '@/lib/icons'
import { useAction, useData, useTrackers } from '@/lib/queries'
import { useApp } from '@/lib/store'
import { IDENTITY_BLURB, colorOf, identityOf, kindOf } from '@/lib/trackers'
import { PageShell } from '@/shell/PageHeader'
import { ConfirmDialog } from '@/ui/dialog'
import { Button, IconButton } from '@/ui/primitives'
import { TrackerDialog } from './TrackerDialog'
import { KIND_LABEL } from './templates'

function blurb(tracker: Tracker): string {
  const identity = identityOf(tracker)
  if (identity !== 'generic') return IDENTITY_BLURB[identity]
  const kind = kindOf(tracker)
  const parts = [tracker.config.description || KIND_LABEL[kind]]
  if (kind === 'numeric' && tracker.config.unit) parts.push(tracker.config.unit)
  if (kind === 'range') parts.push(`${tracker.config.min ?? 1} to ${tracker.config.max ?? 10}`)
  if ((tracker.config.fields?.length ?? 0) > 0) parts.push(`${tracker.config.fields?.length} extra ${tracker.config.fields?.length === 1 ? 'field' : 'fields'}`)
  return parts.join(' · ')
}

export function TrackersPage() {
  const run = useAction()
  const navigate = useApp((state) => state.navigate)
  const { data: trackers = [] } = useTrackers()
  const { data: hidden = [] } = useData(['trackers', 'archived'], () => api.getArchivedTrackers())
  const [editing, setEditing] = useState<Tracker | 'new' | null>(null)
  const [removing, setRemoving] = useState<Tracker | null>(null)
  const [dragId, setDragId] = useState<number | null>(null)
  const [overId, setOverId] = useState<number | null>(null)

  const reorder = (ids: number[]) => void run(() => must(api.reorderTrackers(ids), 'The order was not saved'))
  const shift = (index: number, delta: number) => {
    const ids = trackers.map((tracker) => tracker.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder(ids)
  }
  const drop = (targetId: number) => {
    if (dragId == null || dragId === targetId) return
    const ids = trackers.map((tracker) => tracker.id).filter((id) => id !== dragId)
    ids.splice(ids.indexOf(targetId) + (trackers.findIndex((t) => t.id === dragId) < trackers.findIndex((t) => t.id === targetId) ? 1 : 0), 0, dragId)
    reorder(ids)
  }

  return (
    <PageShell
      title="Trackers"
      subtitle="What you record. The order here is the order in the sidebar and when logging."
      actions={
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')} data-testid="new-tracker">
          New tracker
        </Button>
      }
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <ul className="card overflow-hidden" data-testid="tracker-list">
          {trackers.map((tracker, index) => (
            <li
              key={tracker.id}
              draggable
              onDragStart={(event) => {
                setDragId(tracker.id)
                event.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(event) => {
                event.preventDefault()
                setOverId(tracker.id)
              }}
              onDragEnd={() => {
                setDragId(null)
                setOverId(null)
              }}
              onDrop={(event) => {
                event.preventDefault()
                drop(tracker.id)
                setDragId(null)
                setOverId(null)
              }}
              className={cn('group flex items-center gap-3 border-t border-line/60 py-2.5 pl-2 pr-3 first:border-t-0', dragId === tracker.id && 'opacity-40', overId === tracker.id && dragId !== tracker.id && 'bg-accent/10')}
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-faint" aria-hidden />
              <button type="button" onClick={() => navigate({ page: 'tracker', id: tracker.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${colorOf(tracker)}22` }}>
                  <TrackerIcon name={tracker.icon} color={colorOf(tracker)} className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-medium">{tracker.name}</span>
                  <span className="block truncate text-sm text-muted">{blurb(tracker)}</span>
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-0.5">
                <IconButton label={tracker.isFavorite ? 'Remove from favourites' : 'Favourite: shown first when logging'} size="sm" active={!!tracker.isFavorite} onClick={() => void run(() => must(api.toggleTrackerFavorite(tracker.id), 'The tracker was not updated'))}>
                  <Star className="h-3.5 w-3.5" fill={tracker.isFavorite ? 'currentColor' : 'none'} />
                </IconButton>
                <IconButton label="Move up" size="sm" disabled={index === 0} onClick={() => shift(index, -1)}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label="Move down" size="sm" disabled={index === trackers.length - 1} onClick={() => shift(index, 1)}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label="Edit" size="sm" onClick={() => setEditing(tracker)}>
                  <Pencil className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label="Hide: keeps its records" size="sm" onClick={() => void run(() => must(api.updateTracker(tracker.id, { archived: true }), 'The tracker was not hidden'), { success: `${tracker.name} hidden` })}>
                  <EyeOff className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </li>
          ))}
          {trackers.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Every tracker is hidden. Restore one below or create a new one.</li>}
        </ul>

        {hidden.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 text-sm font-medium text-muted">Hidden</h2>
            <ul className="card overflow-hidden">
              {hidden.map((tracker) => (
                <li key={tracker.id} className="flex items-center gap-3 border-t border-line/60 px-3 py-2.5 first:border-t-0">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-raised">
                    <TrackerIcon name={tracker.icon} className="h-4 w-4 text-faint" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-base text-muted">{tracker.name}</span>
                  <Button size="sm" icon={<ArchiveRestore className="h-3.5 w-3.5" />} onClick={() => void run(() => must(api.updateTracker(tracker.id, { archived: false }), 'The tracker was not restored'))}>
                    Restore
                  </Button>
                  {identityOf(tracker) === 'generic' && (
                    <IconButton label="Delete with all its records" size="sm" tone="danger" onClick={() => setRemoving(tracker)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 px-1 text-xs text-faint">Hidden trackers keep their records and stay out of the sidebar, the dashboard and Insights. Trackers you created can be deleted from here.</p>
          </section>
        )}
      </div>

      {editing && <TrackerDialog tracker={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={(saved) => editing === 'new' && navigate({ page: 'tracker', id: saved.id })} />}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Delete ${removing?.name ?? ''}?`}
        confirmLabel="Delete tracker and records"
        onConfirm={() => {
          const id = removing?.id
          setRemoving(null)
          if (id) void run(() => must(api.deleteTracker(id), 'The tracker was not deleted'))
        }}
      >
        The tracker and every record in it are deleted for good. Export a backup first if you might want them back.
      </ConfirmDialog>
    </PageShell>
  )
}
