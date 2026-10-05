"use client"

import React from "react"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useDashboard } from "@/context/dashboard-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2, DollarSign, TrendingUp } from "lucide-react"
import { calculateWinRate, getWinLossCounts } from "@/lib/trading-metrics"

interface AccountFormData {
  name: string
  type: "personal" | "prop_firm" | "demo"
  broker: string
  balance: number
}

export default function Accounts() {
  const { accounts, trades, addAccount, updateAccount, deleteAccount } = useDashboard()
  const [showForm, setShowForm] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [formData, setFormData] = useState<AccountFormData>({
    name: "",
    type: "personal",
    broker: "",
    balance: 10000,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingAccountId) {
      updateAccount(editingAccountId, formData)
    } else {
      addAccount({
        ...formData,
        lastUpdated: "Just now",
      })
    }
    
    resetForm()
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingAccountId(null)
    setFormData({
      name: "",
      type: "personal",
      broker: "",
      balance: 10000,
    })
  }

  const handleEditAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    if (account) {
      setFormData({
        name: account.name,
        type: account.type,
        broker: account.broker,
        balance: account.balance,
      })
      setEditingAccountId(accountId)
      setShowForm(true)
    }
  }

  // Calculate account statistics
  const getAccountStats = (accountName: string) => {
    const accountTrades = trades.filter(t => {
      // This is a simplification - in real app, trades would have account_id
      return true
    })
    
    const totalPL = accountTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0)
    const { wins, losses } = getWinLossCounts(accountTrades)
    const winRate = calculateWinRate(wins, losses)

    return {
      totalTrades: accountTrades.length,
      totalPL,
      wins,
      losses,
      winRate,
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "personal":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "prop_firm":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "demo":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "personal":
        return "Personal"
      case "prop_firm":
        return "Prop Firm"
      case "demo":
        return "Demo"
      default:
        return type
    }
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Trading Accounts</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                Manage and track all your trading accounts
              </p>
            </div>
            <Button 
              onClick={() => {
                setEditingAccountId(null)
                setShowForm(true)
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Account</span>
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Accounts</p>
            <p className="text-2xl font-semibold">{accounts.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Balance</p>
            <p className="text-2xl font-semibold">
              ${accounts.reduce((sum, a) => sum + a.balance, 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">All Trades</p>
            <p className="text-2xl font-semibold">{trades.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
            <p className={`text-2xl font-semibold ${trades.reduce((sum, t) => sum + (t.profitLoss || 0), 0) > 0 ? "text-green-400" : "text-red-400"}`}>
              ${trades.reduce((sum, t) => sum + (t.profitLoss || 0), 0) > 0 ? "+" : ""}{(trades.reduce((sum, t) => sum + (t.profitLoss || 0), 0)).toFixed(0)}
            </p>
          </div>
        </div>

        {/* Accounts Grid */}
        {accounts.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {accounts.map((account) => {
              const stats = getAccountStats(account.name)

              return (
                <div key={account.id} className="bg-card border border-border rounded-lg overflow-hidden">
                  {/* Header */}
                  <div className="p-6 border-b border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{account.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{account.broker}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditAccount(account.id)}
                          className="p-2 hover:bg-background rounded transition-colors"
                          title="Edit account"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this account?")) {
                              deleteAccount(account.id)
                            }
                          }}
                          className="p-2 hover:bg-background rounded transition-colors text-red-400 hover:text-red-500"
                          title="Delete account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Account Type Badge */}
                    <div className="flex gap-2 items-center">
                      <span className={`px-2.5 py-1 rounded text-xs font-medium border ${getTypeColor(account.type)}`}>
                        {getTypeLabel(account.type)}
                      </span>
                    </div>
                  </div>

                  {/* Balance Section */}
                  <div className="p-6 bg-background/50 border-b border-border">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Account Balance</p>
                        <p className="text-2xl font-semibold">
                          ${account.balance.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="p-6 space-y-3">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-background/50 rounded">
                        <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
                        <p className="text-xl font-semibold">{stats.totalTrades}</p>
                      </div>
                      <div className="p-3 bg-background/50 rounded">
                        <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                        <p className={`text-xl font-semibold ${stats.winRate >= 50 ? "text-green-400" : "text-red-400"}`}>
                          {stats.winRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Wins / Losses</span>
                        <span className="font-mono font-semibold">
                          {stats.wins} / {stats.losses}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total P&L</span>
                        <span className={`font-mono font-semibold ${stats.totalPL > 0 ? "text-green-400" : "text-red-400"}`}>
                          {stats.totalPL > 0 ? "+" : ""}{stats.totalPL.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="pt-3 border-t border-border flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <p className="text-xs text-muted-foreground">Last updated: {account.lastUpdated}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No accounts yet</p>
            <Button
              onClick={() => setShowForm(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Your First Account
            </Button>
          </div>
        )}

        {/* Account Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-lg max-w-2xl w-full">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold">
                  {editingAccountId ? "Edit Account" : "New Account"}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-medium">Account Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Main Trading Account"
                    className="mt-2"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Account Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full mt-2 px-3 py-2 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="personal">Personal</option>
                      <option value="prop_firm">Prop Firm</option>
                      <option value="demo">Demo</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Broker</label>
                    <Input
                      value={formData.broker}
                      onChange={(e) => setFormData(prev => ({ ...prev, broker: e.target.value }))}
                      placeholder="e.g., Interactive Brokers"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Starting Balance</label>
                  <Input
                    type="number"
                    step="1"
                    value={formData.balance}
                    onChange={(e) => setFormData(prev => ({ ...prev, balance: parseFloat(e.target.value) }))}
                    placeholder="10000"
                    className="mt-2"
                    required
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
                  >
                    {editingAccountId ? "Update Account" : "Create Account"}
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
