import { useMemo, useState, type CSSProperties } from "react"
import { Plus, Tag as TagIcon, X } from "lucide-react"
import { Button } from "@packages/ui/button"
import { Input } from "@packages/ui/input"
import { cn } from "@shared/utils"
import type { Tag } from "@contracts/contracts"

const DEFAULT_TAG_COLOR = "hsl(266 73% 63%)"

export function resolveVisibleTags(tagIds: number[] | undefined, tags: Tag[]): Tag[] {
  if (!tagIds?.length || tags.length === 0) return []
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]))
  return tagIds.map((tagId) => tagsById.get(tagId)).filter((tag): tag is Tag => Boolean(tag))
}

export function tagOverflowLabel(tagIds: number[] | undefined, tags: Tag[], limit: number): string | null {
  const visibleCount = resolveVisibleTags(tagIds, tags).length
  const overflow = visibleCount - limit
  return overflow > 0 ? `+${overflow}` : null
}

interface TagChipsProps {
  tagIds?: number[]
  tags: Tag[]
  limit?: number
  className?: string
}

export function TagChips({ tagIds, tags, limit, className }: TagChipsProps) {
  const visibleTags = resolveVisibleTags(tagIds, tags)
  if (visibleTags.length === 0) return null

  const displayedTags = typeof limit === "number" ? visibleTags.slice(0, limit) : visibleTags
  const overflow = typeof limit === "number" ? visibleTags.length - displayedTags.length : 0

  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-1.5", className)}>
      {displayedTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-medium"
          style={tagButtonStyle(tag, true)}
          title={tag.name}
        >
          <span className="truncate">{tag.name}</span>
        </span>
      ))}
      {overflow > 0 && (
        <span className="rounded-full border border-[hsl(var(--border)/0.7)] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
          +{overflow}
        </span>
      )}
    </div>
  )
}

interface TagSelectorProps {
  tags: Tag[]
  selectedTagIds: number[]
  onChange: (tagIds: number[]) => void
  onCreateTag?: (name: string) => Promise<Tag | null | undefined>
  disabled?: boolean
  creating?: boolean
  label?: string
  compact?: boolean
}

export function TagSelector({
  tags,
  selectedTagIds,
  onChange,
  onCreateTag,
  disabled = false,
  creating = false,
  label = "Tags",
  compact = false,
}: TagSelectorProps) {
  const [newTagName, setNewTagName] = useState("")
  const selectedTagSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds])
  const selectedTags = resolveVisibleTags(selectedTagIds, tags)
  const availableTags = tags.filter((tag) => !selectedTagSet.has(tag.id))
  const canCreate = Boolean(onCreateTag) && newTagName.trim().length > 0

  const toggleTag = (tagId: number) => {
    if (disabled) return
    if (selectedTagSet.has(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  const handleCreateTag = async () => {
    if (!onCreateTag || !newTagName.trim() || disabled || creating) return
    const createdTag = await onCreateTag(newTagName.trim())
    if (!createdTag) return
    setNewTagName("")
    if (!selectedTagSet.has(createdTag.id)) {
      onChange([...selectedTagIds, createdTag.id])
    }
  }

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{label}</label>
        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            disabled={disabled}
          >
            Clear
          </button>
        )}
      </div>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.35)]"
              style={tagButtonStyle(tag, true)}
              disabled={disabled}
              title={`Remove ${tag.name}`}
            >
              {tag.name}
              <X className="h-3 w-3" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {availableTags.length > 0 && (
        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.35)]"
              style={tagButtonStyle(tag, false)}
              disabled={disabled}
            >
              <TagIcon className="h-3 w-3" aria-hidden />
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {onCreateTag && (
        <div className="flex min-w-0 gap-2">
          <Input
            type="text"
            value={newTagName}
            onChange={(event) => setNewTagName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canCreate) {
                event.preventDefault()
                event.stopPropagation()
                handleCreateTag()
              }
            }}
            placeholder="Create tag..."
            className="h-10 min-w-0 bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
            disabled={disabled || creating}
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 rounded-xl px-3"
            onClick={handleCreateTag}
            disabled={!canCreate || disabled || creating}
            loading={creating}
            title="Create tag"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function tagButtonStyle(tag: Tag, selected: boolean): CSSProperties {
  const color = tag.color ?? DEFAULT_TAG_COLOR
  return {
    borderColor: selected ? `color-mix(in srgb, ${color} 40%, transparent)` : "hsl(var(--border) / 0.7)",
    backgroundColor: selected ? `color-mix(in srgb, ${color} 12%, transparent)` : "rgba(255,255,255,0.04)",
    color: selected ? color : "hsl(var(--foreground))",
  }
}
