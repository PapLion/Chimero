"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { Plus, Star, Clock, TrendingUp, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface QuickEntryItem {
  id: number
  name: string
  icon?: string
  color?: string
  lastUsed?: Date
  useCount: number
  isFavorite: boolean
  tags?: string[]
}

interface QuickEntryPopoverProps {
  category: string
  items: QuickEntryItem[]
  onSelectItem: (item: QuickEntryItem) => void
  onCreateNew: () => void
  trigger?: React.ReactNode
  className?: string
}

export function QuickEntryPopover({
  category,
  items,
  onSelectItem,
  onCreateNew,
  trigger,
  className,
}: QuickEntryPopoverProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  // Memoized filtered lists
  const recentItems = useMemo(
    () =>
      items
        .filter((i) => i.lastUsed)
        .sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0))
        .slice(0, 5),
    [items],
  )

  const frequentItems = useMemo(() => items.sort((a, b) => b.useCount - a.useCount).slice(0, 5), [items])

  const favoriteItems = useMemo(() => items.filter((i) => i.isFavorite), [items])

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const query = search.toLowerCase()
    return items
      .filter((i) => i.name.toLowerCase().includes(query) || i.tags?.some((t) => t.toLowerCase().includes(query)))
      .slice(0, 8)
  }, [items, search])

  const handleSelect = (item: QuickEntryItem) => {
    onSelectItem(item)
    setOpen(false)
    setSearch("")
  }

  const ItemButton = ({ item }: { item: QuickEntryItem }) => (
    <button
      onClick={() => handleSelect(item)}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
        style={{ backgroundColor: item.color ? `${item.color}20` : "hsl(var(--muted))" }}
      >
        {item.icon || item.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.name}</p>
        {item.tags && item.tags.length > 0 && (
          <div className="flex gap-1 mt-1">
            {item.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {item.isFavorite && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
    </button>
  )

  const EmptyState = ({ message }: { message: string }) => (
    <div className="py-8 text-center text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button size="icon" variant="ghost" className={cn("rounded-full", className)}>
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-card border-2 border-border" align="end" sideOffset={8}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Quick Add {category}</h3>
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
        </div>

        {search ? (
          <div className="p-2 max-h-[300px] overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map((item) => <ItemButton key={item.id} item={item} />)
            ) : (
              <EmptyState message="No items found" />
            )}
          </div>
        ) : (
          <Tabs defaultValue="recent" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0">
              <TabsTrigger
                value="recent"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                <Clock className="w-4 h-4 mr-2" />
                Recent
              </TabsTrigger>
              <TabsTrigger
                value="frequent"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Frequent
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                <Star className="w-4 h-4 mr-2" />
                Favorites
              </TabsTrigger>
            </TabsList>

            <div className="max-h-[250px] overflow-y-auto">
              <TabsContent value="recent" className="p-2 m-0">
                {recentItems.length > 0 ? (
                  recentItems.map((item) => <ItemButton key={item.id} item={item} />)
                ) : (
                  <EmptyState message="No recent items" />
                )}
              </TabsContent>

              <TabsContent value="frequent" className="p-2 m-0">
                {frequentItems.length > 0 ? (
                  frequentItems.map((item) => <ItemButton key={item.id} item={item} />)
                ) : (
                  <EmptyState message="No frequent items yet" />
                )}
              </TabsContent>

              <TabsContent value="favorites" className="p-2 m-0">
                {favoriteItems.length > 0 ? (
                  favoriteItems.map((item) => <ItemButton key={item.id} item={item} />)
                ) : (
                  <EmptyState message="No favorites yet" />
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}

        <div className="p-3 border-t border-border">
          <Button
            variant="outline"
            className="w-full border-dashed bg-transparent"
            onClick={() => {
              onCreateNew()
              setOpen(false)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Item
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
