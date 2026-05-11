"use client"

import { createElement, useState, useMemo, useEffect } from "react"
import { useAppStore } from "@shared/store"
import { useContact, useContactInteractions, useCreateContactMutation, useUpdateContactMutation, useDeleteContactMutation, useAssets } from "@shared/queries"
import { Input } from "@packages/ui/input"
import { Button } from "@packages/ui/button"
import { cn } from "@shared/utils"
import { api } from "@shared/api"
import { ConfirmDeleteDialog } from "@shared/components/ConfirmDeleteDialog"
import { formatToastError, useToast } from "@shared/components/toast"
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
  const toast = useToast()

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
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

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
    if (isUploadingAvatar) return

    setIsUploadingAvatar(true)
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
          await updateContactMutation.mutateAsync({
            id: selectedContactId,
            updates: { avatarAssetId: newAsset.id },
          })
        }
        toast.info("Photo updated.", name.trim() || "Contact photo")
      }
    } catch (error) {
      toast.error(
        "We couldn't update that photo.",
        formatToastError(error, "Please try again in a moment."),
      )
      console.error("Upload failed", error)
    } finally {
      setIsUploadingAvatar(false)
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

  const handleSave = async () => {
    if (!name.trim()) return
    if (isSaving) return

    setIsSaving(true)

    try {
      if (isCreateMode) {
        const createdContact = (await createContactMutation.mutateAsync({
          name: name.trim(),
          avatarAssetId,
          birthday: birthday || null,
          dateMet: dateMet || null,
          notes: notes.trim() || null,
        })) as Contact

        if (traits.length > 0 && createdContact?.id) {
          try {
            await updateContactMutation.mutateAsync({
              id: createdContact.id,
              updates: { traits },
            })
          } catch (traitError) {
            toast.error(
              "The contact was created, but the traits need another try.",
              formatToastError(traitError, "Please reopen the contact and try again."),
            )
            setCurrentPage("home")
            setSelectedContactId(null)
            return
          }
        }

        toast.success("Contact created.", name.trim())
        setCurrentPage("home")
        setSelectedContactId(null)
      } else if (selectedContactId) {
        await updateContactMutation.mutateAsync({
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
        })

        toast.info("Contact updated.", name.trim())
        setCurrentPage("home")
        setSelectedContactId(null)
      }
    } catch (error) {
      toast.error(
        isCreateMode ? "We couldn't create that contact." : "We couldn't save that contact.",
        formatToastError(error, "Please try again in a moment."),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedContactId) return

    try {
      await deleteContactMutation.mutateAsync(selectedContactId)
      setDeleteDialogOpen(false)
      setCurrentPage("home")
      setSelectedContactId(null)
      toast.destructive("Contact removed.", name.trim() || "Contact")
    } catch (error) {
      toast.error(
        "We couldn't delete that contact.",
        formatToastError(error, "Please try again in a moment."),
      )
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
      <div className="flex min-h-[200px] items-center justify-center text-[hsl(220_12%_58%)]">
        Loading contact...
      </div>
    )
  }

  return (
    <div className="surface-panel mx-auto max-w-2xl space-y-6 rounded-3xl p-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="surface-chip p-2 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/[0.06]"
        >
          <ArrowLeft className="h-5 w-5 text-[hsl(210_28%_97%)]" />
        </button>
        <div>
          <div className="section-kicker">Contacts</div>
          <h1 className="page-title mt-1 text-[2rem]">
            {isCreateMode ? "New Contact" : "Edit Contact"}
          </h1>
        </div>
      </div>

      {/* Avatar section */}
      <div className="flex items-center gap-6">
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name || "Contact avatar"}
              className="h-24 w-24 rounded-full border-2 border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/10 bg-white/[0.04]">
              <User className="h-10 w-10 text-[hsl(220_12%_58%)]" />
            </div>
          )}
          {!isCreateMode && name && (
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(266_73%_63%)] text-xs font-medium text-white shadow-lg shadow-primary/20">
              {getInitials(name)}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleAvatarUpload}
          loading={isUploadingAvatar}
          loadingText="Uploading photo..."
          disabled={isSaving}
          className="rounded-xl border-white/10 text-[hsl(210_28%_97%)] hover:bg-white/[0.06]"
        >
          Change photo
        </Button>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {/* Name (required) */}
        <div className="space-y-2">
          <label className="text-sm text-[hsl(210_28%_97%)]">Name *</label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
            className="text-[hsl(210_28%_97%)] placeholder:text-[hsl(220_12%_58%)]"
          />
        </div>

        {/* Birthday with age calculation */}
        <div className="space-y-2">
          <label className="text-sm text-[hsl(210_28%_97%)]">Birthday</label>
          <Input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="text-[hsl(210_28%_97%)]"
          />
          {age !== null && (
            <p className="text-sm text-[hsl(220_12%_58%)]">Age: {age} years</p>
          )}
        </div>

        {/* Date met */}
        <div className="space-y-2">
          <label className="text-sm text-[hsl(210_28%_97%)]">Date we met</label>
          <Input
            type="date"
            value={dateMet}
            onChange={(e) => setDateMet(e.target.value)}
            className="text-[hsl(210_28%_97%)]"
          />
        </div>

        {/* Date last talked */}
        <div className="space-y-2">
          <label className="text-sm text-[hsl(210_28%_97%)]">Last talked</label>
          <Input
            type="date"
            value={dateLastTalked}
            onChange={(e) => setDateLastTalked(e.target.value)}
            className="text-[hsl(210_28%_97%)]"
          />
        </div>

        {/* Notes - using native textarea */}
        <div className="space-y-2">
          <label className="text-sm text-[hsl(210_28%_97%)]">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            rows={4}
            className="w-full resize-none rounded-xl border border-white/8 bg-white/[0.05] px-3 py-2 text-[hsl(210_28%_97%)] placeholder:text-[hsl(220_12%_58%)]"
          />
        </div>

        {/* Traits - drag and drop */}
        <div className="space-y-2">
          <label className="text-sm text-[hsl(210_28%_97%)]">Traits</label>
          <div className="min-h-[40px] rounded-xl border border-white/8 bg-white/[0.04] p-3">
            {traits.length > 0 ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={traits} strategy={horizontalListSortingStrategy}>
                  <div className="flex flex-wrap gap-2">
                    {traits.map((trait) =>
                      createElement(SortableTrait, {
                        key: trait,
                        id: trait,
                        trait,
                        onRemove: () => handleRemoveTrait(trait),
                      }),
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-sm text-[hsl(220_12%_58%)]">No traits added</p>
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
              className="text-[hsl(210_28%_97%)] placeholder:text-[hsl(220_12%_58%)]"
            />
            <Button
              type="button"
              onClick={handleAddTrait}
              disabled={!newTrait.trim()}
              className="rounded-xl bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 pt-4">
        {isCreateMode ? (
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            loading={isSaving}
            loadingText="Creating contact..."
            className="rounded-xl bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
          >
            Create contact
          </Button>
        ) : (
          <>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || isSaving}
              loading={isSaving}
              loadingText="Saving contact..."
              className="rounded-xl bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
            >
              Save changes
            </Button>
            <Button
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isSaving || isUploadingAvatar || deleteDialogOpen}
              variant="destructive"
              className="rounded-xl bg-red-600 text-white hover:bg-red-700"
            >
              Delete contact
            </Button>
          </>
        )}
      </div>

      {/* Interactions history - only in edit mode */}
      {!isCreateMode && (
        <div className="space-y-4 border-t border-white/10 pt-6">
          <h2 className="text-lg font-medium text-[hsl(210_28%_97%)]">Interaction History</h2>
          {interactionsLoading ? (
            <p className="text-sm text-[hsl(220_12%_58%)]">Loading interactions...</p>
          ) : interactions.length === 0 ? (
            <p className="text-sm text-[hsl(220_12%_58%)]">No interactions recorded yet</p>
          ) : (
            <div className="space-y-3">
              {interactions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="surface-chip flex items-start gap-3 rounded-xl p-3"
                >
                  <span className="text-sm text-[hsl(210_28%_97%)]">
                    {formatDate(interaction.timestamp)}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <span
                      className={cn(
                        "inline-flex rounded px-2 py-0.5 text-xs font-medium border",
                        getMoodColor(interaction.mood)
                      )}
                    >
                      {interaction.mood}
                    </span>
                    {interaction.notes && (
                      <span className="block text-sm text-[hsl(210_12%_47%)]">
                        {interaction.notes}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        title={`Delete ${name.trim() || "contact"}?`}
        body="This will remove the contact and their history."
        description="This action cannot be undone."
        confirmLabel="Delete contact"
        pendingLabel="Deleting contact..."
      />
    </div>
  )
}
