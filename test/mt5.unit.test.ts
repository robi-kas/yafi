import { describe, it, expect } from 'vitest'
import { mapPosition, displaySymbol, positionKey, validatePosition, sessionFor } from '../lib/mt5'

const base = {
  positionId: 123456,
  symbol: 'XAUUSDm',
  type: 'sell',
  volume: 0.1,
  openTime: Date.UTC(2026, 8, 15, 13, 30) / 1000,
  closeTime: Date.UTC(2026, 8, 15, 14, 10) / 1000,
  openPrice: 2400,
  closePrice: 2390,
  sl: 2405,
  tp: 2385,
  profit: 100,
  commission: -0.7,
  swap: 0,
}

describe('mt5 mapping', () => {
  it('strips broker suffixes but keeps real 6-letter pairs', () => {
    expect(displaySymbol('XAUUSDm')).toBe('XAUUSD')
    expect(displaySymbol('EURUSD.r')).toBe('EURUSD')
    expect(displaySymbol('USDZAR')).toBe('USDZAR')
    expect(displaySymbol('NAS100')).toBe('NAS100')
  })

  it('maps a closed gold sell with net P&L, R and planned RR', () => {
    const t = mapPosition(base)
    expect(t.symbol).toBe('XAUUSD')
    expect(t.originalBrokerSymbol).toBe('XAUUSDm')
    expect(t.market).toBe('metal')
    expect(t.direction).toBe('sell')
    expect(t.profitLoss).toBe(99.3) // profit + commission + swap
    expect(t.result).toBe('win')
    expect(t.initialPlannedRiskUsd).toBeCloseTo(50) // $5 x 0.1 lot x 100 oz
    expect(t.rrAchieved).toBeCloseTo(1.99)
    expect(t.riskToReward).toBe(3)
    expect(t.session).toBe('New York')
    expect(t.tradeStatus).toBe('closed')
  })

  it('marks R as missing when there was no stop loss', () => {
    const t = mapPosition({ ...base, sl: 0 })
    expect(t.rrAchieved).toBeNull()
    expect(t.rStatus).toBe('MISSING_STOP')
  })

  it('treats a scratch trade as breakeven', () => {
    expect(mapPosition({ ...base, profit: 0.7, commission: -0.7 }).result).toBe('breakeven')
  })

  it('builds a stable unique key per broker position', () => {
    expect(positionKey('Exness-MT5Real27', 414619046, 123456)).toBe('mt5:Exness-MT5Real27:414619046:123456')
  })

  it('rejects incomplete positions', () => {
    expect(validatePosition(base)).toBeNull()
    expect(validatePosition({ ...base, closePrice: 0 })).toBe('missing prices')
    expect(validatePosition({ ...base, positionId: undefined as any })).toBe('missing positionId')
  })

  it('buckets sessions by UTC hour', () => {
    expect(sessionFor(new Date(Date.UTC(2026, 0, 1, 3)))).toBe('Asia')
    expect(sessionFor(new Date(Date.UTC(2026, 0, 1, 8)))).toBe('London')
    expect(sessionFor(new Date(Date.UTC(2026, 0, 1, 21)))).toBe('After Hours')
  })
})
