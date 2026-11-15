import { useMemo, useState } from 'react'
import type { Tag, TagRelationship, TagTree } from '@contracts/contracts'
import { CornerDownRight, FlaskConical, Plus, Tags as TagsIcon, Trash2 } from 'lucide-react'
import { api, must } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useAction, useData, useMetrics } from '@/lib/queries'
import { useApp } from '@/lib/store'
import { FALLBACK_COLOR, PALETTE } from '@/lib/trackers'
import { PageShell } from '@/shell/PageHeader'
import { ConfirmDialog } from '@/ui/dialog'
import { Popover } from '@/ui/menu'
import { Button, Empty, IconButton, Input, Select } from '@/ui/primitives'

function descendants(id: number, relationships: TagRelationship[]): Set<number> {
  const found = new Set<number>()
  const queue = [id]
  while (queue.length > 0) {
    const current = queue.pop() as number
    for (const relation of relationships) {
      if (relation.parentTagId === current && !found.has(relation.childTagId)) {
        found.add(relation.childTagId)
        queue.push(relation.childTagId)
      }
    }
  }
  return found
}

export function TagsPage() {
  const run = useAction()
  const navigate = useApp((state) => state.navigate)
  const { data, isLoading } = useData(['tag-tree'], () => api.getTagTree())
  const { data: metrics = [] } = useMetrics()
  const [name, setName] = useState('')
  const [removing, setRemoving] = useState<Tag | null>(null)
  const tags = data?.tags ?? []
  const relationships = data?.relationships ?? []
  const measured = useMemo(() => new Set(metrics.map((metric) => metric.id)), [metrics])

  const rows = useMemo(() => {
    const out: Array<{ tag: TagTree; depth: number; key: string }> = []
    const walk = (nodes: TagTree[], depth: number, path: string) => {
      for (const node of [...nodes].sort((a, b) => a.name.localeCompare(b.name))) {
        // A tag under two groups appears under each; a path keeps the rows distinct.
        if (path.split('/').includes(String(node.id))) continue
        out.push({ tag: node, depth, key: `${path}/${node.id}` })
        walk(node.children, depth + 1, `${path}/${node.id}`)
      }
    }
    walk(data?.tree ?? [], 0, '')
    return out
  }, [data])

  const create = async () => {
    const value = name.trim()
    if (!value) return
    if (tags.some((tag) => tag.name.toLowerCase() === value.toLowerCase())) return
    const created = await run(() => must(api.createTag({ name: value, color: PALETTE[tags.length % PALETTE.length] }), 'The tag was not created'))
    if (created) setName('')
  }

  const setParent = (tag: Tag, parentId: number | null) => {
    const rest = relationships.filter((relation) => relation.childTagId !== tag.id)
    const next = parentId ? [...rest, { parentTagId: parentId, childTagId: tag.id }] : rest
    void run(() => api.updateTagRelationships(next), { failure: 'The group was not changed' })
  }

  const duplicate = !!name.trim() && tags.some((tag) => tag.name.toLowerCase() === name.trim().toLowerCase())

  return (
    <PageShell title="Tags" subtitle="Label records with what might explain them. A tag inside a group also counts for the group — “pizza” under “dairy” makes every pizza a dairy day.">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <form
          className="flex items-start gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void create()
          }}
        >
          <div className="flex-1">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="New tag: dairy, poor sleep, travelling…" aria-label="New tag name" />
            {duplicate && <p className="mt-1 text-xs text-warn">A tag with that name already exists.</p>}
          </div>
          <Button variant="primary" type="submit" disabled={!name.trim() || duplicate} icon={<Plus className="h-4 w-4" />}>
            Add tag
          </Button>
        </form>

        {tags.length === 0 && !isLoading ? (
          <Empty icon={<TagsIcon />} title="No tags yet">
            Tags are how you tell Chimero what was different about a day. Add a few here, or create them while logging.
          </Empty>
        ) : (
          <ul className="card overflow-hidden">
            {rows.map(({ tag, depth, key }) => {
              const blocked = descendants(tag.id, relationships)
              const parent = relationships.find((relation) => relation.childTagId === tag.id)?.parentTagId ?? null
              return (
                <li key={key} className="group flex items-center gap-2.5 border-t border-line/60 py-2 pr-3 first:border-t-0" style={{ paddingLeft: 14 + depth * 26 }}>
                  {depth > 0 && <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-faint" />}
                  <ColorDot tag={tag} onPick={(color) => void run(() => must(api.updateTag(tag.id, { color }), 'The colour was not saved'))} />
                  <TagName tag={tag} taken={tags} onRename={(next) => void run(() => must(api.updateTag(tag.id, { name: next }), 'The tag was not renamed'))} />
                  {tag.children.length > 0 && <span className="shrink-0 text-xs text-faint">{tag.children.length} inside</span>}
                  <Select
                    aria-label={`Group for ${tag.name}`}
                    value={parent ?? ''}
                    onChange={(event) => setParent(tag, event.target.value ? Number(event.target.value) : null)}
                    className={cn('h-7 w-40 shrink-0 text-sm', !parent && 'text-faint')}
                  >
                    <option value="">No group</option>
                    {tags
                      .filter((candidate) => candidate.id !== tag.id && !blocked.has(candidate.id))
                      .map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          In {candidate.name}
                        </option>
                      ))}
                  </Select>
                  <IconButton label={measured.has(`tag:${tag.id}`) ? 'Explore in Insights' : 'Not used on any record yet'} size="sm" disabled={!measured.has(`tag:${tag.id}`)} onClick={() => navigate({ page: 'insights', a: `tag:${tag.id}` })}>
                    <FlaskConical className="h-3.5 w-3.5" />
                  </IconButton>
                  <IconButton label="Delete tag" size="sm" tone="danger" onClick={() => setRemoving(tag)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Delete “${removing?.name ?? ''}”?`}
        onConfirm={() => {
          const id = removing?.id
          setRemoving(null)
          if (id) void run(() => must(api.deleteTag(id), 'The tag was not deleted'))
        }}
      >
        The tag is removed from every record that uses it. The records themselves stay.
      </ConfirmDialog>
    </PageShell>
  )
}

function ColorDot({ tag, onPick }: { tag: Tag; onPick: (color: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className="p-2"
      trigger={<button type="button" aria-label={`Colour of ${tag.name}`} className="h-4 w-4 shrink-0 rounded-full ring-offset-2 ring-offset-surface hover:ring-2 hover:ring-faint" style={{ background: tag.color ?? FALLBACK_COLOR }} />}
    >
      <div className="grid grid-cols-6 gap-1.5">
        {PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            onClick={() => {
              onPick(color)
              setOpen(false)
            }}
            className={cn('h-6 w-6 rounded-full transition-transform hover:scale-110', tag.color === color && 'ring-2 ring-text ring-offset-2 ring-offset-raised')}
            style={{ background: color }}
          />
        ))}
      </div>
    </Popover>
  )
}

function TagName({ tag, taken, onRename }: { tag: Tag; taken: Tag[]; onRename: (name: string) => void }) {
  const [value, setValue] = useState<string | null>(null)
  const commit = () => {
    const next = value?.trim()
    setValue(null)
    if (!next || next === tag.name) return
    if (taken.some((other) => other.id !== tag.id && other.name.toLowerCase() === next.toLowerCase())) return
    onRename(next)
  }
  return (
    <input
      aria-label={`Name of ${tag.name}`}
      value={value ?? tag.name}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          setValue(null)
          event.currentTarget.blur()
        }
      }}
      className="h-7 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-base font-medium hover:border-line focus:border-accent focus:outline-none"
    />
  )
}
