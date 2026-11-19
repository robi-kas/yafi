"use client"

import React, { useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useDashboard } from "@/context/dashboard-context"
import { EquityCurveChart } from "@/components/dashboard/trading-charts"
import {
  getPerformanceByRMultiple, getPerformanceBySymbol, getTradeDistributionByDay,
  getWeekdayPerformance, getSessionPerformance, getHtfBiasAccuracy,
  getEntryModelPerformance, getSetupScoreAnalytics, getMistakeAnalysis,
  getEmotionalAnalytics, getEquityCurveData, getMonthlyPerformance,
  getExpectancy, getRiskManagement, getInsights, getEnhancedTrades, getAllMetrics,
} from "@/lib/analytics"
import {
  TrendingUp, TrendingDown, Target, Zap, AlertTriangle, Info,
  BarChart3, Activity, Brain, Calendar, DollarSign, LineChart,
  Sun, Star, Flame, ChevronDown, Trophy,
} from "@/components/icons"
import type { IconComponent } from "@/components/icons"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Line, AreaChart, Area, Cell, ComposedChart,
} from "recharts"
import { Page, PageHeader, Panel, PanelHeader, PanelBody, StatCard, EmptyState, formatMoney, pnlTone } from "@/components/kit"
import { cn } from "@/lib/utils"
import { isClosedTrade } from "@/lib/trading-metrics"

/* ─── Small building blocks ─── */

type Tone = "profit" | "loss" | "default"
const toneClass = (t: Tone) => (t === "profit" ? "text-profit" : t === "loss" ? "text-loss" : "text-foreground")
const signTone = (n: number): Tone => (n > 0 ? "profit" : n < 0 ? "loss" : "default")

/** Compact metric tile used inside panels. */
function Tile({ label, value, sub, tone = "default" }: { label: string; value: string; sub?: string; tone?: Tone }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background/40 p-3">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate font-mono text-base font-semibold tabular", toneClass(tone))}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function InsightCard({ type, title, description }: { type: "positive" | "negative" | "neutral"; title: string; description: string }) {
  const style = {
    positive: "border-profit/20 bg-profit/5 text-profit",
    negative: "border-loss/20 bg-loss/5 text-loss",
    neutral: "border-border bg-secondary/40 text-foreground",
  }[type]
  return (
    <div className={cn("rounded-xl border p-4", style)}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

function NoData({ title = "Not enough data yet", description }: { title?: string; description: string }) {
  return <EmptyState icon={Info} title={title} description={description} className="py-10" />
}

const NEEDS_TRADES = "Log or import a few closed trades and this breakdown fills in automatically."
const NEEDS_JOURNAL = "Fill in the journal fields (session, HTF bias, entry model, emotions) when logging trades to unlock this."

type Cell =
  | string
  | { value: string; tone?: Tone; mono?: boolean }

function DataTable({ headers, rows }: {
  headers: { key: string; label: string; align?: "left" | "right" }[]
  rows: { key: string; cells: Cell[] }[]
}) {
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {headers.map(h => (
              <th key={h.key} className={cn("px-5 py-2 font-medium text-muted-foreground", h.align === "right" ? "text-right" : "text-left")}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40">
              {r.cells.map((c, i) => {
                const val = typeof c === "string" ? c : c.value
                const tone = typeof c === "string" ? undefined : c.tone
                const mono = typeof c === "string" ? false : !!c.mono
                return (
                  <td
                    key={i}
                    className={cn(
                      "px-5 py-2.5",
                      headers[i]?.align === "right" ? "text-right" : "text-left",
                      tone && toneClass(tone),
                      (mono || headers[i]?.align === "right") && "font-mono tabular"
                    )}
                  >
                    {val}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      {label !== undefined && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono tabular">
          <span className="mr-2 font-sans text-muted-foreground">{LABELS[p.name] || p.name}</span>
          {formatter ? formatter(p.value, p.name) : p.value}
        </p>
      ))}
    </div>
  )
}

const LABELS: Record<string, string> = {
  count: "Trades", netPnl: "Net P&L", wins: "Wins", losses: "Losses", breakevens: "Breakeven",
  winRate: "Win rate", drawdown: "Drawdown",
}

/* ─── Chart defaults ─── */
const AXIS_PROPS = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false }
const GRID = <CartesianGrid vertical={false} stroke="var(--border)" />
const GRID_H = <CartesianGrid horizontal={false} stroke="var(--border)" />
const CURSOR = { fill: "var(--accent)", fillOpacity: 0.5 }
const money = (v: number) => formatMoney(v, { sign: true })
const pct = (v: number) => `${Number(v).toFixed(1)}%`
const pf = (v: number) => (v === Infinity ? "∞" : v.toFixed(2))
const monthLabel = (key: string) => {
  const [y, mo] = key.split("-").map(Number)
  if (!y || !mo) return key
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" })
}

/* ─── Section config ─── */
interface SectionDef { id: string; title: string; description: string; icon: IconComponent; cols: 1 | 2 | 3 }

const SECTIONS: SectionDef[] = [
  { id: "r-multiple", title: "R-multiple distribution", description: "How many trades landed in each R bucket", icon: Target, cols: 2 },
  { id: "expectancy", title: "Expectancy", description: "What an average trade is worth", icon: Trophy, cols: 1 },
  { id: "symbols", title: "Symbol performance", description: "Net P&L by instrument", icon: BarChart3, cols: 2 },
  { id: "risk-management", title: "Risk management", description: "Risk taken versus reward achieved", icon: DollarSign, cols: 1 },
  { id: "equity", title: "Equity & drawdown", description: "Balance and distance from peak", icon: TrendingUp, cols: 2 },
  { id: "day-distribution", title: "Results by day", description: "Wins, losses and breakevens per weekday", icon: Calendar, cols: 1 },
  { id: "monthly", title: "Monthly performance", description: "Net P&L bars with win-rate line", icon: LineChart, cols: 2 },
  { id: "weekday", title: "Weekday performance", description: "Which days pay and which cost", icon: Activity, cols: 1 },
  { id: "entry-models", title: "Entry model performance", description: "Win rate by entry model", icon: Zap, cols: 2 },
  { id: "session", title: "Session performance", description: "Win rate by trading session", icon: Sun, cols: 1 },
  { id: "htf-bias", title: "HTF bias accuracy", description: "Results when trading with each bias", icon: TrendingUp, cols: 1 },
  { id: "setup-score", title: "Setup score vs win rate", description: "Do higher-quality setups win more?", icon: Star, cols: 1 },
  { id: "mistakes", title: "Mistake analysis", description: "What your mistakes cost you", icon: Flame, cols: 1 },
  { id: "emotional", title: "Emotional analytics", description: "Results by emotional state", icon: Brain, cols: 3 },
]

/* ─── Main component ─── */
function AnalyticsInner() {
  const { trades: allTrades, performanceMetrics } = useDashboard()
  // Analytics describe realised results: only finished trades count, so every
  // P&L, win rate and R figure on this page uses the same population.
  const trades = useMemo(() => allTrades.filter(isClosedTrade), [allTrades])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setCollapsed(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const enhanced = useMemo(() => getEnhancedTrades(trades), [trades])
  const legacyCount = trades.length - enhanced.length
  const m = useMemo(() => getAllMetrics(trades), [trades])
  const rMultiple = useMemo(() => getPerformanceByRMultiple(trades), [trades])
  const symbols = useMemo(() => getPerformanceBySymbol(trades), [trades])
  const dayDist = useMemo(() => getTradeDistributionByDay(trades), [trades])
  const weekday = useMemo(() => getWeekdayPerformance(trades), [trades])
  const session = useMemo(() => getSessionPerformance(enhanced), [enhanced])
  const htfBias = useMemo(() => getHtfBiasAccuracy(enhanced), [enhanced])
  const entryModels = useMemo(() => getEntryModelPerformance(enhanced), [enhanced])
  const setupScore = useMemo(() => getSetupScoreAnalytics(trades), [trades])
  const mistakes = useMemo(() => getMistakeAnalysis(trades), [trades])
  const emotions = useMemo(() => getEmotionalAnalytics(enhanced), [enhanced])
  const equity = useMemo(() => getEquityCurveData(trades, performanceMetrics.totalDeposit), [trades, performanceMetrics.totalDeposit])
  const monthly = useMemo(() => getMonthlyPerformance(trades).map(x => ({ ...x, label: monthLabel(x.month) })), [trades])
  const expectancy = useMemo(() => getExpectancy(trades), [trades])
  const risk = useMemo(() => getRiskManagement(trades), [trades])
  const insights = useMemo(() => getInsights(trades), [trades])

  // Note: always sort copies — these arrays are also rendered as charts/tables.
  const renderBody = (id: string): React.ReactNode => {
    switch (id) {
      case "r-multiple": {
        if (!rMultiple.length) return <NoData description="R multiples need a stop loss on each trade (or an achieved R). Add stops when logging trades." />
        const best = [...rMultiple].filter(b => b.totalPnl > 0).sort((a, b) => b.totalPnl - a.totalPnl)[0]
        const worst = [...rMultiple].filter(b => b.totalPnl < 0).sort((a, b) => a.totalPnl - b.totalPnl)[0]
        const common = [...rMultiple].sort((a, b) => b.count - a.count)[0]
        return (
          <div className="space-y-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rMultiple} layout="vertical" margin={{ left: 8, right: 16 }}>
                  {GRID_H}
                  <XAxis type="number" allowDecimals={false} {...AXIS_PROPS} />
                  <YAxis type="category" dataKey="key" width={80} {...AXIS_PROPS} />
                  <Tooltip cursor={CURSOR} content={<ChartTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {rMultiple.map((b, i) => <Cell key={i} fill={b.totalPnl > 0 ? "var(--profit)" : b.totalPnl < 0 ? "var(--loss)" : "var(--chart-2)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Tile label="Most profitable bucket" value={best?.key || "—"} tone={best ? "profit" : "default"} />
              <Tile label="Most costly bucket" value={worst?.key || "—"} tone={worst ? "loss" : "default"} />
              <Tile label="Most common" value={common?.key || "—"} />
            </div>
          </div>
        )
      }
      case "symbols": {
        if (!symbols.length) return <NoData description={NEEDS_TRADES} />
        const byPnl = [...symbols].sort((a, b) => b.netPnl - a.netPnl)
        const mostTraded = [...symbols].sort((a, b) => b.totalTrades - a.totalTrades)[0]
        return (
          <div className="space-y-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPnl} layout="vertical" margin={{ left: 8, right: 16 }}>
                  {GRID_H}
                  <XAxis type="number" {...AXIS_PROPS} tickFormatter={(v: number) => `$${v}`} />
                  <YAxis type="category" dataKey="symbol" width={72} {...AXIS_PROPS} />
                  <Tooltip cursor={CURSOR} content={<ChartTooltip formatter={money} />} />
                  <Bar dataKey="netPnl" radius={[0, 4, 4, 0]}>
                    {byPnl.map((e, i) => <Cell key={i} fill={e.netPnl >= 0 ? "var(--profit)" : "var(--loss)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <DataTable
              headers={[
                { key: "sym", label: "Symbol" },
                { key: "tr", label: "Trades", align: "right" },
                { key: "w", label: "Wins", align: "right" },
                { key: "l", label: "Losses", align: "right" },
                { key: "wr", label: "Win rate", align: "right" },
                { key: "pnl", label: "Net P&L", align: "right" },
                { key: "pf", label: "Profit factor", align: "right" },
              ]}
              rows={byPnl.map(s => ({
                key: s.symbol,
                cells: [
                  { value: s.symbol },
                  String(s.totalTrades),
                  { value: String(s.wins), tone: "profit" },
                  { value: String(s.losses), tone: "loss" },
                  pct(s.winRate),
                  { value: money(s.netPnl), tone: signTone(s.netPnl) },
                  pf(s.profitFactor),
                ],
              }))}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Tile label="Best symbol" value={byPnl[0]?.symbol || "—"} sub={byPnl[0] ? money(byPnl[0].netPnl) : undefined} tone="profit" />
              <Tile label="Worst symbol" value={byPnl[byPnl.length - 1]?.symbol || "—"} sub={byPnl.length ? money(byPnl[byPnl.length - 1].netPnl) : undefined} tone={signTone(byPnl[byPnl.length - 1]?.netPnl || 0)} />
              <Tile label="Most traded" value={mostTraded?.symbol || "—"} sub={mostTraded ? `${mostTraded.totalTrades} trades` : undefined} />
            </div>
          </div>
        )
      }
      case "day-distribution": {
        if (dayDist.every(d => !d.total)) return <NoData description={NEEDS_TRADES} />
        return (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayDist}>
                {GRID}
                <XAxis dataKey="day" {...AXIS_PROPS} tickFormatter={(d: string) => String(d).slice(0, 3)} />
                <YAxis allowDecimals={false} width={28} {...AXIS_PROPS} />
                <Tooltip cursor={CURSOR} content={<ChartTooltip />} />
                <Bar dataKey="wins" stackId="a" fill="var(--profit)" />
                <Bar dataKey="losses" stackId="a" fill="var(--loss)" />
                <Bar dataKey="breakevens" stackId="a" fill="var(--warning)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      }
      case "weekday": {
        if (weekday.every(d => !d.trades)) return <NoData description={NEEDS_TRADES} />
        const active = weekday.filter(d => d.trades > 0)
        const best = [...active].sort((a, b) => b.netPnl - a.netPnl)[0]
        const worst = [...active].sort((a, b) => a.netPnl - b.netPnl)[0]
        const busiest = [...active].sort((a, b) => b.trades - a.trades)[0]
        return (
          <div className="space-y-3">
            <DataTable
              headers={[
                { key: "d", label: "Day" }, { key: "tr", label: "Trades", align: "right" },
                { key: "wr", label: "Win rate", align: "right" }, { key: "pnl", label: "P&L", align: "right" },
              ]}
              rows={weekday.map(d => ({
                key: d.day,
                cells: [
                  { value: d.day, tone: best && d.day === best.day && d.trades > 0 ? "profit" : worst && d.day === worst.day && d.trades > 0 && worst.netPnl < 0 ? "loss" : undefined },
                  String(d.trades),
                  d.trades ? pct(d.winRate) : "—",
                  { value: d.trades ? money(d.netPnl) : "—", tone: d.trades ? signTone(d.netPnl) : undefined },
                ],
              }))}
            />
            {best && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {best.day} is your most profitable day ({money(best.netPnl)}).
                {worst && worst.day !== best.day && ` ${worst.day} is the least profitable (${money(worst.netPnl)}).`}
                {busiest && ` ${busiest.day} is the busiest (${busiest.trades} trades).`}
              </p>
            )}
          </div>
        )
      }
      case "session": {
        if (!session.length) return <NoData description={NEEDS_JOURNAL} />
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {session.map(s => (
                <Tile key={s.session} label={s.session} value={pct(s.winRate)} sub={`${s.trades} trades · ${money(s.netPnl)}`} tone={signTone(s.netPnl)} />
              ))}
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={session}>
                  {GRID}
                  <XAxis dataKey="session" {...AXIS_PROPS} />
                  <YAxis width={32} {...AXIS_PROPS} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip cursor={CURSOR} content={<ChartTooltip formatter={pct} />} />
                  <Bar dataKey="winRate" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      }
      case "htf-bias": {
        if (!htfBias.length) return <NoData description={NEEDS_JOURNAL} />
        return (
          <div className="grid grid-cols-2 gap-2">
            {htfBias.map(b => (
              <div key={b.bias} className="rounded-lg border border-border bg-background/40 p-4">
                <div className="mb-2 flex items-center gap-2">
                  {b.bias === "Bullish" ? <TrendingUp className="size-4 text-profit" /> : <TrendingDown className="size-4 text-loss" />}
                  <p className="text-sm font-medium">{b.bias} bias</p>
                </div>
                <p className="font-mono text-2xl font-semibold tabular">{pct(b.winRate)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{b.trades} trades · <span className={toneClass(signTone(b.netPnl))}>{money(b.netPnl)}</span></p>
              </div>
            ))}
          </div>
        )
      }
      case "entry-models": {
        if (!entryModels.length) return <NoData description={NEEDS_JOURNAL} />
        return (
          <div className="space-y-4">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entryModels} layout="vertical" margin={{ left: 8, right: 16 }}>
                  {GRID_H}
                  <XAxis type="number" {...AXIS_PROPS} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis type="category" dataKey="model" width={96} {...AXIS_PROPS} />
                  <Tooltip cursor={CURSOR} content={<ChartTooltip formatter={pct} />} />
                  <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                    {entryModels.map((e, i) => <Cell key={i} fill={e.winRate >= 50 ? "var(--profit)" : "var(--loss)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <DataTable
              headers={[
                { key: "m", label: "Model" }, { key: "tr", label: "Trades", align: "right" },
                { key: "wr", label: "Win rate", align: "right" }, { key: "pf", label: "Profit factor", align: "right" },
                { key: "pnl", label: "P&L", align: "right" }, { key: "rr", label: "Avg R", align: "right" },
              ]}
              rows={entryModels.map(x => ({
                key: x.model,
                cells: [
                  { value: x.model },
                  String(x.trades),
                  { value: pct(x.winRate), tone: x.winRate >= 50 ? "profit" : "loss" },
                  pf(x.profitFactor),
                  { value: money(x.netPnl), tone: signTone(x.netPnl) },
                  x.avgRR.toFixed(2),
                ],
              }))}
            />
          </div>
        )
      }
      case "setup-score": {
        if (setupScore.data.every(d => !d.trades)) return <NoData description="Tick the entry confluences (POI, sweep, MSS, FVG …) when logging trades to score each setup." />
        const filtered = setupScore.data.filter(d => d.trades > 0)
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Tile label="Avg score, winners" value={`${setupScore.avgScoreWinners.toFixed(2)} / 8`} tone="profit" />
              <Tile label="Avg score, losers" value={`${setupScore.avgScoreLosers.toFixed(2)} / 8`} tone="loss" />
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filtered}>
                  {GRID}
                  <XAxis dataKey="score" {...AXIS_PROPS} />
                  <YAxis width={32} {...AXIS_PROPS} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip cursor={CURSOR} content={<ChartTooltip formatter={pct} />} labelFormatter={(l: any) => `Score ${l}`} />
                  <Bar dataKey="winRate" radius={[4, 4, 0, 0]} fill="var(--chart-3)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      }
      case "mistakes": {
        if (!mistakes.length) return <NoData title="No mistakes tagged" description="Tag mistakes (FOMO, moved stop, overtraded …) on trades to see what they cost you." />
        const costly = [...mistakes].sort((a, b) => a.netPnl - b.netPnl)[0]
        const common = [...mistakes].sort((a, b) => b.frequency - a.frequency)[0]
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Tile label="Most costly" value={costly.mistake} sub={money(costly.netPnl)} tone="loss" />
              <Tile label="Most common" value={common.mistake} sub={`${common.frequency}×`} />
            </div>
            <DataTable
              headers={[
                { key: "m", label: "Mistake" }, { key: "freq", label: "Times", align: "right" },
                { key: "wr", label: "Win rate", align: "right" }, { key: "pnl", label: "P&L", align: "right" },
              ]}
              rows={mistakes.map(x => ({
                key: x.mistake,
                cells: [
                  { value: x.mistake },
                  String(x.frequency),
                  { value: pct(x.winRate), tone: x.winRate >= 50 ? "profit" : "loss" },
                  { value: money(x.netPnl), tone: signTone(x.netPnl) },
                ],
              }))}
            />
          </div>
        )
      }
      case "emotional": {
        if (!emotions.length) return <NoData description={NEEDS_JOURNAL} />
        return (
          <DataTable
            headers={[
              { key: "e", label: "Emotion" }, { key: "tr", label: "Trades", align: "right" },
              { key: "wr", label: "Win rate", align: "right" }, { key: "pnl", label: "Net P&L", align: "right" },
            ]}
            rows={emotions.map(e => ({
              key: e.emotion,
              cells: [
                { value: e.emotion },
                String(e.trades),
                { value: pct(e.winRate), tone: e.winRate >= 50 ? "profit" : "loss" },
                { value: money(e.netPnl), tone: signTone(e.netPnl) },
              ],
            }))}
          />
        )
      }
      case "monthly": {
        if (!monthly.length) return <NoData description={NEEDS_TRADES} />
        return (
          <div className="space-y-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthly}>
                  {GRID}
                  <XAxis dataKey="label" {...AXIS_PROPS} />
                  <YAxis yAxisId="l" width={56} {...AXIS_PROPS} tickFormatter={(v: number) => `$${v}`} />
                  <YAxis yAxisId="r" orientation="right" width={36} {...AXIS_PROPS} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip cursor={CURSOR} content={<ChartTooltip formatter={(v: number, n: string) => (n === "winRate" ? pct(v) : money(v))} />} />
                  <Bar yAxisId="l" dataKey="netPnl" radius={[4, 4, 0, 0]}>
                    {monthly.map((x, i) => <Cell key={i} fill={x.netPnl >= 0 ? "var(--profit)" : "var(--loss)"} />)}
                  </Bar>
                  <Line yAxisId="r" type="monotone" dataKey="winRate" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3, fill: "var(--chart-2)" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <DataTable
              headers={[
                { key: "mo", label: "Month" }, { key: "tr", label: "Trades", align: "right" },
                { key: "wr", label: "Win rate", align: "right" }, { key: "pnl", label: "P&L", align: "right" },
                { key: "r", label: "Net R", align: "right" },
              ]}
              rows={monthly.map(x => ({
                key: x.month,
                cells: [
                  { value: x.label },
                  String(x.trades),
                  pct(x.winRate),
                  { value: money(x.netPnl), tone: signTone(x.netPnl) },
                  { value: `${x.netR >= 0 ? "+" : ""}${x.netR.toFixed(2)}R`, tone: signTone(x.netR) },
                ],
              }))}
            />
          </div>
        )
      }
      case "equity": {
        if (!trades.length) return <NoData description={NEEDS_TRADES} />
        return (
          <div className="space-y-5">
            <EquityCurveChart height={240} />
            {equity.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Drawdown from peak</p>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equity} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--loss)" stopOpacity={0.05} />
                          <stop offset="100%" stopColor="var(--loss)" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      {GRID}
                      <XAxis dataKey="tradeNumber" {...AXIS_PROPS} minTickGap={24} tickFormatter={(v: number) => `#${v}`} />
                      <YAxis width={64} {...AXIS_PROPS} domain={[0, "auto"]} tickFormatter={(v: number) => `${Number(v).toFixed(1)}%`} />
                      <Tooltip content={<ChartTooltip formatter={(v: number, n: string) => (n === "drawdown" ? `${Number(v).toFixed(2)}%` : money(v))} />} labelFormatter={(l: any) => `Trade #${l}`} />
                      <Area type="monotone" dataKey="drawdown" stroke="var(--loss)" strokeWidth={1.5} fill="url(#ddGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )
      }
      case "expectancy": {
        if (!m.totalTrades) return <NoData description={NEEDS_TRADES} />
        return (
          <div className="space-y-2">
            <Tile label="Expectancy per trade" value={money(expectancy.expectancyPerTrade)} tone={signTone(expectancy.expectancyPerTrade)} />
            <Tile label="Expectancy in R" value={`${expectancy.expectancyInR >= 0 ? "+" : ""}${expectancy.expectancyInR.toFixed(2)}R`} tone={signTone(expectancy.expectancyInR)} />
            <Tile label="Avg win ÷ avg loss" value={expectancy.avgLoss > 0 ? `${(expectancy.avgWin / expectancy.avgLoss).toFixed(2)}×` : "∞"} />
            <p className="pt-1 font-mono text-xs leading-relaxed text-muted-foreground tabular">
              {pct(expectancy.winRate)} × {formatMoney(expectancy.avgWin)} − {pct(expectancy.lossRate)} × {formatMoney(expectancy.avgLoss)}
            </p>
          </div>
        )
      }
      case "risk-management": {
        if (!m.totalTrades) return <NoData description={NEEDS_TRADES} />
        return (
          <div className="grid grid-cols-2 gap-2">
            <Tile label="Avg risk / trade" value={formatMoney(risk.avgRiskPerTrade)} />
            <Tile label="Avg planned R" value={`${risk.avgRRPlanned.toFixed(2)}R`} />
            <Tile label="Avg achieved R" value={`${risk.avgRRAchieved.toFixed(2)}R`} tone={risk.avgRRAchieved >= risk.avgRRPlanned ? "profit" : "loss"} />
            <Tile label="Win ÷ loss size" value={risk.avgLossVal > 0 ? `${(risk.avgWinVal / risk.avgLossVal).toFixed(2)}×` : "∞"} />
            <Tile label="Largest win" value={money(risk.largestWin)} tone="profit" />
            <Tile label="Largest loss" value={money(-Math.abs(risk.largestLoss))} tone="loss" />
            <Tile label="Avg winner" value={formatMoney(risk.avgWinVal)} tone="profit" />
            <Tile label="Avg loser" value={formatMoney(-Math.abs(risk.avgLossVal))} tone="loss" />
          </div>
        )
      }
      default:
        return null
    }
  }

  const expectancyPerTrade = m.avgWin * (m.winRate / 100) - m.avgLoss * ((100 - m.winRate) / 100)
  const recovery = performanceMetrics.maxDrawdown !== 0 ? m.totalPnl / Math.abs(performanceMetrics.maxDrawdown) : Infinity

  return (
    <Page>
      <PageHeader title="Analytics" description="Where your edge comes from, and where it leaks." />

      {legacyCount > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-medium">Some breakdowns only use fully journaled trades</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {legacyCount} trade{legacyCount === 1 ? "" : "s"} {legacyCount === 1 ? "is" : "are"} missing journal fields. P&L, win rate and equity include
              every trade; session, setup score, emotions and HTF bias use journaled trades only.
            </p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard label="Net P&L" value={money(m.totalPnl)} tone={pnlTone(m.totalPnl)} icon={m.totalPnl >= 0 ? TrendingUp : TrendingDown} sub={`${m.totalTrades} trades`} />
        <StatCard label="Win rate" value={pct(m.winRate)} icon={Target} sub={`${m.wins} wins · ${m.losses} losses · ${m.breakeven} BE`} />
        <StatCard
          label="Profit factor"
          value={m.profitFactor === Infinity ? "∞" : m.profitFactor ? m.profitFactor.toFixed(2) : "—"}
          tone={m.profitFactor >= 1 ? "profit" : m.profitFactor > 0 ? "loss" : "default"}
          icon={Trophy}
          sub={`Avg win ${formatMoney(m.avgWin)} · Avg loss ${formatMoney(m.avgLoss)}`}
        />
        <StatCard
          label="Avg R per trade"
          value={`${m.avgRR >= 0 ? "+" : ""}${m.avgRR.toFixed(2)}R`}
          tone={pnlTone(m.avgRR)}
          icon={Activity}
          sub={`Net ${m.netR >= 0 ? "+" : ""}${m.netR.toFixed(2)}R`}
        />
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium">Insights</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
        {SECTIONS.map(sec => {
          const isCollapsed = collapsed.has(sec.id)
          return (
            <Panel key={sec.id} className={cn(sec.cols === 2 && "lg:col-span-2", sec.cols === 3 && "lg:col-span-3")}>
              <PanelHeader
                title={sec.title}
                description={sec.description}
                icon={sec.icon}
                actions={
                  <button
                    onClick={() => toggle(sec.id)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label={isCollapsed ? "Expand section" : "Collapse section"}
                    title={isCollapsed ? "Expand" : "Collapse"}
                  >
                    <ChevronDown className={cn("size-4 transition-transform", isCollapsed && "-rotate-90")} />
                  </button>
                }
              />
              {!isCollapsed && <PanelBody>{renderBody(sec.id)}</PanelBody>}
              {isCollapsed && <div className="h-5" />}
            </Panel>
          )
        })}
      </div>

      {/* Summary */}
      {m.totalTrades > 0 && (
        <Panel className="mt-4 md:mt-6">
          <PanelHeader title="Summary" icon={Activity} />
          <PanelBody className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Expectancy per trade</p>
              <p className={cn("mt-1 font-mono text-xl font-semibold tabular", toneClass(signTone(expectancyPerTrade)))}>{money(expectancyPerTrade)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Expected value of an average trade</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recovery factor</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular">{Number.isFinite(recovery) ? recovery.toFixed(2) : "∞"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Net profit divided by max drawdown</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total net R</p>
              <p className={cn("mt-1 font-mono text-xl font-semibold tabular", toneClass(signTone(m.netR)))}>
                {m.netR >= 0 ? "+" : ""}{m.netR.toFixed(2)}R
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Sum of every trade’s R multiple</p>
            </div>
          </PanelBody>
        </Panel>
      )}
    </Page>
  )
}

export default function Analytics() {
  return (
    <DashboardLayout>
      <AnalyticsInner />
    </DashboardLayout>
  )
}
