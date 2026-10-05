"use client"

import React, { useEffect } from "react"
import { useState } from "react"
import { useDashboard, Trade, TradeMarket, TradeDirection, TradeResult } from "@/context/dashboard-context"
import { getTradeEditMode } from "@/lib/trade-mode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Upload, AlertTriangle } from "lucide-react"

const MARKET_SYMBOLS: Record<string, string[]> = {
  forex: ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURGBP", "EURJPY"],
  crypto: ["BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD", "ADAUSD", "DOTUSD", "LINKUSD"],
  stocks: ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "GOOGL", "META", "NFLX"],
  indices: ["US30", "NAS100", "SPX500", "GER40", "UK100", "JPN225"],
  metal: ["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"]
}

function getPipMultiplier(market: TradeMarket, symbol: string): number {
  const sym = symbol.toUpperCase()
  if (sym.includes('XAU')) return 10 // Gold ($1 move = 10 pips)
  if (sym.includes('XAG') || sym.includes('XPT') || sym.includes('XPD')) return 1
  if (sym.includes('US30') || sym.includes('NAS') || sym.includes('SPX')) return 1
  if (sym.includes('JPY')) return 100
  
  switch (market) {
    case 'forex':
      return 10000
    case 'metal':
      return 10 // fallback
    default:
      return 1
  }
}

function getPipValueInDollars(market: TradeMarket, symbol: string, price: number): number {
  if (market !== 'forex' || price <= 0) return 10
  if (symbol.includes('JPY')) {
    return (0.01 / price) * 100000
  } else {
    return 10
  }
}

const getBasePipValuePerLot = (market: TradeMarket): number => {
  switch (market) {
    case 'forex':
      return 10
    case 'metal':
      return 10
    default:
      return 10
  }
}

interface TradeEntryFormProps {
  onClose: () => void
  initialTrade?: Trade
  defaultEntryTime?: string
}

export function TradeEntryForm({ onClose, initialTrade, defaultEntryTime }: TradeEntryFormProps) {
  const { accounts, selectedAccountId, strategies, addTrade, updateTrade, isLoading } = useDashboard()
  const mode = getTradeEditMode(initialTrade)
  const isImported = mode === 'EDIT_IMPORTED_TRADE'

  const selectedAccount = accounts.find(a => a.id === selectedAccountId)
  const accountBalance = selectedAccount?.balance
  const hasValidAccountBalance = Number.isFinite(accountBalance) && accountBalance !== undefined && accountBalance > 0
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0)
  const hasAnyAccounts = accounts.length > 0
  const effectiveBalance = hasValidAccountBalance
    ? (accountBalance as number)
    : (hasAnyAccounts ? totalBalance : 0)

  const getInitialEntryTime = () => {
    if (initialTrade?.entryTime) {
      return new Date(initialTrade.entryTime).toISOString().slice(0, 16)
    }
    if (defaultEntryTime) {
      return defaultEntryTime
    }
    return ""
  }

  const [formData, setFormData] = useState({
    // Section 1: Trade Basics
    symbol: initialTrade?.symbol || "",
    market: (initialTrade?.market || "forex") as TradeMarket,
    direction: (initialTrade?.direction || "buy") as TradeDirection,
    lotSize: initialTrade?.lotSize || 0,
    riskPercent: 1,
    strategy: initialTrade?.strategy || "",
    tradeStatus: (initialTrade?.tradeStatus || "open") as "open" | "closed",

    // Section 2: Price Levels
    entryPrice: initialTrade?.entryPrice || 0,
    stopLoss: initialTrade?.stopLoss || 0,
    takeProfit: initialTrade?.takeProfit || 0,
    exitPrice: initialTrade?.exitPrice || 0,
    rrPlanned: initialTrade?.rrPlanned || 0,

    // Section 3: Timing
    entryTime: getInitialEntryTime(),
    exitTime: initialTrade?.exitTime ? new Date(initialTrade.exitTime).toISOString().slice(0, 16) : "",

    // Section 4: Market Structure
    htfBias: initialTrade?.htfBias || "",
    trendAlignment: initialTrade?.trendAlignment || "",
    htfTimeframe: initialTrade?.htfTimeframe || "",

    // Section 5: Session Data
    session: initialTrade?.session || "",
    killZone: initialTrade?.killZone || "",

    // Section 6: Setup Validation (individual booleans)
    htfPoi: initialTrade?.htfPoi || false,
    liquiditySweep: initialTrade?.liquiditySweep || false,
    mssConfirmed: initialTrade?.mssConfirmed || false,
    fvgPresent: initialTrade?.fvgPresent || false,
    ifvgPresent: initialTrade?.ifvgPresent || false,
    breakerBlockRetest: initialTrade?.breakerBlockRetest || false,
    orderBlockRetest: initialTrade?.orderBlockRetest || false,
    fibonacciRetracement: initialTrade?.fibonacciRetracement || false,

    // Section 7: Entry Model
    entryModel: initialTrade?.entryModel || "",

    // Section 8: Journal Reasoning
    entryReason: initialTrade?.entryReason || "",
    exitReason: initialTrade?.exitReason || "",
    tradeCause: initialTrade?.tradeCause || "",
    lessonLearned: initialTrade?.lessonLearned || "",
    retakeTrade: initialTrade?.retakeTrade || "",

    // Section 9: Emotional Tracking
    emotionBefore: initialTrade?.emotionBefore || 0,
    emotionAfter: initialTrade?.emotionAfter || 0,
    emotionTags: initialTrade?.emotionTags || [],

    // Section 10: Performance Review
    mistakeTags: initialTrade?.mistakeTags || [],
    mistakes: initialTrade?.mistakes || [],
    rrAchieved: initialTrade?.rrAchieved || 0,
    result: initialTrade?.result || "",

    // Section 12: Additional Notes
    notes: initialTrade?.notes || "",
    tags: initialTrade?.tags || [],

    // Backward compat
    confluences: initialTrade?.confluences || [],
    emotionalState: (initialTrade?.emotionalState && initialTrade.emotionalState !== "focused")
      ? initialTrade.emotionalState : "",
  })

  const [riskPercentHydrated, setRiskPercentHydrated] = useState(!initialTrade)
  useEffect(() => {
    setRiskPercentHydrated(!initialTrade)
  }, [initialTrade?.id, selectedAccountId])

  const [screenshots, setScreenshots] = useState<{ htf: string[]; entry: string[]; exit: string[] }>({
    htf: [],
    entry: [],
    exit: [],
  })
  const [showCustomSymbol, setShowCustomSymbol] = useState(
    initialTrade ? !Object.values(MARKET_SYMBOLS).flat().includes(initialTrade.symbol) : false
  )

  useEffect(() => {
    if (initialTrade?.screenshots) {
      const all = initialTrade.screenshots
      setScreenshots({
        htf: all.length > 0 ? [all[0]] : [],
        entry: all.length > 1 ? [all[1]] : [],
        exit: all.length > 2 ? [all[2]] : [],
      })
    }
  }, [initialTrade?.id])

  const allScreenshots = [...screenshots.htf, ...screenshots.entry, ...screenshots.exit]

  const sessionOptions = ["London", "New York", "Asia", "London Open", "NY Open", "London/NY Overlap"]
  const killZoneOptions = ["London Kill Zone", "New York Kill Zone", "Asia Kill Zone"]
  const entryModelOptions = ["Breaker Block", "Order Block", "FVG", "IFVG", "Unicorn", "MMXM", "Other"]
  const emotionCheckboxOptions = ["Fear", "FOMO", "Revenge", "Overconfidence", "Hesitation", "Neutral"]
  const mistakeTagOptions = [
    "Entered Early", "Entered Late", "Ignored HTF Bias", "No MSS", "No Liquidity Sweep",
    "Chased Price", "Overtraded", "Moved Stop Loss", "Closed Early", "Risk Violation",
    "FOMO", "Revenge Trading", "Overleveraged", "Ignored Rules",
  ]
  const resultOptions = ["win", "loss", "breakeven"]

  const setupValidationKeys = [
    { key: "htfPoi", label: "HTF POI" },
    { key: "liquiditySweep", label: "Liquidity Sweep" },
    { key: "mssConfirmed", label: "MSS Confirmed" },
    { key: "fvgPresent", label: "FVG" },
    { key: "ifvgPresent", label: "IFVG" },
    { key: "breakerBlockRetest", label: "Breaker Block" },
    { key: "orderBlockRetest", label: "Order Block" },
    { key: "fibonacciRetracement", label: "Fibonacci Retracement" },
  ]

  const setupScore = setupValidationKeys.filter(k => (formData as any)[k.key]).length
  const setupTotal = setupValidationKeys.length

  const toggleCheckbox = (field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: !(prev as any)[field],
    }))
  }

  const toggleSelection = (field: string, item: string) => {
    setFormData(prev => {
      const arr = (prev as any)[field] as string[]
      return {
        ...prev,
        [field]: arr.includes(item)
          ? arr.filter(i => i !== item)
          : [...arr, item],
      }
    })
  }

  const trendHtfConflict = formData.trendAlignment && formData.htfBias && formData.trendAlignment !== formData.htfBias

  // Auto-set tradeStatus to "closed" if exitPrice exists
  React.useEffect(() => {
    const exit = Number(formData.exitPrice) || 0
    if (exit > 0 && formData.tradeStatus !== "closed") {
      setFormData(prev => ({ ...prev, tradeStatus: "closed" }))
    }
  }, [formData.exitPrice])

  const liveStats = React.useMemo(() => {
    const entry = Number(formData.entryPrice) || 0
    const sl = Number(formData.stopLoss) || 0
    const tp = Number(formData.takeProfit) || 0
    const exit = Number(formData.exitPrice) || 0
    const size = Number(formData.lotSize) || 0
    const direction = formData.direction
    const multiplier = getPipMultiplier(formData.market, formData.symbol)

    let pipValue = getBasePipValuePerLot(formData.market)
    if (formData.market === 'forex' && entry > 0) {
      pipValue = getPipValueInDollars(formData.market, formData.symbol, entry)
    }

    // PLANNED METRICS (from TP)
    let riskPoints = 0
    let rewardPoints = 0
    let rrPlanned = 0
    let riskAmount = 0
    let plannedProfit = 0
    let plannedLoss = 0

    if (entry > 0 && sl > 0 && tp > 0) {
      if (direction === "buy") {
        riskPoints = entry - sl
        rewardPoints = tp - entry
      } else {
        riskPoints = sl - entry
        rewardPoints = entry - tp
      }
      rrPlanned = riskPoints > 0 ? rewardPoints / riskPoints : 0
    }

    if (entry > 0 && sl > 0 && size > 0) {
      const diff = Math.abs(entry - sl)
      riskAmount = diff * multiplier * size * pipValue
    }

    if (entry > 0 && tp > 0 && size > 0) {
      let diff = 0
      if (direction === "buy") {
        diff = tp - entry
      } else {
        diff = entry - tp
      }
      plannedProfit = diff * multiplier * size * pipValue
    }

    if (entry > 0 && sl > 0 && size > 0) {
      const diff = Math.abs(entry - sl)
      plannedLoss = -diff * multiplier * size * pipValue
    }

    // ACTUAL METRICS (from Exit Price)
    let actualRewardPoints = 0
    let rrActual = 0
    let actualPnL = 0
    let actualResult: "win" | "loss" | "breakeven" = "breakeven"

    if (entry > 0 && sl > 0 && exit > 0) {
      if (direction === "buy") {
        actualRewardPoints = exit - entry
      } else {
        actualRewardPoints = entry - exit
      }
      rrActual = riskPoints > 0 ? actualRewardPoints / riskPoints : 0

      const diff = direction === "buy" ? (exit - entry) : (entry - exit)
      actualPnL = diff * multiplier * size * pipValue

      if (rrActual > 0) actualResult = "win"
      else if (rrActual < 0) actualResult = "loss"
      else actualResult = "breakeven"
    }

    // For backward compatibility - use actual P&L if exit exists, otherwise planned
    const pl = exit > 0 ? actualPnL : plannedProfit + plannedLoss

    return {
      // Planned
      riskPoints,
      rewardPoints,
      rrPlanned,
      riskAmount,
      plannedProfit,
      plannedLoss,
      // Actual
      actualRewardPoints,
      rrActual,
      actualPnL,
      actualResult,
      // Compat
      pl,
      pipValue
    }
  }, [formData])

  useEffect(() => {
    const currentLotSize = Number(formData.lotSize) || 0
    if (initialTrade && !riskPercentHydrated && currentLotSize > 0.001) return

    const entry = Number(formData.entryPrice) || 0
    const sl = Number(formData.stopLoss) || 0
    const riskPercent = Number(formData.riskPercent) || 1
    const balance = effectiveBalance

    if (entry > 0 && sl > 0 && balance > 0) {
      const cashRisk = (balance * riskPercent) / 100
      const multiplier = getPipMultiplier(formData.market, formData.symbol)
      const stopLossPips = Math.abs(entry - sl) * multiplier
      if (stopLossPips > 0) {
        let pipValue = getBasePipValuePerLot(formData.market)
        if (formData.market === 'forex') {
          pipValue = getPipValueInDollars(formData.market, formData.symbol, entry)
        }
        const suggestedSize = cashRisk / (stopLossPips * pipValue)
        if (Math.abs(suggestedSize - formData.lotSize) > 0.0001) {
          setFormData(prev => ({ ...prev, lotSize: parseFloat(suggestedSize.toFixed(4)) }))
        }
      }
    }
  }, [
    formData.entryPrice,
    formData.stopLoss,
    formData.riskPercent,
    formData.market,
    formData.symbol,
    formData.lotSize,
    initialTrade,
    riskPercentHydrated,
    effectiveBalance,
  ])

  useEffect(() => {
    if (!initialTrade) return
    if (riskPercentHydrated) return
    if (effectiveBalance <= 0) return

    const entry = Number(initialTrade.entryPrice) || 0
    const sl = Number(initialTrade.stopLoss) || 0
    const size = Number(initialTrade.lotSize) || 0
    if (!(entry > 0 && sl > 0 && size > 0)) {
      setRiskPercentHydrated(true)
      return
    }

    const multiplier = getPipMultiplier(initialTrade.market, initialTrade.symbol)
    let pipValue = getBasePipValuePerLot(initialTrade.market)
    if (initialTrade.market === "forex") {
      pipValue = getPipValueInDollars(initialTrade.market, initialTrade.symbol, entry)
    }

    const riskAmount = Math.abs(entry - sl) * multiplier * size * pipValue
    const riskPercentDerived = (riskAmount / effectiveBalance) * 100

    if (Number.isFinite(riskPercentDerived) && riskPercentDerived >= 0) {
      setFormData(prev => ({ ...prev, riskPercent: Number(riskPercentDerived.toFixed(4)) }))
    }

    setRiskPercentHydrated(true)
  }, [initialTrade, riskPercentHydrated, effectiveBalance])

  const handleScreenshotUpload = (type: "htf" | "entry" | "exit", e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          setScreenshots(prev => ({ ...prev, [type]: [...prev[type], base64] }))
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeScreenshot = (type: "htf" | "entry" | "exit", index: number) => {
    setScreenshots(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }))
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const [validationError, setValidationError] = useState<string | null>(null)

  const priceStructureError = React.useMemo(() => {
    const entry = Number(formData.entryPrice) || 0
    const sl = Number(formData.stopLoss) || 0
    const tp = Number(formData.takeProfit) || 0
    const direction = formData.direction

    if (entry === 0 || sl === 0 || tp === 0) return null

    if (direction === "buy") {
      if (sl >= entry) return "Invalid price structure for BUY: Stop Loss must be below Entry"
      if (tp <= entry) return "Invalid price structure for BUY: Take Profit must be above Entry"
    } else {
      if (sl <= entry) return "Invalid price structure for SELL: Stop Loss must be above Entry"
      if (tp >= entry) return "Invalid price structure for SELL: Take Profit must be below Entry"
    }
    return null
  }, [formData.entryPrice, formData.stopLoss, formData.takeProfit, formData.direction])

  const exitPriceRequiredError = React.useMemo(() => {
    if (formData.tradeStatus === "closed" && (!formData.exitPrice || Number(formData.exitPrice) === 0)) {
      return "Exit Price is required when Trade Status is Closed"
    }
    return null
  }, [formData.tradeStatus, formData.exitPrice])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (priceStructureError) {
      setValidationError(priceStructureError)
      return
    }

    if (exitPriceRequiredError) {
      setValidationError(exitPriceRequiredError)
      return
    }

    const missing: string[] = []
    if (!formData.symbol) missing.push("Symbol")
    if (!formData.direction) missing.push("Direction")
    
    if (!isImported) {
      if (!formData.htfBias) missing.push("HTF Bias")
      if (!formData.trendAlignment) missing.push("Trend Alignment")
      if (!formData.session) missing.push("Session")
      if (!formData.entryModel) missing.push("Entry Model")
      if (!formData.entryReason) missing.push("Entry Reason")
    }

    if (missing.length > 0) {
      setValidationError("Complete required journal fields before recording trade.")
      return
    }

    const lotSize = parseFloat(formData.lotSize.toString()) || 0
    const entryPrice = parseFloat(formData.entryPrice.toString()) || 0
    const exitPrice = parseFloat(formData.exitPrice.toString()) || 0
    const stopLoss = parseFloat(formData.stopLoss.toString()) || 0
    const takeProfit = parseFloat(formData.takeProfit.toString()) || 0

    const multiplier = getPipMultiplier(formData.market, formData.symbol)
    let pipValue = getBasePipValuePerLot(formData.market)
    if (formData.market === 'forex' && entryPrice > 0) {
      pipValue = getPipValueInDollars(formData.market, formData.symbol, entryPrice)
    }

    // Use liveStats for actual metrics when exit price exists
    const profitLoss = exitPrice > 0 ? liveStats.actualPnL : 0
    const derivedResult: TradeResult = exitPrice > 0 ? liveStats.actualResult : "breakeven"
    const rrAchieved = exitPrice > 0 ? liveStats.rrActual : 0

    // Planned RR (from TP/SL)
    let riskToReward = 0
    if (stopLoss > 0 && takeProfit > 0) {
      let risk = 0
      let reward = 0
      if (formData.direction === "buy") {
        risk = entryPrice - stopLoss
        reward = takeProfit - entryPrice
      } else {
        risk = stopLoss - entryPrice
        reward = entryPrice - takeProfit
      }
      riskToReward = risk > 0 ? reward / risk : 0
    }

    // Collect all screenshots into a flat array for storage
    const allShots = [...screenshots.htf, ...screenshots.entry, ...screenshots.exit]

    const tradeData: Omit<Trade, "id"> = {
      ...formData,
      symbol: formData.symbol.trim(),
      entryPrice,
      stopLoss,
      takeProfit,
      exitPrice: exitPrice > 0 ? exitPrice : undefined,
      lotSize,
      profitLoss: exitPrice > 0 ? profitLoss : undefined,
      result: (formData.result || derivedResult) as TradeResult,
      riskToReward: riskToReward > 0 ? riskToReward : undefined,
      entryTime: new Date(formData.entryTime).toISOString(),
      exitTime: formData.exitTime ? new Date(formData.exitTime).toISOString() : undefined,
      screenshots: allShots.length > 0 ? allShots : undefined,

      confluences: setupValidationKeys.filter(k => (formData as any)[k.key]).map(k => k.label),
      emotionalState: formData.emotionalState || undefined,
      emotionTags: formData.emotionTags.length > 0 ? formData.emotionTags : undefined,
      mistakeTags: formData.mistakeTags.length > 0 ? formData.mistakeTags : undefined,
      mistakes: formData.mistakes.length > 0 ? formData.mistakes : undefined,
      entryReason: formData.entryReason || undefined,
      exitReason: formData.exitReason || undefined,
      tradeCause: formData.tradeCause || undefined,
      lessonLearned: formData.lessonLearned || undefined,
      retakeTrade: formData.retakeTrade || undefined,
      rrPlanned: formData.rrPlanned || undefined,
      rrAchieved: exitPrice > 0 ? rrAchieved : (formData.rrAchieved || undefined),
      tradeStatus: formData.tradeStatus,
    }

    if (initialTrade) {
      updateTrade(initialTrade.id, tradeData)
    } else {
      addTrade(tradeData)
    }

    onClose()
  }

  const emotionBefore = formData.emotionBefore || 0
  const emotionAfter = formData.emotionAfter || 0

  const screenshotUploader = (type: "htf" | "entry" | "exit", label: string) => (
    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-emerald-500/50 transition-colors">
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => handleScreenshotUpload(type, e)}
        className="hidden"
        id={`screenshot-${type}`}
      />
      <label htmlFor={`screenshot-${type}`} className="cursor-pointer flex flex-col items-center gap-2">
        <Upload className="w-4 h-4 text-muted-foreground" />
        <p className="text-xs font-medium">{label}</p>
      </label>
      {screenshots[type].length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {screenshots[type].map((s, i) => (
            <div key={i} className="relative group">
              <img src={s} alt="" className="w-16 h-12 object-cover rounded border border-border" />
              <button
                type="button"
                onClick={() => removeScreenshot(type, i)}
                className="absolute -top-1 -right-1 p-0.5 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold">
            {initialTrade ? "Edit Trade" : "New Trade Entry"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-background rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {isImported && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-500">Imported trade — journal review incomplete</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Journal review: {[
                      formData.htfBias, formData.trendAlignment, formData.session, formData.entryModel,
                      formData.entryReason, formData.strategy, formData.emotionBefore, formData.emotionAfter,
                      formData.notes, formData.mistakes.length > 0 || formData.mistakeTags.length > 0
                    ].filter(Boolean).length} of 10 fields completed.
                  </p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-3 pt-3 border-t border-yellow-500/10">
                Broker execution corrections are not available yet. Original MT5 data is preserved for audit.
              </p>
            </div>
          )}

          {/* SECTION 1: TRADE BASICS */}
          <div className={isImported ? "opacity-75" : ""}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-500/20 text-zinc-400 flex items-center justify-center text-[10px] font-mono">1</span>
              {isImported ? "Broker Execution Data (Read Only)" : "Trade Basics"}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Symbol</Label>
                {showCustomSymbol ? (
                  <div className="flex gap-2 mt-1">
                    <Input 
                      value={formData.symbol}
                      onChange={(e) => handleInputChange("symbol", e.target.value)}
                      placeholder="EURUSD"
                      className="flex-1"
                      required
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowCustomSymbol(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <select 
                    value={formData.symbol}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === "custom") {
                        setShowCustomSymbol(true)
                        handleInputChange("symbol", "")
                      } else {
                        handleInputChange("symbol", val)
                        for (const [market, symbols] of Object.entries(MARKET_SYMBOLS)) {
                          if (symbols.includes(val)) {
                            handleInputChange("market", market as TradeMarket)
                            break
                          }
                        }
                      }
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                    required
                  >
                    <option value="">Select Symbol...</option>
                    {Object.entries(MARKET_SYMBOLS).map(([market, symbols]) => (
                      <optgroup key={market} label={market.toUpperCase()}>
                        {symbols.map(s => <option key={s} value={s}>{s}</option>)}
                      </optgroup>
                    ))}
                    <option value="custom">Other / Custom...</option>
                  </select>
                )}
              </div>
              <div>
                <Label className="text-xs">Market</Label>
                <select 
                  value={formData.market}
                  onChange={(e) => handleInputChange("market", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="forex">Forex</option>
                  <option value="crypto">Crypto</option>
                  <option value="stocks">Stocks</option>
                  <option value="indices">Indices</option>
                  <option value="metal">Metal</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Direction</Label>
                <select 
                  value={formData.direction}
                  onChange={(e) => handleInputChange("direction", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  required
                >
                  <option value="">Select...</option>
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Risk %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.riskPercent}
                  onChange={(e) => handleInputChange("riskPercent", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Position Size</Label>
                <Input 
                  type="number"
                  step="0.0001"
                  value={formData.lotSize}
                  onChange={(e) => handleInputChange("lotSize", e.target.value)}
                  className="mt-1"
                  required
                />
                {effectiveBalance > 0 && liveStats.riskAmount > 0 && (
                  <div className="text-xs mt-1 text-muted-foreground space-y-0.5">
                    <p>Account Size: ${effectiveBalance.toLocaleString()}</p>
                    <p>Risk: ${liveStats.riskAmount.toFixed(2)} ({(liveStats.riskAmount / effectiveBalance * 100).toFixed(2)}% of account)</p>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs">Strategy</Label>
                <select
                  value={formData.strategy}
                  onChange={(e) => handleInputChange("strategy", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Select Strategy...</option>
                  {strategies.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                  {!strategies.some(s => s.name === formData.strategy) && formData.strategy && (
                    <option value={formData.strategy}>{formData.strategy}</option>
                  )}
                </select>
              </div>
              <div>
                <Label className="text-xs">Trade Status</Label>
                <select 
                  value={formData.tradeStatus}
                  onChange={(e) => handleInputChange("tradeStatus", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  required
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: PRICE LEVELS */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-500/20 text-zinc-400 flex items-center justify-center text-[10px] font-mono">2</span>
              Price Levels
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Entry Price</Label>
                <Input 
                  type="number"
                  step="0.00001"
                  value={formData.entryPrice}
                  onChange={(e) => handleInputChange("entryPrice", e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Stop Loss</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={formData.stopLoss}
                  onChange={(e) => handleInputChange("stopLoss", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Take Profit</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={formData.takeProfit}
                  onChange={(e) => handleInputChange("takeProfit", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Exit Price</Label>
                <Input 
                  type="number"
                  step="0.00001"
                  value={formData.exitPrice}
                  onChange={(e) => handleInputChange("exitPrice", e.target.value)}
                  className="mt-1"
                  placeholder={formData.tradeStatus === "closed" ? "Required when Closed" : "Optional"}
                />
                {(formData.stopLoss > 0 || formData.takeProfit > 0) && (
                  <div className="mt-1 flex gap-2">
                    {formData.stopLoss > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleInputChange("exitPrice", formData.stopLoss)}
                        className="text-xs"
                      >
                        Use SL
                      </Button>
                    )}
                    {formData.takeProfit > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleInputChange("exitPrice", formData.takeProfit)}
                        className="text-xs"
                      >
                        Use TP
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs">RR Planned</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.rrPlanned}
                  onChange={(e) => handleInputChange("rrPlanned", e.target.value)}
                  className="mt-1"
                  placeholder="e.g. 3.0"
                />
              </div>
            </div>

            {/* PLANNED METRICS (from TP) */}
            {(liveStats.riskPoints > 0 || liveStats.rewardPoints > 0 || liveStats.rrPlanned > 0 || liveStats.plannedLoss !== 0 || liveStats.plannedProfit !== 0) && (
              <div className="mt-4 p-4 bg-blue-500/5 rounded-lg border border-blue-500/20 space-y-3">
                <h4 className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Trade Plan (from TP/SL)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-2 bg-background rounded border border-border">
                    <p className="text-xs text-muted-foreground">Risk Distance</p>
                    <p className="font-mono text-sm font-medium">{liveStats.riskPoints.toFixed(2)}</p>
                  </div>
                  <div className="p-2 bg-background rounded border border-border">
                    <p className="text-xs text-muted-foreground">Reward Distance</p>
                    <p className="font-mono text-sm font-medium">{liveStats.rewardPoints.toFixed(2)}</p>
                  </div>
                  <div className="p-2 bg-background rounded border border-border">
                    <p className="text-xs text-muted-foreground">Planned RR</p>
                    <p className="font-mono text-sm font-medium text-blue-400">{liveStats.rrPlanned.toFixed(2)}R</p>
                  </div>
                  <div className="p-2 bg-background rounded border border-border">
                    <p className="text-xs text-muted-foreground">RR Planned</p>
                    <p className="font-mono text-sm font-medium">{formData.rrPlanned ? `${formData.rrPlanned}R` : "—"}</p>
                  </div>
                </div>
                {formData.rrPlanned && liveStats.rrPlanned > 0 && (
                  <div className="p-2 bg-muted/30 rounded border border-border">
                    <p className="text-xs text-muted-foreground">
                      RR Difference: <span className="font-mono font-medium">
                        {(liveStats.rrPlanned - formData.rrPlanned) > 0 ? "+" : ""}{(liveStats.rrPlanned - formData.rrPlanned).toFixed(2)}R
                      </span>
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div className="p-2 bg-background rounded border border-border">
                    <p className="text-xs text-muted-foreground">Planned Loss</p>
                    <p className="font-mono text-sm font-medium text-red-400">${liveStats.plannedLoss.toFixed(2)}</p>
                  </div>
                  <div className="p-2 bg-background rounded border border-border">
                    <p className="text-xs text-muted-foreground">Planned Gain</p>
                    <p className="font-mono text-sm font-medium text-emerald-400">+${liveStats.plannedProfit.toFixed(2)}</p>
                  </div>
                </div>
                {(liveStats.riskAmount > 0 || (effectiveBalance > 0 && liveStats.rrPlanned > 0)) && (
                  <div className="p-2 bg-muted/30 rounded border border-border text-xs text-muted-foreground">
                    Position Risk: ${liveStats.riskAmount.toFixed(2)}
                    {effectiveBalance > 0 && liveStats.riskAmount > 0 && (
                      <> ({(liveStats.riskAmount / effectiveBalance * 100).toFixed(2)}% of account)</>
                    )}
                    {effectiveBalance > 0 && liveStats.rrPlanned > 0 && liveStats.riskAmount > 0 && (
                      <> | Expected Profit: ${(liveStats.riskAmount * liveStats.rrPlanned).toFixed(2)}</>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ACTUAL METRICS (from Exit Price) */}
            {formData.tradeStatus === "closed" && liveStats.actualRewardPoints !== 0 && (
              <div className="mt-4 p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/20 space-y-3">
                <h4 className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">Actual Results (from Exit Price)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-2 bg-background rounded border border-border">
                    <p className="text-xs text-muted-foreground">Risk Distance</p>
                    <p className="font-mono text-sm font-medium">{liveStats.riskPoints.toFixed(2)}</p>
                  </div>
                  <div className="p-2 bg-background rounded border border-border">
                    <p className="text-xs text-muted-foreground">Actual Reward</p>
                    <p className="font-mono text-sm font-medium">{liveStats.actualRewardPoints.toFixed(2)}</p>
                  </div>
                  <div className="p-2 bg-background rounded border border-border">
                    <p className="text-xs text-muted-foreground">Actual RR</p>
                    <p className="font-mono text-sm font-medium text-emerald-400">{liveStats.rrActual.toFixed(2)}R</p>
                  </div>
                  <div className="p-2 bg-background rounded border border-border">
                    <p className="text-xs text-muted-foreground">Result</p>
                    <p className="font-mono text-sm font-medium capitalize">{liveStats.actualResult}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div className="p-2 bg-background rounded border border-border">
                    <p className="text-xs text-muted-foreground">Actual P&L</p>
                    <p className="font-mono text-sm font-medium {liveStats.actualPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                      {liveStats.actualPnL >= 0 ? '+' : ''}${liveStats.actualPnL.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-2 bg-background rounded border border-border">
                    <p className="text-xs text-muted-foreground">RR Achieved</p>
                    <p className="font-mono text-sm font-medium">{liveStats.rrActual !== 0 ? `${liveStats.rrActual.toFixed(2)}R` : "—"}</p>
                  </div>
                </div>
              </div>
            )}

            {formData.tradeStatus === "open" && (
              <div className="mt-4 p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
                <p className="text-xs text-amber-300">Waiting for trade closure — enter Exit Price to see Actual Results</p>
              </div>
            )}

            {priceStructureError && (
              <div className="mt-3 p-3 rounded-md bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-300">{priceStructureError}</p>
              </div>
            )}
          </div>

          {/* SECTION 3: TIMING */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-500/20 text-zinc-400 flex items-center justify-center text-[10px] font-mono">3</span>
              Timing
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Entry Time</Label>
                <Input 
                  type="datetime-local"
                  value={formData.entryTime}
                  onChange={(e) => handleInputChange("entryTime", e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Exit Time (Optional)</Label>
                <Input 
                  type="datetime-local"
                  value={formData.exitTime}
                  onChange={(e) => handleInputChange("exitTime", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: MARKET STRUCTURE */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-[10px] font-mono">4</span>
              Market Structure
            </h3>

            {trendHtfConflict && (
              <div className="mb-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-300">
                  Trend Alignment ({formData.trendAlignment}) conflicts with HTF Bias ({formData.htfBias}).
                  Trade is only valid when they match.
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-medium">HTF Bias</Label>
                <select
                  value={formData.htfBias}
                  onChange={(e) => handleInputChange("htfBias", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  required
                >
                  <option value="">Select...</option>
                  <option value="Bullish">Bullish</option>
                  <option value="Bearish">Bearish</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium">Trend Alignment</Label>
                <select
                  value={formData.trendAlignment}
                  onChange={(e) => handleInputChange("trendAlignment", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  required
                >
                  <option value="">Select...</option>
                  <option value="Bullish">Bullish</option>
                  <option value="Bearish">Bearish</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium">HTF Timeframe</Label>
                <select
                  value={formData.htfTimeframe}
                  onChange={(e) => handleInputChange("htfTimeframe", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Select...</option>
                  <option value="Daily">Daily</option>
                  <option value="4H">4H</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 5: SESSION DATA */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-[10px] font-mono">5</span>
              Session Data
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Session</Label>
                <select
                  value={formData.session}
                  onChange={(e) => handleInputChange("session", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  required
                >
                  <option value="">Select Session...</option>
                  {sessionOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Kill Zone</Label>
                <select
                  value={formData.killZone}
                  onChange={(e) => handleInputChange("killZone", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Select Kill Zone...</option>
                  {killZoneOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 6: SETUP VALIDATION */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-mono">6</span>
              Setup Validation
            </h3>
            <p className="text-xs text-muted-foreground mb-3">{setupScore} / {setupTotal} conditions met</p>
            <div className="flex flex-wrap gap-2">
              {setupValidationKeys.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggleCheckbox(opt.key)}
                  className={`px-3 py-1.5 rounded-md text-xs border transition-all ${(formData as any)[opt.key]
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                    : "bg-background border-border hover:border-emerald-500/50"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 7: ENTRY MODEL */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-500 flex items-center justify-center text-[10px] font-mono">7</span>
              Entry Model
            </h3>
            <div>
              <Label className="text-xs">Primary Entry Model</Label>
              <select
                value={formData.entryModel}
                onChange={(e) => handleInputChange("entryModel", e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                required
              >
                <option value="">Select Entry Model...</option>
                {entryModelOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 8: JOURNAL REASONING */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center text-[10px] font-mono">8</span>
              Journal Reasoning
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Why did you enter? <span className="text-red-400">*</span></Label>
                <textarea
                  value={formData.entryReason}
                  onChange={(e) => handleInputChange("entryReason", e.target.value)}
                  placeholder="Technical reason for entry..."
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:ring-1 focus:ring-rose-500"
                  rows={2}
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Why did you exit?</Label>
                <textarea
                  value={formData.exitReason}
                  onChange={(e) => handleInputChange("exitReason", e.target.value)}
                  placeholder="Reason for exit..."
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:ring-1 focus:ring-rose-500"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">What caused the move?</Label>
                <textarea
                  value={formData.tradeCause}
                  onChange={(e) => handleInputChange("tradeCause", e.target.value)}
                  placeholder="e.g. News, Liquidity grab, FVG fill..."
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:ring-1 focus:ring-rose-500"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">Lesson learned</Label>
                <textarea
                  value={formData.lessonLearned}
                  onChange={(e) => handleInputChange("lessonLearned", e.target.value)}
                  placeholder="What will you do differently?"
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:ring-1 focus:ring-rose-500"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">Would take again?</Label>
                <div className="flex gap-4 mt-1">
                  {["Yes", "No"].map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="retakeTrade"
                        value={opt}
                        checked={formData.retakeTrade === opt}
                        onChange={(e) => handleInputChange("retakeTrade", e.target.value)}
                        className="text-rose-500 focus:ring-rose-500"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 9: EMOTIONAL TRACKING */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center text-[10px] font-mono">9</span>
              Emotional Tracking
            </h3>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <Label className="text-xs">Before Trade Emotion</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={emotionBefore}
                    onChange={(e) => handleInputChange("emotionBefore", parseInt(e.target.value))}
                    className="flex-1 accent-pink-500"
                  />
                  <span className="text-sm font-mono w-6 text-center">{emotionBefore}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Calm (1)</span>
                  <span>Extreme (10)</span>
                </div>
              </div>
              <div>
                <Label className="text-xs">After Trade Emotion</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={emotionAfter}
                    onChange={(e) => handleInputChange("emotionAfter", parseInt(e.target.value))}
                    className="flex-1 accent-pink-500"
                  />
                  <span className="text-sm font-mono w-6 text-center">{emotionAfter}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Calm (1)</span>
                  <span>Extreme (10)</span>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Emotion Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {emotionCheckboxOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleSelection("emotionTags", opt)}
                    className={`px-3 py-1.5 rounded-md text-xs border transition-all ${formData.emotionTags.includes(opt)
                      ? "bg-pink-500/20 border-pink-500/50 text-pink-400"
                      : "bg-background border-border hover:border-pink-500/50"
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

           {/* SECTION 10: PERFORMANCE REVIEW */}
           <div className="bg-muted/30 rounded-lg p-4 border border-border">
             <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
               <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-[10px] font-mono">10</span>
               Performance Review
             </h3>
             <div className="space-y-4">
               <div>
                 <Label className="text-xs">Mistake Tags</Label>
                 <div className="flex flex-wrap gap-2 mt-2">
                   {mistakeTagOptions.map((opt) => (
                     <button
                       key={opt}
                       type="button"
                       onClick={() => toggleSelection("mistakeTags", opt)}
                       className={`px-3 py-1.5 rounded-md text-xs border transition-all ${formData.mistakeTags.includes(opt)
                         ? "bg-red-500/20 border-red-500/50 text-red-400"
                         : "bg-background border-border hover:border-red-500/50"
                         }`}
                     >
                       {opt}
                     </button>
                   ))}
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-4">
                 <div>
                   <Label className="text-xs">RR Planned</Label>
                   <Input
                     type="number"
                     step="0.1"
                     value={formData.rrPlanned}
                     onChange={(e) => handleInputChange("rrPlanned", e.target.value)}
                     className="mt-1"
                     placeholder="3.0"
                   />
                 </div>
               </div>
             </div>
           </div>

           {/* SECTION 11: SCREENSHOTS */}
           <div>
             <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
               <span className="w-5 h-5 rounded-full bg-zinc-500/20 text-zinc-400 flex items-center justify-center text-[10px] font-mono">11</span>
               Screenshots
             </h3>
             <div className="grid grid-cols-3 gap-3">
               {screenshotUploader("htf", "HTF Screenshot")}
               {screenshotUploader("entry", "Entry Screenshot")}
               {screenshotUploader("exit", "Exit Screenshot")}
             </div>
             {formData.tradeStatus === "closed" && (
               <p className="mt-2 text-xs text-muted-foreground">
                 {(() => {
                   let count = 0
                   if (screenshots.htf.length > 0) count++
                   if (screenshots.entry.length > 0) count++
                   if (screenshots.exit.length > 0) count++
                   return `${count} / 3 screenshots uploaded`
                 })()}
               </p>
             )}
           </div>

          {/* SECTION 12: ADDITIONAL NOTES */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-500/20 text-zinc-400 flex items-center justify-center text-[10px] font-mono">12</span>
              Additional Notes
            </h3>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Any additional thoughts, observations, or context..."
              className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:ring-1 focus:ring-emerald-500"
              rows={3}
            />
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300">{validationError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Saving..." : (initialTrade ? "Update Trade" : "Record Trade")}
            </Button>
          </div>

          {/* Trade Summary Card */}
          {(liveStats.riskPoints > 0 || liveStats.actualPnL !== 0 || liveStats.plannedProfit !== 0 || liveStats.plannedLoss !== 0) && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Trade Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{formData.tradeStatus}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Result</p>
                  <p className="font-medium">
                    {liveStats.actualResult && liveStats.actualResult !== "breakeven"
                      ? (liveStats.actualResult === "win" ? "Win" : "Loss")
                      : (liveStats.rrPlanned > 0 ? "Planned" : "—")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Actual RR</p>
                  <p className="font-mono font-medium {liveStats.rrActual > 0 ? 'text-emerald-400' : liveStats.rrActual < 0 ? 'text-red-400' : 'text-muted-foreground'}">
                    {liveStats.rrActual !== 0 ? `${liveStats.rrActual.toFixed(2)}R` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">P&L</p>
                  <p className="font-mono font-medium {liveStats.actualPnL > 0 ? 'text-emerald-400' : liveStats.actualPnL < 0 ? 'text-red-400' : liveStats.plannedProfit + liveStats.plannedLoss > 0 ? 'text-emerald-400' : 'text-red-400'}">
                    {liveStats.actualPnL !== 0
                      ? `${liveStats.actualPnL >= 0 ? '+' : ''}$${liveStats.actualPnL.toFixed(2)}`
                      : liveStats.plannedProfit + liveStats.plannedLoss !== 0
                        ? `${liveStats.plannedProfit + liveStats.plannedLoss >= 0 ? '+' : ''}$${(liveStats.plannedProfit + liveStats.plannedLoss).toFixed(2)}`
                        : "—"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground">Session</p>
                  <p className="font-medium">{formData.session || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Model</p>
                  <p className="font-medium">{formData.entryModel || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Setup Score</p>
                  <p className="font-medium">{setupScore} / {setupTotal}</p>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Live P&L preview */}
        {(Number(formData.exitPrice) > 0 || (liveStats.riskPoints > 0 && liveStats.rewardPoints > 0)) && (
          <div className="px-6 pb-6">
            <div className="bg-muted p-3 rounded-lg">
              {liveStats.actualPnL !== 0 ? (
                <>
                  <p className="text-sm font-medium">
                    Actual P&L: <span className={liveStats.actualPnL > 0 ? 'text-emerald-400' : liveStats.actualPnL < 0 ? 'text-red-400' : 'text-muted-foreground'}>
                      {liveStats.actualPnL >= 0 ? '+' : ''}${liveStats.actualPnL.toFixed(2)}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                    {liveStats.rrActual !== 0 && <span>Actual RR: {liveStats.rrActual.toFixed(2)}R</span>}
                    {liveStats.actualResult && <span className="capitalize">{liveStats.actualResult}</span>}
                    {liveStats.riskAmount > 0 && <span>Risk: ${liveStats.riskAmount.toFixed(2)}</span>}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">
                    Planned P&L: <span className={liveStats.plannedProfit + liveStats.plannedLoss > 0 ? 'text-emerald-400' : liveStats.plannedProfit + liveStats.plannedLoss < 0 ? 'text-red-400' : 'text-muted-foreground'}>
                      ${(liveStats.plannedProfit + liveStats.plannedLoss).toFixed(2)}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                    {liveStats.rrPlanned > 0 && <span>Planned RR: {liveStats.rrPlanned.toFixed(2)}R</span>}
                    {liveStats.riskAmount > 0 && <span>Risk: ${liveStats.riskAmount.toFixed(2)}</span>}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
