import React, { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTrackers, useUpdateEntryMutation, useAssets } from "../../lib/queries"
import { Dialog, DialogContent } from "@packages/ui/dialog"
import { format } from "date-fns"
import { Trash2, Camera, ImageIcon } from "lucide-react"
import { Button } from "@packages/ui/button"
import { cn } from "../../lib/utils"
import { api } from "../../lib/api"
import type { Entry } from "../../lib/store"

interface EditEntryDialogProps {
    entry: Entry | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditEntryDialog({ entry, open, onOpenChange }: EditEntryDialogProps) {
    const { data: trackers = [] } = useTrackers()
    const { data: assetsData = new Map() } = useAssets()
    const assets = assetsData as Map<number, { id: number; path: string; originalName?: string | null }>
    const updateEntryMutation = useUpdateEntryMutation()
    const qc = useQueryClient()

    const [value, setValue] = useState("")
    const [note, setNote] = useState("")
    const [date, setDate] = useState("")
    const [time, setTime] = useState("")
    const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null)
    const [assetPickerOpen, setAssetPickerOpen] = useState(false)

    // Initialize form when entry or open state changes
    useEffect(() => {
        if (open && entry) {
            setValue(entry.value != null ? entry.value.toString() : "")
            setNote(entry.note || "")
            setSelectedAssetId(entry.assetId || null)

            // format local date and time from timestamp
            const d = new Date(entry.timestamp)
            setDate(format(d, "yyyy-MM-dd"))
            setTime(format(d, "HH:mm"))
        }
    }, [open, entry])

    const tracker = entry ? trackers.find((t) => t.id === entry.trackerId) : null

    const handleSubmit = (e?: React.FormEvent) => {
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

        updateEntryMutation.mutate(
            {
                id: entry.id,
                updates: {
                    value: parsedValue,
                    note: note.trim() || null,
                    assetId: selectedAssetId,
                    timestamp,
                },
            },
            {
                onSuccess: () => {
                    onOpenChange(false)
                }
            }
        )
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
            console.error("Upload failed", error)
        }
    }

    if (!tracker) return null

    // UI rendering based on tracker type (simplified version of QuickEntry)
    const isNumeric = tracker.type === "numeric" || tracker.type === "range" || tracker.type === "counter"
    const isText = tracker.type === "text" || tracker.type === "list"

    // Calculate if the save button should be disabled
    const saveDisabled = isText ? !note.trim() && !value : !value && !note.trim()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-[hsl(210_24%_10%)] border-white/10 text-white p-0 overflow-hidden shadow-2xl">
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                        <span className="text-2xl">{tracker.icon || "📝"}</span>
                        <div>
                            <h2 className="text-lg font-semibold text-white/90">Edit {tracker.name}</h2>
                            <p className="text-xs text-white/50">Modify entry details and past timestamp.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Timestamp Editing */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-xs text-white/50">Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] rounded-lg p-2  border outline-none focus:border-[hsl(266_73%_63%)]"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-white/50">Time</label>
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] rounded-lg p-2 border outline-none focus:border-[hsl(266_73%_63%)]"
                                    required
                                />
                            </div>
                        </div>

                        {/* Inputs based on tracker type */}
                        {tracker.type === "rating" ? (
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                        type="button"
                                        key={rating}
                                        onClick={() => setValue(rating.toString())}
                                        className={cn(
                                            "flex-1 py-3 rounded-lg border transition-all text-lg",
                                            value === rating.toString()
                                                ? "bg-[hsl(266_73%_63%)] border-[hsl(266_73%_63%)] text-white"
                                                : "bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_12%_47%)] hover:bg-[hsl(210_20%_20%)]",
                                        )}
                                    >
                                        {rating}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {isNumeric && (
                                    <div className="space-y-1">
                                        <label className="text-xs text-white/50">Value</label>
                                        <input
                                            type="number"
                                            placeholder={`Enter ${tracker.config?.unit || "value"}...`}
                                            value={value}
                                            onChange={(e) => setValue(e.target.value)}
                                            className="w-full text-lg h-12 bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] border rounded-lg p-3 text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)] outline-none focus:border-[hsl(266_73%_63%)]"
                                            autoFocus
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-xs text-white/50">Note (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Add a note..."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="w-full h-12 bg-[hsl(210_20%_15%)] rounded-lg p-3 border border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)] outline-none focus:border-[hsl(266_73%_63%)]"
                                        autoFocus={isText}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Assets */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-[hsl(210_12%_47%)]">Image Attachment</span>
                                {!assetPickerOpen && (
                                    <button
                                        type="button"
                                        onClick={() => setAssetPickerOpen(true)}
                                        className="text-xs text-[hsl(266_73%_63%)] hover:text-[hsl(266_73%_73%)] flex items-center gap-1"
                                    >
                                        <ImageIcon className="w-3 h-3" />
                                        {selectedAssetId ? "Change" : "Add Image"}
                                    </button>
                                )}
                            </div>

                            {assetPickerOpen ? (
                                <div className="space-y-3 bg-black/20 p-3 rounded-xl border border-white/5">
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="flex-1 border-dashed border-white/20 hover:border-white/40 bg-white/[0.02]"
                                            onClick={handleAssetUpload}
                                        >
                                            <Camera className="w-4 h-4 mr-2" />
                                            Upload New
                                        </Button>
                                    </div>
                                    {Array.from(assets.values()).length > 0 && (
                                        <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                            <div className="grid grid-cols-4 gap-2">
                                                {Array.from(assets.values()).map((asset) => (
                                                    <button
                                                        type="button"
                                                        key={asset.id}
                                                        onClick={() => {
                                                            setSelectedAssetId(asset.id)
                                                            setAssetPickerOpen(false)
                                                        }}
                                                        className={cn(
                                                            "relative aspect-square rounded-lg overflow-hidden border-2 transition-all group",
                                                            selectedAssetId === asset.id
                                                                ? "border-[hsl(266_73%_63%)] scale-95"
                                                                : "border-transparent hover:border-white/20",
                                                        )}
                                                    >
                                                        <img
                                                            src={`chimero-asset://${asset.path}`}
                                                            alt={asset.originalName || "Asset"}
                                                            className="w-full h-full object-cover"
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
                                            className="text-white/50 hover:text-white"
                                            onClick={() => setAssetPickerOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : selectedAssetId ? (
                                <div className="relative inline-block group">
                                    <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/10 bg-white/5">
                                        <img
                                            src={`chimero-asset://${assets.get(selectedAssetId)?.path}`}
                                            alt="Selected asset"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedAssetId(null)}
                                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-rose-600 hover:scale-110"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-white/10 mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 bg-transparent border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_20%)]"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
                                disabled={saveDisabled || updateEntryMutation.isPending}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
