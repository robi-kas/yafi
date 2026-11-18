"use client"

import React, { useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useDashboard, Account } from "@/context/dashboard-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Edit2, Trash2, Wallet, BookOpen, Target, TrendingUp, TrendingDown } from "@/components/icons"
import { getWinLossCounts, calculateWinRate } from "@/lib/trading-metrics"
import { Page, PageHeader, Panel, StatCard, EmptyState, formatMoney, pnlTone } from "@/components/kit"
import { cn } from "@/lib/utils"

interface AccountFormData {
  name: string
  type: "personal" | "prop_firm" | "demo"
  broker: string
  balance: number
}

const TYPE_LABEL: Record<string, string> = { personal: "Personal", prop_firm: "Prop firm", demo: "Demo" }
const TYPE_STYLE: Record<string, string> = {
  personal: "bg-sky-500/10 text-sky-400",
  prop_firm: "bg-violet-500/10 text-violet-400",
  demo: "bg-secondary text-muted-foreground",
}

const EMPTY_FORM: AccountFormData = { name: "", type: "personal", broker: "", balance: 10000 }

export default function Accounts() {
  const { accounts, trades, addAccount, updateAccount, deleteAccount } = useDashboard()
  const [showForm, setShowForm] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [formData, setFormData] = useState<AccountFormData>(EMPTY_FORM)

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
    setFormData(EMPTY_FORM)
  }

  const handleEditAccount = (account: Account) => {
    setFormData({ name: account.name, type: account.type, broker: account.broker, balance: account.balance })
    setEditingAccountId(account.id)
    setShowForm(true)
  }

  // Per-account stats from the trades linked to that account.
  const statsByAccount = useMemo(() => {
    const map: Record<string, { totalTrades: number; totalPL: number; wins: number; losses: number; winRate: number }> = {}
    for (const a of accounts) {
      const accountTrades = trades.filter((t) => t.accountId === a.id)
      const totalPL = accountTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0)
      const { wins, losses } = getWinLossCounts(accountTrades)
      map[a.id] = { totalTrades: accountTrades.length, totalPL, wins, losses, winRate: calculateWinRate(wins, losses) }
    }
    return map
  }, [accounts, trades])

  const totalDeposit = accounts.reduce((sum, a) => sum + (a.balance || 0), 0)
  const totalPL = trades.reduce((sum, t) => sum + (t.profitLoss || 0), 0)

  return (
    <DashboardLayout>
      <Page>
        <PageHeader
          title="Accounts"
          description="Your trading accounts, their deposits and performance"
          actions={
            <Button
              size="sm"
              onClick={() => {
                setEditingAccountId(null)
                setFormData(EMPTY_FORM)
                setShowForm(true)
              }}
            >
              <Plus /> New account
            </Button>
          }
        />

        <div className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:gap-4 xl:grid-cols-4">
          <StatCard label="Accounts" value={accounts.length} icon={Wallet} />
          <StatCard label="Total deposits" value={formatMoney(totalDeposit)} icon={Wallet} />
          <StatCard label="Current balance" value={formatMoney(totalDeposit + totalPL)} icon={BookOpen} sub={`${trades.length} trades`} />
          <StatCard
            label="Total P&L"
            value={formatMoney(totalPL, { sign: true })}
            tone={pnlTone(totalPL)}
            icon={totalPL >= 0 ? TrendingUp : TrendingDown}
          />
        </div>

        {accounts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
            {accounts.map((account) => {
              const stats = statsByAccount[account.id] || { totalTrades: 0, totalPL: 0, wins: 0, losses: 0, winRate: 0 }
              const current = (account.balance || 0) + stats.totalPL
              return (
                <Panel key={account.id} className="overflow-hidden">
                  <div className="flex items-start justify-between gap-3 p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <Wallet className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-medium">{account.name}</h3>
                          <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", TYPE_STYLE[account.type] || TYPE_STYLE.demo)}>
                            {TYPE_LABEL[account.type] || account.type}
                          </span>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{account.broker || "No broker set"}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleEditAccount(account)} title="Edit account">
                        <Edit2 />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-loss"
                        onClick={() => {
                          if (confirm(`Delete the account "${account.name}"?`)) deleteAccount(account.id)
                        }}
                        title="Delete account"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 border-t border-border">
                    <div className="p-5">
                      <p className="text-xs text-muted-foreground">Deposit</p>
                      <p className="mt-1 font-mono text-lg font-semibold tabular">{formatMoney(account.balance)}</p>
                    </div>
                    <div className="border-l border-border p-5">
                      <p className="text-xs text-muted-foreground">P&L</p>
                      <p className={cn("mt-1 font-mono text-lg font-semibold tabular", stats.totalPL > 0 ? "text-profit" : stats.totalPL < 0 ? "text-loss" : "")}>
                        {formatMoney(stats.totalPL, { sign: true })}
                      </p>
                    </div>
                    <div className="border-l border-border p-5">
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="mt-1 font-mono text-lg font-semibold tabular">{formatMoney(current)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border bg-background/40 px-5 py-3 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <BookOpen className="size-4" />
                      <span className="tabular text-foreground">{stats.totalTrades}</span> trades
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Target className="size-4" />
                      <span className={cn("tabular", stats.winRate >= 50 ? "text-profit" : stats.totalTrades ? "text-loss" : "text-foreground")}>
                        {stats.winRate.toFixed(1)}%
                      </span>{" "}
                      win rate
                    </span>
                    <span className="text-muted-foreground">
                      <span className="tabular text-foreground">{stats.wins}</span>W / <span className="tabular text-foreground">{stats.losses}</span>L
                    </span>
                  </div>
                </Panel>
              )
            })}
          </div>
        ) : (
          <Panel>
            <EmptyState
              icon={Wallet}
              title="No accounts yet"
              description="Add a trading account to track its deposit, balance and performance."
              action={
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus /> Add your first account
                </Button>
              }
            />
          </Panel>
        )}

        <Dialog open={showForm} onOpenChange={(o) => !o && resetForm()}>
          <DialogContent className="sm:max-w-lg">
            <form onSubmit={handleSubmit} className="space-y-5">
              <DialogHeader>
                <DialogTitle>{editingAccountId ? "Edit account" : "New account"}</DialogTitle>
                <DialogDescription>The starting balance is your deposit; trade P&L is added on top.</DialogDescription>
              </DialogHeader>

              <div className="space-y-1.5">
                <Label htmlFor="acc-name">Account name</Label>
                <Input
                  id="acc-name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Main trading account"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Account type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData((prev) => ({ ...prev, type: v as AccountFormData["type"] }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="prop_firm">Prop firm</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-broker">Broker</Label>
                  <Input
                    id="acc-broker"
                    value={formData.broker}
                    onChange={(e) => setFormData((prev) => ({ ...prev, broker: e.target.value }))}
                    placeholder="e.g. Exness"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acc-balance">Starting balance</Label>
                <Input
                  id="acc-balance"
                  type="number"
                  step="any"
                  className="font-mono"
                  value={Number.isFinite(formData.balance) ? formData.balance : ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, balance: parseFloat(e.target.value) }))}
                  placeholder="10000"
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">{editingAccountId ? "Save changes" : "Create account"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Page>
    </DashboardLayout>
  )
}
