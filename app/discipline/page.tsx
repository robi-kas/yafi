"use client"

import React from "react"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useDashboard } from "@/context/dashboard-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Plus,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Brain,
  BarChart3,
  Calendar,
  Award,
} from "lucide-react"
import { getWinLossCounts, calculateWinRate } from "@/lib/trading-metrics"

interface DailyDiscipline {
  date: string
  followedRules: boolean
  emotionalControl: number // 1-10
  notes: string
  violations: string[]
}

export default function Discipline() {
  const { trades } = useDashboard()
  const [disciplineLog, setDisciplineLog] = useState<DailyDiscipline[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    followedRules: true,
    emotionalControl: 7,
    notes: "",
    violations: [] as string[],
  })

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault()
    setDisciplineLog(prev => [formData as DailyDiscipline, ...prev])
    setFormData({
      date: new Date().toISOString().split("T")[0],
      followedRules: true,
      emotionalControl: 7,
      notes: "",
      violations: [],
    })
    setShowForm(false)
  }

  // Calculate statistics
  const totalDays = disciplineLog.length
  const daysFollowingRules = disciplineLog.filter(d => d.followedRules).length
  const disciplineRate = totalDays > 0 ? (daysFollowingRules / totalDays) * 100 : 0
  const avgEmotionalControl =
    totalDays > 0 ? Math.round(disciplineLog.reduce((sum, d) => sum + d.emotionalControl, 0) / totalDays) : 0

  // Analyze emotional state vs trading results
  const emotionalAnalysis = (() => {
    const high = trades.filter(t => t.emotionalState === "confident" || t.emotionalState === "focused")
    const low = trades.filter(t => t.emotionalState === "anxious" || t.emotionalState === "frustrated")

    const { wins: highWins, losses: highLosses } = getWinLossCounts(high)
    const { wins: lowWins, losses: lowLosses } = getWinLossCounts(low)
    const highWinRate = calculateWinRate(highWins, highLosses)
    const lowWinRate = calculateWinRate(lowWins, lowLosses)

    return {
      highEmotionalWinRate: highWinRate,
      lowEmotionalWinRate: lowWinRate,
      highTradeCount: high.length,
      lowTradeCount: low.length,
    }
  })()

  // Identify common mistakes
  const mistakeTags = trades.flatMap(t => t.tags || [])
  const mistakeCounts = mistakeTags.reduce(
    (acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const topMistakes = Object.entries(mistakeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Trading Psychology</h1>
              <p className="text-muted-foreground mt-1">
                Track discipline, emotional control, and psychological patterns
              </p>
            </div>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Log Day</span>
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Discipline Rate</p>
              <Award className="w-4 h-4 text-yellow-500" />
            </div>
            <p className="text-2xl font-semibold">{disciplineRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground mt-1">{daysFollowingRules} of {totalDays} days</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Avg Emotional Control</p>
              <Brain className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-semibold">{avgEmotionalControl}/10</p>
            <p className="text-xs text-muted-foreground mt-1">From daily logs</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">High Emotion Win Rate</p>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-semibold">{emotionalAnalysis.highEmotionalWinRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">{emotionalAnalysis.highTradeCount} trades</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Low Emotion Win Rate</p>
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-semibold">{emotionalAnalysis.lowEmotionalWinRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">{emotionalAnalysis.lowTradeCount} trades</p>
          </div>
        </div>

        {/* Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Emotional Impact */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Emotional State Impact
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              How emotional states affect your trading outcomes
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Focused/Confident</span>
                  <span className="text-sm font-semibold text-green-400">
                    {emotionalAnalysis.highEmotionalWinRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${emotionalAnalysis.highEmotionalWinRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Anxious/Frustrated</span>
                  <span className="text-sm font-semibold text-red-400">
                    {emotionalAnalysis.lowEmotionalWinRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${emotionalAnalysis.lowEmotionalWinRate}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 p-4 bg-background/50 rounded border border-border/50">
                <p className="text-xs text-muted-foreground">
                  💡{" "}
                  {emotionalAnalysis.highEmotionalWinRate > emotionalAnalysis.lowEmotionalWinRate
                    ? `Your trading performs ${(emotionalAnalysis.highEmotionalWinRate - emotionalAnalysis.lowEmotionalWinRate).toFixed(1)}% better when you're focused and confident. Prioritize emotional control.`
                    : `Your performance is similar regardless of emotional state. Focus on other factors.`}
                </p>
              </div>
            </div>
          </div>

          {/* Common Mistakes */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Common Mistakes
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Most frequent trading mistakes and violations
            </p>

            {topMistakes.length > 0 ? (
              <div className="space-y-3">
                {topMistakes.map(([mistake, count]) => (
                  <div key={mistake} className="flex items-center justify-between p-3 bg-background/50 rounded">
                    <div>
                      <p className="text-sm font-medium capitalize">{mistake.replace(/[-_]/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{count} occurrences</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{count}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No tagged mistakes found</p>
              </div>
            )}

            <div className="mt-6 p-4 bg-background/50 rounded border border-border/50">
              <p className="text-xs text-muted-foreground">
                💡 Focus your discipline efforts on eliminating the top mistakes
              </p>
            </div>
          </div>
        </div>

        {/* Discipline Log */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Daily Discipline Log
            </h2>
          </div>

          {disciplineLog.length > 0 ? (
            <div className="divide-y divide-border">
              {disciplineLog.map((entry, i) => (
                <div key={i} className="p-4 hover:bg-background/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{new Date(entry.date).toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">
                        Emotional Control: {entry.emotionalControl}/10
                      </p>
                    </div>
                    <div>
                      {entry.followedRules ? (
                        <div className="flex items-center gap-2 text-green-400">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">Rules Followed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-400">
                          <XCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">Rules Broken</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {entry.violations.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Violations:</p>
                      <div className="flex flex-wrap gap-1">
                        {entry.violations.map((violation, j) => (
                          <span key={j} className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                            {violation}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.notes && <p className="text-sm text-muted-foreground italic">{entry.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No daily logs yet. Start tracking your discipline!</p>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Log Today
              </Button>
            </div>
          )}
        </div>

        {/* Trading Rules Section */}
        <div className="mt-8 bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Your Trading Rules</h2>
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Follow your system strictly</p>
                <p className="text-sm text-muted-foreground">Never deviate from your trading plan</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Risk only what you can afford</p>
                <p className="text-sm text-muted-foreground">Never exceed 2% risk per trade</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Keep emotions in check</p>
                <p className="text-sm text-muted-foreground">Don't let greed, fear, or frustration affect your decisions</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Review daily</p>
                <p className="text-sm text-muted-foreground">Analyze what went well and what didn't each day</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Log Today's Discipline</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1 hover:bg-background rounded transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddEntry} className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="mt-2"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Did you follow your trading rules?</label>
                  <div className="mt-2 flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="rules"
                        checked={formData.followedRules}
                        onChange={() => setFormData(prev => ({ ...prev, followedRules: true }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Yes, I followed all rules</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="rules"
                        checked={!formData.followedRules}
                        onChange={() => setFormData(prev => ({ ...prev, followedRules: false }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">No, I broke some rules</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Emotional Control (1-10)</label>
                  <div className="mt-2 flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={formData.emotionalControl}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, emotionalControl: parseInt(e.target.value) }))
                      }
                      className="flex-1"
                    />
                    <span className="text-lg font-semibold w-8 text-center">
                      {formData.emotionalControl}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    1 = Completely overwhelmed, 10 = Perfect control
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="How did you feel today? Any challenges or wins?"
                    className="w-full mt-2 px-3 py-2 rounded-md border border-input bg-background resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Save Entry
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
