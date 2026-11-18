"use client"

import React, { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useDashboard } from "@/context/dashboard-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, TrendingDown, TrendingUp, AlertCircle, CheckCircle, XCircle, Brain, Calendar, Award, ShieldCheck } from "@/components/icons"
import { getWinLossCounts, calculateWinRate } from "@/lib/trading-metrics"
import { Page, PageHeader, Panel, PanelHeader, PanelBody, StatCard, EmptyState } from "@/components/kit"
import { cn } from "@/lib/utils"

interface DailyDiscipline {
  date: string
  followedRules: boolean
  emotionalControl: number // 1-10
  notes: string
  violations: string[]
}

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const RULES = [
  { title: "Follow your system strictly", detail: "Never deviate from your trading plan" },
  { title: "Risk only what you can afford", detail: "Never exceed 2% risk per trade" },
  { title: "Keep emotions in check", detail: "Don't let greed, fear, or frustration affect your decisions" },
  { title: "Review daily", detail: "Analyze what went well and what didn't each day" },
]

export default function Discipline() {
  const { trades } = useDashboard()
  const [disciplineLog, setDisciplineLog] = useState<DailyDiscipline[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    date: todayISO(),
    followedRules: true,
    emotionalControl: 7,
    notes: "",
    violations: [] as string[],
  })

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault()
    setDisciplineLog((prev) => [formData as DailyDiscipline, ...prev])
    setFormData({ date: todayISO(), followedRules: true, emotionalControl: 7, notes: "", violations: [] })
    setShowForm(false)
  }

  // Statistics
  const totalDays = disciplineLog.length
  const daysFollowingRules = disciplineLog.filter((d) => d.followedRules).length
  const disciplineRate = totalDays > 0 ? (daysFollowingRules / totalDays) * 100 : 0
  const avgEmotionalControl =
    totalDays > 0 ? Math.round(disciplineLog.reduce((sum, d) => sum + d.emotionalControl, 0) / totalDays) : 0

  // Emotional state vs trading results
  const emotionalAnalysis = (() => {
    const high = trades.filter((t) => t.emotionalState === "confident" || t.emotionalState === "focused")
    const low = trades.filter((t) => t.emotionalState === "anxious" || t.emotionalState === "frustrated")

    const { wins: highWins, losses: highLosses } = getWinLossCounts(high)
    const { wins: lowWins, losses: lowLosses } = getWinLossCounts(low)

    return {
      highEmotionalWinRate: calculateWinRate(highWins, highLosses),
      lowEmotionalWinRate: calculateWinRate(lowWins, lowLosses),
      highTradeCount: high.length,
      lowTradeCount: low.length,
    }
  })()

  // Most common mistakes: use the mistake fields, not general trade tags
  const mistakeCounts = trades
    .flatMap((t) => [...(t.mistakeTags || []), ...(t.mistakes || [])])
    .filter(Boolean)
    .reduce(
      (acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

  // Object.entries returns a fresh array, so sorting it is safe.
  const topMistakes = Object.entries(mistakeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
  const maxMistake = topMistakes[0]?.[1] || 1

  const emotionDelta = emotionalAnalysis.highEmotionalWinRate - emotionalAnalysis.lowEmotionalWinRate

  return (
    <DashboardLayout>
      <Page>
        <PageHeader
          title="Discipline"
          description="Track rule-following, emotional control and recurring mistakes"
          actions={
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus /> Log day
            </Button>
          }
        />

        {/* Key metrics */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:gap-4 xl:grid-cols-4">
          <StatCard
            label="Discipline rate"
            value={`${disciplineRate.toFixed(0)}%`}
            tone={totalDays ? (disciplineRate >= 70 ? "profit" : "loss") : "default"}
            icon={Award}
            sub={`${daysFollowingRules} of ${totalDays} days`}
          />
          <StatCard label="Avg emotional control" value={`${avgEmotionalControl}/10`} icon={Brain} sub="From daily logs" />
          <StatCard
            label="Win rate when focused"
            value={`${emotionalAnalysis.highEmotionalWinRate.toFixed(1)}%`}
            icon={TrendingUp}
            sub={`${emotionalAnalysis.highTradeCount} trades`}
          />
          <StatCard
            label="Win rate when anxious"
            value={`${emotionalAnalysis.lowEmotionalWinRate.toFixed(1)}%`}
            icon={TrendingDown}
            sub={`${emotionalAnalysis.lowTradeCount} trades`}
          />
        </div>

        {/* Insights */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:mb-6 md:gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Emotional state impact" description="How your state affects outcomes" icon={Brain} />
            <PanelBody className="space-y-5">
              {[
                { label: "Focused / confident", rate: emotionalAnalysis.highEmotionalWinRate, bar: "bg-profit", text: "text-profit" },
                { label: "Anxious / frustrated", rate: emotionalAnalysis.lowEmotionalWinRate, bar: "bg-loss", text: "text-loss" },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm">{row.label}</span>
                    <span className={cn("font-mono text-sm font-semibold tabular", row.text)}>{row.rate.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className={cn("h-full rounded-full", row.bar)} style={{ width: `${row.rate}%` }} />
                  </div>
                </div>
              ))}

              <p className="rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
                {emotionalAnalysis.highTradeCount + emotionalAnalysis.lowTradeCount === 0
                  ? "Record your emotional state on trades to see how it affects your results."
                  : emotionDelta > 0
                    ? `You win ${emotionDelta.toFixed(1)} percentage points more often when focused and confident. Prioritize emotional control.`
                    : "Your win rate is similar regardless of emotional state. Focus on other factors."}
              </p>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Common mistakes" description="Most frequent tagged mistakes" icon={AlertCircle} />
            <PanelBody>
              {topMistakes.length > 0 ? (
                <div className="space-y-3">
                  {topMistakes.map(([mistake, count]) => (
                    <div key={mistake}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="truncate text-sm capitalize">{mistake.replace(/[-_]/g, " ")}</span>
                        <span className="font-mono text-sm tabular text-muted-foreground">
                          {count}×
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-loss/70" style={{ width: `${(count / maxMistake) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="pt-2 text-xs text-muted-foreground">Focus your discipline efforts on eliminating the top mistakes.</p>
                </div>
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title="No tagged mistakes"
                  description="Tag mistakes when journaling trades and the most frequent ones will show here."
                  className="py-8"
                />
              )}
            </PanelBody>
          </Panel>
        </div>

        {/* Daily log + rules */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
          <Panel className="lg:col-span-2">
            <PanelHeader
              title="Daily discipline log"
              description={totalDays ? `${totalDays} ${totalDays === 1 ? "entry" : "entries"} this session` : undefined}
              icon={Calendar}
            />
            <PanelBody className="pt-3">
              {disciplineLog.length > 0 ? (
                <div className="divide-y divide-border">
                  {disciplineLog.map((entry, i) => (
                    <div key={i} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(`${entry.date}T00:00`).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Emotional control <span className="font-mono tabular">{entry.emotionalControl}/10</span>
                          </p>
                        </div>
                        {entry.followedRules ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-profit/10 px-2 py-1 text-xs font-medium text-profit">
                            <CheckCircle className="size-3.5" /> Rules followed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-loss/10 px-2 py-1 text-xs font-medium text-loss">
                            <XCircle className="size-3.5" /> Rules broken
                          </span>
                        )}
                      </div>

                      {entry.violations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {entry.violations.map((violation, j) => (
                            <span key={j} className="rounded-md border border-loss/20 bg-loss/10 px-2 py-0.5 text-xs text-loss">
                              {violation}
                            </span>
                          ))}
                        </div>
                      )}

                      {entry.notes && <p className="mt-2 text-sm text-muted-foreground">{entry.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No daily logs yet"
                  description="Log each trading day to track how consistently you follow your rules."
                  action={
                    <Button size="sm" onClick={() => setShowForm(true)}>
                      <Plus /> Log today
                    </Button>
                  }
                />
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Your trading rules" icon={ShieldCheck} />
            <PanelBody className="space-y-2">
              {RULES.map((rule) => (
                <div key={rule.title} className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3">
                  <CheckCircle className="mt-0.5 size-4 shrink-0 text-brand" />
                  <div>
                    <p className="text-sm font-medium">{rule.title}</p>
                    <p className="text-xs text-muted-foreground">{rule.detail}</p>
                  </div>
                </div>
              ))}
            </PanelBody>
          </Panel>
        </div>

        {/* Log form */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Log a trading day</DialogTitle>
              <DialogDescription>Be honest — the value is in the pattern over time.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddEntry} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="disc-date">Date</Label>
                <Input
                  id="disc-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Did you follow your trading rules?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: true, label: "Yes, all rules" },
                    { v: false, label: "No, broke some" },
                  ].map((opt) => (
                    <button
                      key={String(opt.v)}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, followedRules: opt.v }))}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm transition-colors",
                        formData.followedRules === opt.v
                          ? opt.v
                            ? "border-profit/40 bg-profit/10 text-profit"
                            : "border-loss/40 bg-loss/10 text-loss"
                          : "border-input text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="disc-emotion">Emotional control</Label>
                  <span className="font-mono text-sm font-semibold tabular">{formData.emotionalControl}/10</span>
                </div>
                <input
                  id="disc-emotion"
                  type="range"
                  min="1"
                  max="10"
                  value={formData.emotionalControl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, emotionalControl: parseInt(e.target.value) }))}
                  className="w-full accent-brand"
                />
                <p className="text-xs text-muted-foreground">1 = completely overwhelmed, 10 = perfect control</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="disc-notes">Notes</Label>
                <Textarea
                  id="disc-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="How did you feel today? Any challenges or wins?"
                  rows={3}
                  className="resize-none"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save entry</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Page>
    </DashboardLayout>
  )
}
