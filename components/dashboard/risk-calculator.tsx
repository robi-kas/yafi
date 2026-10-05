"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
    Calculator,
    Percent,
    DollarSign,
    Target,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Info,
    ShieldCheck,
    Zap,
    ArrowRightLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { useDashboard } from "@/context/dashboard-context"
import { cn } from "@/lib/utils"

interface RiskCalculatorProps {
    initialBalance?: number
}

type AssetType = "forex" | "gold" | "indices" | "crypto"
type RiskMode = "percent" | "fixed"

const ASSET_CONFIGS: Record<AssetType, {
    name: string,
    multiplier: number,
    pipDecimal: number,
    label: string,
    unit: string
}> = {
    forex: { name: "Forex", multiplier: 10, pipDecimal: 4, label: "Pips", unit: "Lots" },
    gold: { name: "Gold", multiplier: 100, pipDecimal: 2, label: "Ticks", unit: "Lots" },
    indices: { name: "Indices", multiplier: 1, pipDecimal: 2, label: "Points", unit: "Lots" },
    crypto: { name: "Crypto", multiplier: 1, pipDecimal: 2, label: "Price", unit: "Units" }
}

export function PositionSizeCalculator({ initialBalance: propBalance }: RiskCalculatorProps) {
    const { accounts, selectedAccountId } = useDashboard()

    const activeAccount = accounts.find(a => a.id === selectedAccountId)
  const activeBalance = activeAccount?.balance
  const hasValidActiveBalance = Number.isFinite(activeBalance) && activeBalance !== undefined && activeBalance > 0
  const hasSelectedAccount = selectedAccountId !== null && selectedAccountId !== undefined
  // Avoid using a $10,000 fallback when the user has selected an account:
  // otherwise "1% risk" can temporarily show as "$100" even if balance is ~$10.
  const defaultBalance = hasValidActiveBalance
    ? (activeBalance as number)
    : (hasSelectedAccount ? 0 : (typeof propBalance === "number" ? propBalance : 10000))

    // State
    const [balance, setBalance] = useState(defaultBalance)
    const [riskMode, setRiskMode] = useState<RiskMode>("percent")
    const [riskValue, setRiskValue] = useState(1)
    const [assetType, setAssetType] = useState<AssetType>("forex")

    // Price vs Pips toggle
    const [usePrice, setUsePrice] = useState(false)
    const [entryPrice, setEntryPrice] = useState("")
    const [stopLossPrice, setStopLossPrice] = useState("")
    const [takeProfitPrice, setTakeProfitPrice] = useState("")
    const [manualPips, setManualPips] = useState(10)

    // Sync balance with selected account
    useEffect(() => {
        if (Number.isFinite(activeAccount?.balance) && activeAccount?.balance !== undefined && (activeAccount.balance as number) > 0) {
            setBalance(activeAccount.balance)
        } else {
            setBalance(0)
        }
    }, [activeAccount])

  // If no account is selected, sync using the `initialBalance` prop.
  useEffect(() => {
    if (hasSelectedAccount) return
    if (typeof propBalance === "number" && Number.isFinite(propBalance) && propBalance > 0) {
      setBalance(propBalance)
    } else {
      setBalance(0)
    }
  }, [propBalance, hasSelectedAccount])

    const calc = useMemo(() => {
        const config = ASSET_CONFIGS[assetType]

        // 1. Risk Amount
        const cashRisk = riskMode === "percent"
            ? (balance * riskValue) / 100
            : riskValue

        // 2. SL Distance
        let slDistance = manualPips
        let tpDistance = 0

        if (usePrice && entryPrice && stopLossPrice) {
            const entry = parseFloat(entryPrice)
            const sl = parseFloat(stopLossPrice)
            if (!isNaN(entry) && !isNaN(sl)) {
                const diff = Math.abs(entry - sl)
                slDistance = diff / Math.pow(10, -config.pipDecimal)

                if (takeProfitPrice) {
                    const tp = parseFloat(takeProfitPrice)
                    if (!isNaN(tp)) {
                        const tpDiff = Math.abs(tp - entry)
                        tpDistance = tpDiff / Math.pow(10, -config.pipDecimal)
                    }
                }
            }
        }

        // 3. Position Size
        const lotSize = slDistance > 0 ? cashRisk / (slDistance * config.multiplier) : 0

        // 4. Reward Ratio
        const rr = tpDistance > 0 && slDistance > 0 ? tpDistance / slDistance : 0
        const potentialProfit = cashRisk * rr

        return {
            cashRisk,
            slDistance,
            tpDistance,
            lotSize,
            rr,
            potentialProfit,
            config
        }
    }, [balance, riskMode, riskValue, assetType, usePrice, entryPrice, stopLossPrice, takeProfitPrice, manualPips])

    return (
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-5 h-full flex flex-col shadow-2xl overflow-hidden group">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <Calculator className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold tracking-tight">Risk Calculator</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Precision Position Sizing</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md hover:bg-emerald-500/10 hover:text-emerald-500 text-muted-foreground dark:text-muted-foreground"
                        onClick={() => {
                            setRiskValue(1)
                            setManualPips(10)
                            setEntryPrice("")
                            setStopLossPrice("")
                            setTakeProfitPrice("")
                            setUsePrice(false)
                        }}
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                {/* Left Column: Inputs */}
                <div className="space-y-4">
                    {/* Account & Risk Mode */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px] uppercase font-mono text-muted-foreground font-bold tracking-wider">Asset Class</Label>
                                <Select value={assetType} onValueChange={(v: AssetType) => setAssetType(v)}>
                                    <SelectTrigger className="h-10 bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 font-mono text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="forex">Forex (FX)</SelectItem>
                                        <SelectItem value="gold">Gold (XAUUSD)</SelectItem>
                                        <SelectItem value="indices">Indices (US30/NAS)</SelectItem>
                                        <SelectItem value="crypto">Crypto (BTC/ETH)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px] uppercase font-mono text-muted-foreground font-bold tracking-wider">Account Balance</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-500/50" />
                                    <Input
                                        type="number"
                                        value={balance}
                                        onChange={(e) => setBalance(Number(e.target.value))}
                                        className="h-11 pl-9 bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 focus-visible:ring-emerald-500/20"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[11px] uppercase font-mono text-muted-foreground flex justify-between font-bold border-b border-border/30 pb-1 mb-2">
                                Risk Commitment
                                <span className={cn(
                                    "font-black tracking-tighter text-sm",
                                    riskMode === "percent" ? "text-emerald-600 dark:text-emerald-400" : "text-emerald-600/80 dark:text-emerald-400/80"
                                )}>
                                    ${calc.cashRisk.toFixed(2)}
                                </span>
                            </Label>
                            <div className="flex p-1 bg-background border border-border/50 rounded-xl mb-3">
                                <Button
                                    variant={riskMode === "percent" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setRiskMode("percent")}
                                    className={cn(
                                        "flex-1 h-9 text-[11px] uppercase tracking-widest font-black transition-all",
                                        riskMode === "percent" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-muted-foreground/60 hover:text-muted-foreground"
                                    )}
                                >
                                    Percent (%)
                                </Button>
                                <Button
                                    variant={riskMode === "fixed" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setRiskMode("fixed")}
                                    className={cn(
                                        "flex-1 h-9 text-[11px] uppercase tracking-widest font-black transition-all",
                                        riskMode === "fixed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-muted-foreground/60 hover:text-muted-foreground"
                                    )}
                                >
                                    Amount ($)
                                </Button>
                            </div>
                            <div className="relative mt-3">
                                {riskMode === "percent" ? (
                                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                ) : (
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                )}
                                <Input
                                    type="number"
                                    value={riskValue}
                                    onChange={(e) => setRiskValue(Number(e.target.value))}
                                    className="h-11 pl-9 bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 font-mono text-base font-bold focus:ring-2 focus:ring-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Price Logic */}
                    <div className="space-y-3 pt-2 border-t border-border/30">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] uppercase font-mono text-muted-foreground">Stop Loss Setting</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-2 text-[9px] uppercase font-mono text-emerald-500/70 hover:text-emerald-500"
                                onClick={() => setUsePrice(!usePrice)}
                            >
                                <ArrowRightLeft className="w-2.5 h-2.5 mr-1" />
                                {usePrice ? "Use Pips" : "Use Price"}
                            </Button>
                        </div>

                        {usePrice ? (
                            <div className="grid grid-cols-1 gap-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        placeholder="Entry"
                                        value={entryPrice}
                                        onChange={(e) => setEntryPrice(e.target.value)}
                                        className="h-11 bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-slate-700 dark:text-slate-300"
                                    />
                                    <Input
                                        placeholder="Stop Loss"
                                        value={stopLossPrice}
                                        onChange={(e) => setStopLossPrice(e.target.value)}
                                        className="h-11 border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/30 font-mono text-sm font-bold focus-visible:ring-red-500/30 text-red-600 dark:text-red-400 placeholder:text-red-400 dark:placeholder:text-red-900/50"
                                    />
                                </div>
                                <Input
                                    placeholder="Take Profit (Optional)"
                                    value={takeProfitPrice}
                                    onChange={(e) => setTakeProfitPrice(e.target.value)}
                                    className="h-11 border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/30 font-mono text-sm font-bold focus-visible:ring-emerald-500/30 text-emerald-600 dark:text-emerald-400 placeholder:text-emerald-400 dark:placeholder:text-emerald-900/50"
                                />
                            </div>
                        ) : (
                            <div className="relative">
                                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    placeholder={calc.config.label}
                                    value={manualPips}
                                    onChange={(e) => setManualPips(Number(e.target.value))}
                                    className="h-11 pl-10 bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 font-mono text-base font-bold text-slate-700 dark:text-slate-300"
                                />
                            </div>
                        )}
                    </div>

                    <Button
                        className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-wide uppercase text-[11px] shadow-lg shadow-emerald-500/10 group-hover:scale-[1.02] transition-transform mt-2"
                        onClick={() => {
                            // Feedback for calculation
                        }}
                    >
                        <Zap className="w-3.5 h-3.5 mr-2 fill-current" />
                        Calculate Position
                    </Button>
                </div>

                {/* Right Column: Dynamic Results */}
                <div className="flex flex-col gap-4">
                    <div className="flex-1 rounded-xl bg-background/40 border border-border/50 p-5 space-y-8 relative overflow-hidden group/card">
                        {/* Background Glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full -mr-16 -mt-16 pointer-events-none group-hover/card:bg-emerald-500/10 transition-all duration-700" />

                        <div className="space-y-2">
                            <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono font-bold">Recommended Size</span>
                            <div className="flex items-baseline gap-3">
                                <span className="text-5xl font-black font-mono tracking-tighter bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
                                    {calc.lotSize.toFixed(4)}
                                </span>
                                <span className="text-lg font-bold text-emerald-600/70 dark:text-emerald-500/70">{calc.config.unit}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="p-4 bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 rounded-xl space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
                                    <span className="text-[10px] uppercase font-bold text-red-600/90 dark:text-red-500/90 tracking-tight">Potential Loss</span>
                                </div>
                                <div className="text-2xl font-mono font-black text-red-600 dark:text-red-400 leading-none py-1 truncate">
                                    -${calc.cashRisk.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[9px] text-red-600/50 dark:text-red-500/50 font-mono font-bold">{calc.slDistance.toFixed(1)} {calc.config.label}</div>
                            </div>

                            <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-xl space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                                    <span className="text-[10px] uppercase font-bold text-emerald-600/90 dark:text-emerald-500/90 tracking-tight">Potential Profit</span>
                                </div>
                                <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 leading-none py-1 truncate">
                                    +${calc.potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[9px] text-emerald-600/50 dark:text-emerald-500/50 font-mono font-bold">
                                    {calc.tpDistance > 0 ? `${calc.tpDistance.toFixed(1)} ${calc.config.label}` : "N/A"}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-foreground/5 dark:bg-black/40 rounded-xl border border-border/50">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-background border border-border/50 rounded-md">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                </div>
                                <span className="text-[11px] uppercase font-bold tracking-tight text-muted-foreground">Reward Ratio</span>
                            </div>
                            <div className={cn(
                                "font-mono font-black text-2xl truncate ml-2",
                                calc.rr >= 3 ? "text-emerald-400" : calc.rr >= 2 ? "text-blue-400" : "text-muted-foreground"
                            )}>
                                {calc.rr > 0 ? `1:${calc.rr.toFixed(1)}` : "TBD"}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10 animate-pulse">
                        <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                        <p className="text-[9px] text-emerald-500/80 font-medium">Calculations based on standard contract sizes.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
