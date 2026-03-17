"use client"

import { useState, useMemo, useEffect } from "react"
import { useAppStore } from "../lib/store"
import { useContact, useContactInteractions, useCreateContactMutation, useUpdateContactMutation, useDeleteContactMutation, useAssets } from "../lib/queries"
import { Input } from "@packages/ui/input"
import { Button } from "@packages/ui/button"
import { cn } from "../lib/utils"
import { api } from "../lib/api"
import { ArrowLeft, X, Plus, User } from "lucide-react"
import type { Contact, ContactInteraction } from "@packages/db"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface SortableTraitProps {
  id: string
  trait: string
  onRemove: () => void
}

function SortableTrait({ id, trait, onRemove }: SortableTraitProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(266_73%_63%)] text-white text-sm",
        isDragging && "opacity-50 z-50"
      )}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        ⋮⋮
      </span>
      <span>{trait}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 hover:text-red-300 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ContactProfilePage() {
  const { selectedContactId, setCurrentPage, setSelectedContactId } = useAppStore()
  const isCreateMode = selectedContactId === null

  // Queries - cast to proper types
  const { data: contactData, isLoading: contactLoading } = useContact(selectedContactId ?? 0)
  const contact = contactData as Contact | undefined
  const { data: interactionsData = [], isLoading: interactionsLoading } = useContactInteractions(selectedContactId ?? 0)
  const interactions = interactionsData as ContactInteraction[]
  const { data: assetsData = [] } = useAssets({ limit: 200 })

  // Mutations
  const createContactMutation = useCreateContactMutation()
  const updateContactMutation = useUpdateContactMutation()
  const deleteContactMutation = useDeleteContactMutation()

  // Form state
  const [name, setName] = useState("")
  const [birthday, setBirthday] = useState("")
  const [dateMet, setDateMet] = useState("")
  const [dateLastTalked, setDateLastTalked] = useState("")
  const [notes, setNotes] = useState("")
  const [traits, setTraits] = useState<string[]>([])
  const [newTrait, setNewTrait] = useState("")
  const [avatarAssetId, setAvatarAssetId] = useState<number | null>(null)

  // Compute age from birthday
  const age = useMemo(() => {
    if (!birthday) return null
    const today = new Date()
    const birth = new Date(birthday)
    let calculatedAge = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--
    }
    return calculatedAge >= 0 ? calculatedAge : null
  }, [birthday])

  // Load contact data when in edit mode
  useEffect(() => {
    if (contact && !isCreateMode) {
      setName(contact.name)
      setBirthday(contact.birthday || "")
      setDateMet(contact.dateMet || "")
      setDateLastTalked(contact.dateLastTalked || "")
      setNotes(contact.notes || "")
      setTraits(contact.traits || [])
      setAvatarAssetId(contact.avatarAssetId || null)
    }
  }, [contact, isCreateMode])

  // Reset form when switching to create mode
  useEffect(() => {
    if (isCreateMode) {
      setName("")
      setBirthday("")
      setDateMet("")
      setDateLastTalked("")
      setNotes("")
      setTraits([])
      setAvatarAssetId(null)
    }
  }, [isCreateMode])

  // Dnd sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = traits.indexOf(active.id as string)
      const newIndex = traits.indexOf(over.id as string)
      if (oldIndex >= 0 && newIndex >= 0) {
        setTraits(arrayMove(traits, oldIndex, newIndex))
      }
    }
  }

  const handleAddTrait = () => {
    const trimmed = newTrait.trim()
    if (trimmed && !traits.includes(trimmed)) {
      setTraits([...traits, trimmed])
      setNewTrait("")
    }
  }

  const handleRemoveTrait = (traitToRemove: string) => {
    setTraits(traits.filter((t) => t !== traitToRemove))
  }

  const handleAvatarUpload = async () => {
    try {
      const result = await api.openFileDialog({
        filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] }],
      })
      if (!result.path) return
      const newAsset = await api.uploadAsset(result.path) as { id: number } | undefined
      if (newAsset && newAsset.id) {
        setAvatarAssetId(newAsset.id)
        // If in edit mode, also update the contact
        if (!isCreateMode && selectedContactId) {
          updateContactMutation.mutate({
            id: selectedContactId,
            updates: { avatarAssetId: newAsset.id },
          })
        }
      }
    } catch (error) {
      console.error("Upload failed", error)
    }
  }

  // Build assets map for avatar lookup
  const assetsMap = useMemo(() => {
    const map = new Map<number, { id: number; thumbnailUrl?: string; assetUrl?: string }>()
    ;(assetsData as Array<{ id: number; thumbnailUrl?: string; assetUrl?: string }>).forEach((asset) => {
      if (asset?.id != null) map.set(asset.id, asset)
    })
    return map
  }, [assetsData])

  const avatarUrl = avatarAssetId ? (assetsMap.get(avatarAssetId)?.thumbnailUrl || assetsMap.get(avatarAssetId)?.assetUrl || null) : null

  const handleSave = () => {
    if (!name.trim()) return

    if (isCreateMode) {
      createContactMutation.mutate(
        {
          name: name.trim(),
          avatarAssetId,
          birthday: birthday || null,
          dateMet: dateMet || null,
          notes: notes.trim() || null,
        },
        {
          onSuccess: (newContact) => {
            const createdContact = newContact as Contact
            // If there are traits, update the contact with them
            if (traits.length > 0 && createdContact && createdContact.id) {
              updateContactMutation.mutate({
                id: createdContact.id,
                updates: { traits },
              })
            }
            // Navigate back
            setCurrentPage("home")
            setSelectedContactId(null)
          },
        }
      )
    } else if (selectedContactId) {
      updateContactMutation.mutate(
        {
          id: selectedContactId,
          updates: {
            name: name.trim(),
            avatarAssetId,
            birthday: birthday || null,
            dateMet: dateMet || null,
            dateLastTalked: dateLastTalked || null,
            traits: traits.length > 0 ? traits : null,
            notes: notes.trim() || null,
          },
        },
        {
          onSuccess: () => {
            setCurrentPage("home")
            setSelectedContactId(null)
          },
        }
      )
    }
  }

  const handleDelete = () => {
    if (!selectedContactId) return
    if (confirm("Are you sure you want to delete this contact? This action cannot be undone.")) {
      deleteContactMutation.mutate(selectedContactId, {
        onSuccess: () => {
          setCurrentPage("home")
          setSelectedContactId(null)
        },
      })
    }
  }

  const handleBack = () => {
    setCurrentPage("home")
    setSelectedContactId(null)
  }

  const getInitials = (nameStr: string): string => {
    const parts = nameStr.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return nameStr.slice(0, 2).toUpperCase()
  }

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getMoodColor = (mood: string): string => {
    switch (mood) {
      case "positive":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "negative":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  if (contactLoading && !isCreateMode) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-[hsl(210_12%_47%)]">
        Loading contact...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[hsl(210_25%_97%)]" />
        </button>
        <h1 className="text-xl font-semibold text-[hsl(210_25%_97%)]">
          {isCreateMode ? "New Contact" : "Edit Contact"}
        </h1>
      </div>

      {/* Avatar section */}
      <div className="flex items-center gap-6">
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name || "Contact avatar"}
              className="w-24 h-24 rounded-full object-cover border-2 border-white/10"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[hsl(210_20%_15%)] border-2 border-white/10 flex items-center justify-center">
              <User className="w-10 h-10 text-[hsl(210_12%_47%)]" />
            </div>
          )}
          {!isCreateMode && name && (
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[hsl(266_73%_63%)] flex items-center justify-center text-xs font-medium text-white">
              {getInitials(name)}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleAvatarUpload}
          className="border-white/10 text-[hsl(210_25%_97%)] hover:bg-white/5"
        >
          Change photo
        </Button>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {/* Name (required) */}
        <div className="space-y-2">
          <label className="text-sm text-[hsl(210_25%_97%)]">Name *</label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
            className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
          />
        </div>

        {/* Birthday with age calculation */}
        <div className="space-y-2">
          <label className="text-sm text-[hsl(210_25%_97%)]">Birthday</label>
          <Input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)]"
          />
          {age !== null && (
            <p className="text-sm text-[hsl(210_12%_47%)]">Age: {age} years</p>
          )}
        </div>

        {/* Date met */}
        <div className="space-y-2">
          <label className="text-sm text-[hsl(210_25%_97%)]">Date we met</label>
          <Input
            type="date"
            value={dateMet}
            onChange={(e) => setDateMet(e.target.value)}
            className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)]"
          />
        </div>

        {/* Date last talked */}
        <div className="space-y-2">
          <label className="text-sm text-[hsl(210_25%_97%)]">Last talked</label>
          <Input
            type="date"
            value={dateLastTalked}
            onChange={(e) => setDateLastTalked(e.target.value)}
            className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)]"
          />
        </div>

        {/* Notes - using native textarea */}
        <div className="space-y-2">
          <label className="text-sm text-[hsl(210_25%_97%)]">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            rows={4}
            className="w-full px-3 py-2 bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)] rounded-md resize-none"
          />
        </div>

        {/* Traits - drag and drop */}
        <div className="space-y-2">
          <label className="text-sm text-[hsl(210_25%_97%)]">Traits</label>
          <div className="min-h-[40px] p-3 bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] rounded-lg">
            {traits.length > 0 ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={traits} strategy={horizontalListSortingStrategy}>
                  <div className="flex flex-wrap gap-2">
                    {traits.map((trait) => (
                      <SortableTrait
                        id={trait}
                        trait={trait}
                        onRemove={() => handleRemoveTrait(trait)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-sm text-[hsl(210_12%_47%)]">No traits added</p>
            )}
          </div>
          {/* Add new trait input */}
          <div className="flex gap-2">
            <Input
              type="text"
              value={newTrait}
              onChange={(e) => setNewTrait(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddTrait()
                }
              }}
              placeholder="Add a trait..."
              className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
            />
            <Button
              type="button"
              onClick={handleAddTrait}
              disabled={!newTrait.trim()}
              className="bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-4">
        {isCreateMode ? (
          <Button
            onClick={handleSave}
            disabled={!name.trim() || createContactMutation.isPending}
            className="bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
          >
            {createContactMutation.isPending ? "Creating..." : "Create contact"}
          </Button>
        ) : (
          <>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || updateContactMutation.isPending}
              className="bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
            >
              {updateContactMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleteContactMutation.isPending}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteContactMutation.isPending ? "Deleting..." : "Delete contact"}
            </Button>
          </>
        )}
      </div>

      {/* Interactions history - only in edit mode */}
      {!isCreateMode && (
        <div className="space-y-4 pt-6 border-t border-white/10">
          <h2 className="text-lg font-medium text-[hsl(210_25%_97%)]">Interaction History</h2>
          {interactionsLoading ? (
            <p className="text-sm text-[hsl(210_12%_47%)]">Loading interactions...</p>
          ) : interactions.length === 0 ? (
            <p className="text-sm text-[hsl(210_12%_47%)]">No interactions recorded yet</p>
          ) : (
            <div className="space-y-3">
              {interactions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="flex items-start gap-3 p-3 bg-[hsl(210_20%_15%)] rounded-lg border border-white/5"
                >
                  <span className="text-sm text-[hsl(210_25%_97%)]">
                    {formatDate(interaction.timestamp)}
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium border",
                      getMoodColor(interaction.mood)
                    )}
                  >
                    {interaction.mood}
                  </span>
                  {interaction.notes && (
                    <span className="text-sm text-[hsl(210_12%_47%)]">
                      {interaction.notes}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}