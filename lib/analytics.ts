import { Trade } from "@/context/dashboard-context"
import {
  calcResult,
  getWinLossCounts,
  calculateWinRate,
  calculateProfitFactor,
  calculateAvgRR,
  calculateNetR,
  calculateAvgWin,
  calculateAvgLoss,
} from "./trading-metrics"

export const SESSIONS = ["Asia", "London", "New York", "London/New York Overlap"] as const
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const
export const MISTAKE_TYPES = [
  "FOMO", "Revenge Trading", "Ignored Rules", "Chasing Price",
  "Entered Early", "Entered Late", "Moved Stop Loss", "Overtraded",
] as const
export const EMOTIONS = ["Fear", "FOMO", "Revenge", "Overconfidence", "Hesitation"] as const
export const ENTRY_MODELS = [
  "Order Block", "FVG", "IFVG", "Breaker Block", "MSS", "Liquidity Sweep", "HTF POI",
] as const

export const R_BUCKETS = [
  { key: "<= -4R", min: -Infinity, max: -4 },
  { key: "-4R to -3R", min: -4, max: -3 },
  { key: "-3R to -2R", min: -3, max: -2 },
  { key: "-2R to -1R", min: -2, max: -1 },
  { key: "-1R to 0R", min: -1, max: 0 },
  { key: "0R (Breakeven)", min: 0, max: 0 },
  { key: "0R to +1R", min: 0, max: 1 },
  { key: "+1R to +2R", min: 1, max: 2 },
  { key: "+2R to +3R", min: 2, max: 3 },
  { key: "+3R to +4R", min: 3, max: 4 },
  { key: ">= +4R", min: 4, max: Infinity },
] as const

export function isLegacyTrade(trade: Trade): boolean {
  return !trade.entryModel || trade.entryModel === "UNKNOWN"
}

export function hasEnhancedData(trade: Trade): boolean {
  return !isLegacyTrade(trade) || !!trade.session || !!trade.htfBias || !!trade.entryModel
}

export function getEnhancedTrades(trades: Trade[]): Trade[] {
  return trades.filter(t => hasEnhancedData(t))
}

function getRMultiple(trade: Trade): number | null {
  if (trade.rrAchieved != null && trade.rrAchieved !== 0) return trade.rrAchieved
  if (!trade.entryPrice || !trade.stopLoss || !trade.lotSize || !trade.profitLoss) return null
  const riskPerUnit = Math.abs(trade.entryPrice - trade.stopLoss)
  if (riskPerUnit === 0) return null
  const riskAmount = riskPerUnit * trade.lotSize * 100000
  if (riskAmount === 0) return null
  return trade.profitLoss / riskAmount
}

function getDayName(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getUTCDay()]
  } catch { return "Unknown" }
}

function getMonthKey(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
  } catch { return "Unknown" }
}

export function getSetupScore(trade: Trade): number {
  let score = 0
  if (trade.htfPoi) score++
  if (trade.liquiditySweep) score++
  if (trade.mssConfirmed) score++
  if (trade.fvgPresent) score++
  if (trade.ifvgPresent) score++
  if (trade.breakerBlockRetest) score++
  if (trade.orderBlockRetest) score++
  if (trade.fibonacciRetracement) score++
  return score
}

export interface RBucketStat {
  key: string
  count: number
  totalPnl: number
  netR: number
  trades: Trade[]
}

export function getPerformanceByRMultiple(trades: Trade[]): RBucketStat[] {
  const buckets = R_BUCKETS.map(b => ({ ...b, count: 0, totalPnl: 0, netR: 0, trades: [] as Trade[] }))
  for (const t of trades) {
    const r = getRMultiple(t)
    if (r === null) continue
    const bucket = buckets.find(b => r >= b.min && r < (b.max === Infinity ? Infinity : r <= b.max ? b.max + 0.0001 : b.max))
    if (bucket) {
      bucket.count++
      bucket.totalPnl += t.profitLoss || 0
      bucket.netR += r
      bucket.trades.push(t)
    }
  }
  return buckets.filter(b => b.count > 0)
}

export interface SymbolStat {
  symbol: string
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  netPnl: number
  profitFactor: number
  netR: number
}

export function getPerformanceBySymbol(trades: Trade[]): SymbolStat[] {
  const map = new Map<string, Trade[]>()
  for (const t of trades) {
    const sym = t.symbol || "Unknown"
    if (!map.has(sym)) map.set(sym, [])
    map.get(sym)!.push(t)
  }
  const results: SymbolStat[] = []
  for (const [symbol, symTrades] of map) {
    const { wins, losses } = getWinLossCounts(symTrades)
    const netPnl = symTrades.reduce((s, t) => s + (t.profitLoss || 0), 0)
    results.push({
      symbol,
      totalTrades: symTrades.length,
      wins,
      losses,
      winRate: calculateWinRate(wins, losses),
      netPnl,
      profitFactor: calculateProfitFactor(symTrades),
      netR: netPnl,
    })
  }
  return results.sort((a, b) => b.netPnl - a.netPnl)
}

export interface DayDistribution {
  day: string
  wins: number
  losses: number
  breakevens: number
  total: number
}

export function getTradeDistributionByDay(trades: Trade[]): DayDistribution[] {
  const map = new Map<string, Trade[]>()
  for (const t of trades) {
    if (!t.entryTime) continue
    const day = getDayName(t.entryTime)
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(t)
  }
  return DAYS.map(day => {
    const dayTrades = map.get(day) || []
    const { wins, losses, breakevens } = getWinLossCounts(dayTrades)
    return { day, wins, losses, breakevens, total: dayTrades.length }
  })
}

export interface WeekdayStat {
  day: string
  trades: number
  wins: number
  losses: number
  breakevens: number
  winRate: number
  netPnl: number
  avgRR: number
}

export function getWeekdayPerformance(trades: Trade[]): WeekdayStat[] {
  const map = new Map<string, Trade[]>()
  for (const t of trades) {
    if (!t.entryTime) continue
    const day = getDayName(t.entryTime)
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(t)
  }
  return DAYS.map(day => {
    const dayTrades = map.get(day) || []
    const { wins, losses, breakevens } = getWinLossCounts(dayTrades)
    return {
      day,
      trades: dayTrades.length,
      wins,
      losses,
      breakevens,
      winRate: calculateWinRate(wins, losses),
      netPnl: dayTrades.reduce((s, t) => s + (t.profitLoss || 0), 0),
      avgRR: calculateAvgRR(dayTrades),
    }
  })
}

export interface SessionStat {
  session: string
  trades: number
  winRate: number
  profitFactor: number
  netPnl: number
  avgRR: number
}

export function getSessionPerformance(trades: Trade[]): SessionStat[] {
  return SESSIONS.map(session => {
    const subset = trades.filter(t => t.session === session)
    const { wins, losses } = getWinLossCounts(subset)
    return {
      session,
      trades: subset.length,
      winRate: calculateWinRate(wins, losses),
      profitFactor: calculateProfitFactor(subset),
      netPnl: subset.reduce((s, t) => s + (t.profitLoss || 0), 0),
      avgRR: calculateAvgRR(subset),
    }
  }).filter(s => s.trades > 0)
}

export interface HtfBiasStat {
  bias: string
  trades: number
  winRate: number
  netPnl: number
}

export function getHtfBiasAccuracy(trades: Trade[]): HtfBiasStat[] {
  const biases = ["Bullish", "Bearish"]
  return biases.map(bias => {
    const subset = trades.filter(t => t.htfBias === bias)
    const { wins, losses } = getWinLossCounts(subset)
    return {
      bias,
      trades: subset.length,
      winRate: calculateWinRate(wins, losses),
      netPnl: subset.reduce((s, t) => s + (t.profitLoss || 0), 0),
    }
  }).filter(s => s.trades > 0)
}

export interface EntryModelStat {
  model: string
  trades: number
  winRate: number
  profitFactor: number
  netPnl: number
  avgRR: number
}

export function getEntryModelPerformance(trades: Trade[]): EntryModelStat[] {
  return ENTRY_MODELS.map(model => {
    const subset = trades.filter(t => t.entryModel === model)
    const { wins, losses } = getWinLossCounts(subset)
    return {
      model,
      trades: subset.length,
      winRate: calculateWinRate(wins, losses),
      profitFactor: calculateProfitFactor(subset),
      netPnl: subset.reduce((s, t) => s + (t.profitLoss || 0), 0),
      avgRR: calculateAvgRR(subset),
    }
  })
    .filter(s => s.trades > 0)
    .sort((a, b) => b.winRate - a.winRate)
}

export interface SetupScorePoint {
  score: number
  trades: number
  wins: number
  losses: number
  winRate: number
  netPnl: number
}

export function getSetupScoreAnalytics(trades: Trade[]): {
  data: SetupScorePoint[]
  avgScoreWinners: number
  avgScoreLosers: number
} {
  const enhanced = trades.filter(t => !isLegacyTrade(t))
  const byScore = new Map<number, Trade[]>()
  for (const t of enhanced) {
    const score = getSetupScore(t)
    if (!byScore.has(score)) byScore.set(score, [])
    byScore.get(score)!.push(t)
  }
  const data: SetupScorePoint[] = []
  for (let i = 0; i <= 8; i++) {
    const subset = byScore.get(i) || []
    const { wins, losses } = getWinLossCounts(subset)
    data.push({
      score: i,
      trades: subset.length,
      wins,
      losses,
      winRate: calculateWinRate(wins, losses),
      netPnl: subset.reduce((s, t) => s + (t.profitLoss || 0), 0),
    })
  }

  const winners = enhanced.filter(t => calcResult(t) === "win")
  const losers = enhanced.filter(t => calcResult(t) === "loss")
  const avgScoreWinners = winners.length > 0
    ? winners.reduce((s, t) => s + getSetupScore(t), 0) / winners.length
    : 0
  const avgScoreLosers = losers.length > 0
    ? losers.reduce((s, t) => s + getSetupScore(t), 0) / losers.length
    : 0

  return { data, avgScoreWinners, avgScoreLosers }
}

export interface MistakeStat {
  mistake: string
  frequency: number
  winRate: number
  netPnl: number
}

export function getMistakeAnalysis(trades: Trade[]): MistakeStat[] {
  const map = new Map<string, Trade[]>()
  for (const t of trades) {
    const tags = new Set<string>()
    if (t.mistakeTags) t.mistakeTags.forEach(m => tags.add(m))
    if (t.mistakes) t.mistakes.forEach(m => tags.add(m))
    for (const tag of tags) {
      if (!map.has(tag)) map.set(tag, [])
      map.get(tag)!.push(t)
    }
  }
  const results: MistakeStat[] = []
  for (const [mistake, subset] of map) {
    const { wins, losses } = getWinLossCounts(subset)
    results.push({
      mistake,
      frequency: subset.length,
      winRate: calculateWinRate(wins, losses),
      netPnl: subset.reduce((s, t) => s + (t.profitLoss || 0), 0),
    })
  }
  return results.sort((a, b) => b.frequency - a.frequency)
}

export interface EmotionStat {
  emotion: string
  trades: number
  winRate: number
  netPnl: number
}

export function getEmotionalAnalytics(trades: Trade[]): EmotionStat[] {
  const map = new Map<string, Trade[]>()
  for (const t of trades) {
    let emotion = t.emotionalState?.toLowerCase()
    if (t.emotionTags && t.emotionTags.length > 0) {
      for (const tag of t.emotionTags) {
        if (!map.has(tag)) map.set(tag, [])
        map.get(tag)!.push(t)
      }
    } else if (emotion) {
      if (!map.has(emotion)) map.set(emotion, [])
      map.get(emotion)!.push(t)
    }
  }
  const results: EmotionStat[] = []
  for (const [emotion, subset] of map) {
    const { wins, losses } = getWinLossCounts(subset)
    results.push({
      emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      trades: subset.length,
      winRate: calculateWinRate(wins, losses),
      netPnl: subset.reduce((s, t) => s + (t.profitLoss || 0), 0),
    })
  }
  return results.sort((a, b) => b.trades - a.trades)
}

export interface EquityCurvePoint {
  tradeNumber: number
  date: string
  balance: number
  runningPnl: number
  drawdown: number
  profitLoss: number
}

export function getEquityCurveData(trades: Trade[], totalDeposit: number): EquityCurvePoint[] {
  const sorted = [...trades].sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime())
  let runningPnl = 0
  let peak = totalDeposit
  const points: EquityCurvePoint[] = []
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i]
    runningPnl += t.profitLoss || 0
    const balance = totalDeposit + runningPnl
    if (balance > peak) peak = balance
    const drawdown = peak > 0 ? ((peak - balance) / peak) * 100 : 0
    points.push({
      tradeNumber: i + 1,
      date: t.entryTime,
      balance,
      runningPnl,
      drawdown,
      profitLoss: t.profitLoss || 0,
    })
  }
  return points
}

export interface MonthlyStat {
  month: string
  trades: number
  winRate: number
  netPnl: number
  netR: number
}

export function getMonthlyPerformance(trades: Trade[]): MonthlyStat[] {
  const map = new Map<string, Trade[]>()
  for (const t of trades) {
    if (!t.entryTime) continue
    const key = getMonthKey(t.entryTime)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  const results: MonthlyStat[] = []
  for (const [month, subset] of map) {
    const { wins, losses } = getWinLossCounts(subset)
    results.push({
      month,
      trades: subset.length,
      winRate: calculateWinRate(wins, losses),
      netPnl: subset.reduce((s, t) => s + (t.profitLoss || 0), 0),
      netR: subset.reduce((s, t) => s + (t.profitLoss || 0), 0),
    })
  }
  return results.sort((a, b) => a.month.localeCompare(b.month))
}

export interface ExpectancyData {
  expectancyPerTrade: number
  expectancyInR: number
  winRate: number
  lossRate: number
  avgWin: number
  avgLoss: number
}

export function getExpectancy(trades: Trade[]): ExpectancyData {
  const { wins, losses } = getWinLossCounts(trades)
  const total = wins + losses
  const winRate = total > 0 ? wins / total : 0
  const lossRate = total > 0 ? losses / total : 0
  const avgWin = calculateAvgWin(trades)
  const avgLoss = calculateAvgLoss(trades)
  return {
    expectancyPerTrade: (winRate * avgWin) - (lossRate * avgLoss),
    expectancyInR: total > 0 ? trades.reduce((s, t) => s + (t.profitLoss || 0), 0) / trades.length : 0,
    winRate: winRate * 100,
    lossRate: lossRate * 100,
    avgWin,
    avgLoss,
  }
}

export interface RiskManagement {
  avgRiskPerTrade: number
  avgRRPlanned: number
  avgRRAchieved: number
  largestWin: number
  largestLoss: number
  avgWinVal: number
  avgLossVal: number
}

export function getRiskManagement(trades: Trade[]): RiskManagement {
  const withRisk = trades.filter(t => t.entryPrice && t.stopLoss && t.lotSize)
  const avgRiskPerTrade = withRisk.length > 0
    ? withRisk.reduce((s, t) => {
      const risk = Math.abs((t.entryPrice || 0) - (t.stopLoss || 0)) * (t.lotSize || 0) * 100000
      return s + risk
    }, 0) / withRisk.length
    : 0

  const withRR = trades.filter(t => t.riskToReward && t.riskToReward > 0)
  const avgRRPlanned = withRR.length > 0
    ? withRR.reduce((s, t) => s + (t.riskToReward || 0), 0) / withRR.length
    : 0

  const withAchieved = trades.filter(t => t.rrAchieved && t.rrAchieved !== 0)
  const avgRRAchieved = withAchieved.length > 0
    ? withAchieved.reduce((s, t) => s + (t.rrAchieved || 0), 0) / withAchieved.length
    : 0

  const pls = trades.map(t => t.profitLoss || 0)
  const largestWin = pls.length > 0 ? Math.max(...pls) : 0
  const largestLoss = pls.length > 0 ? Math.min(...pls) : 0

  return {
    avgRiskPerTrade,
    avgRRPlanned,
    avgRRAchieved,
    largestWin,
    largestLoss,
    avgWinVal: calculateAvgWin(trades),
    avgLossVal: calculateAvgLoss(trades),
  }
}

export interface Insight {
  type: "positive" | "negative" | "neutral"
  title: string
  description: string
}

export function getInsights(trades: Trade[]): Insight[] {
  const insights: Insight[] = []
  if (trades.length === 0) return insights

  const { wins, losses, breakevens } = getWinLossCounts(trades)
  const totalDecisive = wins + losses
  const winRate = calculateWinRate(wins, losses)

  const symbols = getPerformanceBySymbol(trades)
  if (symbols.length > 0) {
    const best = symbols[0]
    const worst = symbols[symbols.length - 1]
    if (best.netPnl > 0) {
      insights.push({
        type: "positive",
        title: "Best Performing Symbol",
        description: `${best.symbol} with ${best.wins}W/${best.losses}L and $${best.netPnl.toFixed(2)} profit.`,
      })
    }
    if (worst.netPnl < 0) {
      insights.push({
        type: "negative",
        title: "Worst Performing Symbol",
        description: `${worst.symbol} with ${worst.wins}W/${worst.losses}L and $${Math.abs(worst.netPnl).toFixed(2)} loss.`,
      })
    }
  }

  const days = getWeekdayPerformance(trades)
  const bestDay = [...days].filter(d => d.trades > 0).sort((a, b) => b.netPnl - a.netPnl)[0]
  const worstDay = [...days].filter(d => d.trades > 0).sort((a, b) => a.netPnl - b.netPnl)[0]
  if (bestDay) {
    insights.push({
      type: bestDay.netPnl >= 0 ? "positive" : "negative",
      title: "Best Trading Day",
      description: `${bestDay.day} with ${bestDay.wins}W/${bestDay.losses}L and $${bestDay.netPnl.toFixed(2)}.`,
    })
  }
  if (worstDay && worstDay.day !== bestDay?.day) {
    insights.push({
      type: worstDay.netPnl < 0 ? "negative" : "positive",
      title: "Worst Trading Day",
      description: `${worstDay.day} with ${worstDay.wins}W/${worstDay.losses}L and $${worstDay.netPnl.toFixed(2)}.`,
    })
  }

  const mistakes = getMistakeAnalysis(trades)
  if (mistakes.length > 0) {
    const mostCostly = [...mistakes].sort((a, b) => a.netPnl - b.netPnl)[0]
    if (mostCostly.netPnl < 0) {
      insights.push({
        type: "negative",
        title: "Most Costly Mistake",
        description: `${mostCostly.mistake} — cost $${Math.abs(mostCostly.netPnl).toFixed(2)} across ${mostCostly.frequency} trades.`,
      })
    }
    const mostCommon = mistakes[0]
    insights.push({
      type: "neutral",
      title: "Most Common Mistake",
      description: `${mostCommon.mistake} appeared in ${mostCommon.frequency} trade(s).`,
    })
  }

  const sessions = getSessionPerformance(trades)
  if (sessions.length > 0) {
    const bestSession = [...sessions].sort((a, b) => b.netPnl - a.netPnl)[0]
    insights.push({
      type: bestSession.netPnl >= 0 ? "positive" : "negative",
      title: "Best Session",
      description: `${bestSession.session} session with ${bestSession.trades} trade(s) and $${bestSession.netPnl.toFixed(2)}.`,
    })
  }

  const models = getEntryModelPerformance(trades)
  if (models.length > 0) {
    const bestModel = models[0]
    insights.push({
      type: "positive",
      title: "Most Profitable Setup",
      description: `${bestModel.model} — ${bestModel.winRate.toFixed(1)}% win rate, $${bestModel.netPnl.toFixed(2)} profit.`,
    })
  }

  if (totalDecisive > 0) {
    insights.push({
      type: winRate >= 50 ? "positive" : "negative",
      title: "Overall Win Rate",
      description: `${winRate.toFixed(1)}% (${wins}W/${losses}L/${breakevens}BE) across ${trades.length} trade(s).`,
    })
  }

  const pls = trades.map(t => t.profitLoss || 0)
  const largestWin = pls.length > 0 ? Math.max(...pls) : 0
  const largestLoss = pls.length > 0 ? Math.min(...pls) : 0
  if (largestWin > 0) {
    insights.push({
      type: "positive",
      title: "Highest RR Trade",
      description: `Best single trade: +$${largestWin.toFixed(2)}.`,
    })
  }
  if (largestLoss < 0) {
    insights.push({
      type: "negative",
      title: "Largest Loss",
      description: `Worst single trade: -$${Math.abs(largestLoss).toFixed(2)}.`,
    })
  }

  return insights
}

export function getAllMetrics(trades: Trade[]): {
  totalTrades: number
  wins: number
  losses: number
  breakeven: number
  winRate: number
  totalPnl: number
  profitFactor: number
  avgWin: number
  avgLoss: number
  avgRR: number
  netR: number
} {
  const { wins, losses, breakevens } = getWinLossCounts(trades)
  const totalPnl = trades.reduce((s, t) => s + (t.profitLoss || 0), 0)
  return {
    totalTrades: trades.length,
    wins,
    losses,
    breakeven: breakevens,
    winRate: calculateWinRate(wins, losses),
    totalPnl,
    profitFactor: calculateProfitFactor(trades),
    avgWin: calculateAvgWin(trades),
    avgLoss: calculateAvgLoss(trades),
    avgRR: calculateAvgRR(trades),
    netR: totalPnl,
  }
}
