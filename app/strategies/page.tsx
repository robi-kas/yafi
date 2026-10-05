"use client"

import React from "react"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useDashboard } from "@/context/dashboard-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2, TrendingUp, BarChart3 } from "lucide-react"
import { calculateWinRate, getWinLossCounts, calcResult } from "@/lib/trading-metrics"

interface StrategyFormData {
  name: string
  description: string
  rules: string
  markets: string[]
  riskPerTrade: number
}

export default function Strategies() {
  const { strategies, trades, addStrategy, updateStrategy, deleteStrategy, isLoading } = useDashboard()
  const [showForm, setShowForm] = useState(false)
  const [editingStrategyId, setEditingStrategyId] = useState<string | null>(null)
  const [formData, setFormData] = useState<StrategyFormData>({
    name: "",
    description: "",
    rules: "",
    markets: [],
    riskPerTrade: 2,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingStrategyId(null)
    setFormData({
      name: "",
      description: "",
      rules: "",
      markets: [],
      riskPerTrade: 2,
    })
  }

  const handleEditStrategy = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId)
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

  // Calculate strategy performance
  const getStrategyStats = (strategyName: string) => {
    const strategyTrades = trades.filter(t => t.strategy === strategyName)
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
      avgWin: wins > 0
        ? strategyTrades
          .filter(t => calcResult(t) === "win")
          .reduce((sum, t) => sum + (t.profitLoss || 0), 0) / wins
        : 0,
      avgLoss: losses > 0
        ? strategyTrades
          .filter(t => calcResult(t) === "loss")
          .reduce((sum, t) => sum + (t.profitLoss || 0), 0) / losses
        : 0,
    }
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Trading Strategies</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                Define and track the performance of your trading strategies
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingStrategyId(null)
                setShowForm(true)
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Strategy</span>
            </Button>
          </div>
        </div>

        {/* Strategy Cards */}
        {isLoading && strategies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-lg">
            <div className="w-10 h-10 border-4 border-lime/30 border-t-lime rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground animate-pulse font-mono tracking-widest text-xs uppercase">Initializing System...</p>
          </div>
        ) : strategies.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {strategies.map((strategy) => {
              const stats = getStrategyStats(strategy.name)

              return (
                <div key={strategy.id} className="bg-card border border-border rounded-lg p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{strategy.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {strategy.description}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditStrategy(strategy.id)}
                        className="p-2 hover:bg-background rounded transition-colors"
                        title="Edit strategy"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this strategy?")) {
                            deleteStrategy(strategy.id)
                          }
                        }}
                        className="p-2 hover:bg-background rounded transition-colors text-red-400 hover:text-red-500"
                        title="Delete strategy"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4 p-4 bg-background/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Trades</p>
                      <p className="text-lg font-semibold">{stats.trades}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Win Rate</p>
                      <p className={`text-lg font-semibold ${stats.winRate >= 50 ? "text-green-400" : "text-red-400"}`}>
                        {stats.winRate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total P&L</p>
                      <p className={`text-lg font-semibold ${stats.totalPL > 0 ? "text-green-400" : "text-red-400"}`}>
                        ${stats.totalPL > 0 ? "+" : ""}{stats.totalPL.toFixed(0)}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Stats */}
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Wins / Losses</span>
                      <span className="font-mono font-semibold">
                        {stats.wins} / {stats.losses}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Avg Win</span>
                      <span className="font-mono font-semibold text-green-400">
                        ${stats.avgWin.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Avg Loss</span>
                      <span className="font-mono font-semibold text-red-400">
                        -${Math.abs(stats.avgLoss).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Avg per Trade</span>
                      <span className={`font-mono font-semibold ${stats.avgPL > 0 ? "text-green-400" : "text-red-400"}`}>
                        ${stats.avgPL.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Rules Section */}
                  {strategy.rules && (
                    <div className="p-3 bg-background/30 rounded border border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Strategy Rules</p>
                      <p className="text-xs leading-relaxed">{strategy.rules}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No strategies defined yet</p>
            <Button
              onClick={() => setShowForm(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Your First Strategy
            </Button>
          </div>
        )}

        {/* Strategy Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-lg max-w-2xl w-full">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold">
                  {editingStrategyId ? "Edit Strategy" : "New Strategy"}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-medium">Strategy Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Support/Resistance Bounce"
                    className="mt-2"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief overview of your strategy..."
                    className="mt-2 w-full px-3 py-2 rounded-md border border-input bg-background resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Strategy Rules</label>
                  <textarea
                    value={formData.rules}
                    onChange={(e) => setFormData(prev => ({ ...prev, rules: e.target.value }))}
                    placeholder="Detailed rules and conditions for this strategy..."
                    className="mt-2 w-full px-3 py-2 rounded-md border border-input bg-background resize-none"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Risk per Trade (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={formData.riskPerTrade}
                    onChange={(e) => setFormData(prev => ({ ...prev, riskPerTrade: parseFloat(e.target.value) }))}
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {editingStrategyId ? "Updating..." : "Creating..."}
                      </span>
                    ) : (
                      editingStrategyId ? "Update Strategy" : "Create Strategy"
                    )}
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
