"use client"

import type React from "react"
import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar container */}
      <div className={cn("relative transition-all duration-300 ease-in-out", sidebarOpen ? "w-64" : "w-0")}>
        <div className={cn("w-64 h-full", !sidebarOpen && "opacity-0 pointer-events-none")}>
          <Sidebar />
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            "absolute top-6 z-50 transition-all duration-300",
            "w-8 h-20 flex items-center justify-center",
            "bg-card border border-border hover:border-primary/50",
            "text-foreground",
            "rounded-r-full",
            "shadow-lg hover:shadow-primary/20",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
            "group",
            sidebarOpen ? "-right-8" : "left-0",
          )}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5 transition-transform group-hover:scale-110" />
          ) : (
            <ChevronRight className="w-5 h-5 transition-transform group-hover:scale-110" />
          )}
        </button>
      </div>

      {/* Main content area */}
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="container mx-auto p-6 lg:p-8 max-w-[1600px]">
          <div className="mb-8">
            <DashboardHeader />
          </div>

          {children}
        </div>
      </main>
    </div>
  )
}
