"use client"

import React, { useState, useMemo } from "react"
import { useContacts } from "@shared/queries"
import { useAppStore } from "@shared/store"
import { Input } from "@packages/ui/input"
import { Button } from "@packages/ui/button"
import { cn } from "@shared/utils"
import type { Contact } from "@packages/db"

export interface ContactMoodSelection {
  contactId: number
  mood: "positive" | "negative" | "neutral"
}

interface ContactBubblesGridProps {
  onSelectionChange: (selected: ContactMoodSelection[]) => void
}

export function ContactBubblesGrid({ onSelectionChange }: ContactBubblesGridProps) {
  const [sortBy, setSortBy] = useState<"name" | "most-talked-to" | "least-talked-to">("name")
  const { data: contacts = [], isLoading } = useContacts({ sortBy })
  const { setCurrentPage, setSelectedContactId } = useAppStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedContacts, setSelectedContacts] = useState<Map<number, "positive" | "negative" | "neutral">>(new Map())

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts
    const query = searchQuery.toLowerCase().trim()
    return (contacts as Contact[]).filter((c) => c.name.toLowerCase().includes(query))
  }, [contacts, searchQuery])

  // Handle click on a contact bubble
  const handleBubbleClick = (contactId: number, event?: React.MouseEvent) => {
    // If Ctrl or Cmd key is pressed, navigate to contact profile instead of cycling mood
    if (event && (event.ctrlKey || event.metaKey)) {
      setSelectedContactId(contactId)
      setCurrentPage("contact")
      return
    }

    const currentMood = selectedContacts.get(contactId)

    let newMood: "positive" | "negative" | "neutral" | undefined
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
    const selectionArray: ContactMoodSelection[] = Array.from(newMap.entries()).map(([id, mood]): ContactMoodSelection => ({
      contactId: id as number,
      mood: mood as "positive" | "negative" | "neutral",
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
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-[hsl(210_28%_97%)] placeholder:text-[hsl(220_12%_58%)]"
        />
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
          className="rounded-xl border border-white/8 bg-white/[0.05] px-3 py-2 text-sm text-[hsl(210_28%_97%)]"
        >
          <option value="name">Name</option>
          <option value="most-talked-to">Most talked to</option>
          <option value="least-talked-to">Least talked to</option>
        </select>
      </div>

      {/* Bubbles Grid */}
      <div className="flex flex-wrap gap-3">
        {filteredContacts.map((contact) => {
          const mood = selectedContacts.get(contact.id)
          const isSelected = !!mood

          return (
            <button
              key={contact.id}
              type="button"
              onClick={(e) => handleBubbleClick(contact.id, e)}
              className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[hsl(266_73%_63%/0.45)]",
                isSelected
                  ? getBorderClass(mood)
                  : "surface-chip border-white/10 hover:border-[hsl(266_73%_63%/0.45)]"
              )}
              title={`${contact.name} - ${mood || "not selected"} (Ctrl+Click to edit profile)`}
            >
              {contact.avatarAssetId ? (
                /* Avatar image would go here - for now fallback to initials */
                <span className="text-sm font-medium text-[hsl(210_28%_97%)]">
                  {getInitials(contact.name)}
                </span>
              ) : (
                <span className="text-sm font-medium text-[hsl(210_28%_97%)]">
                  {getInitials(contact.name)}
                </span>
              )}
            </button>
          )
        })}
      </div>

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
