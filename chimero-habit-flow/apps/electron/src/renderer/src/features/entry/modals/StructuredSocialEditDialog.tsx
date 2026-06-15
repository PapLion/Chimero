"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import { Camera, ImageIcon, PencilLine, Plus, Trash2 } from "lucide-react"
import type { AssetWithUrls } from "@contracts/features/assets"
import type { Entry, SocialMethod, SocialMoodImpact, Tracker } from "@contracts/contracts"
import { getContactInitials, normalizeSocialMethod, normalizeSocialMoodImpact, validateSocialMethod, validateSocialMoodImpact } from "@contracts/domain"
import { api } from "@shared/api"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@packages/ui/dialog"
import { Button } from "@packages/ui/button"
import { Input } from "@packages/ui/input"
import { TagSelector } from "@features/tags/components/TagChips"
import { CyberpunkSelect } from "@features/tracking/components/CyberpunkSelect"
import { formatToastError, useToast } from "@shared/components/toast"
import { queryKeys, useAssets, useContacts, useCreateTagMutation, useTags, useUpdateEntryMutation } from "@shared/queries"
import { cn } from "@shared/utils"
import { useQueryClient } from "@tanstack/react-query"

type SocialContactDraft = {
  contactId: number
  moodImpact: SocialMoodImpact
}

type SocialEditDraft = {
  entryId: number
  trackerId: number
  contacts: SocialContactDraft[]
  method: SocialMethod
  note: string
  timestamp: number
  tagIds: number[]
  assetId: number | null
}

const METHOD_OPTIONS: Array<{ value: SocialMethod; label: string }> = [
  { value: "call", label: "Call" },
  { value: "text", label: "Text" },
  { value: "in-person", label: "In person" },
  { value: "video", label: "Video" },
  { value: "other", label: "Other" },
]

function formatDateTimeParts(timestamp: number): { date: string; time: string } {
  const value = new Date(timestamp)
  return {
    date: format(value, "yyyy-MM-dd"),
    time: format(value, "HH:mm"),
  }
}

function combineDateTime(date: string, time: string): number | null {
  const parsed = new Date(`${date}T${time}`)
  const timestamp = parsed.getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function normalizeContacts(contacts: SocialContactDraft[]): SocialContactDraft[] {
  const seen = new Set<number>()
  const normalized: SocialContactDraft[] = []

  for (const contact of contacts) {
    if (!Number.isInteger(contact.contactId) || contact.contactId <= 0) continue
    if (seen.has(contact.contactId)) continue
    seen.add(contact.contactId)
    normalized.push({
      contactId: contact.contactId,
      moodImpact: validateSocialMoodImpact(contact.moodImpact) ? contact.moodImpact : "neutral",
    })
  }

  return normalized
}

function buildDraftFromEntry(entry: Entry): SocialEditDraft {
  const interactions = entry.socialInteractions ?? []
  const contacts = normalizeContacts(interactions.map((interaction) => ({
    contactId: interaction.contactId,
    moodImpact: normalizeSocialMoodImpact(interaction.moodImpact) ?? "neutral",
  })))
  const firstInteraction = interactions[0] ?? null
  const method = normalizeSocialMethod(firstInteraction?.method ?? null) ?? "other"
  const note = (entry.note ?? firstInteraction?.note ?? "").trim()

  return {
    entryId: entry.id,
    trackerId: entry.trackerId,
    contacts,
    method,
    note,
    timestamp: entry.timestamp,
    tagIds: entry.tagIds ?? [],
    assetId: entry.assetId ?? null,
  }
}

function getMethodLabel(method: SocialMethod): string {
  return METHOD_OPTIONS.find((option) => option.value === method)?.label ?? method
}

interface StructuredSocialEditDialogProps {
  entry: Entry
  tracker: Tracker
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StructuredSocialEditDialog({ entry, tracker, open, onOpenChange }: StructuredSocialEditDialogProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const updateEntryMutation = useUpdateEntryMutation()
  const createTagMutation = useCreateTagMutation()
  const { data: contactsData = [] } = useContacts({ sortBy: "name" })
  const { data: assetsData = [] } = useAssets({ limit: 200 })
  const { data: tags = [] } = useTags()
  const assetList = useMemo<AssetWithUrls[]>(() => assetsData as AssetWithUrls[], [assetsData])
  const assets = useMemo<Map<number, AssetWithUrls>>(
    () => new Map(assetList.map((asset) => [asset.id, asset])),
    [assetList],
  )

  const [draft, setDraft] = useState<SocialEditDraft>(() => buildDraftFromEntry(entry))
  const [loadedEntryId, setLoadedEntryId] = useState<number | null>(() => entry.id)
  const [searchQuery, setSearchQuery] = useState("")
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const saveLockRef = useRef(false)

  useEffect(() => {
    if (!open) {
      setLoadedEntryId(null)
      setSearchQuery("")
      setAssetPickerOpen(false)
      setSaveError(null)
      setIsSubmitting(false)
      saveLockRef.current = false
      return
    }

    if (loadedEntryId === entry.id) return

    setDraft(buildDraftFromEntry(entry))
    setLoadedEntryId(entry.id)
    setSearchQuery("")
    setAssetPickerOpen(false)
    setSaveError(null)
  }, [entry, loadedEntryId, open])

  const contacts = contactsData as Array<{ id: number; name: string; avatarAssetId?: number | null; initials?: string | null }>
  const selectedContactIds = useMemo(() => new Set(draft.contacts.map((contact) => contact.contactId)), [draft.contacts])
  const selectedContacts = useMemo(() => {
    const byId = new Map(contacts.map((contact) => [contact.id, contact]))
    return draft.contacts
      .map((selection) => {
        const contact = byId.get(selection.contactId)
        return contact ? { contact, moodImpact: selection.moodImpact } : null
      })
      .filter((value): value is { contact: (typeof contacts)[number]; moodImpact: SocialMoodImpact } => value != null)
  }, [contacts, draft.contacts])
  const visibleContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return contacts.filter((contact) => {
      if (selectedContactIds.has(contact.id)) return false
      if (!query) return true
      return contact.name.toLowerCase().includes(query)
    })
  }, [contacts, searchQuery, selectedContactIds])
  const selectedAsset = draft.assetId ? assets.get(draft.assetId) : undefined
  const { date, time } = useMemo(() => formatDateTimeParts(draft.timestamp), [draft.timestamp])
  const isPending = updateEntryMutation.isPending || createTagMutation.isPending || isSubmitting || saveLockRef.current
  const hasInvalidContacts = draft.contacts.some((contact) => !validateSocialMoodImpact(contact.moodImpact))
  const saveDisabled = isPending || draft.contacts.length === 0 || !validateSocialMethod(draft.method) || hasInvalidContacts

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (isPending || saveLockRef.current)) return
    onOpenChange(nextOpen)
  }

  const updateTimestamp = (nextDate?: string, nextTime?: string) => {
    setDraft((current) => {
      if (!current) return current
      const combined = combineDateTime(nextDate ?? date, nextTime ?? time)
      return combined == null ? current : { ...current, timestamp: combined }
    })
  }

  const addContact = (contactId: number) => {
    setDraft((current) => {
      if (!current || current.contacts.some((contact) => contact.contactId === contactId)) return current
      return {
        ...current,
        contacts: [...current.contacts, { contactId, moodImpact: "neutral" }],
      }
    })
  }

  const removeContact = (contactId: number) => {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        contacts: current.contacts.filter((contact) => contact.contactId !== contactId),
      }
    })
  }

  const setContactMood = (contactId: number, moodImpact: SocialMoodImpact) => {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        contacts: current.contacts.map((contact) => (
          contact.contactId === contactId ? { ...contact, moodImpact } : contact
        )),
      }
    })
  }

  const handleCreateTag = async (name: string) => {
    try {
      const createdTag = await createTagMutation.mutateAsync({ name })
      if (createdTag) {
        toast.success("Tag created.", createdTag.name)
      }
      return createdTag
    } catch (error) {
      toast.error(
        "We couldn't create that tag.",
        formatToastError(error, "Please try again in a moment."),
      )
      return null
    }
  }

  const handleSave = async (event?: React.FormEvent) => {
    if (event) event.preventDefault()
    if (isPending || saveLockRef.current || !draft) return

    const normalizedContacts = normalizeContacts(draft.contacts)
    if (normalizedContacts.length === 0) {
      setSaveError("Select at least one contact before saving.")
      return
    }
    if (!validateSocialMethod(draft.method)) {
      setSaveError("Pick a valid Social method.")
      return
    }
    if (normalizedContacts.some((contact) => !validateSocialMoodImpact(contact.moodImpact))) {
      setSaveError("Pick a valid mood impact for each contact.")
      return
    }

    try {
      setSaveError(null)
      saveLockRef.current = true
      setIsSubmitting(true)
      await updateEntryMutation.mutateAsync({
        id: draft.entryId,
        updates: {
          timestamp: draft.timestamp,
          note: draft.note.trim() || null,
          assetId: draft.assetId,
          tagIds: draft.tagIds,
          socialInteractions: normalizedContacts.map((contact) => ({
            contactId: contact.contactId,
            method: draft.method,
            moodImpact: contact.moodImpact,
            notes: draft.note.trim() || null,
          })),
        },
      })

      toast.info("Social entry updated.", tracker.name)
      onOpenChange(false)
    } catch (error) {
      const message = formatToastError(error, "Please try again in a moment.")
      setSaveError(message)
      toast.error("We couldn't save that Social entry.", message)
    } finally {
      saveLockRef.current = false
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl min-w-0 overflow-hidden p-0">
        <div className="max-h-[85vh] overflow-y-auto">
          <div className="flex items-center gap-3 border-b border-[hsl(var(--border)/0.7)] px-6 py-5">
            <div className="surface-chip flex h-10 w-10 items-center justify-center rounded-xl">
              <PencilLine className="h-5 w-5 text-[hsl(var(--primary))]" />
            </div>
            <div className="min-w-0">
              <div className="section-kicker">Edit social check-in</div>
              <DialogTitle className="mt-1 truncate text-lg font-semibold text-[hsl(var(--foreground))]">{tracker.name}</DialogTitle>
              <DialogDescription className="sr-only">
                Edit the saved structured Social interaction for this entry.
              </DialogDescription>
              <p className="line-clamp-2 text-xs text-[hsl(var(--muted-foreground))]">Update the saved structured contacts, method, note, time, tags, and attachment.</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5 p-6">
            {saveError && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {saveError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(event) => updateTimestamp(event.target.value, time)}
                  className="h-11 bg-white/5 text-[hsl(var(--foreground))] [color-scheme:dark]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Time</label>
                <Input
                  type="time"
                  value={time}
                  onChange={(event) => updateTimestamp(date, event.target.value)}
                  className="h-11 bg-white/5 text-[hsl(var(--foreground))] [color-scheme:dark]"
                  required
                />
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Method</div>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Visible before you save and backed by the canonical Social contract.</p>
                </div>
                <div className="max-w-[12rem] flex-1">
                  <CyberpunkSelect
                    value={draft.method}
                    onValueChange={(value) => {
                      if (typeof value !== "string" || !validateSocialMethod(value)) return
                      setDraft((current) => current ? { ...current, method: value } : current)
                    }}
                    options={METHOD_OPTIONS}
                  />
                </div>
              </div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Current method: {getMethodLabel(draft.method)}
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Contacts</div>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Add people to this check-in, then set a mood impact for each one.</p>
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{selectedContacts.length} selected</div>
              </div>

              <div className="space-y-2">
                <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Search contacts</label>
                <Input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-11 bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                />
              </div>

              {selectedContacts.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Selected contacts</div>
                  <div className="space-y-2">
                    {selectedContacts.map(({ contact, moodImpact }) => {
                      const avatarAsset = contact.avatarAssetId ? assets.get(contact.avatarAssetId) : null
                      const avatarUrl = avatarAsset?.thumbnailUrl || avatarAsset?.assetUrl || null
                      return (
                        <div
                          key={contact.id}
                          className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.05] text-xs font-semibold text-[hsl(210_28%_97%)]">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={contact.name} className="h-full w-full object-cover" />
                              ) : (
                                contact.initials || getContactInitials(contact.name)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[hsl(210_28%_97%)]">{contact.name}</div>
                              <div className="text-xs text-[hsl(220_12%_58%)]">Mood impact</div>
                            </div>
                          </div>

                          <div className="ml-auto flex flex-wrap items-center gap-2">
                            {([
                              { value: "positive", label: "Positive", className: "border-green-500/40 bg-green-500/10 text-green-100" },
                              { value: "neutral", label: "Neutral", className: "border-purple-500/40 bg-purple-500/10 text-purple-100" },
                              { value: "negative", label: "Negative", className: "border-red-500/40 bg-red-500/10 text-red-100" },
                            ] as const).map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setContactMood(contact.id, option.value)}
                                aria-pressed={moodImpact === option.value}
                                className={cn(
                                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out",
                                  moodImpact === option.value
                                    ? option.className
                                    : "border-white/10 bg-white/[0.03] text-[hsl(220_12%_68%)] hover:border-white/20 hover:bg-white/[0.05]",
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => removeContact(contact.id)}
                              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[hsl(220_12%_68%)] transition-all duration-200 ease-out hover:border-white/20 hover:bg-white/[0.05]"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Add contact</div>
                {visibleContacts.length > 0 ? (
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {visibleContacts.map((contact) => {
                      const avatarAsset = contact.avatarAssetId ? assets.get(contact.avatarAssetId) : null
                      const avatarUrl = avatarAsset?.thumbnailUrl || avatarAsset?.assetUrl || null
                      return (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => addContact(contact.id)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.82)]"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.05] text-xs font-semibold text-[hsl(210_28%_97%)]">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={contact.name} className="h-full w-full object-cover" />
                            ) : (
                              contact.initials || getContactInitials(contact.name)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-[hsl(210_28%_97%)]">{contact.name}</div>
                            <div className="text-xs text-[hsl(220_12%_58%)]">Add to this check-in</div>
                          </div>
                          <Plus className="h-4 w-4 text-[hsl(var(--primary))]" />
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-[hsl(var(--muted-foreground))]">
                    No contacts match that search.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
              <div className="space-y-1">
                <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Note / context</label>
                <textarea
                  placeholder="What did you talk about?"
                  value={draft.note}
                  onChange={(event) => setDraft((current) => current ? { ...current, note: event.target.value } : current)}
                  className="min-h-[120px] w-full resize-y rounded-xl border border-[hsl(var(--border)/0.7)] bg-white/5 px-4 py-3 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none transition-colors duration-200 ease-out focus:border-[hsl(var(--primary)/0.45)] focus:ring-2 focus:ring-[hsl(var(--ring)/0.25)]"
                />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Attachment</div>
                {assetPickerOpen ? (
                  <div className="surface-card space-y-3 rounded-2xl p-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={async () => {
                        const result = await api.openFileDialog({
                          filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] }],
                        })
                        if (!result.path) return
                        await api.uploadAsset(result.path)
                        await queryClient.invalidateQueries({ queryKey: queryKeys.assetsRoot })
                      }}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Upload New
                    </Button>
                    {assetList.length > 0 && (
                      <div className="max-h-40 overflow-y-auto pr-1">
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(72px,1fr))] gap-2">
                          {assetList.map((asset) => (
                            <button
                              type="button"
                              key={asset.id}
                              onClick={() => {
                                setDraft((current) => current ? { ...current, assetId: asset.id } : current)
                                setAssetPickerOpen(false)
                              }}
                              className={cn(
                                "group relative aspect-square min-w-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ease-out",
                                draft.assetId === asset.id ? "border-[hsl(var(--primary)/0.35)]" : "border-[hsl(var(--border)/0.7)] hover:border-[hsl(var(--primary)/0.35)]",
                              )}
                            >
                              <img
                                src={asset.thumbnailUrl || asset.assetUrl || `chimero-asset://${asset.path}`}
                                alt={asset.originalName || "Asset"}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setAssetPickerOpen(false)}>
                        Close
                      </Button>
                    </div>
                  </div>
                ) : selectedAsset ? (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-[hsl(var(--foreground))]">{selectedAsset.originalName || "Attached image"}</div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))]">Selected asset</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDraft((current) => current ? { ...current, assetId: null } : current)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear
                      </Button>
                    </div>
                    <div className="mt-3 overflow-hidden rounded-xl border border-white/8 bg-black/20">
                      <img
                        src={selectedAsset.thumbnailUrl || selectedAsset.assetUrl}
                        alt={selectedAsset.originalName || "Attached image"}
                        className="h-auto max-h-44 w-full object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAssetPickerOpen(true)}
                    className="flex h-full min-h-[180px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-[hsl(var(--muted-foreground))] transition-all duration-200 ease-out hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    <ImageIcon className="h-5 w-5" />
                    Add image
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <TagSelector
                tags={tags}
                selectedTagIds={draft.tagIds}
                onChange={(tagIds) => setDraft((current) => current ? { ...current, tagIds } : current)}
                onCreateTag={handleCreateTag}
                disabled={isPending}
                creating={createTagMutation.isPending}
                compact
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/8 pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveDisabled}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
