"use client"

import { createElement, useState, useMemo, useEffect } from "react"
import { useAppStore } from "@shared/store"
import { useContact, useContactInteractions, useContactProfileBlocks, useContactReminderSettings, useContacts, useCreateContactMutation, useCreateContactProfileBlockMutation, useDeleteContactMutation, useDeleteContactProfileBlockMutation, useReorderContactProfileBlocksMutation, useUpdateContactMutation, useUpdateContactProfileBlockMutation, useUpsertContactReminderSettingsMutation, useAssets } from "@shared/queries"
import { Input } from "@packages/ui/input"
import { Button } from "@packages/ui/button"
import { cn } from "@shared/utils"
import { api } from "@shared/api"
import { ConfirmDeleteDialog } from "@shared/components/ConfirmDeleteDialog"
import { formatToastError, useToast } from "@shared/components/toast"
import { ArrowLeft, X, Plus, User, ChevronUp, ChevronDown } from "lucide-react"
import { buildBirthdayAwareness, buildCheckInAttention } from "@contracts/domain"
import type { Contact, ContactInteraction, ContactProfileBlock } from "@packages/db"
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

export function ContactsPage() {
  const [sortBy, setSortBy] = useState<"name" | "most-talked-to" | "least-talked-to">("name")
  const [searchQuery, setSearchQuery] = useState("")
  const { data: contactsData = [], isLoading } = useContacts({ sortBy })
  const contacts = contactsData as Contact[]
  const { setCurrentPage, setSelectedContactId } = useAppStore()

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return contacts
    return contacts.filter((contact) => contact.name.toLowerCase().includes(query))
  }, [contacts, searchQuery])

  const handleAddContact = () => {
    setSelectedContactId(null)
    setCurrentPage("contact")
  }

  const handleOpenContact = (contactId: number) => {
    setSelectedContactId(contactId)
    setCurrentPage("contact")
  }

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="section-kicker">Social CRM</div>
          <h1 className="page-title mt-1 text-[2.25rem]">Contacts</h1>
          <p className="page-subtitle mt-1.5">Manage people, profile notes, and check-in context.</p>
        </div>
        <Button
          type="button"
          onClick={handleAddContact}
          className="rounded-xl bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add contact
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
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

      {isLoading ? (
        <div className="surface-card rounded-2xl py-12 text-center text-sm text-[hsl(220_12%_58%)]">Loading contacts...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="surface-card rounded-2xl py-12 text-center">
          <p className="text-sm text-[hsl(220_12%_58%)]">
            {contacts.length === 0 ? "No contacts yet." : "No contacts match that search."}
          </p>
          <Button
            type="button"
            onClick={handleAddContact}
            className="mt-4 rounded-xl bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
          >
            Add contact
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => handleOpenContact(contact.id)}
              className="surface-card flex min-h-[104px] items-center gap-4 rounded-2xl p-4 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.82)]"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-sm font-semibold text-[hsl(210_28%_97%)]">
                {contact.initials || getInitials(contact.name)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[hsl(210_28%_97%)]">{contact.name}</div>
                <div className="mt-1 text-xs text-[hsl(220_12%_58%)]">
                  {contact.dateLastTalked ? `Last talked ${contact.dateLastTalked}` : "No linked check-ins yet"}
                </div>
                {contact.birthday && (
                  <div className="mt-1 text-xs text-[hsl(220_12%_58%)]">Birthday {contact.birthday}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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
  const { data: reminderSettings } = useContactReminderSettings(selectedContactId ?? 0)
  const { data: profileBlocksData = [] } = useContactProfileBlocks(selectedContactId ?? 0)
  const profileBlocks = profileBlocksData as ContactProfileBlock[]
  const { data: assetsData = [] } = useAssets({ limit: 200 })

  // Mutations
  const createContactMutation = useCreateContactMutation()
  const updateContactMutation = useUpdateContactMutation()
  const deleteContactMutation = useDeleteContactMutation()
  const upsertReminderSettingsMutation = useUpsertContactReminderSettingsMutation()
  const createProfileBlockMutation = useCreateContactProfileBlockMutation()
  const updateProfileBlockMutation = useUpdateContactProfileBlockMutation()
  const deleteProfileBlockMutation = useDeleteContactProfileBlockMutation()
  const reorderProfileBlocksMutation = useReorderContactProfileBlocksMutation()

  // Form state
  const [name, setName] = useState("")
  const [birthday, setBirthday] = useState("")
  const [dateMet, setDateMet] = useState("")
  const [dateLastTalked, setDateLastTalked] = useState("")
  const [notes, setNotes] = useState("")
  const [likesText, setLikesText] = useState("")
  const [dislikesText, setDislikesText] = useState("")
  const [traits, setTraits] = useState<string[]>([])
  const [newTrait, setNewTrait] = useState("")
  const [hasKids, setHasKids] = useState(false)
  const [kidsNotes, setKidsNotes] = useState("")
  const [avatarAssetId, setAvatarAssetId] = useState<number | null>(null)
  const [birthdayReminderEnabled, setBirthdayReminderEnabled] = useState(false)
  const [birthdayReminderDaysBefore, setBirthdayReminderDaysBefore] = useState("7")
  const [checkInReminderEnabled, setCheckInReminderEnabled] = useState(false)
  const [checkInAfterDays, setCheckInAfterDays] = useState("14")
  const [newBlockTitle, setNewBlockTitle] = useState("")
  const [newBlockBody, setNewBlockBody] = useState("")
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

  const splitList = (value: string): string[] | null => {
    const items = value.split(",").map((item) => item.trim()).filter(Boolean)
    return items.length > 0 ? items : null
  }

  const joinList = (value?: string[] | null): string => value?.join(", ") ?? ""

  const birthdayAwareness = useMemo(
    () => buildBirthdayAwareness({ birthday }, new Date(), Number.parseInt(birthdayReminderDaysBefore, 10) || 7),
    [birthday, birthdayReminderDaysBefore],
  )

  const checkInAttention = useMemo(
    () => buildCheckInAttention(
      { lastTalkedAt: contact?.lastTalkedAt ?? null, dateLastTalked: dateLastTalked || null },
      {
        checkInReminderEnabled,
        checkInAfterDays: Number.parseInt(checkInAfterDays, 10) || 14,
      },
      new Date(),
    ),
    [checkInAfterDays, checkInReminderEnabled, contact?.lastTalkedAt, dateLastTalked],
  )

  // Load contact data when in edit mode
  useEffect(() => {
    if (contact && !isCreateMode) {
      setName(contact.name)
      setBirthday(contact.birthday || "")
      setDateMet(contact.dateMet || "")
      setDateLastTalked(contact.dateLastTalked || "")
      setNotes(contact.notes || "")
      setLikesText(joinList(contact.likes))
      setDislikesText(joinList(contact.dislikes))
      setTraits(contact.traits || [])
      setHasKids(!!contact.hasKids)
      setKidsNotes(contact.kidsNotes || "")
      setAvatarAssetId(contact.avatarAssetId || null)
    }
  }, [contact, isCreateMode])

  useEffect(() => {
    if (reminderSettings && !isCreateMode) {
      setBirthdayReminderEnabled(reminderSettings.birthdayReminderEnabled)
      setBirthdayReminderDaysBefore(String(reminderSettings.birthdayReminderDaysBefore))
      setCheckInReminderEnabled(reminderSettings.checkInReminderEnabled)
      setCheckInAfterDays(String(reminderSettings.checkInAfterDays))
    }
  }, [isCreateMode, reminderSettings])

  // Reset form when switching to create mode
  useEffect(() => {
    if (isCreateMode) {
      setName("")
      setBirthday("")
      setDateMet("")
      setDateLastTalked("")
      setNotes("")
      setLikesText("")
      setDislikesText("")
      setTraits([])
      setHasKids(false)
      setKidsNotes("")
      setAvatarAssetId(null)
      setBirthdayReminderEnabled(false)
      setBirthdayReminderDaysBefore("7")
      setCheckInReminderEnabled(false)
      setCheckInAfterDays("14")
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

  const handleCreateProfileBlock = async () => {
    if (!selectedContactId || !newBlockTitle.trim()) return
    try {
      await createProfileBlockMutation.mutateAsync({
        contactId: selectedContactId,
        title: newBlockTitle.trim(),
        body: newBlockBody.trim(),
        orderIndex: profileBlocks.length,
        blockType: "text",
      })
      setNewBlockTitle("")
      setNewBlockBody("")
    } catch (error) {
      toast.error(
        "We couldn't add that profile block.",
        formatToastError(error, "Please try again in a moment."),
      )
    }
  }

  const handleUpdateProfileBlock = async (block: ContactProfileBlock, updates: Partial<ContactProfileBlock>) => {
    if (!selectedContactId) return
    try {
      await updateProfileBlockMutation.mutateAsync({
        id: block.id,
        contactId: selectedContactId,
        updates: {
          title: updates.title ?? block.title,
          body: updates.body ?? block.body,
          orderIndex: updates.orderIndex ?? block.orderIndex,
          blockType: updates.blockType ?? block.blockType,
          contactId: selectedContactId,
        },
      })
    } catch (error) {
      toast.error(
        "We couldn't update that profile block.",
        formatToastError(error, "Please try again in a moment."),
      )
    }
  }

  const handleDeleteProfileBlock = async (block: ContactProfileBlock) => {
    if (!selectedContactId) return
    try {
      await deleteProfileBlockMutation.mutateAsync({ id: block.id, contactId: selectedContactId })
    } catch (error) {
      toast.error(
        "We couldn't delete that profile block.",
        formatToastError(error, "Please try again in a moment."),
      )
    }
  }

  const handleMoveProfileBlock = async (blockId: number, direction: "up" | "down") => {
    if (!selectedContactId) return
    const index = profileBlocks.findIndex((block) => block.id === blockId)
    const nextIndex = direction === "up" ? index - 1 : index + 1
    if (index < 0 || nextIndex < 0 || nextIndex >= profileBlocks.length) return
    const nextBlocks = [...profileBlocks]
    const [moved] = nextBlocks.splice(index, 1)
    nextBlocks.splice(nextIndex, 0, moved)
    try {
      await reorderProfileBlocksMutation.mutateAsync({
        contactId: selectedContactId,
        ids: nextBlocks.map((block) => block.id),
      })
    } catch (error) {
      toast.error(
        "We couldn't reorder those profile blocks.",
        formatToastError(error, "Please try again in a moment."),
      )
    }
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
          likes: splitList(likesText),
          dislikes: splitList(dislikesText),
          traits: traits.length > 0 ? traits : null,
          hasKids,
          kidsNotes: kidsNotes.trim() || null,
          notes: notes.trim() || null,
        })) as Contact

        if (createdContact?.id) {
          try {
            await upsertReminderSettingsMutation.mutateAsync({
              contactId: createdContact.id,
              birthdayReminderEnabled,
              birthdayReminderDaysBefore: Number.parseInt(birthdayReminderDaysBefore, 10) || 7,
              checkInReminderEnabled,
              checkInAfterDays: Number.parseInt(checkInAfterDays, 10) || 14,
            })
          } catch (settingsError) {
            toast.error(
              "The contact was created, but attention settings need another try.",
              formatToastError(settingsError, "Please reopen the contact and try again."),
            )
            setCurrentPage("contacts")
            setSelectedContactId(undefined)
            return
          }
        }

        toast.success("Contact created.", name.trim())
        setCurrentPage("contacts")
        setSelectedContactId(undefined)
      } else if (selectedContactId) {
        await updateContactMutation.mutateAsync({
          id: selectedContactId,
          updates: {
            name: name.trim(),
            avatarAssetId,
            birthday: birthday || null,
            dateMet: dateMet || null,
            dateLastTalked: dateLastTalked || null,
            likes: splitList(likesText),
            dislikes: splitList(dislikesText),
            traits: traits.length > 0 ? traits : null,
            hasKids,
            kidsNotes: kidsNotes.trim() || null,
            notes: notes.trim() || null,
          },
        })
        await upsertReminderSettingsMutation.mutateAsync({
          contactId: selectedContactId,
          birthdayReminderEnabled,
          birthdayReminderDaysBefore: Number.parseInt(birthdayReminderDaysBefore, 10) || 7,
          checkInReminderEnabled,
          checkInAfterDays: Number.parseInt(checkInAfterDays, 10) || 14,
        })

        toast.info("Contact updated.", name.trim())
        setCurrentPage("contacts")
        setSelectedContactId(undefined)
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
      setCurrentPage("contacts")
      setSelectedContactId(undefined)
      toast.destructive("Contact removed.", name.trim() || "Contact")
    } catch (error) {
      toast.error(
        "We couldn't delete that contact.",
        formatToastError(error, "Please try again in a moment."),
      )
    }
  }

  const handleBack = () => {
    setCurrentPage("contacts")
    setSelectedContactId(undefined)
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-[hsl(210_28%_97%)]">Likes</label>
            <Input
              type="text"
              value={likesText}
              onChange={(e) => setLikesText(e.target.value)}
              placeholder="Coffee, hiking, sci-fi"
              className="text-[hsl(210_28%_97%)] placeholder:text-[hsl(220_12%_58%)]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-[hsl(210_28%_97%)]">Dislikes</label>
            <Input
              type="text"
              value={dislikesText}
              onChange={(e) => setDislikesText(e.target.value)}
              placeholder="Crowds, early calls"
              className="text-[hsl(210_28%_97%)] placeholder:text-[hsl(220_12%_58%)]"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-sm text-[hsl(210_28%_97%)]">
          <input
            type="checkbox"
            checked={hasKids}
            onChange={(e) => setHasKids(e.target.checked)}
            className="h-4 w-4"
          />
          Has kids
        </label>

        {hasKids && (
          <div className="space-y-2">
            <label className="text-sm text-[hsl(210_28%_97%)]">Kids notes</label>
            <textarea
              value={kidsNotes}
              onChange={(e) => setKidsNotes(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-white/8 bg-white/[0.05] px-3 py-2 text-[hsl(210_28%_97%)] placeholder:text-[hsl(220_12%_58%)]"
            />
          </div>
        )}

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

      <div className="space-y-4 border-t border-white/10 pt-6">
        <h2 className="text-lg font-medium text-[hsl(210_28%_97%)]">Contact Reminders / Attention</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-sm text-[hsl(210_28%_97%)]">
            <input
              type="checkbox"
              checked={birthdayReminderEnabled}
              onChange={(e) => setBirthdayReminderEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            Birthday awareness
          </label>
          <div className="space-y-2">
            <label className="text-sm text-[hsl(210_28%_97%)]">Days before birthday</label>
            <Input
              type="number"
              min={0}
              value={birthdayReminderDaysBefore}
              onChange={(e) => setBirthdayReminderDaysBefore(e.target.value)}
              className="text-[hsl(210_28%_97%)]"
            />
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-sm text-[hsl(210_28%_97%)]">
            <input
              type="checkbox"
              checked={checkInReminderEnabled}
              onChange={(e) => setCheckInReminderEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            Check-in attention
          </label>
          <div className="space-y-2">
            <label className="text-sm text-[hsl(210_28%_97%)]">Check in after days</label>
            <Input
              type="number"
              min={1}
              value={checkInAfterDays}
              onChange={(e) => setCheckInAfterDays(e.target.value)}
              className="text-[hsl(210_28%_97%)]"
            />
          </div>
        </div>
        <div className="grid gap-3 text-sm text-[hsl(220_12%_72%)] sm:grid-cols-2">
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
            {birthdayAwareness.hasBirthday
              ? birthdayAwareness.isToday
                ? "Birthday is today"
                : birthdayAwareness.isSoon
                  ? `Birthday in ${birthdayAwareness.daysUntilBirthday} day${birthdayAwareness.daysUntilBirthday === 1 ? "" : "s"}`
                  : "Birthday saved"
              : "No birthday saved"}
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
            {checkInAttention.daysSinceLastTalked == null
              ? "No linked Social interaction yet"
              : checkInAttention.needsAttention
                ? `${checkInAttention.daysSinceLastTalked} days since last talked`
                : `Last talked ${checkInAttention.daysSinceLastTalked} day${checkInAttention.daysSinceLastTalked === 1 ? "" : "s"} ago`}
          </div>
        </div>
      </div>

      {!isCreateMode && (
        <div className="space-y-4 border-t border-white/10 pt-6">
          <h2 className="text-lg font-medium text-[hsl(210_28%_97%)]">Profile Grid / Blocks</h2>
          <div className="space-y-3">
            {profileBlocks.length === 0 ? (
              <p className="text-sm text-[hsl(220_12%_58%)]">No profile blocks yet</p>
            ) : (
              profileBlocks.map((block, index) => (
                <div key={block.id} className="space-y-3 rounded-xl border border-white/8 bg-white/[0.04] p-3">
                  <Input
                    type="text"
                    defaultValue={block.title}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== block.title) {
                        void handleUpdateProfileBlock(block, { title: e.target.value.trim() || block.title })
                      }
                    }}
                    className="text-[hsl(210_28%_97%)]"
                  />
                  <textarea
                    defaultValue={block.body}
                    onBlur={(e) => {
                      if (e.target.value !== block.body) {
                        void handleUpdateProfileBlock(block, { body: e.target.value })
                      }
                    }}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-white/8 bg-white/[0.05] px-3 py-2 text-[hsl(210_28%_97%)]"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={index === 0}
                      onClick={() => void handleMoveProfileBlock(block.id, "up")}
                      className="rounded-xl border-white/10 text-[hsl(210_28%_97%)] hover:bg-white/[0.06]"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={index === profileBlocks.length - 1}
                      onClick={() => void handleMoveProfileBlock(block.id, "down")}
                      className="rounded-xl border-white/10 text-[hsl(210_28%_97%)] hover:bg-white/[0.06]"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => void handleDeleteProfileBlock(block)}
                      className="rounded-xl bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="space-y-3 rounded-xl border border-white/8 bg-white/[0.04] p-3">
            <Input
              type="text"
              value={newBlockTitle}
              onChange={(e) => setNewBlockTitle(e.target.value)}
              placeholder="Block title"
              className="text-[hsl(210_28%_97%)] placeholder:text-[hsl(220_12%_58%)]"
            />
            <textarea
              value={newBlockBody}
              onChange={(e) => setNewBlockBody(e.target.value)}
              placeholder="Block body"
              rows={3}
              className="w-full resize-none rounded-xl border border-white/8 bg-white/[0.05] px-3 py-2 text-[hsl(210_28%_97%)] placeholder:text-[hsl(220_12%_58%)]"
            />
            <Button
              type="button"
              onClick={() => void handleCreateProfileBlock()}
              disabled={!newBlockTitle.trim()}
              className="rounded-xl bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
            >
              Add block
            </Button>
          </div>
        </div>
      )}

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
                        getMoodColor(interaction.moodImpact ?? interaction.mood ?? "neutral")
                      )}
                    >
                      {interaction.moodImpact ?? interaction.mood ?? "neutral"}
                    </span>
                    {interaction.method && (
                      <span className="ml-2 inline-flex rounded px-2 py-0.5 text-xs font-medium border border-white/10 text-[hsl(220_12%_72%)]">
                        {interaction.method}
                      </span>
                    )}
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
