"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Upload, Search, Grid3x3, List, Trash2, Edit, Download, AlertCircle, ImageIcon } from "lucide-react"
import { cn } from "../lib/utils"
import { useAssets, useUploadAssetMutation, useUpdateAssetMutation, useDeleteAssetMutation } from "../lib/queries"
import { type AssetCategory } from "../lib/store"

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
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "all">("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  const [editingAsset, setEditingAsset] = useState<ApiAsset | null>(null)
  const [deletingAsset, setDeletingAsset] = useState<ApiAsset | null>(null)
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const nameFor = (asset: ApiAsset) => asset.originalName || asset.filename

  const filteredAssets = assets.filter((asset) => {
    const matchesCategory = selectedCategory === "all"
    const matchesSearch = nameFor(asset).toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

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
          showNotification("success", "Asset uploaded successfully")
        }
      },
      onError: () => {
        showNotification("error", "Upload failed")
      },
    })
  }



  const handleEditAsset = (originalName: string) => {
    if (!editingAsset) return
    updateAssetMutation.mutate(
      { id: editingAsset.id, originalName: originalName.trim() || null },
      {
        onSuccess: () => {
          setEditingAsset(null)
          showNotification("success", "Saved")
        },
        onError: () => showNotification("error", "Failed to save"),
      }
    )
  }

  const handleDeleteAsset = () => {
    if (!deletingAsset) return
    deleteMutation.mutate(deletingAsset.id, {
      onSuccess: () => {
        setDeletingAsset(null)
        showNotification("success", "Asset deleted")
      },
      onError: () => showNotification("error", "Delete failed"),
    })
  }

  const handleDownload = (asset: ApiAsset) => {
    window.api.downloadAsset(asset.id, nameFor(asset)).then((result) => {
      if (result.ok) showNotification("success", "Saved")
      else if (result.canceled) { /* user cancelled */ }
      else showNotification("error", result.error ?? "Failed to download")
    }).catch(() => showNotification("error", "Failed to download asset"))
  }

  return (
    <div className="space-y-8">
      {/* Notification */}
      {notification && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-top-2",
            notification.type === "success"
              ? "bg-[hsl(266_73%_63%/0.1)] border-[hsl(266_73%_63%/0.5)] text-[hsl(266_73%_63%)]"
              : "bg-[hsl(0_65%_54%/0.1)] border-[hsl(0_65%_54%/0.5)] text-[hsl(0_65%_54%)]"
          )}
        >
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2 text-[hsl(210_25%_97%)]">Assets</h1>
          <p className="text-[hsl(210_12%_47%)]">Manage your images and icons</p>
        </div>

        <button
          onClick={handleUploadClick}
          disabled={uploadMutation.isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[hsl(266_73%_63%)] text-white font-medium hover:bg-[hsl(266_73%_58%)] transition-colors disabled:opacity-50"
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
          "bg-[hsl(210_25%_11%)] border-2 border-dashed rounded-2xl p-8 transition-colors cursor-pointer",
          isDragging
            ? "border-[hsl(266_73%_63%)] bg-[hsl(266_73%_63%/0.05)]"
            : "border-[hsl(210_18%_22%)] hover:border-[hsl(266_73%_63%/0.5)]"
        )}
        onClick={handleUploadClick}
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 rounded-xl bg-[hsl(266_73%_63%/0.1)] flex items-center justify-center">
            <Upload className="w-8 h-8 text-[hsl(266_73%_63%)]" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg mb-1 text-[hsl(210_25%_97%)]">
              Click or drop to open file picker
            </h3>
            <p className="text-sm text-[hsl(210_12%_47%)]">
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
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border",
                selectedCategory === category.id
                  ? "bg-[hsl(266_73%_63%)] text-white border-[hsl(266_73%_63%)]"
                  : "bg-transparent text-[hsl(210_25%_97%)] border-[hsl(210_18%_22%)] hover:border-[hsl(266_73%_63%/0.5)]"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(210_12%_47%)]" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 rounded-lg bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)] focus:outline-none focus:border-[hsl(266_73%_63%)]"
            />
          </div>

          <div className="flex border border-[hsl(210_18%_22%)] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "grid"
                  ? "bg-[hsl(266_73%_63%)] text-white"
                  : "bg-transparent text-[hsl(210_12%_47%)] hover:bg-[hsl(210_20%_15%)]"
              )}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "list"
                  ? "bg-[hsl(266_73%_63%)] text-white"
                  : "bg-transparent text-[hsl(210_12%_47%)] hover:bg-[hsl(210_20%_15%)]"
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
              className="group bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-xl p-4 hover:border-[hsl(266_73%_63%/0.5)] transition-all hover:scale-[1.02]"
            >
              <div className="aspect-square bg-[hsl(210_20%_15%)] rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                <img
                  src={asset.thumbnailUrl || asset.assetUrl}
                  alt={nameFor(asset)}
                  className="w-full h-full object-contain p-4"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate text-[hsl(210_25%_97%)]">{nameFor(asset)}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[hsl(210_20%_15%)] text-[hsl(210_12%_47%)] border border-[hsl(210_18%_22%)]">
                    {asset.type.toUpperCase()}
                  </span>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingAsset(asset)}
                    className="p-2 rounded-lg hover:bg-[hsl(210_20%_15%)] text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)] transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownload(asset)}
                    className="p-2 rounded-lg hover:bg-[hsl(210_20%_15%)] text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingAsset(asset)}
                    className="p-2 rounded-lg hover:bg-[hsl(0_65%_54%/0.1)] text-[hsl(0_65%_54%)] transition-colors"
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
              className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-xl p-4 hover:border-[hsl(266_73%_63%/0.5)] transition-colors flex items-center gap-4"
            >
              <div className="w-16 h-16 bg-[hsl(210_20%_15%)] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img
                  src={asset.thumbnailUrl || asset.assetUrl}
                  alt={nameFor(asset)}
                  className="w-full h-full object-contain p-2"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate text-[hsl(210_25%_97%)]">{nameFor(asset)}</h4>
                <p className="text-sm text-[hsl(210_12%_47%)] capitalize">{asset.type}</p>
              </div>

              <span className="text-xs px-2 py-1 rounded bg-[hsl(210_20%_15%)] text-[hsl(210_12%_47%)] border border-[hsl(210_18%_22%)]">
                {asset.type.toUpperCase()}
              </span>

              <div className="flex gap-1">
                <button
                  onClick={() => setEditingAsset(asset)}
                  className="p-2 rounded-lg hover:bg-[hsl(210_20%_15%)] text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)] transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDownload(asset)}
                  className="p-2 rounded-lg hover:bg-[hsl(210_20%_15%)] text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)] transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingAsset(asset)}
                  className="p-2 rounded-lg hover:bg-[hsl(0_65%_54%/0.1)] text-[hsl(0_65%_54%)] transition-colors"
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
                className="flex-1 px-4 py-2.5 rounded-lg bg-[hsl(0_65%_54%)] text-white font-medium hover:bg-[hsl(0_65%_49%)] transition-colors"
              >
                Delete
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
