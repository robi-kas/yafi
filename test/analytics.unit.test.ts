import { describe, it, expect } from 'vitest'
import { rBucketKey, getExpectancy, getPerformanceByRMultiple } from '../lib/analytics'
import { calculateMetrics } from '../lib/trading-metrics'

const t = (o: any) => ({
  id: Math.random().toString(36).slice(2), symbol: 'EURUSD', market: 'forex', direction: 'buy',
  entryPrice: 1.1, stopLoss: 1.099, takeProfit: 1.103, lotSize: 1, exitPrice: 1.101,
  tradeStatus: 'closed', entryTime: '2026-01-01T10:00:00Z', strategy: '', tags: [], ...o,
})

describe('R buckets', () => {
  it('puts a full -1R stop in "-1R to 0R", not "-2R to -1R"', () => {
    expect(rBucketKey(-1)).toBe('-1R to 0R')
    expect(rBucketKey(-1.2)).toBe('-2R to -1R')
    expect(rBucketKey(-0.4)).toBe('-1R to 0R')
  })
  it('puts winners by R gained and tiny results in breakeven', () => {
    expect(rBucketKey(2)).toBe('+1R to +2R')
    expect(rBucketKey(2.01)).toBe('+2R to +3R')
    expect(rBucketKey(0.5)).toBe('0R to +1R')
    expect(rBucketKey(0.02)).toBe('0R (Breakeven)')
    expect(rBucketKey(10)).toBe('> +4R')
    expect(rBucketKey(-7)).toBe('< -4R')
  })
  it('counts every trade with a known R exactly once', () => {
    const trades = [t({ rrAchieved: -1, profitLoss: -100 }), t({ rrAchieved: 2, profitLoss: 200 }), t({ rrAchieved: -1, profitLoss: -100 })]
    const buckets = getPerformanceByRMultiple(trades as any)
    expect(buckets.reduce((n, b) => n + b.count, 0)).toBe(3)
    expect(buckets.find(b => b.key === '-1R to 0R')?.count).toBe(2)
  })
})

describe('expectancy (standard definitions)', () => {
  const trades = [
    t({ profitLoss: 200, rrAchieved: 2 }),
    t({ profitLoss: -100, rrAchieved: -1 }),
    t({ profitLoss: 0, rrAchieved: 0, exitPrice: 1.1 }), // breakeven = 0R
    t({ profitLoss: -100, rrAchieved: -1 }),
  ]
  it('$ expectancy = net / closed trades (MT5 expected payoff)', () => {
    expect(getExpectancy(trades as any).expectancyPerTrade).toBe(0)
  })
  it('R expectancy = average R with breakevens as 0R (Van Tharp)', () => {
    expect(getExpectancy(trades as any).expectancyInR).toBe(0)
    const e = getExpectancy([t({ profitLoss: 300, rrAchieved: 3 }), t({ profitLoss: -100, rrAchieved: -1 })] as any)
    expect(e.expectancyInR).toBe(1)
    expect(e.expectancyPerTrade).toBe(100)
  })
  it('win% x avg win - loss% x avg loss equals the $ expectancy', () => {
    const e = getExpectancy(trades as any)
    expect((e.winRate / 100) * e.avgWin - (e.lossRate / 100) * e.avgLoss).toBeCloseTo(e.expectancyPerTrade)
  })
})

describe('drawdown percent (MT5 relative drawdown)', () => {
  it('is the largest drop as a share of the peak balance', () => {
    const m = calculateMetrics([
      t({ profitLoss: 1000, entryTime: '2026-01-01T00:00:00Z' }),  // equity 6000 (peak)
      t({ profitLoss: -2000, entryTime: '2026-01-02T00:00:00Z' }), // 4000 -> 33.3%
      t({ profitLoss: 4000, entryTime: '2026-01-03T00:00:00Z' }),  // 8000 (peak)
      t({ profitLoss: -2500, entryTime: '2026-01-04T00:00:00Z' }), // 5500 -> 31.25%, $2500
    ] as any, 5000)
    expect(m.maxDrawdown).toBe(2500)
    expect(m.maxDrawdownPct).toBeCloseTo(33.33, 1)
  })
})
