"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Upload, Search, Grid3x3, List, Trash2, Edit, Download, ImageIcon } from "lucide-react"
import { cn } from "@shared/utils"
import { useAssets, useUploadAssetMutation, useUpdateAssetMutation, useDeleteAssetMutation } from "@shared/queries"
import { type AssetCategory } from "@shared/store"
import { formatToastError, useToast } from "@shared/components/toast"
import { api } from "@shared/api"

/** API asset shape (from get-assets / upload-asset) */
interface ApiAsset {
  id: number
  filename: string
  originalName?: string | null
  path: string
  type: string
  assetUrl: string
  thumbnailUrl?: string | null
  size?: number | null
  createdAt?: number | null
}

const assetCategories: { id: AssetCategory | "all"; name: string }[] = [
  { id: "all", name: "All Assets" },
  { id: "person", name: "People & Social" },
  { id: "games", name: "Games" },
  { id: "books", name: "Books" },
  { id: "tv", name: "TV & Movies" },
  { id: "apps", name: "Apps & Media" },
  { id: "other", name: "Other" },
]

function EditAssetForm({
  asset,
  nameFor,
  onSave,
  onClose,
  isSaving,
}: {
  asset: ApiAsset
  nameFor: (a: ApiAsset) => string
  onSave: (originalName: string) => void
  onClose: () => void
  isSaving: boolean
}) {
  const [editName, setEditName] = useState(nameFor(asset))
  return (
    <div className="space-y-4">
      <div className="aspect-video bg-[hsl(210_20%_15%)] rounded-xl flex items-center justify-center overflow-hidden border border-[hsl(210_18%_22%)]">
        <img
          src={asset.assetUrl}
          alt={nameFor(asset)}
          className="w-full h-full object-contain p-4"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[hsl(210_25%_97%)] mb-1.5">Name</label>
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] focus:outline-none focus:border-[hsl(266_73%_63%)]"
        />
      </div>
      <p className="text-sm text-[hsl(210_12%_47%)]">Type: {asset.type}</p>
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => onSave(editName)}
          disabled={isSaving}
          className="flex-1 px-4 py-2.5 rounded-lg bg-[hsl(266_73%_63%)] text-white font-medium hover:bg-[hsl(266_73%_58%)] transition-colors disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save Changes"}
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-lg bg-transparent border border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] font-medium hover:bg-[hsl(210_20%_15%)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function AssetsPage() {
  const { data } = useAssets()
  const assets = (data ?? []) as ApiAsset[]
  const uploadMutation = useUploadAssetMutation()
  const updateAssetMutation = useUpdateAssetMutation()
  const deleteMutation = useDeleteAssetMutation()
  const toast = useToast()
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "all">("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  const [editingAsset, setEditingAsset] = useState<ApiAsset | null>(null)
  const [deletingAsset, setDeletingAsset] = useState<ApiAsset | null>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const nameFor = (asset: ApiAsset) => asset.originalName || asset.filename

  // Helper function to determine if asset is person/social (for rounded styling)
  const isPersonAsset = (asset: ApiAsset) => {
    // Check if asset type or name indicates it's a person/social asset
    const name = nameFor(asset).toLowerCase()
    return asset.type === 'person' || 
           name.includes('person') || 
           name.includes('people') || 
           name.includes('social') ||
           name.includes('profile') ||
           name.includes('avatar') ||
           name.includes('contact')
  }

  const filteredAssets = assets.filter((asset) => {
    const matchesCategory = selectedCategory === "all" || asset.type === selectedCategory
    const matchesSearch = nameFor(asset).toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleUploadClick()
  }

  const handleUploadClick = () => {
    uploadMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result) {
          toast.success("Asset added.", "Your library was updated.")
        }
      },
      onError: (error) => {
        toast.error(
          "We couldn't upload that asset.",
          formatToastError(error, "Please try again in a moment."),
        )
      },
    })
  }



  const handleEditAsset = (originalName: string) => {
    if (!editingAsset) return
    const asset = editingAsset
    updateAssetMutation.mutate(
      { id: asset.id, originalName: originalName.trim() || null },
      {
        onSuccess: () => {
          setEditingAsset(null)
          toast.info("Asset updated.", nameFor(asset))
        },
        onError: (error) =>
          toast.error(
            "We couldn't save that asset.",
            formatToastError(error, "Please try again in a moment."),
          ),
      }
    )
  }

  const handleDeleteAsset = async () => {
    if (!deletingAsset) return

    const asset = deletingAsset

    try {
      await deleteMutation.mutateAsync(asset.id)
      setDeletingAsset(null)
      toast.destructive("Asset deleted.", nameFor(asset))
    } catch (error) {
      toast.error(
        "We couldn't delete that asset.",
        formatToastError(error, "Please try again in a moment."),
      )
    }
  }

  const handleDownload = (asset: ApiAsset) => {
    api.downloadAsset(asset.id, nameFor(asset)).then((result) => {
      if (result.ok) {
        toast.info("Asset saved.", nameFor(asset))
      } else if (!result.canceled) {
        toast.error(
          "We couldn't download that asset.",
          result.error ?? "Please try again in a moment.",
        )
      }
    }).catch((error) => {
      toast.error(
        "We couldn't download that asset.",
        formatToastError(error, "Please try again in a moment."),
      )
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="surface-panel flex flex-col items-start gap-4 rounded-3xl p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-title mb-2 text-[2.4rem]">Assets</h1>
          <p className="page-subtitle max-w-2xl">Manage your images and icons with a calmer, more tactile library flow.</p>
        </div>

        <button
          onClick={handleUploadClick}
          disabled={uploadMutation.isPending}
          className="flex items-center gap-2 rounded-xl bg-[hsl(266_73%_63%)] px-4 py-2.5 font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[hsl(266_73%_58%)] disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          {uploadMutation.isPending ? "Uploading…" : "Upload Assets"}
        </button>
      </div>

      {/* Drop Zone - click opens native file dialog */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "surface-panel rounded-3xl border-2 border-dashed p-8 transition-all duration-200 ease-out cursor-pointer",
          isDragging
            ? "border-[hsl(266_73%_63%)] bg-[hsl(266_73%_63%/0.06)]"
            : "border-white/10 hover:border-[hsl(266_73%_63%/0.45)]"
        )}
        onClick={handleUploadClick}
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(266_73%_63%/0.18)] to-[hsl(187_84%_44%/0.12)]">
            <Upload className="h-8 w-8 text-[hsl(266_73%_63%)]" />
          </div>
          <div>
            <h3 className="mb-1 font-display text-lg font-semibold text-[hsl(210_28%_97%)]">
              Click or drop to open file picker
            </h3>
            <p className="text-sm text-[hsl(220_12%_58%)]">
              Supports images and video. Files are saved to app data.
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {assetCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "surface-chip rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-out",
                selectedCategory === category.id
                  ? "border-[hsl(266_73%_63%)] bg-[hsl(266_73%_63%)] text-white shadow-lg shadow-primary/20"
                  : "text-[hsl(210_28%_97%)] hover:border-white/12 hover:bg-white/[0.06]"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-xs sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(220_12%_58%)]" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/8 bg-white/[0.05] py-2 pl-10 pr-4 text-[hsl(210_28%_97%)] placeholder:text-[hsl(220_12%_58%)] focus:border-[hsl(266_73%_63%)] focus:outline-none"
            />
          </div>

          <div className="surface-chip overflow-hidden rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 transition-all duration-200 ease-out",
                viewMode === "grid"
                  ? "bg-[hsl(266_73%_63%)] text-white shadow-lg shadow-primary/20"
                  : "text-[hsl(220_12%_58%)] hover:bg-white/[0.06]"
              )}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 transition-all duration-200 ease-out",
                viewMode === "list"
                  ? "bg-[hsl(266_73%_63%)] text-white shadow-lg shadow-primary/20"
                  : "text-[hsl(220_12%_58%)] hover:bg-white/[0.06]"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Assets Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="group surface-panel rounded-2xl p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[hsl(266_73%_63%/0.35)]"
            >
              <div className={cn(
                "mb-3 flex aspect-square items-center justify-center overflow-hidden bg-white/[0.04]",
                isPersonAsset(asset) ? "rounded-full" : "rounded-lg"
              )}>
                <img
                  src={asset.thumbnailUrl || asset.assetUrl}
                  alt={nameFor(asset)}
                  className="w-full h-full object-contain p-4"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium text-[hsl(210_28%_97%)]">{nameFor(asset)}</span>
                  <span className="rounded-full border border-white/8 bg-white/[0.05] px-2 py-0.5 text-xs text-[hsl(220_12%_58%)]">
                    {asset.type.toUpperCase()}
                  </span>
                </div>

                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setEditingAsset(asset)}
                    className="rounded-lg p-2 text-[hsl(220_12%_58%)] transition-colors hover:bg-white/[0.06] hover:text-[hsl(210_28%_97%)]"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownload(asset)}
                    className="rounded-lg p-2 text-[hsl(220_12%_58%)] transition-colors hover:bg-white/[0.06] hover:text-[hsl(210_28%_97%)]"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingAsset(asset)}
                    className="rounded-lg p-2 text-[hsl(0_65%_54%)] transition-colors hover:bg-[hsl(0_65%_54%/0.1)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="surface-panel flex items-center gap-4 rounded-2xl p-4 transition-colors hover:border-[hsl(266_73%_63%/0.35)]"
            >
              <div className={cn(
                "flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden bg-white/[0.04]",
                isPersonAsset(asset) ? "rounded-full" : "rounded-lg"
              )}>
                <img
                  src={asset.thumbnailUrl || asset.assetUrl}
                  alt={nameFor(asset)}
                  className="w-full h-full object-contain p-2"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="truncate font-medium text-[hsl(210_28%_97%)]">{nameFor(asset)}</h4>
                <p className="text-sm capitalize text-[hsl(220_12%_58%)]">{asset.type}</p>
              </div>

              <span className="rounded-full border border-white/8 bg-white/[0.05] px-2 py-1 text-xs text-[hsl(220_12%_58%)]">
                {asset.type.toUpperCase()}
              </span>

              <div className="flex gap-1">
                <button
                  onClick={() => setEditingAsset(asset)}
                  className="rounded-lg p-2 text-[hsl(220_12%_58%)] transition-colors hover:bg-white/[0.06] hover:text-[hsl(210_28%_97%)]"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDownload(asset)}
                  className="rounded-lg p-2 text-[hsl(220_12%_58%)] transition-colors hover:bg-white/[0.06] hover:text-[hsl(210_28%_97%)]"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingAsset(asset)}
                  className="rounded-lg p-2 text-[hsl(0_65%_54%)] transition-colors hover:bg-[hsl(0_65%_54%/0.1)]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredAssets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-xl bg-[hsl(210_20%_15%)] flex items-center justify-center mb-4">
            <ImageIcon className="w-10 h-10 text-[hsl(210_12%_47%)]" />
          </div>
          <h3 className="font-display font-semibold text-lg mb-2 text-[hsl(210_25%_97%)]">No assets found</h3>
          <p className="text-[hsl(210_12%_47%)] mb-4">
            {searchQuery ? "Try a different search term" : "Start by uploading your first asset"}
          </p>
          <button
            onClick={handleUploadClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[hsl(266_73%_63%)] text-white font-medium hover:bg-[hsl(266_73%_58%)] transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Asset
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingAsset && (
        <div key={editingAsset.id} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-display font-bold mb-4 text-[hsl(210_25%_97%)]">Edit Asset</h3>
            <EditAssetForm
              asset={editingAsset}
              nameFor={nameFor}
              onSave={handleEditAsset}
              onClose={() => setEditingAsset(null)}
              isSaving={updateAssetMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-xl font-display font-bold mb-2 text-[hsl(210_25%_97%)]">Delete Asset</h3>
            <p className="text-[hsl(210_12%_47%)] mb-6">
              Are you sure you want to delete &quot;{nameFor(deletingAsset)}&quot;? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteAsset}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-lg bg-[hsl(0_65%_54%)] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[hsl(0_65%_49%)] disabled:cursor-wait disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setDeletingAsset(null)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-transparent border border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] font-medium hover:bg-[hsl(210_20%_15%)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
