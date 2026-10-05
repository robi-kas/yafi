"use client"

import React, { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { GlanceCard } from "@/components/dashboard/glance-card"
import { TrendingUp, TrendingDown, Target, RefreshCw, Trophy, Zap, Trash2 } from "lucide-react"
import { useDashboard, Trade, Account, Strategy } from "@/context/dashboard-context"
import { Button } from "@/components/ui/button"
import { PositionSizeCalculator as LotSizeCalculator } from "@/components/dashboard/risk-calculator"
import { EquityCurveChart } from "@/components/dashboard/trading-charts"
import { TradeDashboard } from "@/components/TradeDashboard"
import BounceLoader from "@/components/ui/bounce-loader"

function TradingDashboardInner() {
  const { trades, accounts, strategies, performanceMetrics, updateMetrics, updateAccount, deleteAccount, addNotification, addAccount, isLoading } = useDashboard()
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [editName, setEditName] = useState("")
  const [editBroker, setEditBroker] = useState("")
  const [editBalance, setEditBalance] = useState<string>("")
  const [showManualModal, setShowManualModal] = useState(false)
  const [manualAccount, setManualAccount] = useState({ name: "", broker: "Exness", balance: 0 })

  const startEdit = (account: Account) => {
    setEditingAccountId(account.id)
    setEditName(account.name || "")
    setEditBroker(account.broker || "")
    setEditBalance(String(account.balance ?? ""))
  }

  const cancelEdit = () => {
    setEditingAccountId(null)
    setEditName("")
    setEditBroker("")
    setEditBalance("")
  }

  const saveEdit = async (id: string) => {
    const parsed = Number(editBalance.replace(/[^0-9.-]+/g, '')) || 0
    if (!updateAccount) {
      cancelEdit()
      return
    }

    try {
      await updateAccount(id, { name: editName, broker: editBroker, balance: parsed })
      cancelEdit()
    } catch (err) {
      cancelEdit()
    }
  }

  // Build glance cards from performance metrics
  const glanceCards = [
    {
      title: "Win Rate",
      value: performanceMetrics.winRate,
      change: performanceMetrics.winRateChange ?? 0,
      suffix: "%",
      sparklineData: performanceMetrics.sparklineData.map((v: number) => Math.max(0, v)), // Showing win distribution
    },
    {
      title: "Profit Factor",
      value: performanceMetrics.profitFactor,
      change: performanceMetrics.profitFactorChange || 0,
      suffix: "x",
      sparklineData: performanceMetrics.sparklineData,
    },
    {
      title: "Avg Win",
      value: performanceMetrics.avgWin,
      change: performanceMetrics.avgWinChange ?? 0,
      prefix: "$",
      sparklineData: performanceMetrics.sparklineData.filter((v: number) => v > 0),
    },
    {
      title: "Net Balance",
      value: performanceMetrics.netBalance,
      change: performanceMetrics.roi,
      prefix: "$",
      sparklineData: (performanceMetrics.sparklineData && performanceMetrics.sparklineData.length > 0)
        ? performanceMetrics.sparklineData.map((v: number, i: number, arr: number[]) => {
          return performanceMetrics.totalDeposit + arr.slice(0, i + 1).reduce((a, b) => a + b, 0);
        })
        : [performanceMetrics.totalDeposit, performanceMetrics.netBalance],
    },
  ]

  let bestStrategy: any = null;
  if (trades.length > 0) {
    const strategyStats: Record<string, { name: string, wins: number, total: number, profit: number }> = {};
    trades.forEach(t => {
      if (t.tradeStatus !== 'open') {
        const sName = typeof t.strategy === 'string' ? t.strategy : (t.strategy as any)?.name || 'Unknown';
        if (!strategyStats[sName]) strategyStats[sName] = { name: sName, wins: 0, total: 0, profit: 0 };
        strategyStats[sName].total++;
        if (t.result === 'win' || (t.profitLoss && t.profitLoss > 0)) strategyStats[sName].wins++;
        strategyStats[sName].profit += (t.profitLoss || 0);
      }
    });
    let bestStat = null;
    for (const key in strategyStats) {
      if (strategyStats[key].total > 0) {
        if (!bestStat || strategyStats[key].profit > bestStat.profit) bestStat = strategyStats[key];
      }
    }
    if (bestStat) {
      bestStrategy = {
        name: bestStat.name,
        winRate: (bestStat.wins / bestStat.total) * 100,
        trades: bestStat.total,
        avgWin: (bestStat.profit / bestStat.total).toFixed(2)
      };
    }
  }
  const worstTrade = trades.length > 0
    ? trades.reduce((worst: Trade, t: Trade) => {
      const wPL = worst.profitLoss || 0;
      const tPL = t.profitLoss || 0;
      return tPL < wPL ? t : worst;
    }, trades[0])
    : null

  // Get recent trades
  const recentTrades = trades.slice(0, 5)

  if (isLoading) {
    return <BounceLoader />
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 animate-pulse bg-sidebar-primary" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Performance Overview
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Trading Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Track your trading performance and discipline
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={updateMetrics}
            className="gap-2 bg-transparent"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Glance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {glanceCards.map((card) => (
          <GlanceCard
            key={card.title}
            title={card.title}
            value={card.value}
            prefix={card.prefix}
            suffix={card.suffix}
            change={card.change ?? 0}
            sparklineData={card.sparklineData}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main Content (Left) */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6 order-2 lg:order-1">
          {/* Real-time Equity Curve */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Account Growth (Equity Curve)</h3>
              <span className="text-[10px] text-muted-foreground uppercase font-mono">Performance Visualization</span>
            </div>
            <EquityCurveChart />
          </div>


          {/* Exness MT5 Integration */}
          <TradeDashboard />

          {/* Recent Trades Table */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Trades</h2>
            <div className="space-y-3">
              {recentTrades.length > 0 ? (
                recentTrades.map((trade: Trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-1 h-8 rounded-full ${trade.result === "win" ? "bg-emerald-500" : "bg-red-500"}`} />
                      <div>
                        <p className="text-sm font-semibold">{trade.symbol} <span className="text-[10px] text-muted-foreground ml-1 uppercase">{trade.direction}</span></p>
                        <p className="text-[10px] text-muted-foreground">{new Date(trade.entryTime).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-mono font-bold ${trade.result === "win" ? "text-emerald-400" : "text-red-400"}`}>
                        {trade.result === "win" ? "+" : ""}${trade.profitLoss?.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground italic">{trade.strategy}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">No trades recorded yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Side Panel (Right) */}
        <div className="flex flex-col gap-4 md:gap-6 order-1 lg:order-2">
          {/* Active Accounts */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Active Accounts</h3>
                <div className="group relative">
                  <div className="w-4 h-4 rounded-full border border-muted-foreground/50 flex items-center justify-center text-[10px] text-muted-foreground cursor-help">?</div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded shadow-lg border border-border opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10">
                    Active Accounts track your total trading capital across different brokers and strategies.
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] uppercase font-mono tracking-tighter"
                onClick={() => setShowLinkModal(true)}
              >
                + Link Broker
              </Button>
            </div>
            <div className="space-y-3">
              {accounts.length > 0 ? (
                accounts.slice(0, 2).map((account: Account) => (
                  <div key={account.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      {editingAccountId === account.id ? (
                        <div className="space-y-1">
                          <input className="w-full px-2 py-1 border rounded" value={editName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)} />
                          <input className="w-full px-2 py-1 border rounded" value={editBroker} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditBroker(e.target.value)} />
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium">{account.name}</p>
                          <p className="text-xs text-muted-foreground">{account.broker}</p>
                        </>
                      )}
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      {editingAccountId === account.id ? (
                        <>
                          <input className="w-24 text-right px-2 py-1 border rounded font-mono" value={editBalance} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditBalance(e.target.value)} />
                          <Button size="sm" onClick={() => saveEdit(account.id)}>Save</Button>
                          <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <div className="text-right">
                            <p className="text-sm font-mono font-semibold">${(account.balance + (accounts.length === 1 ? performanceMetrics.totalProfitLoss : 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="text-[10px] text-muted-foreground italic">
                              (Deposit: ${account.balance.toLocaleString()})
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => startEdit(account)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 px-2" onClick={() => {
                            if (window.confirm(`Are you sure you want to delete the account '${account.name}'?`)) {
                              deleteAccount(account.id);
                            }
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-3">No trading accounts linked</p>
                  <Button variant="outline" size="sm" onClick={() => setShowLinkModal(true)}>
                    Link Account
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Top Strategy */}
          {bestStrategy && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-semibold">Best Strategy</h3>
              </div>
              <p className="text-lg font-semibold mb-2">{bestStrategy.name}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span className="font-mono font-semibold text-emerald-400">{bestStrategy.winRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trades</span>
                  <span className="font-mono font-semibold">{bestStrategy.trades}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Win</span>
                  <span className="font-mono font-semibold text-emerald-400 font-bold">${bestStrategy.avgWin}</span>
                </div>
              </div>
            </div>
          )}

          {/* Risk Calculator */}
          <LotSizeCalculator initialBalance={performanceMetrics.netBalance} />

          {/* Quick Stats Summary */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-sm font-semibold mb-4 uppercase tracking-tighter opacity-70">Stats Overview</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total Trades</span>
                <span className="text-xs font-mono font-bold">{performanceMetrics?.totalTrades ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Win / Loss</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {performanceMetrics?.winningTrades ?? 0} <span className="text-muted-foreground">/</span> <span className="text-red-400">{performanceMetrics?.losingTrades ?? 0}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Account Growth</span>
                <span className={`text-xs font-mono font-bold ${performanceMetrics.totalProfitLoss >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {performanceMetrics.roi.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Broker Link Modal */}
        {showLinkModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Connect Broker</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowLinkModal(false)}>✕</Button>
              </div>

              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-sidebar-primary/10 border border-sidebar-primary/20">
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <span className="w-2 h-2 bg-sidebar-primary rounded-full animate-pulse" />
                    Link with Exness
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    To sync your balance and trades automatically with Exness:
                  </p>
                  <ol className="text-xs text-muted-foreground list-decimal ml-4 mt-2 space-y-1">
                    <li>Log in to your <b>Exness Personal Area</b>.</li>
                    <li>Go to <b>Settings</b> &gt; <b>API</b>.</li>
                    <li>Generate a <b>Read-Only API Key</b>.</li>
                    <li>Enter the key details below (Integration coming soon).</li>
                  </ol>
                </div>

                <div className="space-y-4 opacity-50 pointer-events-none">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">API Key</label>
                    <input type="password" placeholder="ex_..." className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono" />
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <Button className="w-full" onClick={() => setShowManualModal(true)}>
                    Add Manual Account
                  </Button>
                  <Button variant="ghost" className="opacity-50" disabled>
                    Sync via API (Coming Soon)
                  </Button>
                  <Button variant="outline" onClick={() => setShowLinkModal(false)}>Cancel</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manual Account Modal */}
        {showManualModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Add Manual Account</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Account Name</label>
                  <input
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
                    placeholder="e.g. My Exness Live"
                    value={manualAccount.name}
                    onChange={e => setManualAccount({ ...manualAccount, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Broker</label>
                  <input
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
                    placeholder="e.g. Exness"
                    value={manualAccount.broker}
                    onChange={e => setManualAccount({ ...manualAccount, broker: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Initial Deposit (Balance)</label>
                  <input
                    type="number"
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono"
                    placeholder="0.00"
                    value={manualAccount.balance || ""}
                    onChange={e => setManualAccount({ ...manualAccount, balance: Number(e.target.value) })}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <Button className="flex-1" onClick={async () => {
                    if (addAccount && manualAccount.name) {
                      await addAccount(manualAccount);
                      setShowManualModal(false);
                      setShowLinkModal(false);
                      addNotification({ title: "Account Added", message: "Your manual account has been saved.", type: "success" });
                    }
                  }}>Save Account</Button>
                  <Button variant="outline" onClick={() => setShowManualModal(false)}>Cancel</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TradingDashboard() {
  return (
    <DashboardLayout>
      <TradingDashboardInner />
    </DashboardLayout>
  )
}
