"use client"

import { useState, useMemo, useEffect } from "react"
import { TrendingUp, TrendingDown, Minus, Calendar, Flame, Search, BarChart3, Activity, Brain, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { StatsService } from "@/lib/stats-service"
import type { TrackerStats, CorrelationResult, ItemStats } from "@/types/database"

const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />
  return <Minus className="w-4 h-4 text-muted-foreground" />
}

export default function StatisticsPage() {
  const [timeRange, setTimeRange] = useState("30")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const [moodStats, setMoodStats] = useState<TrackerStats | null>(null)
  const [exerciseStats, setExerciseStats] = useState<TrackerStats | null>(null)
  const [dietStats, setDietStats] = useState<TrackerStats | null>(null)
  const [socialStats, setSocialStats] = useState<TrackerStats | null>(null)
  const [correlations, setCorrelations] = useState<CorrelationResult[]>([])

  useEffect(() => {
    // Load stats from StatsService
    setMoodStats(StatsService.getTrackerStats("mood"))
    setExerciseStats(StatsService.getTrackerStats("exercise"))
    setDietStats(StatsService.getTrackerStats("diet"))
    setSocialStats(StatsService.getTrackerStats("social"))
    setCorrelations(StatsService.getCorrelations())
  }, [timeRange])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return StatsService.searchItems(searchQuery, selectedCategory === "all" ? undefined : selectedCategory)
  }, [searchQuery, selectedCategory])

  // Format "last used" display
  const formatLastUsed = (dateStr: string | null): string => {
    if (!dateStr) return "Never"
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Statistics & Insights</h1>
          <p className="text-muted-foreground mt-1">Analyze patterns and discover correlations in your data</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px] bg-background border-border">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-2 border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Retroactive Search
          </CardTitle>
          <CardDescription>Search your history - "When did I last eat tacos?" or "Total eggs in 2024"</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items, activities, or people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background border-border"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px] bg-background border-border">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="exercise">Exercise</SelectItem>
                <SelectItem value="person">People</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="activity">Activities</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((result: ItemStats) => (
                <div key={result.item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{result.item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {result.item.category}
                      </Badge>
                      {result.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: tag.color, color: tag.color }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{result.totalCount} times</p>
                    <p className="text-sm text-muted-foreground">Last: {formatLastUsed(result.lastUsed)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchQuery && searchResults.length === 0 && (
            <div className="mt-4 p-4 text-center text-muted-foreground bg-muted/30 rounded-lg">
              No items found matching "{searchQuery}"
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Mood Stats */}
        <Card className="border-2 border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-yellow-500" />
              </div>
              {moodStats && <TrendIcon trend={moodStats.trend} />}
            </div>
            <p className="text-sm text-muted-foreground">Average Mood</p>
            <p className="text-3xl font-bold">{moodStats?.averagePerDay.toFixed(1) || "-"}</p>
            <p className="text-xs text-muted-foreground mt-1">{moodStats?.totalEntries || 0} entries logged</p>
          </CardContent>
        </Card>

        {/* Exercise Stats */}
        <Card className="border-2 border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-500" />
              </div>
              {exerciseStats && <TrendIcon trend={exerciseStats.trend} />}
            </div>
            <p className="text-sm text-muted-foreground">Exercise Sessions</p>
            <p className="text-3xl font-bold">{exerciseStats?.totalEntries || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              ~{exerciseStats?.averagePerDay.toFixed(1) || 0} per day
            </p>
          </CardContent>
        </Card>

        {/* Streak Stats */}
        <Card className="border-2 border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <Badge variant="secondary">{moodStats?.currentStreak || 0} days</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Current Streak</p>
            <p className="text-3xl font-bold">{moodStats?.currentStreak || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Max streak: {moodStats?.maxStreak || 0} days</p>
          </CardContent>
        </Card>

        {/* Standard Deviation / Consistency */}
        <Card className="border-2 border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-sm font-medium">±{moodStats?.stdDeviation || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Mood Consistency</p>
            <Progress value={Math.max(0, 100 - (moodStats?.stdDeviation || 0) * 10)} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {(moodStats?.stdDeviation || 0) < 1.5 ? "Very consistent" : "Some variation"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Pattern Analysis & Correlations
          </CardTitle>
          <CardDescription>
            Discover how different activities affect each other (powered by local analysis - no AI APIs)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {correlations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {correlations.map((corr, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{corr.factor_a}</Badge>
                      <span className="text-muted-foreground">↔</span>
                      <Badge variant="outline">{corr.factor_b}</Badge>
                    </div>
                    <span
                      className={cn(
                        "font-mono font-bold",
                        corr.correlation_value > 0 ? "text-green-500" : "text-red-500",
                      )}
                    >
                      {corr.correlation_value > 0 ? "+" : ""}
                      {corr.correlation_value.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{corr.insight}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Sample size: {corr.sample_size} data points</span>
                    <Progress
                      value={Math.abs(corr.correlation_value) * 100}
                      className={cn(
                        "h-1.5 w-20",
                        corr.correlation_value > 0 ? "[&>div]:bg-green-500" : "[&>div]:bg-red-500",
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Not enough data for correlation analysis yet.</p>
              <p className="text-sm mt-1">Keep logging to discover patterns!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Tracker Stats */}
      <Tabs defaultValue="mood" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="mood">Mood</TabsTrigger>
          <TabsTrigger value="exercise">Exercise</TabsTrigger>
          <TabsTrigger value="diet">Diet</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
        </TabsList>

        <TabsContent value="mood">
          <Card className="border-2 border-border bg-card">
            <CardHeader>
              <CardTitle>Mood Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">{moodStats?.averagePerDay.toFixed(1) || "-"}</p>
                  <p className="text-sm text-muted-foreground">Avg per Day</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">{moodStats?.totalEntries || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">{moodStats?.currentStreak || 0}</p>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">{moodStats?.maxStreak || 0}</p>
                  <p className="text-sm text-muted-foreground">Best Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exercise">
          <Card className="border-2 border-border bg-card">
            <CardHeader>
              <CardTitle>Exercise Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">{exerciseStats?.totalEntries || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">{exerciseStats?.averagePerDay.toFixed(1) || 0}</p>
                  <p className="text-sm text-muted-foreground">Daily Average</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">{exerciseStats?.currentStreak || 0}</p>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">±{exerciseStats?.stdDeviation || 0}</p>
                  <p className="text-sm text-muted-foreground">Std Deviation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diet">
          <Card className="border-2 border-border bg-card">
            <CardHeader>
              <CardTitle>Diet Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">{dietStats?.totalEntries || 0}</p>
                  <p className="text-sm text-muted-foreground">Meals Logged</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">{dietStats?.averagePerDay.toFixed(1) || 0}</p>
                  <p className="text-sm text-muted-foreground">Per Day</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">{dietStats?.currentStreak || 0}</p>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">{dietStats?.maxStreak || 0}</p>
                  <p className="text-sm text-muted-foreground">Best Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card className="border-2 border-border bg-card">
            <CardHeader>
              <CardTitle>Social Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">{socialStats?.totalEntries || 0}</p>
                  <p className="text-sm text-muted-foreground">Interactions</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">{socialStats?.averagePerDay.toFixed(1) || 0}</p>
                  <p className="text-sm text-muted-foreground">Daily Average</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">{socialStats?.currentStreak || 0}</p>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-3xl font-bold">{socialStats?.maxStreak || 0}</p>
                  <p className="text-sm text-muted-foreground">Best Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
