"use client"

import React, { useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useDashboard } from "@/context/dashboard-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Edit2, Trash2, Target, Trophy, BookOpen, AlertCircle } from "@/components/icons"
import { calculateWinRate, getWinLossCounts, calcResult } from "@/lib/trading-metrics"
import { Page, PageHeader, Panel, StatCard, EmptyState, formatMoney, pnlTone } from "@/components/kit"
import BounceLoader from "@/components/ui/bounce-loader"
import { cn } from "@/lib/utils"

interface StrategyFormData {
  name: string
  description: string
  rules: string
  markets: string[]
  riskPerTrade: number
}

const EMPTY_FORM: StrategyFormData = { name: "", description: "", rules: "", markets: [], riskPerTrade: 2 }

export default function Strategies() {
  const { strategies, trades, addStrategy, updateStrategy, deleteStrategy, isLoading } = useDashboard()
  const [showForm, setShowForm] = useState(false)
  const [editingStrategyId, setEditingStrategyId] = useState<string | null>(null)
  const [formData, setFormData] = useState<StrategyFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingStrategyId) {
        await updateStrategy(editingStrategyId, formData)
      } else {
        await addStrategy({
          ...formData,
          trades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
        })
      }
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingStrategyId(null)
    setFormData(EMPTY_FORM)
  }

  const handleEditStrategy = (strategyId: string) => {
    const strategy = strategies.find((s) => s.id === strategyId)
    if (strategy) {
      setFormData({
        name: strategy.name,
        description: strategy.description,
        rules: strategy.rules || "",
        markets: strategy.markets || [],
        riskPerTrade: strategy.riskPerTrade || 2,
      })
      setEditingStrategyId(strategyId)
      setShowForm(true)
    }
  }

  // Strategy performance (trades carry the strategy's name)
  const getStrategyStats = (strategyName: string) => {
    const strategyTrades = trades.filter((t) => t.strategy === strategyName)
    const { wins, losses } = getWinLossCounts(strategyTrades)
    const totalPL = strategyTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0)
    const avgPL = strategyTrades.length > 0 ? totalPL / strategyTrades.length : 0
    const winRate = calculateWinRate(wins, losses)

    return {
      trades: strategyTrades.length,
      wins,
      losses,
      winRate,
      totalPL,
      avgPL,
      avgWin:
        wins > 0
          ? strategyTrades.filter((t) => calcResult(t) === "win").reduce((sum, t) => sum + (t.profitLoss || 0), 0) / wins
          : 0,
      avgLoss:
        losses > 0
          ? strategyTrades.filter((t) => calcResult(t) === "loss").reduce((sum, t) => sum + (t.profitLoss || 0), 0) / losses
          : 0,
    }
  }

  const summary = useMemo(() => {
    const names = new Set(strategies.map((s) => s.name))
    const byName = strategies.map((s) => ({
      name: s.name,
      pnl: trades.filter((t) => t.strategy === s.name).reduce((sum, t) => sum + (t.profitLoss || 0), 0),
    }))
    const best = [...byName].sort((a, b) => b.pnl - a.pnl)[0]
    const unassigned = trades.filter((t) => !t.strategy || !names.has(t.strategy)).length
    return { best, unassigned }
  }, [strategies, trades])

  const openNew = () => {
    setEditingStrategyId(null)
    setFormData(EMPTY_FORM)
    setShowForm(true)
  }

  return (
    <DashboardLayout>
      <Page>
        <PageHeader
          title="Strategies"
          description="Define your setups and see how each one performs"
          actions={
            <Button size="sm" onClick={openNew}>
              <Plus /> New strategy
            </Button>
          }
        />

        {isLoading && strategies.length === 0 ? (
          <BounceLoader />
        ) : strategies.length > 0 ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 md:mb-6 md:gap-4">
              <StatCard label="Strategies" value={String(strategies.length)} icon={Target} sub={`${trades.length} trades journaled`} />
              <StatCard
                label="Best strategy"
                value={<span className="font-sans">{summary.best?.name || "—"}</span>}
                icon={Trophy}
                sub={summary.best ? `${formatMoney(summary.best.pnl, { sign: true })} net` : undefined}
              />
              <StatCard
                label="Trades without a strategy"
                value={String(summary.unassigned)}
                tone={summary.unassigned ? "loss" : "default"}
                icon={AlertCircle}
                sub={summary.unassigned ? "Tag them in the journal to improve stats" : "Every trade is tagged"}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
              {strategies.map((strategy) => {
                const stats = getStrategyStats(strategy.name)
                const decided = stats.wins + stats.losses

                return (
                  <Panel key={strategy.id} className="flex flex-col p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold">{strategy.name}</h3>
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {strategy.description || "No description"}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleEditStrategy(strategy.id)} title="Edit strategy" aria-label="Edit strategy">
                          <Edit2 />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-loss"
                          onClick={() => {
                            if (confirm(`Delete the strategy "${strategy.name}"?`)) deleteStrategy(strategy.id)
                          }}
                          title="Delete strategy"
                          aria-label="Delete strategy"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>

                    <div className="mb-4 grid grid-cols-3 gap-3 rounded-lg border border-border bg-background/40 p-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Trades</p>
                        <p className="font-mono text-lg font-semibold tabular">{stats.trades}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Win rate</p>
                        <p
                          className={cn(
                            "font-mono text-lg font-semibold tabular",
                            decided ? (stats.winRate >= 50 ? "text-profit" : "text-loss") : "text-muted-foreground"
                          )}
                        >
                          {decided ? `${stats.winRate.toFixed(1)}%` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Net P&L</p>
                        <p
                          className={cn(
                            "font-mono text-lg font-semibold tabular",
                            pnlTone(stats.totalPL) === "profit" && "text-profit",
                            pnlTone(stats.totalPL) === "loss" && "text-loss"
                          )}
                        >
                          {formatMoney(stats.totalPL, { sign: true })}
                        </p>
                      </div>
                    </div>

                    {decided > 0 && (
                      <div className="mb-4 flex h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="bg-profit" style={{ width: `${(stats.wins / decided) * 100}%` }} />
                        <div className="bg-loss/70" style={{ width: `${(stats.losses / decided) * 100}%` }} />
                      </div>
                    )}

                    <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Wins / losses</dt>
                        <dd className="font-mono tabular">
                          {stats.wins} / {stats.losses}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Avg per trade</dt>
                        <dd className={cn("font-mono tabular", stats.avgPL > 0 ? "text-profit" : stats.avgPL < 0 ? "text-loss" : "")}>
                          {formatMoney(stats.avgPL, { sign: true })}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Avg win</dt>
                        <dd className="font-mono tabular text-profit">{formatMoney(stats.avgWin)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Avg loss</dt>
                        <dd className="font-mono tabular text-loss">{formatMoney(-Math.abs(stats.avgLoss))}</dd>
                      </div>
                    </dl>

                    {strategy.rules && (
                      <div className="mt-auto rounded-lg border border-border bg-secondary/40 p-3">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Rules</p>
                        <p className="whitespace-pre-line text-sm leading-relaxed">{strategy.rules}</p>
                      </div>
                    )}
                  </Panel>
                )
              })}
            </div>
          </>
        ) : (
          <Panel>
            <EmptyState
              icon={BookOpen}
              title="No strategies yet"
              description="Create a strategy for each setup you trade, then tag trades with it to compare performance."
              action={
                <Button size="sm" onClick={openNew}>
                  <Plus /> Create your first strategy
                </Button>
              }
            />
          </Panel>
        )}

        <Dialog open={showForm} onOpenChange={(o) => !o && resetForm()}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingStrategyId ? "Edit strategy" : "New strategy"}</DialogTitle>
              <DialogDescription>Trades tagged with this strategy name are counted in its stats.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="strat-name">Name</Label>
                <Input
                  id="strat-name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. London breakout"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="strat-desc">Description</Label>
                <Textarea
                  id="strat-desc"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief overview of the setup..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="strat-rules">Rules</Label>
                <Textarea
                  id="strat-rules"
                  value={formData.rules}
                  onChange={(e) => setFormData((prev) => ({ ...prev, rules: e.target.value }))}
                  placeholder="Entry conditions, invalidation, management..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="strat-risk">Risk per trade (%)</Label>
                <Input
                  id="strat-risk"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  className="font-mono"
                  value={formData.riskPerTrade}
                  onChange={(e) => setFormData((prev) => ({ ...prev, riskPerTrade: parseFloat(e.target.value) }))}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !formData.name.trim()}>
                  {saving ? (editingStrategyId ? "Saving…" : "Creating…") : editingStrategyId ? "Save changes" : "Create strategy"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Page>
    </DashboardLayout>
  )
}
