"use client"

import React, { useState, useMemo } from "react"
import { useAssets, useContacts } from "@shared/queries"
import { useAppStore } from "@shared/store"
import { Input } from "@packages/ui/input"
import { Button } from "@packages/ui/button"
import { cn } from "@shared/utils"
import { CyberpunkSelect } from "@features/tracking/components/CyberpunkSelect"
import type { ContactSortBy, SocialMoodImpact } from "@contracts/contracts"
import type { Contact } from "@packages/db"

export interface ContactMoodSelection {
  contactId: number
  moodImpact: SocialMoodImpact
}

interface ContactBubblesGridProps {
  onSelectionChange: (selected: ContactMoodSelection[]) => void
}

export function ContactBubblesGrid({ onSelectionChange }: ContactBubblesGridProps) {
  const [sortBy, setSortBy] = useState<ContactSortBy>("name")
  const { data: contacts = [], isLoading } = useContacts({ sortBy })
  const { data: assetsData = [] } = useAssets({ limit: 200 })
  const { setCurrentPage, setSelectedContactId } = useAppStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedContacts, setSelectedContacts] = useState<Map<number, SocialMoodImpact>>(new Map())

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts
    const query = searchQuery.toLowerCase().trim()
    return (contacts as Contact[]).filter((c) => c.name.toLowerCase().includes(query))
  }, [contacts, searchQuery])

  const assetsMap = useMemo(() => {
    const map = new Map<number, { id: number; thumbnailUrl?: string; assetUrl?: string }>()
    ;(assetsData as Array<{ id: number; thumbnailUrl?: string; assetUrl?: string }>).forEach((asset) => {
      if (asset?.id != null) map.set(asset.id, asset)
    })
    return map
  }, [assetsData])

  // Handle click on a contact bubble
  const handleBubbleClick = (contactId: number, event?: React.MouseEvent) => {
    // If Ctrl or Cmd key is pressed, navigate to contact profile instead of cycling mood
    if (event && (event.ctrlKey || event.metaKey)) {
      setSelectedContactId(contactId)
      setCurrentPage("contact")
      return
    }

    const currentMood = selectedContacts.get(contactId)

    let newMood: SocialMoodImpact | undefined
    const newMap = new Map(selectedContacts)

    if (!currentMood) {
      // Not selected -> neutral
      newMood = "neutral"
      newMap.set(contactId, newMood)
    } else if (currentMood === "neutral") {
      // neutral -> positive
      newMood = "positive"
      newMap.set(contactId, newMood)
    } else if (currentMood === "positive") {
      // positive -> negative
      newMood = "negative"
      newMap.set(contactId, newMood)
    } else if (currentMood === "negative") {
      // negative -> deselect
      newMap.delete(contactId)
    }

    setSelectedContacts(newMap)

    // Convert Map to array and notify parent
    const selectionArray: ContactMoodSelection[] = Array.from(newMap.entries()).map(([id, moodImpact]): ContactMoodSelection => ({
      contactId: id as number,
      moodImpact: moodImpact as SocialMoodImpact,
    }))
    onSelectionChange(selectionArray)
  }

  const selectedContactDetails = useMemo(() => {
    return Array.from(selectedContacts.entries())
      .map(([contactId, moodImpact]) => {
        const contact = (contacts as Contact[]).find((item) => item.id === contactId)
        return contact ? { contact, moodImpact } : null
      })
      .filter((value): value is { contact: Contact; moodImpact: SocialMoodImpact } => value != null)
  }, [contacts, selectedContacts])

  const setContactMood = (contactId: number, moodImpact: SocialMoodImpact) => {
    const nextMap = new Map(selectedContacts)
    nextMap.set(contactId, moodImpact)
    setSelectedContacts(nextMap)
    const selectionArray: ContactMoodSelection[] = Array.from(nextMap.entries()).map(([id, nextMoodImpact]): ContactMoodSelection => ({
      contactId: id as number,
      moodImpact: nextMoodImpact as SocialMoodImpact,
    }))
    onSelectionChange(selectionArray)
  }

  const removeSelectedContact = (contactId: number) => {
    const nextMap = new Map(selectedContacts)
    nextMap.delete(contactId)
    setSelectedContacts(nextMap)
    const selectionArray: ContactMoodSelection[] = Array.from(nextMap.entries()).map(([id, moodImpact]): ContactMoodSelection => ({
      contactId: id as number,
      moodImpact: moodImpact as SocialMoodImpact,
    }))
    onSelectionChange(selectionArray)
  }

  // Get initials from name
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // Get border class based on mood
  const getBorderClass = (mood: "positive" | "negative" | "neutral" | undefined): string => {
    switch (mood) {
      case "positive":
        return "border-green-500 ring-2 ring-green-500/30"
      case "negative":
        return "border-red-500 ring-2 ring-red-500/30"
      case "neutral":
        return "border-purple-500 ring-2 ring-purple-500/30"
      default:
        return "border-white/10 hover:border-purple-400/50"
    }
  }

  // Handle add contact button - navigate to contact page in create mode
  const handleAddContact = () => {
    setSelectedContactId(null) // null means create mode
    setCurrentPage("contact")
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-[hsl(220_12%_58%)]">Loading contacts...</div>
      </div>
    )
  }

  // Empty state - no contacts
  if (contacts.length === 0) {
    return (
      <div className="surface-panel flex flex-col items-center justify-center rounded-3xl px-4 py-8 text-center">
        <p className="mb-4 text-sm text-[hsl(220_12%_58%)]">No contacts yet. Add your first contact.</p>
        <Button
          onClick={handleAddContact}
          className="rounded-xl bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
        >
          Add contact
        </Button>
      </div>
    )
  }

  // No results after filtering
  if (filteredContacts.length === 0) {
    return (
      <div className="py-8 px-4 text-center">
        <p className="text-sm text-[hsl(220_12%_58%)]">
          No contacts found for &apos;{searchQuery}&apos;
        </p>
        <Button
          type="button"
          onClick={handleAddContact}
          className="mt-4 rounded-xl bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
        >
          Add contact
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-[hsl(210_28%_97%)] placeholder:text-[hsl(220_12%_58%)]"
        />
        <CyberpunkSelect
          value={sortBy}
          onValueChange={(value) => setSortBy(value as typeof sortBy)}
          className="w-full sm:min-w-[12rem]"
          options={[
            { value: "name", label: "Name" },
            { value: "most-talked-to", label: "Most talked to" },
            { value: "least-talked-to", label: "Least talked to" },
            { value: "most-recently-talked-to", label: "Most recently talked to" },
          ]}
        />
        <Button
          type="button"
          onClick={handleAddContact}
          className="rounded-xl bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
        >
          Add contact
        </Button>
      </div>

      {/* Bubbles Grid */}
      <div className="flex flex-wrap gap-3">
        {filteredContacts.map((contact) => {
          const mood = selectedContacts.get(contact.id)
          const isSelected = !!mood
          const avatarAsset = contact.avatarAssetId ? assetsMap.get(contact.avatarAssetId) : null
          const avatarUrl = avatarAsset?.thumbnailUrl || avatarAsset?.assetUrl || null

          return (
            <button
              key={contact.id}
              type="button"
              onClick={(e) => handleBubbleClick(contact.id, e)}
              aria-label={`${contact.name}, ${mood || "not selected"}`}
              aria-pressed={isSelected}
              className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[hsl(266_73%_63%/0.45)]",
                isSelected
                  ? getBorderClass(mood)
                  : "surface-chip border-white/10 hover:border-[hsl(266_73%_63%/0.45)]"
              )}
              title={`${contact.name} - ${mood || "not selected"} (Ctrl+Click to edit profile)`}
              >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={contact.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-[hsl(210_28%_97%)]">
                  {getInitials(contact.name)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selectedContactDetails.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">
            Selected contacts
          </div>
          <div className="space-y-2">
            {selectedContactDetails.map(({ contact, moodImpact }) => {
              const avatarAsset = contact.avatarAssetId ? assetsMap.get(contact.avatarAssetId) : null
              const avatarUrl = avatarAsset?.thumbnailUrl || avatarAsset?.assetUrl || null
              return (
                <div
                  key={contact.id}
                  className="surface-card flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 px-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.05] text-xs font-semibold text-[hsl(210_28%_97%)]">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={contact.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(contact.name)
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
                      onClick={() => removeSelectedContact(contact.id)}
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

      {/* Mood Legend */}
      <div className="surface-chip flex items-center gap-4 rounded-xl px-4 py-3 text-xs text-[hsl(220_12%_58%)]">
        <span className="text-muted-foreground">Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-purple-500 bg-transparent" />
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-green-500 bg-transparent" />
          <span>Positive</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-red-500 bg-transparent" />
          <span>Negative</span>
        </div>
      </div>
    </div>
  )
}
