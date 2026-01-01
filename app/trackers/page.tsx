"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Settings, Trash2, Eye, EyeOff } from "lucide-react"
import { useAppData } from "@/contexts/app-data-context"
import { CustomTrackerWidget } from "@/components/custom-tracker-widget"
import { CreateTrackerDialog } from "@/components/create-tracker-dialog"

export default function TrackersPage() {
  const { customTrackers, deleteCustomTracker, updateCustomTracker } = useAppData()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const handleToggleDashboard = (trackerId: string, currentState: boolean) => {
    updateCustomTracker(trackerId, { showOnDashboard: !currentState })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Custom Trackers</h1>
          <p className="text-muted-foreground">Create and manage your own tracking widgets</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Tracker
        </Button>
      </div>

      {customTrackers.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No custom trackers yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first custom tracker to start monitoring anything you want
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>Create Your First Tracker</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customTrackers.map((tracker) => (
              <div key={tracker.id} className="relative group">
                <CustomTrackerWidget tracker={tracker} />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleToggleDashboard(tracker.id, tracker.showOnDashboard)}
                    title={tracker.showOnDashboard ? "Hide from dashboard" : "Show on dashboard"}
                  >
                    {tracker.showOnDashboard ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      /* TODO: Open edit dialog */
                    }}
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      if (confirm(`Delete tracker "${tracker.name}"? All data will be lost.`)) {
                        deleteCustomTracker(tracker.id)
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <CreateTrackerDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  )
}
