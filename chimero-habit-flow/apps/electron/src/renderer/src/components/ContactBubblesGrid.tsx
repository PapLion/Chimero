"use client"

import React, { useState, useMemo } from "react"
import { useContacts } from "../lib/queries"
import { useAppStore } from "../lib/store"
import { Input } from "@packages/ui/input"
import { Button } from "@packages/ui/button"
import { cn } from "../lib/utils"
import type { Contact } from "@packages/db"

export interface ContactMoodSelection {
  contactId: number
  mood: "positive" | "negative" | "neutral"
}

interface ContactBubblesGridProps {
  onSelectionChange: (selected: ContactMoodSelection[]) => void
}

export function ContactBubblesGrid({ onSelectionChange }: ContactBubblesGridProps) {
  const { data: contacts = [], isLoading } = useContacts()
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
        <div className="text-sm text-[hsl(210_12%_47%)]">Loading contacts...</div>
      </div>
    )
  }

  // Empty state - no contacts
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <p className="text-sm text-[hsl(210_12%_47%)] mb-4">No contacts yet. Add your first contact.</p>
        <Button
          onClick={handleAddContact}
          className="bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
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
        <p className="text-sm text-[hsl(210_12%_47%)]">
          No contacts found for '{searchQuery}'
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <Input
        type="text"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
      />

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
                "relative w-14 h-14 rounded-full border-2 transition-all flex items-center justify-center",
                "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                isSelected
                  ? getBorderClass(mood)
                  : "bg-[hsl(210_20%_15%)] border-white/10 hover:border-purple-400/50"
              )}
              title={`${contact.name} - ${mood || "not selected"} (Ctrl+Click to edit profile)`}
            >
              {contact.avatarAssetId ? (
                /* Avatar image would go here - for now fallback to initials */
                <span className="text-sm font-medium text-[hsl(210_25%_97%)]">
                  {getInitials(contact.name)}
                </span>
              ) : (
                <span className="text-sm font-medium text-[hsl(210_25%_97%)]">
                  {getInitials(contact.name)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Mood Legend */}
      <div className="flex items-center gap-4 pt-2 text-xs text-[hsl(210_12%_47%)]">
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
