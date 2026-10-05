"use client"

import { useMemo, useState } from "react"
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
  Sun, Star, Flame, ArrowUpRight, ArrowDownRight,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Line, AreaChart, Area, Cell, ComposedChart,
} from "recharts"

/* ─── Styled sub-components ─── */

function KpiCard({ label, value, sub, positive }: {
  label: string; value: string; sub?: string; positive?: boolean | null
}) {
  const color = positive === null ? "" : positive ? "text-emerald-400" : "text-rose-400"
  return (
    <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-semibold tracking-tight ${color || "text-zinc-100"}`}>{value}</p>
      {sub && <p className="text-[11px] text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function CardShell({ children, className = "", title, icon, action }: {
  children: React.ReactNode; className?: string; title?: string; icon?: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className={`bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          {title && (
            <div className="flex items-center gap-2">
              {icon && <span className="text-zinc-400">{icon}</span>}
              <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
            </div>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

function InsightBadge({ type, title, description }: {
  type: "positive" | "negative" | "neutral"; title: string; description: string
}) {
  const colors = {
    positive: "bg-emerald-500/8 border-emerald-500/15 text-emerald-400",
    negative: "bg-rose-500/8 border-rose-500/15 text-rose-400",
    neutral: "bg-violet-500/8 border-violet-500/15 text-violet-400",
  }
  return (
    <div className={`p-3 rounded-xl border ${colors[type]}`}>
      <p className="text-xs font-semibold mb-0.5">{title}</p>
      <p className="text-[11px] text-zinc-500 leading-relaxed">{description}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
      <Info className="w-6 h-6 mb-2 opacity-40" />
      <p className="text-xs">{message}</p>
    </div>
  )
}

function DataTable({ headers, rows }: {
  headers: { key: string; label: string; align?: "left" | "right" }[]
  rows: { key: string; cells: (string | { value: string; color?: string; mono?: boolean })[] }[]
}) {
  return (
    <div className="overflow-x-auto -mx-5 -mb-5">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-zinc-800">
            {headers.map(h => (
              <th key={h.key} className={`py-2.5 px-4 font-medium text-zinc-500 ${h.align === "right" ? "text-right" : "text-left"}`}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
              {r.cells.map((c, i) => {
                const val = typeof c === "string" ? c : c.value
                const color = typeof c === "string" ? "" : c.color || ""
                const mono = typeof c === "string" ? false : c.mono || false
                return (
                  <td key={i} className={`py-2.5 px-4 ${headers[i]?.align === "right" ? "text-right" : "text-left"} ${color} ${mono ? "font-mono tracking-tight" : ""}`}>
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
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm text-xs">
      <p className="text-zinc-400 font-medium mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-zinc-100 font-mono">
          <span className="text-zinc-500 mr-2">{p.name}:</span>
          {formatter ? formatter(p.value, p.name) : p.value}
        </p>
      ))}
    </div>
  )
}

/* ─── Chart defaults ─── */
const CHART_PROPS = { stroke: "var(--border)", strokeDasharray: "" }
const AXIS_PROPS = { stroke: "var(--muted-foreground)", fontSize: 10, tickLine: false, axisLine: false }

/* ─── Section config ─── */
interface SectionDef {
  id: string; title: string; icon: React.ReactNode; cols: 1 | 2 | "full"
}

const SECTIONS: SectionDef[] = [
  { id: "r-multiple", title: "R Multiple Distribution", icon: <Target className="w-3.5 h-3.5" />, cols: 2 },
  { id: "symbols", title: "Symbol Performance", icon: <BarChart3 className="w-3.5 h-3.5" />, cols: 2 },
  { id: "day-distribution", title: "Trade Distribution by Day", icon: <Calendar className="w-3.5 h-3.5" />, cols: 1 },
  { id: "weekday", title: "Weekday Performance", icon: <Activity className="w-3.5 h-3.5" />, cols: 1 },
  { id: "session", title: "Session Performance", icon: <Sun className="w-3.5 h-3.5" />, cols: 1 },
  { id: "htf-bias", title: "HTF Bias Accuracy", icon: <TrendingUp className="w-3.5 h-3.5" />, cols: 1 },
  { id: "entry-models", title: "Entry Model Performance", icon: <Zap className="w-3.5 h-3.5" />, cols: 2 },
  { id: "setup-score", title: "Setup Score vs Win Rate", icon: <Star className="w-3.5 h-3.5" />, cols: 1 },
  { id: "mistakes", title: "Mistake Analysis", icon: <Flame className="w-3.5 h-3.5" />, cols: 1 },
  { id: "emotional", title: "Emotional Analytics", icon: <Brain className="w-3.5 h-3.5" />, cols: 1 },
  { id: "monthly", title: "Monthly Performance", icon: <LineChart className="w-3.5 h-3.5" />, cols: 2 },
  { id: "equity", title: "Equity & Drawdown", icon: <TrendingUp className="w-3.5 h-3.5" />, cols: 2 },
  { id: "expectancy", title: "Expectancy", icon: <Target className="w-3.5 h-3.5" />, cols: 1 },
  { id: "risk-management", title: "Risk Management", icon: <DollarSign className="w-3.5 h-3.5" />, cols: 1 },
]

/* ─── Main component ─── */
function AnalyticsInner() {
  const { trades, performanceMetrics } = useDashboard()
  const [open, setOpen] = useState<Set<string>>(new Set(SECTIONS.map(s => s.id)))

  const toggle = (id: string) => setOpen(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

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
  const monthly = useMemo(() => getMonthlyPerformance(trades), [trades])
  const expectancy = useMemo(() => getExpectancy(trades), [trades])
  const risk = useMemo(() => getRiskManagement(trades), [trades])
  const insights = useMemo(() => getInsights(trades), [trades])

  /* ─── Section content renderers ─── */
  const renderSection = (sec: SectionDef) => {
    const isOpen = open.has(sec.id)
    const body = (() => {
      switch (sec.id) {
        /* ── 1. R Multiple ── */
        case "r-multiple": {
          if (!rMultiple.length) return <EmptyState message="Not enough data to calculate R multiples." />
          const best = rMultiple.filter(b => b.totalPnl > 0).sort((a, b) => b.totalPnl - a.totalPnl)[0]
          const worst = rMultiple.filter(b => b.totalPnl < 0).sort((a, b) => a.totalPnl - b.totalPnl)[0]
          const common = rMultiple.sort((a, b) => b.count - a.count)[0]
          return (
            <div className="space-y-4">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rMultiple} layout="vertical" margin={{ left: 80, right: 16 }}>
                    <XAxis type="number" {...AXIS_PROPS} />
                    <YAxis type="category" dataKey="key" width={80} {...AXIS_PROPS} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => v} />} />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <KpiCard label="Biggest Profit Bucket" value={best?.key || "N/A"} positive />
                <KpiCard label="Biggest Loss Bucket" value={worst?.key || "N/A"} positive={false} />
                <KpiCard label="Most Common R" value={common?.key || "N/A"} positive={null} />
              </div>
            </div>
          )
        }
        /* ── 2. Symbol ── */
        case "symbols": {
          if (!symbols.length) return <EmptyState message="Not enough data." />
          return (
            <div className="space-y-4">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={symbols} layout="vertical" margin={{ left: 72, right: 16 }}>
                    <XAxis type="number" {...AXIS_PROPS} />
                    <YAxis type="category" dataKey="symbol" width={70} {...AXIS_PROPS} />
                    <Tooltip content={<ChartTooltip formatter={(v: number, n: string) => n === "netPnl" ? `$${v.toFixed(2)}` : v} />} />
                    <Bar dataKey="netPnl" radius={[0, 6, 6, 0]}>
                      {symbols.map((e, i) => <Cell key={i} fill={e.netPnl >= 0 ? "#10b981" : "#f43f5e"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <DataTable
                headers={[
                  { key: "sym", label: "Symbol" },
                  { key: "tr", label: "Trades", align: "right" },
                  { key: "w", label: "W", align: "right" },
                  { key: "l", label: "L", align: "right" },
                  { key: "wr", label: "Win Rate", align: "right" },
                  { key: "pnl", label: "Net P&L", align: "right" },
                  { key: "pf", label: "PF", align: "right" },
                ]}
                rows={symbols.map(s => ({
                  key: s.symbol,
                  cells: [
                    s.symbol,
                    String(s.totalTrades),
                    { value: String(s.wins), color: "text-emerald-400" },
                    { value: String(s.losses), color: "text-rose-400" },
                    { value: `${s.winRate.toFixed(1)}%` },
                    { value: `$${s.netPnl.toFixed(2)}`, color: s.netPnl >= 0 ? "text-emerald-400" : "text-rose-400", mono: true },
                    { value: s.profitFactor === Infinity ? "∞" : s.profitFactor.toFixed(2) },
                  ],
                }))}
              />
              <div className="grid grid-cols-3 gap-3">
                <KpiCard label="Best" value={`${symbols[0]?.symbol} $${symbols[0]?.netPnl.toFixed(2)}`} positive />
                <KpiCard label="Worst" value={`${symbols[symbols.length - 1]?.symbol} $${symbols[symbols.length - 1]?.netPnl.toFixed(2)}`} positive={false} />
                <KpiCard label="Most Traded" value={symbols.sort((a, b) => b.totalTrades - a.totalTrades)[0]?.symbol || ""} positive={null} />
              </div>
            </div>
          )
        }
        /* ── 3. Day Distribution ── */
        case "day-distribution": {
          if (dayDist.every(d => !d.total)) return <EmptyState message="Not enough data." />
          return (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayDist}>
                  <XAxis dataKey="day" {...AXIS_PROPS} />
                  <YAxis {...AXIS_PROPS} />
                  <Tooltip content={<ChartTooltip formatter={(v: number) => v} />} />
                  <Bar dataKey="wins" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="losses" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="breakevens" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )
        }
        /* ── 4. Weekday ── */
        case "weekday": {
          if (weekday.every(d => !d.trades)) return <EmptyState message="Not enough data." />
          const best = weekday.filter(d => d.trades > 0).sort((a, b) => b.netPnl - a.netPnl)[0]
          const worst = weekday.filter(d => d.trades > 0).sort((a, b) => a.netPnl - b.netPnl)[0]
          const active = weekday.sort((a, b) => b.trades - a.trades)[0]
          return (
            <div className="space-y-3">
              <DataTable
                headers={[
                  { key: "d", label: "Day" }, { key: "tr", label: "Trades", align: "right" },
                  { key: "w", label: "W", align: "right" }, { key: "l", label: "L", align: "right" },
                  { key: "be", label: "BE", align: "right" }, { key: "wr", label: "WR", align: "right" },
                  { key: "pnl", label: "P&L", align: "right" }, { key: "rr", label: "Avg RR", align: "right" },
                ]}
                rows={weekday.map(d => {
                  const isBest = best && d.day === best.day && d.trades > 0
                  const isWorst = worst && d.day === worst.day && d.trades > 0
                  return {
                    key: d.day,
                    cells: [
                      { value: `${d.day}${isBest ? " ★" : ""}${isWorst ? " ⚠" : ""}`, color: isBest ? "text-emerald-400" : isWorst ? "text-rose-400" : "" },
                      String(d.trades),
                      { value: String(d.wins), color: "text-emerald-400" },
                      { value: String(d.losses), color: "text-rose-400" },
                      { value: String(d.breakevens), color: "text-amber-400" },
                      `${d.winRate.toFixed(1)}%`,
                      { value: `$${d.netPnl.toFixed(2)}`, color: d.netPnl >= 0 ? "text-emerald-400" : "text-rose-400", mono: true },
                      d.avgRR.toFixed(2),
                    ],
                  }
                })}
              />
              {best && (
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  {best.day} is most profitable (${best.netPnl.toFixed(2)}).
                  {worst && worst.day !== best.day && ` ${worst.day} is least profitable ($${worst.netPnl.toFixed(2)}).`}
                  {" "}{active.day} is the busiest ({active.trades} trades).
                </p>
              )}
            </div>
          )
        }
        /* ── 5. Session ── */
        case "session": {
          if (!session.length) return <EmptyState message="Collect more enhanced trades." />
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {session.map(s => (
                  <KpiCard key={s.session} label={s.session} value={`${s.winRate.toFixed(1)}%`} sub={`${s.trades} tr · $${s.netPnl.toFixed(2)}`} positive={s.netPnl >= 0} />
                ))}
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={session}>
                    <XAxis dataKey="session" {...AXIS_PROPS} />
                    <YAxis {...AXIS_PROPS} domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />} />
                    <Bar dataKey="winRate" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        }
        /* ── 6. HTF Bias ── */
        case "htf-bias": {
          if (!htfBias.length) return <EmptyState message="Collect more enhanced trades." />
          return (
            <div className="grid grid-cols-2 gap-3">
              {htfBias.map(b => (
                <div key={b.bias} className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    {b.bias === "Bullish"
                      ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                      : <TrendingDown className="w-4 h-4 text-rose-400" />}
                    <p className="text-sm font-semibold text-zinc-100">{b.bias} Bias</p>
                  </div>
                  <p className="text-2xl font-semibold tracking-tight text-zinc-100 mb-1">{b.winRate.toFixed(1)}%</p>
                  <p className="text-[11px] text-zinc-500">{b.trades} trades · ${b.netPnl.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )
        }
        /* ── 7. Entry Models ── */
        case "entry-models": {
          if (!entryModels.length) return <EmptyState message="Collect more enhanced trades." />
          return (
            <div className="space-y-4">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={entryModels} layout="vertical" margin={{ left: 90, right: 16 }}>
                    <XAxis type="number" {...AXIS_PROPS} domain={[0, 100]} />
                    <YAxis type="category" dataKey="model" width={85} {...AXIS_PROPS} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />} />
                    <Bar dataKey="winRate" radius={[0, 6, 6, 0]}>
                      {entryModels.map((e, i) => <Cell key={i} fill={e.winRate >= 50 ? "#10b981" : "#f43f5e"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <DataTable
                headers={[
                  { key: "m", label: "Model" }, { key: "tr", label: "Tr", align: "right" },
                  { key: "wr", label: "WR", align: "right" }, { key: "pf", label: "PF", align: "right" },
                  { key: "pnl", label: "P&L", align: "right" }, { key: "rr", label: "Avg RR", align: "right" },
                ]}
                rows={entryModels.map(m => ({
                  key: m.model,
                  cells: [
                    m.model,
                    String(m.trades),
                    { value: `${m.winRate.toFixed(1)}%`, color: m.winRate >= 50 ? "text-emerald-400" : "text-rose-400" },
                    m.profitFactor === Infinity ? "∞" : m.profitFactor.toFixed(2),
                    { value: `$${m.netPnl.toFixed(2)}`, color: m.netPnl >= 0 ? "text-emerald-400" : "text-rose-400", mono: true },
                    m.avgRR.toFixed(2),
                  ],
                }))}
              />
            </div>
          )
        }
        /* ── 8. Setup Score ── */
        case "setup-score": {
          if (setupScore.data.every(d => !d.trades)) return <EmptyState message="Collect more enhanced trades." />
          const filtered = setupScore.data.filter(d => d.trades > 0)
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <KpiCard label="Avg Score — Winners" value={`${setupScore.avgScoreWinners.toFixed(2)}/8`} positive />
                <KpiCard label="Avg Score — Losers" value={`${setupScore.avgScoreLosers.toFixed(2)}/8`} positive={false} />
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filtered}>
                    <XAxis dataKey="score" {...AXIS_PROPS} label={{ value: "Setup Score", position: "insideBottom", offset: -4, style: { fill: "var(--muted-foreground)", fontSize: 9 } }} />
                    <YAxis {...AXIS_PROPS} domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />} />
                    <Bar dataKey="winRate" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        }
        /* ── 9. Mistakes ── */
        case "mistakes": {
          if (!mistakes.length) return <EmptyState message="Not enough data." />
          const costly = mistakes.sort((a, b) => a.netPnl - b.netPnl)[0]
          return (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <KpiCard label="Most Costly" value={`${costly.mistake} $${Math.abs(costly.netPnl).toFixed(2)}`} positive={false} />
                <KpiCard label="Most Common" value={`${mistakes[0].mistake} (${mistakes[0].frequency}x)`} positive={null} />
              </div>
              <DataTable
                headers={[
                  { key: "m", label: "Mistake" }, { key: "freq", label: "Freq", align: "right" },
                  { key: "wr", label: "WR", align: "right" }, { key: "pnl", label: "P&L", align: "right" },
                ]}
                rows={mistakes.map(m => ({
                  key: m.mistake,
                  cells: [
                    m.mistake,
                    String(m.frequency),
                    { value: `${m.winRate.toFixed(1)}%`, color: m.winRate >= 50 ? "text-emerald-400" : "text-rose-400" },
                    { value: `$${m.netPnl.toFixed(2)}`, color: m.netPnl >= 0 ? "text-emerald-400" : "text-rose-400", mono: true },
                  ],
                }))}
              />
            </div>
          )
        }
        /* ── 10. Emotional ── */
        case "emotional": {
          if (!emotions.length) return <EmptyState message="Collect more enhanced trades." />
          return (
            <DataTable
              headers={[
                { key: "e", label: "Emotion" }, { key: "tr", label: "Trades", align: "right" },
                { key: "wr", label: "Win Rate", align: "right" }, { key: "pnl", label: "Net P&L", align: "right" },
              ]}
              rows={emotions.map(e => ({
                key: e.emotion,
                cells: [
                  e.emotion,
                  String(e.trades),
                  { value: `${e.winRate.toFixed(1)}%`, color: e.winRate >= 50 ? "text-emerald-400" : "text-rose-400" },
                  { value: `$${e.netPnl.toFixed(2)}`, color: e.netPnl >= 0 ? "text-emerald-400" : "text-rose-400", mono: true },
                ],
              }))}
            />
          )
        }
        /* ── 11. Monthly ── */
        case "monthly": {
          if (!monthly.length) return <EmptyState message="Not enough data." />
          return (
            <div className="space-y-4">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthly}>
                    <XAxis dataKey="month" {...AXIS_PROPS} />
                    <YAxis yAxisId="l" {...AXIS_PROPS} />
                    <YAxis yAxisId="r" orientation="right" {...AXIS_PROPS} domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => typeof v === "number" ? v.toFixed(2) : v} />} />
                    <Bar yAxisId="l" dataKey="netPnl" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="r" type="monotone" dataKey="winRate" stroke="#10b981" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <DataTable
                headers={[
                  { key: "mo", label: "Month" }, { key: "tr", label: "Tr", align: "right" },
                  { key: "wr", label: "WR", align: "right" }, { key: "pnl", label: "P&L", align: "right" },
                  { key: "r", label: "Net R", align: "right" },
                ]}
                rows={monthly.map(m => ({
                  key: m.month,
                  cells: [
                    m.month, String(m.trades), `${m.winRate.toFixed(1)}%`,
                    { value: `$${m.netPnl.toFixed(2)}`, color: m.netPnl >= 0 ? "text-emerald-400" : "text-rose-400", mono: true },
                    { value: `${m.netR.toFixed(2)}R`, color: m.netR >= 0 ? "text-emerald-400" : "text-rose-400", mono: true },
                  ],
                }))}
              />
            </div>
          )
        }
        /* ── 12. Equity & Drawdown ── */
        case "equity": {
          return (
            <div className="space-y-4">
              <EquityCurveChart />
              {equity.length > 0 && (
                <div className="h-40">
                  <p className="text-[11px] font-medium text-zinc-500 mb-2">Drawdown Overlay</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equity}>
                      <XAxis dataKey="tradeNumber" {...AXIS_PROPS} label={{ value: "Trade #", position: "insideBottom", offset: -4, style: { fill: "var(--muted-foreground)", fontSize: 9 } }} />
                      <YAxis {...AXIS_PROPS} domain={[0, "auto"]} />
                      <Tooltip content={<ChartTooltip formatter={(v: number, n: string) => n === "drawdown" ? `${v.toFixed(1)}%` : `$${v.toFixed(2)}`} />} />
                      <Area type="monotone" dataKey="drawdown" stroke="#f43f5e" fill="#f43f5e20" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )
        }
        /* ── 13. Expectancy ── */
        case "expectancy": {
          if (!m.totalTrades) return <EmptyState message="Not enough data." />
          return (
            <div className="space-y-3">
              <KpiCard label="Expectancy / Trade" value={`$${expectancy.expectancyPerTrade.toFixed(2)}`} positive={expectancy.expectancyPerTrade >= 0} />
              <KpiCard label="Expectancy in R" value={`${expectancy.expectancyInR.toFixed(2)}R`} positive={expectancy.expectancyInR >= 0} />
              <KpiCard label="Win/Loss Ratio" value={`${expectancy.avgLoss > 0 ? (expectancy.avgWin / expectancy.avgLoss).toFixed(2) : "∞"}x`} positive={null} />
              <p className="text-[10px] text-zinc-600 leading-relaxed">
                {expectancy.winRate.toFixed(1)}% × ${expectancy.avgWin.toFixed(2)} — {expectancy.lossRate.toFixed(1)}% × ${expectancy.avgLoss.toFixed(2)}
              </p>
            </div>
          )
        }
        /* ── 14. Risk Management ── */
        case "risk-management": {
          if (!m.totalTrades) return <EmptyState message="Not enough data." />
          return (
            <div className="grid grid-cols-2 gap-2">
              <KpiCard label="Avg Risk" value={`$${risk.avgRiskPerTrade.toFixed(2)}`} positive={null} />
              <KpiCard label="Avg RR Planned" value={`${risk.avgRRPlanned.toFixed(2)}R`} positive={null} />
              <KpiCard label="Avg RR Achieved" value={`${risk.avgRRAchieved.toFixed(2)}R`} positive={risk.avgRRAchieved >= risk.avgRRPlanned} />
              <KpiCard label="Largest Win" value={`+$${risk.largestWin.toFixed(2)}`} positive />
              <KpiCard label="Largest Loss" value={`-$${Math.abs(risk.largestLoss).toFixed(2)}`} positive={false} />
              <KpiCard label="Avg Winner" value={`$${risk.avgWinVal.toFixed(2)}`} positive />
              <KpiCard label="Avg Loser" value={`-$${risk.avgLossVal.toFixed(2)}`} positive={false} />
              <KpiCard label="Win/Loss Ratio" value={`${risk.avgLossVal > 0 ? (risk.avgWinVal / risk.avgLossVal).toFixed(2) : "∞"}x`} positive={null} />
            </div>
          )
        }
        default: return null
      }
    })()

    return (
      <div key={sec.id} className={`${sec.cols === 2 ? "lg:col-span-2" : sec.cols === "full" ? "lg:col-span-2 xl:col-span-3" : ""}`}>
        <CardShell
          title={sec.title}
          icon={sec.icon}
          action={
            <button onClick={() => toggle(sec.id)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
              {isOpen ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            </button>
          }
        >
          {isOpen ? body : (
            <div className="flex items-center justify-center py-3">
              <button onClick={() => toggle(sec.id)} className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
                Show section
              </button>
            </div>
          )}
        </CardShell>
      </div>
    )
  }

  /* ─── Render ─── */
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Performance Analytics</h1>
          <p className="text-sm text-zinc-500 mt-1">Institutional-grade trading performance analysis</p>
        </div>

        {/* ── Legacy warning ── */}
        {legacyCount > 0 && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-400">Some analytics exclude legacy trades</p>
              <p className="text-[11px] text-amber-400/60 mt-0.5">
                {legacyCount} trade(s) lack enhanced journaling fields. P&L, win rate, and equity include all trades.
                Session, setup score, emotional, and HTF bias analytics use only enhanced trades.
              </p>
            </div>
          </div>
        )}

        {/* ── Insights ── */}
        {insights.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Insights</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {insights.map((ins, i) => <InsightBadge key={i} {...ins} />)}
            </div>
          </div>
        )}

        {/* ── Key Metrics ── */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <KpiCard label="Total Trades" value={String(m.totalTrades)} positive={null} />
            <KpiCard label="Win Rate" value={`${m.winRate.toFixed(1)}%`} sub={`${m.wins}W / ${m.losses}L / ${m.breakeven}BE`} positive={m.winRate >= 50} />
            <KpiCard label="Total P&L" value={`${m.totalPnl >= 0 ? "+" : ""}$${m.totalPnl.toFixed(2)}`} positive={m.totalPnl >= 0} />
            <KpiCard label="Profit Factor" value={m.profitFactor === Infinity ? "∞" : `${m.profitFactor.toFixed(2)}x`} positive={m.profitFactor >= 1.5} />
            <KpiCard label="Avg Win" value={`$${m.avgWin.toFixed(2)}`} positive />
            <KpiCard label="Avg Loss" value={`-$${m.avgLoss.toFixed(2)}`} positive={false} />
            <KpiCard label="Avg RR" value={`${m.avgRR.toFixed(2)}R`} positive={m.avgRR >= 1} />
          </div>
        </div>

        {/* ── Section Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {SECTIONS.map(renderSection)}
        </div>

        {/* ── Summary ── */}
        {m.totalTrades > 0 && (
          <CardShell title="Summary Statistics" icon={<Activity className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-[11px] font-medium text-zinc-500 mb-1.5">Expectancy per Trade</p>
                <p className={`text-xl font-semibold tracking-tight ${m.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  ${(m.avgWin * (m.winRate / 100) - m.avgLoss * ((100 - m.winRate) / 100)).toFixed(2)}
                </p>
                <p className="text-[10px] text-zinc-600 mt-1">Expected value per trade</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-zinc-500 mb-1.5">Recovery Factor</p>
                <p className="text-xl font-semibold tracking-tight text-zinc-100">
                  {performanceMetrics.maxDrawdown !== 0 ? (m.totalPnl / Math.abs(performanceMetrics.maxDrawdown)).toFixed(2) : "∞"}
                </p>
                <p className="text-[10px] text-zinc-600 mt-1">Total profit vs max drawdown</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-zinc-500 mb-1.5">Total Net R</p>
                <p className={`text-xl font-semibold tracking-tight ${m.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {m.netR.toFixed(2)}R
                </p>
                <p className="text-[10px] text-zinc-600 mt-1">Sum of all R multiples</p>
              </div>
            </div>
          </CardShell>
        )}
      </div>
    </div>
  )
}

export default function Analytics() {
  return (
    <DashboardLayout>
      <AnalyticsInner />
    </DashboardLayout>
  )
}
