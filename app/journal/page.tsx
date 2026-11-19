"use client"

import { useState, Fragment, useMemo, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { TradeEntryForm } from "@/components/dashboard/trade-entry-form"
import { useDashboard } from "@/context/dashboard-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageViewer } from "@/components/ui/image-viewer"
import { Plus, Trash2, Edit2, Search, ChevronDown, ChevronRight, AlertTriangle, BookOpen } from "@/components/icons"
import { getWinLossCounts, calcResult as sharedCalcResult, calculateWinRate } from "@/lib/trading-metrics"
import { Page, PageHeader, Panel, StatCard, EmptyState, ResultBadge, DirectionBadge, formatMoney, pnlTone } from "@/components/kit"
import { cn } from "@/lib/utils"
import { NEW_TRADE_EVENT } from "@/components/dashboard/mobile-nav"
import { rMultiple } from "@/lib/instruments"
import { format } from "date-fns"

const MODEL_ABBR: Record<string, string> = {
  "Breaker Block": "BB",
  "Order Block": "OB",
  "FVG": "FVG",
  "IFVG": "IFVG",
  "Unicorn": "Unicorn",
  "MMXM": "MMXM",
  "Other": "Other",
}

const HTF_MAP: Record<string, { label: string; color: string }> = {
  Bullish: { label: "Bullish", color: "bg-profit/10 text-profit" },
  Bearish: { label: "Bearish", color: "bg-loss/10 text-loss" },
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
    <span className="inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
      Unknown
    </span>
  )
}

function LegacyBadge() {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
      Legacy
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
  const rewardPerUnit = String(trade.direction || "").toLowerCase() === "sell"
    ? entry - exit
    : exit - entry
  return rewardPerUnit / riskPerUnit
}

function getRRDisplay(trade: any): string {
  const shared = rMultiple(trade)
  if (shared != null && shared !== 0) {
    if (Math.abs(shared) > 50) return "⚠ " + shared.toFixed(1) + "R"
    return shared.toFixed(1) + "R"
  }
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
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

  const openNewTrade = () => {
    setSelectedTrade(null)
    setShowForm(true)
  }

  // Mobile bottom bar "+": opens the form via ?new=1 or, when already here, an event.
  useEffect(() => {
    const open = () => {
      setSelectedTrade(null)
      setShowForm(true)
    }
    const params = new URLSearchParams(window.location.search)
    if (params.get("new") === "1") {
      open()
      window.history.replaceState(null, "", window.location.pathname)
    }
    window.addEventListener(NEW_TRADE_EVENT, open)
    return () => window.removeEventListener(NEW_TRADE_EVENT, open)
  }, [])


  // Expanded details for a trade: shared by the table (tablet/desktop) and the cards (phone).
  const renderDetails = (trade: any, mistakeList: string[], legacy: boolean) => (
    legacy ? (
      <p className="p-5 text-center text-xs text-muted-foreground">No enhanced journal data for this trade.</p>
    ) : (
      <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 lg:grid-cols-3">
        {[
          ["Notes", trade.notes || "None"],
          ["Entry reason", trade.entryReason || "Not recorded"],
          ["Exit reason", trade.exitReason || "Not recorded"],
          ["Lesson learned", trade.lessonLearned || "Not recorded"],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
            <p className="whitespace-pre-wrap text-sm">{value}</p>
          </div>
        ))}
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Tags</p>
          {trade.tags && trade.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {trade.tags.map((t: string, ti: number) => (
                <span key={`tag-${ti}`} className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">{t}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">None</p>
          )}
          {mistakeList.length > 0 && (
            <>
              <p className="mb-1 mt-3 text-xs font-medium text-muted-foreground">Mistakes</p>
              <div className="flex flex-wrap gap-1">
                {mistakeList.map((m: string, mi: number) => (
                  <span key={`mistake-${mi}`} className="rounded-md bg-loss/10 px-1.5 py-0.5 text-[11px] text-loss">{m}</span>
                ))}
              </div>
            </>
          )}
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Screenshots</p>
          <div className="flex gap-2">
            {trade.screenshots && trade.screenshots.length > 0 ? (
              trade.screenshots.slice(0, 3).map((s: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setViewerImage(s)}
                  className="h-12 w-16 overflow-hidden rounded-md border border-border transition-opacity hover:opacity-80"
                >
                  <img src={s} alt={`Screenshot ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">None</p>
            )}
          </div>
        </div>
      </div>
    )
  )

  const totalPL = filteredTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0)
  // Shared counter: only finished trades count (an open trade isn't a breakeven).
  const { wins: winCount, losses: lossCount, breakevens: beCount } = getWinLossCounts(filteredTrades)
  const winRate = calculateWinRate(winCount, lossCount)

  const columnCount = showNetR ? 15 : 14
  const filtersActive =
    !!searchSymbol || [filterSession, filterHtf, filterModel, filterResult, filterMistake].some(f => f !== "all")
  const clearFilters = () => {
    setSearchSymbol("")
    setFilterSession("all")
    setFilterHtf("all")
    setFilterModel("all")
    setFilterResult("all")
    setFilterMistake("all")
  }

  const th = "px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap"
  const td = "px-3 py-2.5"

  return (
    <DashboardLayout>
      <Page>
        <PageHeader
          title="Trades"
          description="Review every trade, its setup and what you learned"
          actions={
            <Button size="sm" onClick={openNewTrade}>
              <Plus /> New trade
            </Button>
          }
        />

        {/* Legacy warning banner */}
        {showLegacyWarning && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/5 p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium">Analytics may be incomplete</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Most trades were recorded before enhanced journaling was enabled. Log setup details on new trades for more accurate statistics.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-6">
          <StatCard label="Trades" value={filteredTrades.length} />
          <StatCard label="Wins" value={winCount} tone="profit" />
          <StatCard label="Breakeven" value={beCount} tone="muted" />
          <StatCard label="Losses" value={lossCount} tone="loss" />
          <StatCard label="Win rate" value={`${winRate.toFixed(1)}%`} />
          <StatCard label="Total P&L" value={formatMoney(totalPL, { sign: true })} tone={pnlTone(totalPL)} />
        </div>

        {/* Filters */}
        <Panel className="mb-6 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="space-y-1.5">
              <Label htmlFor="journal-search" className="text-xs text-muted-foreground">Symbol</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="journal-search"
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(e.target.value)}
                  placeholder="EURUSD…"
                  className="bg-background pl-9"
                />
              </div>
            </div>
            <FilterSelect
              label="Session"
              value={filterSession}
              onChange={setFilterSession}
              options={[
                { value: "all", label: "All sessions" },
                { value: "unknown", label: "Unknown" },
                { value: "London", label: "London" },
                { value: "New York", label: "New York" },
                { value: "Asia", label: "Asia" },
                { value: "London Open", label: "London Open" },
                { value: "NY Open", label: "NY Open" },
                { value: "London/NY Overlap", label: "London/NY Overlap" },
              ]}
            />
            <FilterSelect
              label="HTF bias"
              value={filterHtf}
              onChange={setFilterHtf}
              options={[
                { value: "all", label: "All bias" },
                { value: "unknown", label: "Unknown" },
                { value: "bull", label: "Bullish" },
                { value: "bear", label: "Bearish" },
              ]}
            />
            <FilterSelect
              label="Model"
              value={filterModel}
              onChange={setFilterModel}
              options={[
                { value: "all", label: "All models" },
                { value: "unknown", label: "Unknown" },
                ...Object.entries(MODEL_ABBR).map(([full, abbr]) => ({ value: abbr, label: abbr === full ? full : `${abbr} · ${full}` })),
              ]}
            />
            <FilterSelect
              label="Result"
              value={filterResult}
              onChange={setFilterResult}
              options={[
                { value: "all", label: "All results" },
                { value: "win", label: "Win" },
                { value: "loss", label: "Loss" },
                { value: "be", label: "Breakeven" },
              ]}
            />
            <FilterSelect
              label="Mistakes"
              value={filterMistake}
              onChange={setFilterMistake}
              options={[
                { value: "all", label: "All trades" },
                { value: "clean", label: "Clean trades" },
                { value: "mistake", label: "With mistakes" },
              ]}
            />
          </div>
        </Panel>

        {/* Trades Table */}
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <p className="text-sm font-medium">
              {filteredTrades.length} {filteredTrades.length === 1 ? "trade" : "trades"}
              {filtersActive && <span className="font-normal text-muted-foreground"> matching filters</span>}
            </p>
            <div className="flex items-center gap-2">
              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNetR(!showNetR)}
                className={cn(showNetR && "border-brand/40 bg-brand-soft text-brand hover:bg-brand-soft hover:text-brand")}
              >
                {showNetR ? "Hide net R" : "Show net R"}
              </Button>
            </div>
          </div>

          {isLoading && trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 size-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
              <p className="text-sm text-muted-foreground">Loading trades…</p>
            </div>
          ) : filteredTrades.length > 0 ? (
            <>
            {/* Phone: one card per trade */}
            <ul className="divide-y divide-border md:hidden">
              {filteredTrades.map((trade) => {
                const resultVal = trade.tradeStatus === "open" ? "" : calcResult(trade)
                const mistakeList = allMistakeTags(trade)
                const legacy = isLegacyTrade(trade)
                const isExpanded = expandedRow === trade.id
                const pl = trade.profitLoss || 0
                const rr = getRRDisplay(trade)
                return (
                  <li key={trade.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedRow(isExpanded ? null : trade.id)}
                      className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition-colors active:bg-accent/40", isExpanded && "bg-accent/30")}
                      aria-expanded={isExpanded}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold">{trade.symbol}</span>
                          <DirectionBadge direction={trade.direction} />
                          <ResultBadge result={resultVal} />
                          {mistakeList.length > 0 && (
                            <span className="rounded-md bg-loss/10 px-1.5 py-0.5 text-[11px] font-medium text-loss">
                              {mistakeList.length} {mistakeList.length === 1 ? "mistake" : "mistakes"}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {format(new Date(trade.entryTime), "d MMM yyyy, HH:mm")}
                          {trade.session ? ` · ${trade.session}` : ""}
                          {trade.strategy ? ` · ${trade.strategy}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={cn("font-mono text-sm font-semibold tabular", pl > 0 ? "text-profit" : pl < 0 ? "text-loss" : "")}>
                          {formatMoney(pl, { sign: true })}
                        </p>
                        {rr !== "-" && <p className="font-mono text-xs text-muted-foreground tabular">{rr}</p>}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border bg-background/40">
                        {renderDetails(trade, mistakeList, legacy)}
                        <div className="flex gap-2 border-t border-border px-4 py-3">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditTrade(trade.id)}>
                            <Edit2 /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-loss hover:text-loss"
                            onClick={() => { if (confirm("Delete this trade?")) deleteTrade(trade.id) }}
                          >
                            <Trash2 /> Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            {/* Tablet / desktop: full table. "relative" keeps absolutely
                positioned children (e.g. sr-only labels) inside the scroll box
                so they can't stretch the page. */}
            <div className="relative hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="w-8 py-2.5 pl-4"></th>
                    <th className={th}>Symbol</th>
                    <th className={th}>Date</th>
                    <th className={th}>Side</th>
                    <th className={th}>Session</th>
                    <th className={th}>HTF bias</th>
                    <th className={th}>Model</th>
                    <th className={th}>Result</th>
                    <th className={cn(th, "text-right")}>P&L</th>
                    <th className={cn(th, "text-right")}>RR</th>
                    {showNetR && <th className={cn(th, "text-right")}>Net R</th>}
                    <th className={cn(th, "text-center")}>Score</th>
                    <th className={cn(th, "text-center")}>Mistakes</th>
                    <th className={cn(th, "text-center")}>Shots</th>
                    <th className={cn(th, "pr-4 text-right")}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => {
                    const score = calcSetupScore(trade)
                    const resultVal = trade.tradeStatus === "open" ? "" : calcResult(trade)
                    const htfValue = trade.htfBias || "UNKNOWN"
                    const htfStyle = HTF_MAP[htfValue]
                    const mistakeList = allMistakeTags(trade)
                    const legacy = isLegacyTrade(trade)
                    const hasVerifiedMistakes = legacy
                      ? ((trade.mistakeTags || []).length > 0 || (trade.mistakes || []).length > 0)
                      : mistakeList.length > 0
                    const isExpanded = expandedRow === trade.id
                    const pl = trade.profitLoss || 0

                    return (
                      <Fragment key={trade.id}>
                        <tr
                          className={cn(
                            "cursor-pointer border-b border-border transition-colors hover:bg-accent/40",
                            isExpanded && "bg-accent/30"
                          )}
                          onClick={() => setExpandedRow(isExpanded ? null : trade.id)}
                        >
                          <td className="py-2.5 pl-4">
                            {isExpanded ? (
                              <ChevronDown className="size-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-3.5 text-muted-foreground" />
                            )}
                          </td>
                          <td className={cn(td, "whitespace-nowrap")}>
                            <span className="font-medium">{trade.symbol}</span>
                            {legacy && <LegacyBadge />}
                          </td>
                          <td className={cn(td, "whitespace-nowrap text-muted-foreground tabular")}>{formatDate(trade.entryTime)}</td>
                          <td className={td}>
                            <DirectionBadge direction={trade.direction} />
                          </td>
                          <td className={cn(td, "whitespace-nowrap")}>
                            {trade.session === "UNKNOWN" || !trade.session ? (
                              <UnknownBadge />
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 text-[11px]">{trade.session}</span>
                            )}
                          </td>
                          <td className={cn(td, "whitespace-nowrap")}>
                            {htfStyle ? (
                              <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium", htfStyle.color)}>
                                {htfStyle.label}
                              </span>
                            ) : (
                              <UnknownBadge />
                            )}
                          </td>
                          <td className={td}>
                            {!trade.entryModel || trade.entryModel === "UNKNOWN" ? (
                              <UnknownBadge />
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium">
                                {MODEL_ABBR[trade.entryModel] || trade.entryModel}
                              </span>
                            )}
                          </td>
                          <td className={td}>
                            <ResultBadge result={resultVal} />
                          </td>
                          <td className={cn(td, "whitespace-nowrap text-right font-mono tabular", pl > 0 ? "text-profit" : pl < 0 ? "text-loss" : "")}>
                            {getPLDisplay(trade)}
                          </td>
                          <td className={cn(td, "text-right font-mono tabular")}>{getRRDisplay(trade)}</td>
                          {showNetR && (
                            <td className={cn(td, "text-right font-mono tabular", pl > 0 ? "text-profit" : pl < 0 ? "text-loss" : "")}>
                              {getNetRDisplay(trade)}
                            </td>
                          )}
                          <td className={cn(td, "text-center")}>
                            {score.hasData ? (
                              <span className={cn("font-mono text-xs tabular", score.score > 0 ? "text-brand" : "text-muted-foreground")}>
                                {score.score}/{score.total}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className={cn(td, "text-center")}>
                            {legacy && !hasVerifiedMistakes ? (
                              <UnknownBadge />
                            ) : hasVerifiedMistakes ? (
                              <span
                                className="inline-flex cursor-help items-center rounded-md bg-loss/10 px-1.5 py-0.5 text-[11px] font-medium text-loss"
                                title={mistakeList.join(", ")}
                              >
                                {mistakeList.length || 1} {mistakeList.length === 1 ? "mistake" : "mistakes"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-profit/10 px-1.5 py-0.5 text-[11px] font-medium text-profit">Clean</span>
                            )}
                          </td>
                          <td className={cn(td, "text-center text-xs text-muted-foreground tabular")}>
                            {trade.screenshots && trade.screenshots.length > 0 ? trade.screenshots.length : "—"}
                          </td>
                          <td className={cn(td, "whitespace-nowrap pr-4 text-right")}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditTrade(trade.id) }}
                              className="inline-flex rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                              title="Edit trade"
                              aria-label="Edit trade"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('Delete this trade?')) {
                                  deleteTrade(trade.id)
                                }
                              }}
                              className="inline-flex rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-loss"
                              title="Delete trade"
                              aria-label="Delete trade"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${trade.id}-expanded`}>
                            <td colSpan={columnCount} className="border-b border-border bg-background/40">
                              {renderDetails(trade, mistakeList, legacy)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </>
          ) : trades.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No trades yet"
              description="Log your first trade or import your history to start building your journal."
              action={
                <Button size="sm" onClick={openNewTrade}>
                  <Plus /> Log first trade
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Search}
              title="No trades match these filters"
              action={
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          )}
        </Panel>
      </Page>

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
