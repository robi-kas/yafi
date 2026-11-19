import { describe, it, expect } from 'vitest'
import { usdPerPointPerLot, initialRiskUsd, rMultiple, instrumentKind } from '../lib/instruments'
import { calculateMetrics, getWinLossCounts, isClosedTrade, calcResult } from '../lib/trading-metrics'

const trade = (o: Partial<any>) => ({
  id: Math.random().toString(36).slice(2),
  symbol: 'EURUSD',
  entryPrice: 1.1,
  stopLoss: 1.099,
  lotSize: 1,
  exitPrice: 1.102,
  tradeStatus: 'closed',
  entryTime: '2026-01-01T10:00:00Z',
  ...o,
})

describe('instruments: contract value per 1.0 price move per lot', () => {
  it('classifies symbols, including broker suffixes', () => {
    expect(instrumentKind('XAUUSD')).toBe('metal')
    expect(instrumentKind('XAUUSDm')).toBe('metal')
    expect(instrumentKind('EURUSD.r')).toBe('forex')
    expect(instrumentKind('NAS100')).toBe('index')
    expect(instrumentKind('BTCUSD')).toBe('crypto')
  })

  it('gold is 100 oz per lot ($100 per $1 move)', () => {
    expect(usdPerPointPerLot('XAUUSD', 2400)).toBe(100)
  })

  it('silver is 5000 oz per lot', () => {
    expect(usdPerPointPerLot('XAGUSD', 30)).toBe(5000)
  })

  it('USD-quoted FX pairs are 100k units', () => {
    expect(usdPerPointPerLot('EURUSD', 1.1)).toBe(100_000)
  })

  it('USD-base pairs convert by price (USDJPY: 1 yen move = 100k JPY)', () => {
    expect(usdPerPointPerLot('USDJPY', 150)).toBeCloseTo(666.67, 1)
    expect(usdPerPointPerLot('USDCAD', 1.25)).toBe(80_000)
  })

  it('crypto and indices are 1 per point', () => {
    expect(usdPerPointPerLot('BTCUSD', 60000)).toBe(1)
    expect(usdPerPointPerLot('NAS100', 18000)).toBe(1)
  })
})

describe('instruments: risk and R', () => {
  it('gold: $5 stop on 0.1 lot risks $50', () => {
    expect(initialRiskUsd({ symbol: 'XAUUSD', entryPrice: 2400, stopLoss: 2395, lotSize: 0.1 })).toBeCloseTo(50)
  })

  it('EURUSD: 10 pip stop on 1 lot risks $100', () => {
    expect(initialRiskUsd({ symbol: 'EURUSD', entryPrice: 1.1, stopLoss: 1.099, lotSize: 1 })).toBeCloseTo(100)
  })

  it('prefers the recorded R when present', () => {
    expect(rMultiple({ rrAchieved: 2.5, profitLoss: 999, symbol: 'XAUUSD', entryPrice: 2400, stopLoss: 2395, lotSize: 0.1 })).toBe(2.5)
  })

  it('derives R from P&L and dollar risk otherwise (gold +$100 on $50 risk = 2R)', () => {
    expect(rMultiple({ profitLoss: 100, symbol: 'XAUUSD', entryPrice: 2400, stopLoss: 2395, lotSize: 0.1 })).toBeCloseTo(2)
  })

  it('returns null when risk is unknown', () => {
    expect(rMultiple({ profitLoss: 100, symbol: 'XAUUSD', entryPrice: 2400, stopLoss: 0, lotSize: 0.1 })).toBeNull()
  })
})

describe('trading-metrics', () => {
  it('a trade with an exit price is closed even if flagged open', () => {
    expect(isClosedTrade({ tradeStatus: 'open', exitPrice: 2400 })).toBe(true)
    expect(isClosedTrade({ tradeStatus: 'open', exitPrice: null })).toBe(false)
    expect(isClosedTrade({ tradeStatus: 'closed', exitPrice: null })).toBe(true)
  })

  it('counts wins, losses and breakevens; win rate excludes breakevens', () => {
    const m = calculateMetrics([
      trade({ profitLoss: 100 }),
      trade({ profitLoss: -50 }),
      trade({ profitLoss: 0 }),
      trade({ profitLoss: 30 }),
    ])
    expect([m.wins, m.losses, m.breakevens]).toEqual([2, 1, 1])
    expect(m.winRateExcludingBreakevens).toBeCloseTo(66.67, 1)
    expect(m.netPnl).toBe(80)
    expect(m.profitFactor).toBeCloseTo(130 / 50)
    expect(m.averageWinner).toBe(65)
    expect(m.largestLoser).toBe(-50)
  })

  it('expectancy uses realised P&L of closed trades only', () => {
    const m = calculateMetrics([
      trade({ profitLoss: 100 }),
      trade({ profitLoss: -40 }),
      trade({ profitLoss: -500, exitPrice: null, tradeStatus: 'open' }), // floating
    ])
    expect(m.closedTrades).toBe(2)
    expect(m.openTrades).toBe(1)
    expect(m.expectancyPerClosed).toBe(30)
    expect(m.netPnl).toBe(-440) // headline net still includes floating P&L
  })

  it('max drawdown is the largest peak-to-trough drop in chronological order', () => {
    const m = calculateMetrics([
      trade({ profitLoss: 100, entryTime: '2026-01-01T00:00:00Z' }),
      trade({ profitLoss: -30, entryTime: '2026-01-02T00:00:00Z' }),
      trade({ profitLoss: -50, entryTime: '2026-01-03T00:00:00Z' }),
      trade({ profitLoss: 200, entryTime: '2026-01-04T00:00:00Z' }),
    ])
    expect(m.maxDrawdown).toBe(80)
  })

  it('profit factor is Infinity with wins and no losses, 0 with nothing', () => {
    expect(calculateMetrics([trade({ profitLoss: 10 })]).profitFactor).toBe(Infinity)
    expect(calculateMetrics([]).profitFactor).toBe(0)
  })

  it('getWinLossCounts uses the same closed population as calculateMetrics', () => {
    const trades = [
      trade({ profitLoss: 10 }),
      trade({ profitLoss: -10 }),
      trade({ profitLoss: -10, exitPrice: null, tradeStatus: 'open' }),
    ]
    const m = calculateMetrics(trades)
    expect(getWinLossCounts(trades)).toEqual({ wins: m.wins, losses: m.losses, breakevens: m.breakevens })
  })

  it('calcResult treats tiny P&L as breakeven', () => {
    expect(calcResult({ profitLoss: 0.0005 })).toBe('breakeven')
    expect(calcResult({ profitLoss: 1 })).toBe('win')
    expect(calcResult({ profitLoss: -1 })).toBe('loss')
  })
})

import { calculateWinRate } from '../lib/trading-metrics'
describe('calculateWinRate', () => {
  it('keeps one decimal and ignores breakevens', () => {
    expect(calculateWinRate(12, 16)).toBe(42.9)
    expect(calculateWinRate(0, 0)).toBe(0)
  })
})
