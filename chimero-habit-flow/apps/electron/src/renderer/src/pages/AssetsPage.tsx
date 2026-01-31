"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Upload, Search, Grid3x3, List, Trash2, Edit, Download, X, AlertCircle, Check, ImageIcon } from "lucide-react"
import { cn } from "../lib/utils"
import { useAppStore, type Asset, type AssetCategory } from "../lib/store"

const assetCategories: { id: AssetCategory | "all"; name: string }[] = [
  { id: "all", name: "All Assets" },
  { id: "games", name: "Games" },
  { id: "books", name: "Books" },
  { id: "tv", name: "TV & Movies" },
  { id: "apps", name: "Apps & Media" },
  { id: "other", name: "Other" },
]

interface StagedAsset {
  file: File | null
  base64: string | null
  name: string
  category: AssetCategory
}

export function AssetsPage() {
  const { assets, addAsset, updateAsset, deleteAsset } = useAppStore()
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "all">("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  const [stagedAsset, setStagedAsset] = useState<StagedAsset | null>(null)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null)
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const filteredAssets = assets.filter((asset) => {
    const matchesCategory = selectedCategory === "all" || asset.category === selectedCategory
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find((file) => file.type.startsWith("image/"))

    if (!imageFile) {
      showNotification("error", "Please drop an image file")
      return
    }

    await stageFile(imageFile)
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await stageFile(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const stageFile = async (file: File) => {
    try {
      const base64 = await fileToBase64(file)
      setStagedAsset({
        file,
        base64,
        name: file.name.replace(/\.[^/.]+$/, ""),
        category: "other",
      })
    } catch (error) {
      showNotification("error", `Failed to process ${file.name}`)
    }
  }

  const confirmStagedAsset = () => {
    if (!stagedAsset || !stagedAsset.base64 || !stagedAsset.name.trim()) {
      showNotification("error", "Please provide a name for the asset")
      return
    }

    const extension = stagedAsset.file?.name.split(".").pop() || "png"

    addAsset({
      name: stagedAsset.name.trim(),
      category: stagedAsset.category,
      url: stagedAsset.base64,
      type: extension as Asset["type"],
      size: stagedAsset.file?.size,
    })

    setStagedAsset(null)
    showNotification("success", "Asset added successfully")
  }

  const cancelStagedAsset = () => {
    setStagedAsset(null)
  }

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || [])
      const imageItem = items.find((item) => item.type.startsWith("image/"))

      if (imageItem) {
        e.preventDefault()
        const file = imageItem.getAsFile()
        if (file) {
          await stageFile(file)
        }
      }
    }

    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [])

  const handleEditAsset = () => {
    if (!editingAsset) return

    updateAsset(editingAsset.id, {
      name: editingAsset.name,
      category: editingAsset.category,
    })

    setEditingAsset(null)
    showNotification("success", "Asset updated successfully")
  }

  const handleDeleteAsset = () => {
    if (!deletingAsset) return

    deleteAsset(deletingAsset.id)
    setDeletingAsset(null)
    showNotification("success", "Asset deleted successfully")
  }

  const handleDownload = (asset: Asset) => {
    try {
      const link = document.createElement("a")
      link.href = asset.url
      link.download = `${asset.name}.${asset.type}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showNotification("success", "Download started")
    } catch {
      showNotification("error", "Failed to download asset")
    }
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
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[hsl(266_73%_63%)] text-white font-medium hover:bg-[hsl(266_73%_58%)] transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Assets
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "bg-[hsl(210_25%_11%)] border-2 border-dashed rounded-2xl p-8 transition-colors",
          isDragging
            ? "border-[hsl(266_73%_63%)] bg-[hsl(266_73%_63%/0.05)]"
            : "border-[hsl(210_18%_22%)] hover:border-[hsl(266_73%_63%/0.5)]",
          !stagedAsset && "cursor-pointer"
        )}
        onClick={() => !stagedAsset && fileInputRef.current?.click()}
      >
        {stagedAsset ? (
          // Staged Asset Preview
          <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg text-[hsl(210_25%_97%)]">Preview Asset</h3>
              <button
                onClick={cancelStagedAsset}
                className="p-2 rounded-lg hover:bg-[hsl(210_20%_15%)] transition-colors"
              >
                <X className="w-4 h-4 text-[hsl(210_12%_47%)]" />
              </button>
            </div>

            <div className="w-full max-w-md mx-auto aspect-square bg-[hsl(210_20%_15%)] rounded-xl flex items-center justify-center overflow-hidden border border-[hsl(210_18%_22%)]">
              <img
                src={stagedAsset.base64 || ""}
                alt="Preview"
                className="w-full h-full object-contain p-8"
              />
            </div>

            <div className="w-full max-w-md mx-auto space-y-4">
              <div>
                <label htmlFor="staged-name" className="block text-sm font-medium text-[hsl(210_25%_97%)] mb-1.5">
                  Asset Name *
                </label>
                <input
                  id="staged-name"
                  value={stagedAsset.name}
                  onChange={(e) => setStagedAsset({ ...stagedAsset, name: e.target.value })}
                  placeholder="Enter asset name"
                  className="w-full px-4 py-2.5 rounded-lg bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)] focus:outline-none focus:border-[hsl(266_73%_63%)]"
                />
              </div>

              <div>
                <label htmlFor="staged-category" className="block text-sm font-medium text-[hsl(210_25%_97%)] mb-1.5">
                  Category *
                </label>
                <select
                  id="staged-category"
                  value={stagedAsset.category}
                  onChange={(e) => setStagedAsset({ ...stagedAsset, category: e.target.value as AssetCategory })}
                  className="w-full px-4 py-2.5 rounded-lg bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] focus:outline-none focus:border-[hsl(266_73%_63%)]"
                >
                  {assetCategories
                    .filter((c) => c.id !== "all")
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={confirmStagedAsset}
                  disabled={!stagedAsset.name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[hsl(266_73%_63%)] text-white font-medium hover:bg-[hsl(266_73%_58%)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  Add Asset
                </button>
                <button
                  onClick={cancelStagedAsset}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-transparent border border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] font-medium hover:bg-[hsl(210_20%_15%)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Upload Prompt
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-xl bg-[hsl(266_73%_63%/0.1)] flex items-center justify-center">
              <Upload className="w-8 h-8 text-[hsl(266_73%_63%)]" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg mb-1 text-[hsl(210_25%_97%)]">
                Drop files here or click to upload
              </h3>
              <p className="text-sm text-[hsl(210_12%_47%)]">
                Supports SVG, PNG, JPG, GIF, WebP. Paste from clipboard with Ctrl+V
              </p>
            </div>
          </div>
        )}
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
                  src={asset.url || "/placeholder.svg"}
                  alt={asset.name}
                  className="w-full h-full object-contain p-4"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate text-[hsl(210_25%_97%)]">{asset.name}</span>
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
                  src={asset.url || "/placeholder.svg"}
                  alt={asset.name}
                  className="w-full h-full object-contain p-2"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate text-[hsl(210_25%_97%)]">{asset.name}</h4>
                <p className="text-sm text-[hsl(210_12%_47%)] capitalize">{asset.category}</p>
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
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[hsl(266_73%_63%)] text-white font-medium hover:bg-[hsl(266_73%_58%)] transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Asset
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-display font-bold mb-4 text-[hsl(210_25%_97%)]">Edit Asset</h3>

            <div className="space-y-4">
              <div className="aspect-video bg-[hsl(210_20%_15%)] rounded-xl flex items-center justify-center overflow-hidden border border-[hsl(210_18%_22%)]">
                <img
                  src={editingAsset.url || "/placeholder.svg"}
                  alt={editingAsset.name}
                  className="w-full h-full object-contain p-4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(210_25%_97%)] mb-1.5">Name</label>
                <input
                  value={editingAsset.name}
                  onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] focus:outline-none focus:border-[hsl(266_73%_63%)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(210_25%_97%)] mb-1.5">Category</label>
                <select
                  value={editingAsset.category}
                  onChange={(e) => setEditingAsset({ ...editingAsset, category: e.target.value as AssetCategory })}
                  className="w-full px-4 py-2.5 rounded-lg bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] focus:outline-none focus:border-[hsl(266_73%_63%)]"
                >
                  {assetCategories
                    .filter((c) => c.id !== "all")
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleEditAsset}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[hsl(266_73%_63%)] text-white font-medium hover:bg-[hsl(266_73%_58%)] transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingAsset(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-transparent border border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] font-medium hover:bg-[hsl(210_20%_15%)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-xl font-display font-bold mb-2 text-[hsl(210_25%_97%)]">Delete Asset</h3>
            <p className="text-[hsl(210_12%_47%)] mb-6">
              Are you sure you want to delete "{deletingAsset.name}"? This action cannot be undone.
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
