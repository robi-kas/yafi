"use client"

import { useDashboard } from "@/context/dashboard-context"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
} from "recharts"

const axisProps = { stroke: "var(--muted-foreground)", fontSize: 10, tickLine: false, axisLine: false }

export function EquityCurveChart({ height = 288 }: { height?: number }) {
  const { trades, performanceMetrics } = useDashboard()
  const startingBalance = performanceMetrics.totalDeposit || 0

  // Copy before sorting: `trades` is shared context state and must not be mutated.
  const sorted = [...trades].sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime())
  let running = startingBalance
  const equityData = [
    { trade: 0, balance: startingBalance, symbol: "Starting balance", pnl: 0, date: "" },
    ...sorted.map((t, i) => {
      running += t.profitLoss || 0
      return { trade: i + 1, balance: running, symbol: t.symbol, pnl: t.profitLoss || 0, date: new Date(t.entryTime).toLocaleDateString() }
    }),
  ]
  const color = running >= startingBalance ? "var(--brand)" : "var(--loss)"
  const fmt = (n: number) => Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={equityData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="trade" {...axisProps} minTickGap={24} tickFormatter={(v: number) => (v === 0 ? "Start" : `#${v}`)} />
          <YAxis {...axisProps} width={64} domain={["auto", "auto"]} tickFormatter={(v: number) => `$${Math.round(v).toLocaleString()}`} />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3", strokeOpacity: 0.5 }}
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
                  <p className="font-medium">{d.trade === 0 ? "Starting balance" : `Trade #${d.trade} · ${d.symbol}`}</p>
                  {d.date && <p className="text-muted-foreground">{d.date}</p>}
                  {d.trade !== 0 && (
                    <p className={`mt-1 font-mono tabular ${d.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                      {d.pnl >= 0 ? "+" : "-"}${fmt(Number(d.pnl))}
                    </p>
                  )}
                  <p className="font-mono tabular">Balance ${fmt(Number(d.balance))}</p>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={color}
            strokeWidth={2}
            fill="url(#eqGrad)"
            dot={false}
            activeDot={{ r: 4, stroke: color, strokeWidth: 2, fill: "var(--card)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function WinLossDistributionChart() {
  const { trades } = useDashboard()

  const wins = trades.filter(t => t.result === "win")
  const losses = trades.filter(t => t.result === "loss")

  // Group wins and losses by size
  const distributeBySize = (tradeList: any[], bins: number = 10) => {
    if (tradeList.length === 0) return []
    const values = tradeList.map(t => t.profitLoss || 0)
    const min = Math.min(...values)
    const max = Math.max(...values)
    let binSize = (max - min) / bins

    // If all values are identical, create a single bin to avoid division by zero
    if (!isFinite(binSize) || binSize === 0) {
      binSize = 1
      bins = 1
    }

    const result = Array.from({ length: bins }, (_, i) => ({
      bin: i,
      range: `${Math.round(min + i * binSize)} - ${Math.round(min + (i + 1) * binSize)}`,
      wins: 0,
      losses: 0,
    }))

    tradeList.forEach((trade) => {
      const value = trade.profitLoss || 0
      let binIndex = Math.floor((value - min) / binSize)
      if (!isFinite(binIndex) || binIndex < 0) binIndex = 0
      if (binIndex >= bins) binIndex = bins - 1

      if (trade.result === "win") {
        result[binIndex].wins += 1
      } else {
        result[binIndex].losses += 1
      }
    })

    return result.filter(r => r.wins > 0 || r.losses > 0)
  }

  const data = distributeBySize([...wins, ...losses])

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="range"
            stroke="var(--muted-foreground)" tickLine={false} axisLine={false}
            style={{ fontSize: "11px" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} style={{ fontSize: "11px" }} />
          <Tooltip contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--foreground)" }} />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
          <Bar dataKey="wins" stackId="a" fill="var(--profit)" name="Wins" />
          <Bar dataKey="losses" stackId="a" fill="var(--loss)" name="Losses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RiskRewardDistributionChart() {
  const { trades } = useDashboard()

  const data = trades
    .filter(t => t.riskToReward && t.profitLoss !== undefined)
    .map((trade, index) => ({
      id: index,
      rr: trade.riskToReward || 0,
      pnl: trade.profitLoss || 0,
      result: trade.result,
      symbol: trade.symbol,
    }))

  const getColor = (result?: string) => {
    if (result === "win") return "var(--profit)"
    if (result === "loss") return "var(--loss)"
    return "var(--chart-3)"
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            type="number"
            dataKey="rr"
            name="Risk:Reward"
            stroke="var(--muted-foreground)" tickLine={false} axisLine={false}
            style={{ fontSize: "11px" }}
            label={{ value: "Risk:Reward Ratio", position: "insideBottomRight", offset: -10 }}
          />
          <YAxis
            type="number"
            dataKey="pnl"
            name="P&L"
            stroke="var(--muted-foreground)" tickLine={false} axisLine={false}
            style={{ fontSize: "11px" }}
            label={{ value: "Profit/Loss ($)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--foreground)" }}
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value) => {
              if (typeof value === "number") {
                return value > 100 ? `$${value.toFixed(0)}` : value.toFixed(2)
              }
              return value
            }}
          />
          <Scatter name="Trades" data={data} fill="var(--chart-3)">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.result)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TradeResultPieChart() {
  const { trades } = useDashboard()

  const wins = trades.filter(t => t.result === "win").length
  const losses = trades.filter(t => t.result === "loss").length
  const breakeven = trades.filter(t => t.result === "breakeven").length

  const data = [
    { name: "Wins", value: wins, fill: "var(--profit)" },
    { name: "Losses", value: losses, fill: "var(--loss)" },
    { name: "Breakeven", value: breakeven, fill: "var(--chart-3)" },
  ].filter(d => d.value > 0)

  return (
    <div className="w-full h-80 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={80}
            fill="var(--chart-3)"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--foreground)" }} formatter={(value) => `${value} trades`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MonthlyPerformanceChart() {
  const { trades } = useDashboard()

  // Group trades by month
  const monthlyData = trades.reduce((acc: any, trade) => {
    const month = new Date(trade.entryTime).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    })

    const existing = acc.find((m: any) => m.month === month)
    if (existing) {
      existing.pnl += trade.profitLoss || 0
      existing.trades += 1
      if (trade.result === "win") existing.wins += 1
    } else {
      acc.push({
        month,
        pnl: trade.profitLoss || 0,
        trades: 1,
        wins: trade.result === "win" ? 1 : 0,
      })
    }
    return acc
  }, [])

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={monthlyData}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="month"
            stroke="var(--muted-foreground)" tickLine={false} axisLine={false}
            style={{ fontSize: "11px" }}
          />
          <YAxis
            stroke="var(--muted-foreground)" tickLine={false} axisLine={false}
            style={{ fontSize: "11px" }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--foreground)" }}
            formatter={(value) => {
              if (typeof value === "number") {
                return `$${value.toLocaleString()}`
              }
              return value
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
          <Bar
            dataKey="pnl"
            fill="var(--profit)"
            name="Monthly P&L"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DrawdownChart() {
  const { trades, performanceMetrics } = useDashboard()

  const startingBalance = performanceMetrics.totalDeposit || 1 // Avoid 0 for percentage
  let runningBalance = startingBalance
  let peak = startingBalance

  // Start with 0 drawdown at deposit
  const maxDrawdownArray: any[] = [{
    trade: 0,
    balance: startingBalance,
    drawdown: 0,
    symbol: "Start"
  }]

  const sortedTrades = [...trades].sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime())

  sortedTrades.forEach((trade, index) => {
    runningBalance += trade.profitLoss || 0
    if (runningBalance > peak) peak = runningBalance

    // Drawdown = (Current - Peak) / Peak
    const currentDrawdown = peak > 0 ? ((runningBalance - peak) / peak) * 100 : 0

    maxDrawdownArray.push({
      trade: index + 1,
      balance: runningBalance,
      drawdown: Math.min(currentDrawdown, 0),
      symbol: trade.symbol,
    })
  })

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={maxDrawdownArray}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--loss)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--loss)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="trade"
            stroke="var(--muted-foreground)" tickLine={false} axisLine={false}
            style={{ fontSize: "11px" }}
          />
          <YAxis
            stroke="var(--muted-foreground)" tickLine={false} axisLine={false}
            style={{ fontSize: "11px" }}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--foreground)" }}
            formatter={(value) => `${Number(value).toFixed(2)}%`}
          />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="var(--loss)"
            fillOpacity={1}
            fill="url(#colorDrawdown)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
