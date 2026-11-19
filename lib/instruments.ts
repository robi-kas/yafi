// Contract specs: how many US dollars a 1.0 price move is worth for 1 standard
// lot. Used to turn a stop-loss distance into dollar risk (and so into R).
//
// Standard MT5 contract sizes: FX 100,000 units, gold 100 oz, silver 5,000 oz,
// platinum/palladium 100 oz, crypto 1 coin, indices/stocks 1 contract.
// Index contract sizes vary by broker, so treat index R as approximate.

const FX_LOT = 100_000

// Rough USD per 1 unit of currency, only for cross pairs whose quote currency
// isn't USD and where no live rate is available. Good enough for R estimates.
const APPROX_USD_PER_UNIT: Record<string, number> = {
  EUR: 1.08, GBP: 1.27, AUD: 0.66, NZD: 0.6, CAD: 0.73, CHF: 1.12, JPY: 0.0067,
}

const CURRENCIES = new Set(["USD", "EUR", "GBP", "AUD", "NZD", "CAD", "CHF", "JPY"])

function cleanSymbol(symbol: string) {
  // Strip broker suffixes like "XAUUSDm", "EURUSD.r", "EURUSD-ECN"
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/(M|R|C|PRO|ECN|RAW)$/, "")
}

export type InstrumentKind = "forex" | "metal" | "crypto" | "index" | "stock"

export function instrumentKind(symbol: string, market?: string | null): InstrumentKind {
  const s = cleanSymbol(symbol || "")
  if (/^(XAU|XAG|XPT|XPD|GOLD|SILVER)/.test(s)) return "metal"
  if (/^(BTC|ETH|XRP|LTC|SOL|ADA|DOGE|BNB)/.test(s)) return "crypto"
  if (/^(US30|NAS|USTEC|US100|SPX|US500|GER|DE40|DAX|UK100|FTSE|JPN|NIKKEI|HK50|AUS200|FRA40|STOXX)/.test(s)) return "index"
  if (s.length >= 6 && CURRENCIES.has(s.slice(0, 3)) && CURRENCIES.has(s.slice(3, 6))) return "forex"
  const m = (market || "").toLowerCase()
  if (m === "forex" || m === "metal" || m === "crypto") return m as InstrumentKind
  if (m === "indices") return "index"
  return "stock"
}

/** USD value of a 1.0 price move for 1 standard lot (price = the trade's price, needed for USD-base pairs). */
export function usdPerPointPerLot(symbol: string, price: number, market?: string | null): number {
  const s = cleanSymbol(symbol || "")
  switch (instrumentKind(symbol, market)) {
    case "metal":
      if (s.startsWith("XAG") || s.startsWith("SILVER")) return 5000
      return 100 // gold, platinum, palladium: 100 oz
    case "crypto":
    case "index":
    case "stock":
      return 1
    case "forex": {
      const base = s.slice(0, 3)
      const quote = s.slice(3, 6)
      if (quote === "USD") return FX_LOT
      if (base === "USD" && price > 0) return FX_LOT / price
      return FX_LOT * (APPROX_USD_PER_UNIT[quote] ?? 1)
    }
  }
}

/** Dollar risk of a position: |entry - stop| x lots x contract value. Null when it can't be known. */
export function initialRiskUsd(t: {
  symbol?: string | null
  market?: string | null
  entryPrice?: number | null
  stopLoss?: number | null
  lotSize?: number | null
}): number | null {
  const entry = Number(t.entryPrice) || 0
  const stop = Number(t.stopLoss) || 0
  const lots = Number(t.lotSize) || 0
  if (!entry || !stop || !lots) return null
  const distance = Math.abs(entry - stop)
  if (!distance) return null
  const risk = distance * lots * usdPerPointPerLot(t.symbol || "", entry, t.market)
  return risk > 0 ? risk : null
}

/** R multiple of a trade: recorded R when available, otherwise P&L / initial dollar risk. */
export function rMultiple(t: {
  rrAchieved?: number | null
  profitLoss?: number | null
  symbol?: string | null
  market?: string | null
  entryPrice?: number | null
  stopLoss?: number | null
  lotSize?: number | null
}): number | null {
  if (t.rrAchieved != null && t.rrAchieved !== 0 && Number.isFinite(t.rrAchieved)) return t.rrAchieved
  const pnl = Number(t.profitLoss) || 0
  if (!pnl) return t.profitLoss === 0 ? 0 : null
  const risk = initialRiskUsd(t)
  return risk ? pnl / risk : null
}
