// Pure mapping from the YafiSync EA's payload to journal trade fields.
// Kept free of database / framework imports so it can be unit tested.
import { instrumentKind, initialRiskUsd } from './instruments'

export interface Mt5Position {
  positionId: number | string
  symbol: string
  type: 'buy' | 'sell' | string
  volume: number
  openTime: number // unix seconds (server time converted to UTC by the EA)
  closeTime: number
  openPrice: number
  closePrice: number
  sl?: number
  tp?: number
  profit: number
  commission?: number
  swap?: number
  comment?: string
  magic?: number
}

export interface Mt5Payload {
  version?: number
  login: number | string
  server: string
  company?: string
  currency?: string
  balance?: number
  netDeposits?: number
  positions: Mt5Position[]
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)

/** Broker symbol without suffixes (XAUUSDm -> XAUUSD, EURUSD.r -> EURUSD). */
export function displaySymbol(symbol: string) {
  const s = String(symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const trimmed = s.replace(/(M|R|C|PRO|ECN|RAW|Z)$/, '')
  // Only trim a suffix when it turns a 7-char name into a 6-letter pair
  // (XAUUSDm, EURUSD.r); never shorten real 6-letter pairs like USDZAR.
  return s.length === 7 && /^[A-Z]{6}$/.test(trimmed) ? trimmed : s
}

/** Session from the entry hour in UTC (same buckets the importer used). */
export function sessionFor(date: Date) {
  const h = date.getUTCHours()
  if (h < 7) return 'Asia'
  if (h < 12) return 'London'
  if (h < 20) return 'New York'
  return 'After Hours'
}

const MARKET_FOR_KIND = { forex: 'forex', metal: 'metal', crypto: 'crypto', index: 'indices', stock: 'stocks' } as const

export function validatePosition(p: Partial<Mt5Position>): string | null {
  if (p.positionId == null || p.positionId === '') return 'missing positionId'
  if (!p.symbol) return 'missing symbol'
  if (!(num(p.volume) > 0)) return 'missing volume'
  if (!(num(p.openTime) > 0) || !(num(p.closeTime) > 0)) return 'missing times'
  if (!(num(p.openPrice) > 0) || !(num(p.closePrice) > 0)) return 'missing prices'
  return null
}

/** Stable unique key for a broker position across all users and accounts. */
export function positionKey(server: string, login: string | number, positionId: string | number) {
  return `mt5:${String(server).trim()}:${String(login).trim()}:${String(positionId).trim()}`
}

/** Fields owned by the broker; safe to overwrite on every sync. */
export function mapPosition(p: Mt5Position) {
  const isBuy = String(p.type).toLowerCase() === 'buy'
  const symbol = displaySymbol(p.symbol)
  const kind = instrumentKind(symbol)
  const entry = num(p.openPrice)
  const exit = num(p.closePrice)
  const sl = num(p.sl)
  const tp = num(p.tp)
  const lots = num(p.volume)
  const commission = num(p.commission)
  const swap = num(p.swap)
  const net = num(p.profit) + commission + swap
  const entryTime = new Date(num(p.openTime) * 1000)
  const exitTime = new Date(num(p.closeTime) * 1000)

  const risk = initialRiskUsd({ symbol, entryPrice: entry, stopLoss: sl, lotSize: lots })
  const rr = risk ? Math.round((net / risk) * 100) / 100 : null
  const plannedRR =
    sl > 0 && tp > 0 && Math.abs(entry - sl) > 0 ? Math.round((Math.abs(tp - entry) / Math.abs(entry - sl)) * 100) / 100 : null

  return {
    symbol,
    displaySymbol: symbol,
    originalBrokerSymbol: p.symbol,
    market: MARKET_FOR_KIND[kind],
    direction: isBuy ? 'buy' : 'sell',
    entryPrice: entry,
    exitPrice: exit,
    stopLoss: sl,
    takeProfit: tp,
    lotSize: lots,
    profitLoss: Math.round(net * 100) / 100,
    brokerCommission: commission,
    brokerSwap: swap,
    result: Math.abs(net) <= 0.001 ? 'breakeven' : net > 0 ? 'win' : 'loss',
    entryTime,
    exitTime,
    tradeStatus: 'closed',
    session: sessionFor(entryTime),
    rrAchieved: rr,
    riskToReward: plannedRR,
    initialPlannedRiskUsd: risk,
    rStatus: risk ? 'VALID' : 'MISSING_STOP',
  }
}
