import React, { useState, useEffect, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTrackers, useUpdateEntryMutation, useUpdateWeightEntryMutation, useAssets, useTags, useCreateTagMutation } from "@shared/queries"
import { Dialog, DialogContent } from "@packages/ui/dialog"
import { Input } from "@packages/ui/input"
import { format } from "date-fns"
import { PencilLine, Trash2, Camera, ImageIcon } from "lucide-react"
import { Button } from "@packages/ui/button"
import { cn } from "@shared/utils"
import { api } from "@shared/api"
import { TagSelector } from "@features/tags/components/TagChips"
import type { Entry } from "@shared/store"
import { formatToastError, useToast } from "@shared/components/toast"
import type { AssetWithUrls } from "@contracts/features/assets"
import type { MeasurementUnit, WeightUnit } from "@contracts/contracts"

interface EditEntryDialogProps {
    entry: Entry | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditEntryDialog({ entry, open, onOpenChange }: EditEntryDialogProps) {
    const { data: trackers = [] } = useTrackers()
    const { data: assetsData = [] } = useAssets()
    const { data: tags = [] } = useTags()
    const assetList = useMemo<AssetWithUrls[]>(() => assetsData as AssetWithUrls[], [assetsData])
    const assets = useMemo<Map<number, AssetWithUrls>>(
        () => new Map(assetList.map((asset) => [asset.id, asset])),
        [assetList],
    )
    const updateEntryMutation = useUpdateEntryMutation()
    const updateWeightEntryMutation = useUpdateWeightEntryMutation()
    const createTagMutation = useCreateTagMutation()
    const qc = useQueryClient()
    const toast = useToast()

    const [value, setValue] = useState("")
    const [note, setNote] = useState("")
    const [waist, setWaist] = useState("")
    const [date, setDate] = useState("")
    const [time, setTime] = useState("")
    const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null)
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
    const [assetPickerOpen, setAssetPickerOpen] = useState(false)

    const readMetadata = (metadata: Entry["metadata"]): Record<string, unknown> => {
        if (typeof metadata === "string") {
            try {
                return JSON.parse(metadata) as Record<string, unknown>
            } catch {
                return {}
            }
        }
        return metadata ?? {}
    }

    const getWeightUnit = (): WeightUnit => {
        const configuredUnit = tracker?.config?.unit
        return configuredUnit === "lb" || configuredUnit === "lbs" ? "lb" : "kg"
    }

    const getWaistUnit = (): MeasurementUnit => getWeightUnit() === "lb" ? "in" : "cm"

    // Initialize form when entry or open state changes
    useEffect(() => {
        if (open && entry) {
            setValue(entry.value != null ? entry.value.toString() : "")
            setNote(entry.note || "")
            setSelectedAssetId(entry.assetId || null)
            setSelectedTagIds(entry.tagIds ?? [])
            const metadata = readMetadata(entry.metadata)
            const metadataWaist = metadata.waist
            setWaist(typeof metadataWaist === "number" ? metadataWaist.toString() : "")

            // format local date and time from timestamp
            const d = new Date(entry.timestamp)
            setDate(format(d, "yyyy-MM-dd"))
            setTime(format(d, "HH:mm"))
        }
    }, [open, entry])

    const tracker = entry ? trackers.find((t) => t.id === entry.trackerId) : null

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!entry || !tracker) return

        // Calculate new timestamp from date and time inputs
        const [year, month, day] = date.split("-").map(Number)
        const [hours, minutes] = time.split(":").map(Number)

        // Create date in local timezone
        const baseDate = new Date()
        baseDate.setFullYear(year, month - 1, day)
        baseDate.setHours(hours, minutes, 0, 0)

        const timestamp = baseDate.getTime()

        // Parse value depending on tracker type
        let parsedValue: number | null = null
        if (value.trim() !== "") {
            parsedValue = parseFloat(value)
            if (isNaN(parsedValue)) parsedValue = null
        }

        try {
            const isWeightTracker =
                tracker.icon === "scale" ||
                tracker.name.toLowerCase().includes("weight") ||
                tracker.name.toLowerCase().includes("peso")

            if (isWeightTracker) {
                if (parsedValue == null) return
                const parsedWaist = waist.trim() ? parseFloat(waist) : null
                if (parsedWaist !== null && !Number.isFinite(parsedWaist)) return
                await updateWeightEntryMutation.mutateAsync({
                    entryId: entry.id,
                    updates: {
                        weight: parsedValue,
                        weightUnit: getWeightUnit(),
                        waist: parsedWaist,
                        waistUnit: parsedWaist !== null ? getWaistUnit() : null,
                        note: note.trim() || null,
                        assetId: selectedAssetId,
                        tagIds: selectedTagIds,
                        timestamp,
                    },
                })
            } else {
                await updateEntryMutation.mutateAsync({
                    id: entry.id,
                    updates: {
                        value: parsedValue,
                        note: note.trim() || null,
                        assetId: selectedAssetId,
                        tagIds: selectedTagIds,
                        timestamp,
                    },
                })
            }

            toast.info("Entry updated.", tracker.name)
            onOpenChange(false)
        } catch (error) {
            toast.error(
                "We couldn't save that entry.",
                formatToastError(error, "Please try again in a moment."),
            )
        }
    }

    const handleAssetUpload = async () => {
        try {
            const result = await api.openFileDialog({
                filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] }],
            })
            if (!result.path) return
            await api.uploadAsset(result.path)
            qc.invalidateQueries({ queryKey: ["assets"] })
            // Select the most recent one ideally, but relying on invalidate for now
        } catch (error) {
            toast.error(
                "We couldn't add that image.",
                formatToastError(error, "Please try again in a moment."),
            )
            console.error("Upload failed", error)
        }
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

    if (!tracker) return null
    const isPending = updateEntryMutation.isPending || updateWeightEntryMutation.isPending
    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen && isPending) return
        onOpenChange(nextOpen)
    }

    // UI rendering based on tracker type (simplified version of QuickEntry)
    const isNumeric = tracker.type === "numeric" || tracker.type === "range" || tracker.type === "counter"
    const isText = tracker.type === "text" || tracker.type === "list"
    const isWeightTracker = tracker.icon === "scale" || tracker.name.toLowerCase().includes("weight") || tracker.name.toLowerCase().includes("peso")
    const waistUnit = getWaistUnit()
    const selectedAsset = selectedAssetId ? assets.get(selectedAssetId) : undefined
    const assetPreviewUrl = (asset: AssetWithUrls) =>
        asset.thumbnailUrl || asset.assetUrl || `chimero-asset://${asset.path}`

    // Calculate if the save button should be disabled
    const waistValue = waist.trim() ? parseFloat(waist) : null
    const saveDisabled = isWeightTracker
        ? !value || (waist.trim() !== "" && !Number.isFinite(waistValue))
        : isText ? !note.trim() && !value : !value && !note.trim()

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md min-w-0 overflow-hidden p-0">
                <div className="max-h-[85vh] overflow-y-auto">
                    <div className="flex items-center gap-3 border-b border-[hsl(var(--border)/0.7)] px-6 py-5">
                        <div className="surface-chip flex h-10 w-10 items-center justify-center rounded-xl">
                            <PencilLine className="h-5 w-5 text-[hsl(var(--primary))]" />
                        </div>
                        <div className="min-w-0">
                            <div className="section-kicker">Edit entry</div>
                            <h2 className="mt-1 truncate text-lg font-semibold text-[hsl(var(--foreground))]">{tracker.name}</h2>
                            <p className="line-clamp-2 text-xs text-[hsl(var(--muted-foreground))]">Modify entry details and past timestamp.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 p-6">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Date</label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="h-11 bg-white/5 text-[hsl(var(--foreground))] [color-scheme:dark]"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Time</label>
                                <Input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="h-11 bg-white/5 text-[hsl(var(--foreground))] [color-scheme:dark]"
                                    required
                                />
                            </div>
                        </div>

                        {tracker.type === "rating" ? (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                        type="button"
                                        key={rating}
                                        onClick={() => setValue(rating.toString())}
                                        className={cn(
                                            "rounded-xl border px-3 py-3 text-lg transition-all duration-200 ease-out",
                                            value === rating.toString()
                                                ? "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--foreground))]"
                                                : "border-[hsl(var(--border)/0.7)] bg-white/5 text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border)/0.95)] hover:bg-white/5"
                                        )}
                                    >
                                        {rating}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {isNumeric && (
                                    <div className="space-y-1">
                                        <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Value</label>
                                        <Input
                                            type="number"
                                            placeholder={`Enter ${tracker.config?.unit || "value"}...`}
                                            value={value}
                                            onChange={(e) => setValue(e.target.value)}
                                            className="h-11 bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                                            autoFocus
                                        />
                                    </div>
                                )}

                                {isWeightTracker && (
                                    <div className="space-y-1">
                                        <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">
                                            Waist (Optional)
                                        </label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="Waist measurement"
                                                value={waist}
                                                onChange={(e) => setWaist(e.target.value)}
                                                className="h-11 bg-white/5 pr-12 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                                            />
                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))]">
                                                {waistUnit}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Note (Optional)</label>
                                    <Input
                                        type="text"
                                        placeholder="Add a note..."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="h-11 bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                                        autoFocus={isText}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <TagSelector
                                tags={tags}
                                selectedTagIds={selectedTagIds}
                                onChange={setSelectedTagIds}
                                onCreateTag={handleCreateTag}
                                disabled={isPending}
                                creating={createTagMutation.isPending}
                                compact
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Image Attachment</span>
                                {!assetPickerOpen && (
                                    <button
                                        type="button"
                                        onClick={() => setAssetPickerOpen(true)}
                                        className="flex items-center gap-1 text-xs text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--foreground))]"
                                    >
                                        <ImageIcon className="h-3 w-3" />
                                        {selectedAssetId ? "Change" : "Add Image"}
                                    </button>
                                )}
                            </div>

                            {assetPickerOpen ? (
                                <div className="surface-card space-y-3 rounded-2xl p-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full rounded-xl"
                                        onClick={handleAssetUpload}
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
                                                            setSelectedAssetId(asset.id)
                                                            setAssetPickerOpen(false)
                                                        }}
                                                        className={cn(
                                                            "group relative aspect-square min-w-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ease-out",
                                                            selectedAssetId === asset.id
                                                                ? "border-[hsl(var(--primary)/0.35)]"
                                                                : "border-[hsl(var(--border)/0.7)] hover:border-[hsl(var(--primary)/0.35)]"
                                                        )}
                                                    >
                                                        <img
                                                            src={assetPreviewUrl(asset)}
                                                            alt={asset.originalName || "Asset"}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setAssetPickerOpen(false)}
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </div>
                            ) : selectedAsset ? (
                                <div className="relative inline-block">
                                    <div className="h-24 w-24 overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.7)] bg-white/5">
                                        <img
                                            src={assetPreviewUrl(selectedAsset)}
                                            alt="Selected asset"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedAssetId(null)}
                                        className="absolute -right-2 -top-2 rounded-full border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card))] p-1.5 text-[hsl(var(--muted-foreground))] shadow-sm transition-all hover:bg-[hsl(var(--destructive)/0.12)] hover:text-[hsl(var(--destructive))]"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border)/0.7)] pt-4 sm:flex-row">
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl sm:flex-1"
                                onClick={() => onOpenChange(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="rounded-xl sm:flex-1"
                                disabled={saveDisabled}
                                loading={isPending}
                                loadingText="Saving changes..."
                            >
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
