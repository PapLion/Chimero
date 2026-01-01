"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Upload, Search, Grid3x3, List, Trash2, Edit, Download, X, AlertCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAppData } from "@/contexts/app-data-context"
import { fileToBase64, downloadBase64File, getFileExtension } from "@/lib/asset-utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Asset, AssetCategoryOption, AssetCategory, AssetType } from "@/types"

const assetCategories: AssetCategoryOption[] = [
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

export default function AssetsPage() {
  const { assets, addAsset, updateAsset, deleteAsset } = useAppData()
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>("all")
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
      console.error("[v0] Error staging file:", error)
      showNotification("error", `Failed to process ${file.name}`)
    }
  }

  const confirmStagedAsset = () => {
    if (!stagedAsset || !stagedAsset.base64 || !stagedAsset.name.trim()) {
      showNotification("error", "Please provide a name for the asset")
      return
    }

    const extension = getFileExtension(stagedAsset.file?.name || "file", stagedAsset.file?.type || "image/png")

    addAsset({
      name: stagedAsset.name.trim(),
      category: stagedAsset.category,
      url: stagedAsset.base64,
      type: extension as AssetType,
      size: stagedAsset.file?.size,
    })

    setStagedAsset(null)
    showNotification("success", "Asset added successfully")
  }

  const cancelStagedAsset = () => {
    setStagedAsset(null)
  }

  // Handle paste from clipboard - now stages instead of instant upload
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
      url: editingAsset.url,
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
      const extension = asset.type !== "other" ? `.${asset.type}` : ""
      downloadBase64File(asset.url, `${asset.name}${extension}`)
      showNotification("success", "Download started")
    } catch (error) {
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
              ? "bg-primary/10 border-primary/50 text-primary"
              : "bg-destructive/10 border-destructive/50 text-destructive",
          )}
        >
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2 text-foreground">Assets</h1>
          <p className="text-muted-foreground">Manage your images and icons</p>
        </div>

        <Button className="gap-2" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4" />
          Upload Assets
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
      </div>

      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "bg-card border-2 border-dashed rounded-2xl p-8 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          !stagedAsset && "cursor-pointer",
        )}
        onClick={() => !stagedAsset && fileInputRef.current?.click()}
      >
        {stagedAsset ? (
          // Staged Asset Preview
          <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg text-foreground">Preview Asset</h3>
              <Button variant="ghost" size="icon" onClick={cancelStagedAsset}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="w-full max-w-md mx-auto aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              <img
                src={stagedAsset.base64 || "/placeholder.svg"}
                alt="Preview"
                className="w-full h-full object-contain p-8"
              />
            </div>

            <div className="w-full max-w-md mx-auto space-y-3">
              <div>
                <Label htmlFor="staged-name" className="text-foreground">
                  Asset Name *
                </Label>
                <Input
                  id="staged-name"
                  value={stagedAsset.name}
                  onChange={(e) => setStagedAsset({ ...stagedAsset, name: e.target.value })}
                  placeholder="Enter asset name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="staged-category" className="text-foreground">
                  Category *
                </Label>
                <Select
                  value={stagedAsset.category}
                  onValueChange={(val) => setStagedAsset({ ...stagedAsset, category: val as AssetCategory })}
                >
                  <SelectTrigger id="staged-category" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assetCategories
                      .filter((c) => c.id !== "all")
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={confirmStagedAsset} disabled={!stagedAsset.name.trim()} className="flex-1 gap-2">
                  <Check className="w-4 h-4" />
                  Add Asset
                </Button>
                <Button variant="outline" onClick={cancelStagedAsset} className="flex-1 bg-transparent">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Upload Prompt
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg mb-1 text-foreground">
                Drop files here or click to upload
              </h3>
              <p className="text-sm text-muted-foreground">
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
            <Badge
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all hover:scale-105",
                selectedCategory === category.id && "bg-primary text-primary-foreground",
              )}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          <div className="flex border border-border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Assets Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="group bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all hover:scale-105"
            >
              <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                <img
                  src={asset.url || "/placeholder.svg"}
                  alt={asset.name}
                  className="w-full h-full object-contain p-4"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate text-foreground">{asset.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {asset.type.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingAsset(asset)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(asset)}>
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeletingAsset(asset)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
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
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors flex items-center gap-4"
            >
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <img
                  src={asset.url || "/placeholder.svg"}
                  alt={asset.name}
                  className="w-full h-full object-contain p-2"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate text-foreground">{asset.name}</h4>
                <p className="text-sm text-muted-foreground capitalize">{asset.category}</p>
              </div>

              <Badge variant="outline">{asset.type.toUpperCase()}</Badge>

              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditingAsset(asset)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDownload(asset)}>
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setDeletingAsset(asset)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredAssets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Upload className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="font-display font-semibold text-lg mb-2 text-foreground">No assets found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "Try a different search term" : "Start by uploading your first asset"}
          </p>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Asset
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingAsset} onOpenChange={(open) => !open && setEditingAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>Update the asset details or replace the image</DialogDescription>
          </DialogHeader>

          {editingAsset && (
            <div className="space-y-4">
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={editingAsset.url || "/placeholder.svg"}
                  alt={editingAsset.name}
                  className="w-full h-full object-contain p-8"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editingAsset.name}
                  onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={editingAsset.category}
                  onValueChange={(val) => setEditingAsset({ ...editingAsset, category: val as AssetCategory })}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assetCategories
                      .filter((c) => c.id !== "all")
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-url">URL or Base64</Label>
                <Input
                  id="edit-url"
                  value={editingAsset.url}
                  onChange={(e) => setEditingAsset({ ...editingAsset, url: e.target.value })}
                  placeholder="Paste new URL or Base64"
                />
              </div>

              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => {
                  const input = document.createElement("input")
                  input.type = "file"
                  input.accept = "image/*"
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) {
                      const base64 = await fileToBase64(file)
                      const extension = getFileExtension(file.name, file.type)
                      setEditingAsset({ ...editingAsset, url: base64, type: extension as AssetType })
                    }
                  }
                  input.click()
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Replace Image
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAsset(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditAsset}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingAsset} onOpenChange={(open) => !open && setDeletingAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this asset? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingAsset(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAsset}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
