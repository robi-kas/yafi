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

export function EquityCurveChart() {
  const { trades, performanceMetrics } = useDashboard()
  const startingBalance = performanceMetrics.totalDeposit || 0

  const equityData = [
    { trade: 0, balance: startingBalance, symbol: "Deposit", pnl: 0 },
    ...trades
      .sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime())
      .reduce((acc: any[], trade, index) => {
        const prevBalance = index === 0 ? startingBalance : acc[index - 1].balance
        return [...acc, { trade: index + 1, balance: prevBalance + (trade.profitLoss || 0), symbol: trade.symbol, pnl: trade.profitLoss || 0 }]
      }, [])
  ]

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={equityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="" stroke="transparent" />
          <XAxis dataKey="trade" {...axisProps} tickFormatter={(v: number) => v === 0 ? "Start" : `#${v}`} />
          <YAxis {...axisProps} domain={["auto", "auto"]} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
          <Tooltip
            content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm text-xs">
                  <p className="text-zinc-400 font-medium mb-1">{label === 0 ? "Initial Deposit" : `Trade #${label}`}</p>
                  <p className="text-zinc-500 mb-1.5">{d.symbol}</p>
                  <p className={`font-mono font-semibold ${d.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {d.pnl >= 0 ? "+" : ""}${Number(d.pnl).toLocaleString()}
                  </p>
                  <p className="font-mono text-zinc-100 mt-0.5">Balance: ${Number(d.balance).toLocaleString()}</p>
                </div>
              )
            }}
          />
          <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} fill="url(#eqGrad)" dot={false} activeDot={{ r: 4, stroke: "#10b981", strokeWidth: 2, fill: "var(--background)" }} />
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
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="range"
            stroke="#666"
            style={{ fontSize: "11px" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="#666" style={{ fontSize: "12px" }} />
          <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }} />
          <Legend />
          <Bar dataKey="wins" stackId="a" fill="#10b981" name="Wins" />
          <Bar dataKey="losses" stackId="a" fill="#ef4444" name="Losses" />
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
    if (result === "win") return "#10b981"
    if (result === "loss") return "#ef4444"
    return "#8b5cf6"
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            type="number"
            dataKey="rr"
            name="Risk:Reward"
            stroke="#666"
            style={{ fontSize: "12px" }}
            label={{ value: "Risk:Reward Ratio", position: "insideBottomRight", offset: -10 }}
          />
          <YAxis
            type="number"
            dataKey="pnl"
            name="P&L"
            stroke="#666"
            style={{ fontSize: "12px" }}
            label={{ value: "Profit/Loss ($)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value) => {
              if (typeof value === "number") {
                return value > 100 ? `$${value.toFixed(0)}` : value.toFixed(2)
              }
              return value
            }}
          />
          <Scatter name="Trades" data={data} fill="#8b5cf6">
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
    { name: "Wins", value: wins, fill: "#10b981" },
    { name: "Losses", value: losses, fill: "#ef4444" },
    { name: "Breakeven", value: breakeven, fill: "#8b5cf6" },
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
            fill="#8b5cf6"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value} trades`} />
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
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="month"
            stroke="#666"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="#666"
            style={{ fontSize: "12px" }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
            formatter={(value) => {
              if (typeof value === "number") {
                return `$${value.toLocaleString()}`
              }
              return value
            }}
          />
          <Legend />
          <Bar
            dataKey="pnl"
            fill="#10b981"
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
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="trade"
            stroke="#666"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="#666"
            style={{ fontSize: "12px" }}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
            formatter={(value) => `${Number(value).toFixed(2)}%`}
          />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="#ef4444"
            fillOpacity={1}
            fill="url(#colorDrawdown)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
