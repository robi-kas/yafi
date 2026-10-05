"use client"

import { useState, Fragment, useMemo } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { TradeEntryForm } from "@/components/dashboard/trade-entry-form"
import { useDashboard } from "@/context/dashboard-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ImageViewer } from "@/components/ui/image-viewer"
import { Plus, Trash2, Edit2, Search, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react"
import { calcResult as sharedCalcResult, calculateWinRate } from "@/lib/trading-metrics"

const MODEL_ABBR: Record<string, string> = {
  "Breaker Block": "BB",
  "Order Block": "OB",
  "FVG": "FVG",
  "IFVG": "IFVG",
  "Unicorn": "Unicorn",
  "MMXM": "MMXM",
  "Other": "Other",
}

const RESULT_MAP: Record<string, { label: string; color: string; bg: string }> = {
  win: { label: "W", color: "text-green-400", bg: "bg-green-500/20" },
  loss: { label: "L", color: "text-red-400", bg: "bg-red-500/20" },
  breakeven: { label: "BE", color: "text-yellow-400", bg: "bg-yellow-500/20" },
}

const HTF_MAP: Record<string, { label: string; icon: string; color: string }> = {
  Bullish: { label: "Bullish Trend", icon: "📈", color: "text-green-400" },
  Bearish: { label: "Bearish Trend", icon: "📉", color: "text-red-400" },
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

function formatDate(iso: string): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "-"
  const day = d.getUTCDate().toString().padStart(2, "0")
  const mon = MONTHS[d.getUTCMonth()]
  const year = d.getUTCFullYear()
  return `${day} ${mon} ${year}`
}

function UnknownBadge() {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] leading-none
      bg-muted/20 text-muted-foreground/80 border border-border/50 font-mono tracking-wide">
      UNKNOWN
    </span>
  )
}

function LegacyBadge() {
  return (
    <span className="px-1 py-0.5 rounded text-[8px] leading-none
      bg-amber-500/10 text-amber-500/70 font-mono ml-1.5 tracking-wide">
      LEGACY
    </span>
  )
}

const calcResult = sharedCalcResult

function calcSetupScore(trade: any): { score: number; total: number; hasData: boolean } {
  const checks = [
    trade.htfPoi,
    trade.liquiditySweep,
    trade.mssConfirmed,
    trade.fvgPresent,
    trade.ifvgPresent,
    trade.breakerBlockRetest,
    trade.orderBlockRetest,
    trade.fibonacciRetracement,
  ]
  const anyTrue = checks.some(Boolean)
  return { score: checks.filter(Boolean).length, total: checks.length, hasData: anyTrue }
}

function hasVerifiedMistakesFn(trade: any): boolean {
  const legacy = trade.isLegacy === true || trade.entryModel === "UNKNOWN"
  const hasMistakeTags = (trade.mistakeTags || []).length > 0
  const hasMistakes = (trade.mistakes || []).length > 0
  if (legacy) {
    return hasMistakeTags || hasMistakes
  }
  return hasMistakeTags || hasMistakes
}

function allMistakeTags(trade: any): string[] {
  const merged = [...(trade.mistakeTags || []), ...(trade.mistakes || [])]
  return [...new Set(merged)]
}

function isLegacyTrade(trade: any): boolean {
  return trade.isLegacy === true || trade.entryModel === "UNKNOWN"
}

function calcNetRR(trade: any): number | null {
  const entry = trade.entryPrice
  const stop = trade.stopLoss
  const exit = trade.exitPrice
  if (entry == null || stop == null || exit == null) return null
  if (stop === entry) return null
  const riskPerUnit = Math.abs(entry - stop)
  if (riskPerUnit <= 0) return null
  const rewardPerUnit = trade.direction === "sell"
    ? entry - exit
    : exit - entry
  return rewardPerUnit / riskPerUnit
}

function getRRDisplay(trade: any): string {
  const netR = calcNetRR(trade)
  if (netR == null) {
    const stored = trade.rrAchieved || trade.riskToReward
    if (!stored || stored <= 0) return "-"
    if (stored > 50) return "⚠ " + stored.toFixed(1) + "R"
    return stored.toFixed(1) + "R"
  }
  if (Math.abs(netR) > 50) return "⚠ " + netR.toFixed(1) + "R"
  return netR.toFixed(1) + "R"
}

function getNetRDisplay(trade: any): string {
  const netR = calcNetRR(trade)
  if (netR == null) return "-"
  if (netR > 0) return "+" + netR.toFixed(1) + "R"
  return netR.toFixed(1) + "R"
}

function getPLDisplay(trade: any): string {
  const pl = trade.profitLoss
  if (pl === undefined || pl === null) return "-"
  const rounded = Math.round(pl * 100) / 100
  if (rounded === 0) return "$0.00"
  return (rounded > 0 ? "+$" : "-$") + Math.abs(rounded).toFixed(2)
}

export default function TradeJournal() {
  const { trades, deleteTrade, isLoading } = useDashboard()
  const [showForm, setShowForm] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [viewerImage, setViewerImage] = useState<string | null>(null)
  const [showNetR, setShowNetR] = useState(false)

  // Filters
  const [searchSymbol, setSearchSymbol] = useState("")
  const [filterSession, setFilterSession] = useState<string>("all")
  const [filterHtf, setFilterHtf] = useState<string>("all")
  const [filterModel, setFilterModel] = useState<string>("all")
  const [filterResult, setFilterResult] = useState<string>("all")
  const [filterMistake, setFilterMistake] = useState<string>("all")

  const legacyCount = useMemo(() => trades.filter(t => isLegacyTrade(t)).length, [trades])
  const enhancedCount = trades.length - legacyCount
  const showLegacyWarning = legacyCount > enhancedCount

  const filteredTrades = trades.filter(trade => {
    const symbol = (trade.symbol || "").toLowerCase()
    if (symbol && !symbol.includes(searchSymbol.toLowerCase())) return false

    if (filterSession !== "all") {
      const session = trade.session || "UNKNOWN"
      if (filterSession === "unknown" && session !== "UNKNOWN") return false
      if (filterSession !== "unknown" && session !== filterSession && session !== "UNKNOWN") return false
      if (filterSession !== "unknown" && session === "UNKNOWN") return false
    }

    if (filterHtf !== "all") {
      const htf = trade.htfBias || "UNKNOWN"
      if (filterHtf === "unknown" && htf !== "UNKNOWN") return false
      if (filterHtf !== "unknown") {
        if (htf === "UNKNOWN") return false
        const filterVal = filterHtf === "bull" ? "Bullish" : "Bearish"
        if (htf !== filterVal) return false
      }
    }

    if (filterModel !== "all") {
      const model = MODEL_ABBR[trade.entryModel || ""] || "UNKNOWN"
      if (filterModel === "unknown" && model !== "UNKNOWN") return false
      if (filterModel !== "unknown" && model !== filterModel) return false
    }

    if (filterResult !== "all") {
      const r = calcResult(trade)
      if (filterResult === "win" && r !== "win") return false
      if (filterResult === "loss" && r !== "loss") return false
      if (filterResult === "be" && r !== "breakeven") return false
    }

    if (filterMistake === "clean" && hasVerifiedMistakesFn(trade)) return false
    if (filterMistake === "mistake" && !hasVerifiedMistakesFn(trade)) return false

    return true
  })

  const editingTrade = selectedTrade ? trades.find(t => t.id === selectedTrade) : undefined

  const handleEditTrade = (tradeId: string) => {
    setSelectedTrade(tradeId)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedTrade(null)
  }

  const totalPL = filteredTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0)
  const winCount = filteredTrades.filter(t => calcResult(t) === "win").length
  const lossCount = filteredTrades.filter(t => calcResult(t) === "loss").length
  const beCount = filteredTrades.filter(t => calcResult(t) === "breakeven").length
  const winRate = calculateWinRate(winCount, lossCount)

  const columnCount = showNetR ? 15 : 14

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Trade Journal</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                Performance-focused trade review
              </p>
            </div>
            <Button
              onClick={() => {
                setSelectedTrade(null)
                setShowForm(true)
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Trade</span>
            </Button>
          </div>

          {/* Legacy warning banner */}
          {showLegacyWarning && (
            <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-500">Analytics may be incomplete</p>
                <p className="text-[11px] text-amber-500/70 mt-0.5">
                  Most trades were recorded before enhanced journaling was enabled. Collect enhanced trades for more accurate statistics.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
            <p className="text-2xl font-semibold">{filteredTrades.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Wins</p>
            <p className="text-2xl font-semibold text-green-400">{winCount}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Breakeven</p>
            <p className="text-2xl font-semibold text-yellow-400">{beCount}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Losses</p>
            <p className="text-2xl font-semibold text-red-400">{lossCount}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
            <p className="text-2xl font-semibold">{winRate.toFixed(1)}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
            <p className={`text-2xl font-semibold ${totalPL > 0 ? 'text-green-400' : totalPL < 0 ? 'text-red-400' : ''}`}>
              {totalPL > 0 ? '+' : ''}${totalPL.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-2">Search Symbol</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(e.target.value)}
                  placeholder="EURUSD..."
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">Session</label>
              <select
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Sessions</option>
                <option value="unknown">UNKNOWN</option>
                <option value="London">London</option>
                <option value="New York">New York</option>
                <option value="Asia">Asia</option>
                <option value="London Open">London Open</option>
                <option value="NY Open">NY Open</option>
                <option value="London/NY Overlap">London/NY Overlap</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">HTF Bias</label>
              <select
                value={filterHtf}
                onChange={(e) => setFilterHtf(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Bias</option>
                <option value="unknown">UNKNOWN</option>
                <option value="bull">Bullish Trend</option>
                <option value="bear">Bearish Trend</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">Model</label>
              <select
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Models</option>
                <option value="unknown">UNKNOWN</option>
                {Object.entries(MODEL_ABBR).map(([full, abbr]) => (
                  <option key={full} value={abbr}>{abbr} - {full}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">Result</label>
              <select
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Results</option>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="be">Breakeven</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">Mistake</label>
              <select
                value={filterMistake}
                onChange={(e) => setFilterMistake(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Trades</option>
                <option value="clean">Clean Trades</option>
                <option value="mistake">Mistake Trades</option>
              </select>
            </div>
          </div>
        </div>

        {/* Trades Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {isLoading && trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-lg">
              <div className="w-10 h-10 border-4 border-lime/30 border-t-lime rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground animate-pulse font-mono tracking-widest text-xs uppercase">Loading Trades...</p>
            </div>
          ) : filteredTrades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="w-5 px-2 py-3"></th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Symbol</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Date</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Dir</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Session</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">HTF Bias</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Model</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Result</th>
                    <th className="px-2 py-3 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">P&L</th>
                    <th className="px-2 py-3 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">RR</th>
                    {showNetR && (
                      <th className="px-2 py-3 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">Net R</th>
                    )}
                    <th className="px-2 py-3 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">Score</th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">Mistake</th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">Shots</th>
                    <th className="px-2 py-3 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => {
                    const score = calcSetupScore(trade)
                    const calcResultVal = calcResult(trade)
                    const resultStyle = RESULT_MAP[calcResultVal]
                    const htfValue = trade.htfBias || "UNKNOWN"
                    const htfStyle = HTF_MAP[htfValue]
                    const mistakeList = allMistakeTags(trade)
                    const legacy = isLegacyTrade(trade)
                    const hasVerifiedMistakes = legacy
                      ? ((trade.mistakeTags || []).length > 0 || (trade.mistakes || []).length > 0)
                      : mistakeList.length > 0
                    const isExpanded = expandedRow === trade.id

                    return (
                      <Fragment key={trade.id}>
                        <tr
                          className="border-b border-border hover:bg-background/50 transition-colors cursor-pointer"
                          onClick={() => setExpandedRow(isExpanded ? null : trade.id)}
                        >
                          <td className="px-2 py-3">
                            {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                          </td>
                          <td className="px-2 py-3">
                            <span className="font-mono font-semibold text-sm">{trade.symbol}</span>
                            {legacy && <LegacyBadge />}
                          </td>
                          <td className="px-2 py-3">
                            <span className="text-xs text-muted-foreground font-mono">
                              {formatDate(trade.entryTime)}
                            </span>
                          </td>
                          <td className="px-2 py-3">
                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${trade.direction === 'buy'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                              }`}>
                              {trade.direction === 'buy' ? 'BUY' : 'SELL'}
                            </span>
                          </td>
                          <td className="px-2 py-3">
                            {(trade.session === "UNKNOWN" || !trade.session) ? (
                              <UnknownBadge />
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[11px] bg-blue-500/20 text-blue-400">
                                {trade.session}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-sm whitespace-nowrap">
                            {htfValue === "UNKNOWN" ? (
                              <UnknownBadge />
                            ) : htfStyle ? (
                              <span className={htfStyle.color}>
                                {htfStyle.icon} {htfStyle.label}
                              </span>
                            ) : (
                              <UnknownBadge />
                            )}
                          </td>
                          <td className="px-2 py-3">
                            {(!trade.entryModel || trade.entryModel === "UNKNOWN") ? (
                              <UnknownBadge />
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[11px] bg-cyan-500/20 text-cyan-400 font-mono">
                                {MODEL_ABBR[trade.entryModel] || trade.entryModel}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3">
                            {resultStyle ? (
                              <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${resultStyle.bg} ${resultStyle.color}`}>
                                {resultStyle.label}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className={`px-2 py-3 text-right text-sm font-mono ${(trade.profitLoss || 0) > 0 ? 'text-green-400' : (trade.profitLoss || 0) < 0 ? 'text-red-400' : ''}`}>
                            {getPLDisplay(trade)}
                          </td>
                          <td className="px-2 py-3 text-right text-sm font-mono">
                            {getRRDisplay(trade)}
                          </td>
                          {showNetR && (
                            <td className={`px-2 py-3 text-right text-sm font-mono ${(trade.profitLoss || 0) > 0 ? 'text-green-400' : (trade.profitLoss || 0) < 0 ? 'text-red-400' : ''}`}>
                              {getNetRDisplay(trade)}
                            </td>
                          )}
                          <td className="px-2 py-3 text-center">
                            {score.hasData ? (
                              <span className={`text-xs font-mono ${score.score > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                {score.score}/{score.total}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-center">
                            {legacy && !hasVerifiedMistakes ? (
                              <UnknownBadge />
                            ) : hasVerifiedMistakes ? (
                              <span className="text-xs text-red-400 cursor-help" title={mistakeList.join(", ")}>
                                ⚠ Mistake
                              </span>
                            ) : (
                              <span className="text-xs text-emerald-400">✓ Clean</span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-center">
                            {trade.screenshots && trade.screenshots.length > 0 ? (
                              <span className="text-xs text-muted-foreground">{trade.screenshots.length}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditTrade(trade.id) }}
                              className="p-1 hover:bg-background rounded transition-colors inline-flex"
                              title="Edit trade"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('Delete this trade?')) {
                                  deleteTrade(trade.id)
                                }
                              }}
                              className="p-1 hover:bg-background rounded transition-colors text-red-400 hover:text-red-500 inline-flex"
                              title="Delete trade"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowNetR(!showNetR) }}
                              className={`p-1 rounded transition-colors inline-flex ml-1 ${showNetR ? 'text-lime bg-lime/10' : 'text-muted-foreground hover:text-foreground hover:bg-background'}`}
                              title="Toggle Net R column"
                            >
                              <span className="text-[10px] font-mono font-bold">R</span>
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${trade.id}-expanded`}>
                            <td colSpan={columnCount} className="bg-muted/20 border-b border-border">
                              {legacy ? (
                                <div className="p-4 text-center">
                                  <p className="text-xs text-muted-foreground/60 italic">
                                    No enhanced journal data available.
                                  </p>
                                </div>
                              ) : (
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-[11px] text-muted-foreground font-medium mb-1">Notes</p>
                                    <p className="text-sm">{trade.notes || "None"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] text-muted-foreground font-medium mb-1">Entry Reason</p>
                                    <p className="text-sm">{trade.entryReason || "Not recorded"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] text-muted-foreground font-medium mb-1">Exit Reason</p>
                                    <p className="text-sm">{trade.exitReason || "Not recorded"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] text-muted-foreground font-medium mb-1">Lesson Learned</p>
                                    <p className="text-sm">{trade.lessonLearned || "Not recorded"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] text-muted-foreground font-medium mb-1">Tags</p>
                                    {trade.tags && trade.tags.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {trade.tags.map((t: string, ti: number) => (
                                          <span key={`tag-${ti}`} className="px-1.5 py-0.5 rounded text-[10px] bg-muted/30 text-muted-foreground">{t}</span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">None</p>
                                    )}
                                    {mistakeList.length > 0 && (
                                      <>
                                        <p className="text-[11px] text-muted-foreground font-medium mb-1 mt-2">Mistake Tags</p>
                                        <div className="flex flex-wrap gap-1">
                                          {mistakeList.map((m: string, mi: number) => (
                                            <span key={`mistake-${mi}`} className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400">{m}</span>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-[11px] text-muted-foreground font-medium mb-1">Screenshots</p>
                                    <div className="flex gap-2">
                                      {trade.screenshots && trade.screenshots.length > 0 ? (
                                        trade.screenshots.slice(0, 3).map((s: string, i: number) => (
                                          <button
                                            key={i}
                                            onClick={() => setViewerImage(s)}
                                            className="w-16 h-12 rounded border border-border overflow-hidden hover:opacity-80 transition-opacity"
                                          >
                                            <img src={s} alt="" className="w-full h-full object-cover" />
                                          </button>
                                        ))
                                      ) : (
                                        <p className="text-sm text-muted-foreground">None</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              {trades.length === 0 ? (
                <>
                  <p className="text-muted-foreground mb-4">You haven't recorded any trades yet</p>
                  <Button
                    onClick={() => {
                      setSelectedTrade(null)
                      setShowForm(true)
                    }}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Record First Trade
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">No trades found matching your filters</p>
              )}
            </div>
          )}
        </div>

        {/* Net R toggle outside table */}
        {filteredTrades.length > 0 && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setShowNetR(!showNetR)}
              className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${showNetR
                ? 'bg-lime/10 border-lime/30 text-lime'
                : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-background'
                }`}
            >
              {showNetR ? "Hide Net R" : "Show Net R"}
            </button>
          </div>
        )}
      </div>

      {/* Image Viewer */}
      {viewerImage && (
        <ImageViewer src={viewerImage} onClose={() => setViewerImage(null)} />
      )}

      {/* Trade Entry Form Modal */}
      {showForm && (
        <TradeEntryForm
          onClose={handleCloseForm}
          initialTrade={editingTrade}
        />
      )}
    </DashboardLayout>
  )
}
