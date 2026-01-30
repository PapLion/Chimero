"use client"

import { cn } from "../lib/utils"
import { useAppStore } from "../lib/store"
import { Scale, Smile, Dumbbell, Users, CheckSquare, Wallet, ChevronLeft, ChevronRight, Settings, Type as type, LucideIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@packages/ui/tooltip"

const iconMap: Record<string, LucideIcon> = {
  scale: Scale,
  smile: Smile,
  dumbbell: Dumbbell,
  users: Users,
  "check-square": CheckSquare,
  wallet: Wallet,
}

export function Sidebar() {
  const { trackers, activeTracker, setActiveTracker, sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">CH</span>
          </div>
          {!sidebarCollapsed && (
            <span className="font-semibold text-sidebar-foreground truncate">Chimero</span>
          )}
        </div>

        {/* Tracker Tabs */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {trackers.map((tracker) => {
            const Icon = iconMap[tracker.icon] || CheckSquare
            const isActive = activeTracker === tracker.id

            return (
              <Tooltip key={tracker.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveTracker(isActive ? null : tracker.id)}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all",
                      "hover:bg-sidebar-accent",
                      isActive && "bg-sidebar-accent text-primary"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 flex-shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    {!sidebarCollapsed && (
                      <span
                        className={cn(
                          "text-sm truncate",
                          isActive ? "text-primary font-medium" : "text-sidebar-foreground"
                        )}
                      >
                        {tracker.name}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right" sideOffset={10}>
                    {tracker.name}
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-2 border-t border-sidebar-border space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all",
                  "hover:bg-sidebar-accent text-muted-foreground"
                )}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm">Settings</span>}
              </button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right" sideOffset={10}>
                Settings
              </TooltipContent>
            )}
          </Tooltip>

          <button
            onClick={toggleSidebar}
            className={cn(
              "flex items-center justify-center w-full px-3 py-2 rounded-lg transition-all",
              "hover:bg-sidebar-accent text-muted-foreground"
            )}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm ml-2">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
