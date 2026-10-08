export interface TradeMetricsInput {
  id: string
  entryPrice?: number | null
  exitPrice?: number | null
  stopLoss?: number | null
  takeProfit?: number | null
  lotSize?: number | null
  profitLoss?: number | null
  commission?: number | null
  swap?: number | null
  strategyId?: string | null
  tradeStatus?: string | null
  rrAchieved?: number | null
  symbol?: string | null
  entryTime: string | Date
}

export interface MetricWarnings {
  missingInitialRisk: number
  missingExitPrice: number
  missingStrategy: number
}

export interface CalculatedMetrics {
  totalTrades: number
  openTrades: number
  closedTrades: number
  wins: number
  losses: number
  breakevens: number
  winRateExcludingBreakevens: number
  winRateIncludingBreakevens: number
  grossProfit: number
  grossLoss: number
  netPnl: number
  profitFactor: number
  averageWinner: number
  averageLoser: number
  expectancyPerClosed: number
  expectancyPerNonBreakeven: number
  validRCount: number
  totalR: number
  expectancyInR: number
  maxDrawdown: number
  recoveryFactor: number
  largestWinner: number
  largestLoser: number
  warnings: MetricWarnings
}

const BREAKEVEN_TOLERANCE_USD = 0.001; // Trades within ±$0.001 are considered breakeven

export function calculateMetrics(trades: TradeMetricsInput[]): CalculatedMetrics {
  const warnings: MetricWarnings = {
    missingInitialRisk: 0,
    missingExitPrice: 0,
    missingStrategy: 0,
  }

  const closedTrades = trades.filter(t => t.tradeStatus === 'closed' || t.tradeStatus === 'breakeven' || (t.tradeStatus !== 'open' && t.exitPrice != null))
  const openTrades = trades.filter(t => !closedTrades.includes(t))

  let wins = 0
  let losses = 0
  let breakevens = 0
  
  let grossProfit = 0
  let grossLoss = 0
  let netPnl = 0

  let largestWinner = 0
  let largestLoser = 0

  let validRCount = 0
  let totalR = 0

  // Calculate drawdown (simplified chronological approach)
  let maxDrawdown = 0
  let peak = 0
  let cumulativePnl = 0

  // Sort closed trades chronologically for drawdown calculation
  const sortedClosed = [...closedTrades].sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime())

  for (const t of sortedClosed) {
    if (!t.exitPrice) warnings.missingExitPrice++
    if (!t.strategyId) warnings.missingStrategy++

    const pnl = (t.profitLoss || 0) + (t.commission || 0) + (t.swap || 0)
    netPnl += pnl

    // Drawdown update
    cumulativePnl += pnl
    if (cumulativePnl > peak) peak = cumulativePnl
    const drawdown = peak - cumulativePnl
    if (drawdown > maxDrawdown) maxDrawdown = drawdown

    if (Math.abs(pnl) <= BREAKEVEN_TOLERANCE_USD) {
      breakevens++
    } else if (pnl > 0) {
      wins++
      grossProfit += pnl
      if (pnl > largestWinner) largestWinner = pnl
    } else {
      losses++
      grossLoss += Math.abs(pnl)
      if (pnl < largestLoser) largestLoser = pnl
    }

    // Calculate R
    if (t.rrAchieved != null && t.rrAchieved !== 0) {
      totalR += t.rrAchieved
      validRCount++
    } else if (t.entryPrice && t.stopLoss && t.lotSize && pnl !== 0) {
      const riskPerUnit = Math.abs(t.entryPrice - t.stopLoss)
      if (riskPerUnit > 0) {
        let multiplier = 100000
        if (t.symbol?.toLowerCase().includes('xau') || t.symbol?.toLowerCase().includes('gold')) {
          multiplier = 10
        } else if (t.symbol?.toLowerCase().includes('btc')) {
          multiplier = 1
        }
        
        const initialRiskUsd = riskPerUnit * t.lotSize * multiplier
        if (initialRiskUsd > 0) {
          totalR += (pnl / initialRiskUsd)
          validRCount++
        } else {
          warnings.missingInitialRisk++
        }
      } else {
        warnings.missingInitialRisk++
      }
    } else {
      warnings.missingInitialRisk++
    }
  }

  // Calculate Net P&L across ALL trades (open + closed) to match reconciled database
  for (const t of trades) {
    if (!closedTrades.includes(t)) {
      netPnl += (t.profitLoss || 0) + (t.commission || 0) + (t.swap || 0)
    }
  }

  const nonBreakevenCount = wins + losses
  const winRateExcludingBreakevens = nonBreakevenCount > 0 ? (wins / nonBreakevenCount) * 100 : 0
  const winRateIncludingBreakevens = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0)
  const averageWinner = wins > 0 ? grossProfit / wins : 0
  const averageLoser = losses > 0 ? grossLoss / losses : 0
  
  const expectancyPerClosed = closedTrades.length > 0 ? (netPnl / closedTrades.length) : 0
  const expectancyPerNonBreakeven = nonBreakevenCount > 0 ? (netPnl / nonBreakevenCount) : 0
  const expectancyInR = validRCount > 0 ? (totalR / validRCount) : 0

  const recoveryFactor = maxDrawdown > 0 ? netPnl / maxDrawdown : 0

  return {
    totalTrades: trades.length,
    openTrades: openTrades.length,
    closedTrades: closedTrades.length,
    wins,
    losses,
    breakevens,
    winRateExcludingBreakevens,
    winRateIncludingBreakevens,
    grossProfit,
    grossLoss,
    netPnl,
    profitFactor,
    averageWinner,
    averageLoser,
    expectancyPerClosed,
    expectancyPerNonBreakeven,
    validRCount,
    totalR,
    expectancyInR,
    maxDrawdown,
    recoveryFactor,
    largestWinner,
    largestLoser,
    warnings
  }
}

// Restored UI utilities for individual trade rendering
export function calcResult(t: { profitLoss?: number | null }): "win" | "loss" | "breakeven" {
  if (!t.profitLoss || Math.abs(t.profitLoss) <= BREAKEVEN_TOLERANCE_USD) return "breakeven"
  return t.profitLoss > 0 ? "win" : "loss"
}

export function getWinLossCounts(trades: { profitLoss?: number | null }[]) {
  let wins = 0
  let losses = 0
  let breakevens = 0
  for (const t of trades) {
    if (!t.profitLoss || Math.abs(t.profitLoss) <= BREAKEVEN_TOLERANCE_USD) breakevens++
    else if (t.profitLoss > BREAKEVEN_TOLERANCE_USD) wins++
    else if (t.profitLoss < -BREAKEVEN_TOLERANCE_USD) losses++
  }
  return { wins, losses, breakevens }
}

export function calculateWinRate(wins: number, losses: number): number {
  const total = wins + losses
  return total > 0 ? Math.round((wins / total) * 100) : 0
}

export function calculateProfitFactor(trades: any[]): number {
  return calculateMetrics(trades).profitFactor
}

export function calculateAvgRR(trades: any[]): number {
  return calculateMetrics(trades).expectancyInR
}

export function calculateNetR(trades: any[]): number {
  return calculateMetrics(trades).totalR
}

export function calculateAvgWin(trades: any[]): number {
  return calculateMetrics(trades).averageWinner
}

export function calculateAvgLoss(trades: any[]): number {
  return calculateMetrics(trades).averageLoser
}
