"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useDashboard, Trade, Account } from "@/context/dashboard-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PositionSizeCalculator } from "@/components/dashboard/risk-calculator"
import { EquityCurveChart } from "@/components/dashboard/trading-charts"
import BounceLoader from "@/components/ui/bounce-loader"
import {
  Page,
  PageHeader,
  Panel,
  PanelHeader,
  PanelBody,
  StatCard,
  EmptyState,
  ResultBadge,
  DirectionBadge,
  formatMoney,
  pnlTone,
} from "@/components/kit"
import {
  Plus,
  RefreshCw,
  Wallet,
  BookOpen,
  Target,
  Trophy,
  Flame,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  ArrowRight,
  LineChart,
} from "@/components/icons"
import { calculateMetrics, calcResult } from "@/lib/trading-metrics"
import { useCurrentUser } from "@/hooks/use-current-user"
import { cn } from "@/lib/utils"

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

function strategyName(t: Trade) {
  return typeof t.strategy === "string" ? t.strategy : (t.strategy as any)?.name || ""
}

function DashboardInner() {
  const { trades, accounts, performanceMetrics, updateMetrics, updateAccount, deleteAccount, addAccount, addNotification, isLoading } =
    useDashboard()
  const user = useCurrentUser()
  const name = (user?.user_metadata?.full_name as string | undefined) || user?.email?.split("@")[0] || ""

  const [accountDialog, setAccountDialog] = useState<{ mode: "add" | "edit"; account?: Account } | null>(null)
  const [form, setForm] = useState({ name: "", broker: "", balance: "" })

  const m = useMemo(() => calculateMetrics(trades as any), [trades])

  // P&L per account, so each account card shows its own balance.
  const pnlByAccount = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of trades) if (t.accountId) map[t.accountId] = (map[t.accountId] || 0) + (t.profitLoss || 0)
    return map
  }, [trades])

  const recent = useMemo(
    () => [...trades].sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()).slice(0, 6),
    [trades]
  )

  const highlights = useMemo(() => {
    const byStrategy: Record<string, { pnl: number; n: number; wins: number }> = {}
    for (const t of trades) {
      const s = strategyName(t)
      if (!s) continue
      byStrategy[s] ??= { pnl: 0, n: 0, wins: 0 }
      byStrategy[s].pnl += t.profitLoss || 0
      byStrategy[s].n++
      if (calcResult(t) === "win") byStrategy[s].wins++
    }
    const best = Object.entries(byStrategy).sort((a, b) => b[1].pnl - a[1].pnl)[0]

    // Current streak, newest trade first, ignoring breakevens.
    let streak = 0
    let streakKind: "win" | "loss" | null = null
    for (const t of recent.length ? [...trades].sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()) : []) {
      const r = calcResult(t)
      if (r === "breakeven") continue
      if (!streakKind) streakKind = r
      if (r !== streakKind) break
      streak++
    }
    return { best, streak, streakKind }
  }, [trades, recent])

  const balance = performanceMetrics.netBalance
  const roi = performanceMetrics.roi || 0
  const decided = m.wins + m.losses
  const winRate = decided ? (m.wins / decided) * 100 : 0

  const openAdd = () => {
    setForm({ name: "", broker: "", balance: "" })
    setAccountDialog({ mode: "add" })
  }
  const openEdit = (a: Account) => {
    setForm({ name: a.name || "", broker: a.broker || "", balance: String(a.balance ?? "") })
    setAccountDialog({ mode: "edit", account: a })
  }
  const saveAccount = async () => {
    const payload = { name: form.name.trim(), broker: form.broker.trim(), balance: Number(form.balance.replace(/[^0-9.-]+/g, "")) || 0 }
    if (!payload.name) return
    try {
      if (accountDialog?.mode === "edit" && accountDialog.account) {
        await updateAccount(accountDialog.account.id, payload)
      } else {
        await addAccount({ ...payload, type: "personal" } as Partial<Account>)
        addNotification({ title: "Account added", message: `${payload.name} was added.`, type: "success" })
      }
      setAccountDialog(null)
    } catch (err: any) {
      addNotification({ title: "Could not save account", message: err?.message || "Please try again.", type: "error" })
    }
  }

  if (isLoading) return <BounceLoader />

  return (
    <Page>
      <PageHeader
        title={name ? `${greeting()}, ${name}` : greeting()}
        description={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={updateMetrics}>
              <RefreshCw /> Refresh
            </Button>
            <Button size="sm" asChild>
              <Link href="/journal">
                <Plus /> Log trade
              </Link>
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:gap-4 xl:grid-cols-4">
        <StatCard
          label="Net P&L"
          value={formatMoney(m.netPnl, { sign: true })}
          tone={pnlTone(m.netPnl)}
          icon={m.netPnl >= 0 ? TrendingUp : TrendingDown}
          sub={`${m.closedTrades} closed trades · ${roi >= 0 ? "+" : ""}${roi.toFixed(1)}% return`}
        />
        <StatCard
          label="Win rate"
          value={`${winRate.toFixed(1)}%`}
          icon={Target}
          sub={`${m.wins} wins · ${m.losses} losses · ${m.breakevens} BE`}
        >
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="bg-profit" style={{ width: `${winRate}%` }} />
            <div className="bg-loss/70" style={{ width: `${decided ? 100 - winRate : 0}%` }} />
          </div>
        </StatCard>
        <StatCard
          label="Profit factor"
          value={m.profitFactor ? (Number.isFinite(m.profitFactor) ? m.profitFactor.toFixed(2) : "∞") : "—"}
          tone={m.profitFactor >= 1 ? "profit" : m.profitFactor > 0 ? "loss" : "default"}
          icon={Trophy}
          sub={`Avg win ${formatMoney(m.averageWinner)} · Avg loss ${formatMoney(Math.abs(m.averageLoser))}`}
        />
        <StatCard
          label="Expectancy / trade"
          value={formatMoney(m.expectancyPerClosed, { sign: true })}
          tone={pnlTone(m.expectancyPerClosed)}
          icon={LineChart}
          sub={`Max drawdown ${formatMoney(Math.abs(m.maxDrawdown))}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
        {/* Equity */}
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Equity curve"
            description="Balance after each trade"
            actions={
              <div className="text-right">
                <div className="font-mono text-lg font-semibold tabular">{formatMoney(balance)}</div>
                <div className={cn("text-xs tabular", roi >= 0 ? "text-profit" : "text-loss")}>
                  {roi >= 0 ? "+" : ""}
                  {roi.toFixed(2)}% all time
                </div>
              </div>
            }
          />
          <PanelBody className="pt-3">
            {trades.length ? (
              <EquityCurveChart height={280} />
            ) : (
              <EmptyState
                icon={LineChart}
                title="No trades yet"
                description="Your equity curve appears here once you log or import trades."
                action={
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/import">Import trades</Link>
                  </Button>
                }
                className="h-[280px]"
              />
            )}
          </PanelBody>
        </Panel>

        {/* Accounts */}
        <Panel>
          <PanelHeader
            title="Accounts"
            description={`${accounts.length} account${accounts.length === 1 ? "" : "s"}`}
            icon={Wallet}
            actions={
              <Button variant="ghost" size="sm" onClick={openAdd}>
                <Plus /> Add
              </Button>
            }
          />
          <PanelBody className="space-y-2">
            {accounts.length ? (
              accounts.map((a) => {
                const pnl = pnlByAccount[a.id] || 0
                return (
                  <div key={a.id} className="group flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.broker || "—"} · deposit {formatMoney(a.balance)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold tabular">{formatMoney((a.balance || 0) + pnl)}</p>
                      <p className={cn("font-mono text-xs tabular", pnl > 0 ? "text-profit" : pnl < 0 ? "text-loss" : "text-muted-foreground")}>
                        {formatMoney(pnl, { sign: true })}
                      </p>
                    </div>
                    <div className="flex flex-col opacity-60 transition-opacity group-hover:opacity-100">
                      <button className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit" onClick={() => openEdit(a)}>
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-loss"
                        title="Delete"
                        onClick={() => {
                          if (window.confirm(`Delete the account "${a.name}"?`)) deleteAccount(a.id)
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <EmptyState
                icon={Wallet}
                title="No accounts yet"
                description="Add a trading account to track its balance."
                action={
                  <Button size="sm" variant="outline" onClick={openAdd}>
                    <Plus /> Add account
                  </Button>
                }
              />
            )}
          </PanelBody>
        </Panel>

        {/* Recent trades */}
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Recent trades"
            icon={BookOpen}
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/journal">
                  View all <ArrowRight />
                </Link>
              </Button>
            }
          />
          <PanelBody className="px-2 pb-2 pt-3 md:px-3">
            {recent.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Symbol</th>
                      <th className="px-3 py-2 font-medium">Side</th>
                      <th className="hidden px-3 py-2 font-medium sm:table-cell">Date</th>
                      <th className="hidden px-3 py-2 font-medium md:table-cell">Strategy</th>
                      <th className="px-3 py-2 font-medium">Result</th>
                      <th className="px-3 py-2 text-right font-medium">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((t) => (
                      <tr key={t.id} className="border-t border-border transition-colors hover:bg-accent/40">
                        <td className="px-3 py-2.5 font-medium">{t.symbol}</td>
                        <td className="px-3 py-2.5">
                          <DirectionBadge direction={t.direction} />
                        </td>
                        <td className="hidden px-3 py-2.5 text-muted-foreground sm:table-cell">
                          {new Date(t.entryTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </td>
                        <td className="hidden max-w-[160px] truncate px-3 py-2.5 text-muted-foreground md:table-cell">{strategyName(t) || "—"}</td>
                        <td className="px-3 py-2.5">
                          <ResultBadge result={t.tradeStatus === "open" ? "" : calcResult(t)} />
                        </td>
                        <td className={cn("px-3 py-2.5 text-right font-mono tabular", (t.profitLoss || 0) > 0 ? "text-profit" : (t.profitLoss || 0) < 0 ? "text-loss" : "")}>
                          {formatMoney(t.profitLoss, { sign: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No trades recorded"
                description="Log your first trade or import your history to get started."
                action={
                  <Button size="sm" asChild>
                    <Link href="/journal">
                      <Plus /> Log trade
                    </Link>
                  </Button>
                }
              />
            )}
          </PanelBody>
        </Panel>

        {/* Highlights */}
        <Panel>
          <PanelHeader title="Highlights" icon={Trophy} />
          <PanelBody className="space-y-1">
            {[
              {
                label: "Best strategy",
                value: highlights.best ? highlights.best[0] : "—",
                sub: highlights.best ? `${formatMoney(highlights.best[1].pnl, { sign: true })} · ${highlights.best[1].n} trades` : "",
                tone: highlights.best ? pnlTone(highlights.best[1].pnl) : "default",
              },
              { label: "Largest win", value: formatMoney(m.largestWinner, { sign: true }), tone: m.largestWinner > 0 ? "profit" : "default" },
              { label: "Largest loss", value: formatMoney(m.largestLoser, { sign: true }), tone: m.largestLoser < 0 ? "loss" : "default" },
              {
                label: "Current streak",
                value: highlights.streak ? `${highlights.streak} ${highlights.streakKind === "win" ? "win" : "loss"}${highlights.streak > 1 ? (highlights.streakKind === "win" ? "s" : "es") : ""}` : "—",
                tone: highlights.streakKind === "win" ? "profit" : highlights.streakKind === "loss" ? "loss" : "default",
                icon: Flame,
              },
              { label: "Total trades", value: String(m.totalTrades), tone: "default" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 rounded-md px-1 py-2">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <div className="min-w-0 text-right">
                  <p
                    className={cn(
                      "truncate text-sm font-medium tabular",
                      row.tone === "profit" && "text-profit",
                      row.tone === "loss" && "text-loss"
                    )}
                  >
                    {row.value}
                  </p>
                  {row.sub && <p className="truncate text-xs text-muted-foreground">{row.sub}</p>}
                </div>
              </div>
            ))}
          </PanelBody>
        </Panel>

        {/* Calculator */}
        <div className="lg:col-span-3">
          <PositionSizeCalculator initialBalance={balance} />
        </div>
      </div>

      {/* Account dialog */}
      <Dialog open={!!accountDialog} onOpenChange={(o) => !o && setAccountDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{accountDialog?.mode === "edit" ? "Edit account" : "Add account"}</DialogTitle>
            <DialogDescription>The deposit is your starting balance; P&L from trades is added on top.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">Account name</Label>
              <Input id="acc-name" placeholder="e.g. Exness Live" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-broker">Broker</Label>
              <Input id="acc-broker" placeholder="e.g. Exness" value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-balance">Deposit</Label>
              <Input
                id="acc-balance"
                inputMode="decimal"
                placeholder="0.00"
                className="font-mono"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDialog(null)}>
              Cancel
            </Button>
            <Button onClick={saveAccount} disabled={!form.name.trim()}>
              {accountDialog?.mode === "edit" ? "Save changes" : "Add account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardInner />
    </DashboardLayout>
  )
}
