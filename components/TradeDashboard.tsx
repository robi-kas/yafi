"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { useDashboard, Trade } from "@/context/dashboard-context"
import { RefreshCw, Download, ArrowRight, WifiOff, Zap, CheckCircle2 } from "lucide-react"

interface MT5Trade {
    ticket: number
    time: string
    type: number // 0 = buy, 1 = sell
    magic: number
    identifier: number
    reason: number
    volume: number
    price: number
    sl: number
    tp: number
    commission: number
    swap: number
    profit: number
    symbol: string
    comment: string
}

// Removed Electron API definition


export function TradeDashboard() {
    const { addTrade, trades } = useDashboard()
    const [mt5Trades, setMt5Trades] = useState<MT5Trade[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null) // null = not checked yet

    const fetchTrades = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await fetch('/api/mt5')
            const result = await response.json()

            // Handle graceful "unavailable" state from the bridge
            if (result.available === false) {
                setIsAvailable(false)
                setMt5Trades([])
                return
            }

            if (!response.ok) {
                throw new Error(result.error || "Failed to fetch trades")
            }

            setIsAvailable(true)
            setMt5Trades(result.data || [])
        } catch (err: any) {
            console.error(err)
            setError(err.message || "Failed to fetch trades")
            setIsAvailable(false)
        } finally {
            setIsLoading(false)
        }
    }

    const importTrade = async (mt5Trade: MT5Trade) => {
        // Map MT5 trade to App Trade
        const direction = mt5Trade.type === 0 ? "buy" : "sell"
        const result = mt5Trade.profit > 0 ? "win" : mt5Trade.profit < 0 ? "loss" : "breakeven"

        const newTrade: Partial<Trade> = {
            symbol: mt5Trade.symbol,
            market: "forex",
            direction: direction,
            entryPrice: mt5Trade.price,
            stopLoss: mt5Trade.sl,
            takeProfit: mt5Trade.tp,
            lotSize: mt5Trade.volume,
            profitLoss: mt5Trade.profit + mt5Trade.swap + mt5Trade.commission,
            result: result,
            entryTime: mt5Trade.time,
            strategy: "Exness Import",
            tags: ["imported", "exness", `ticket-${mt5Trade.ticket}`],
            notes: mt5Trade.comment
        }

        await addTrade(newTrade)
    }

    const importAll = async () => {
        setIsLoading(true);
        try {
            const existingTickets = new Set(
                trades
                    .flatMap(t => t.tags || [])
                    .filter(tag => tag.startsWith('ticket-'))
                    .map(tag => tag.replace('ticket-', ''))
            );

            const newTrades = mt5Trades.filter(mt => !existingTickets.has(String(mt.ticket)));

            if (newTrades.length === 0) {
                return;
            }

            for (const mtTrade of newTrades) {
                await importTrade(mtTrade);
            }
        } catch (err) {
            console.error("Failed to import all trades:", err);
        } finally {
            setIsLoading(false);
        }
    }

    const isImported = (ticket: number) => {
        return trades.some(t => t.tags?.includes(`ticket-${ticket}`));
    }

    return (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Exness MT5 Live Sync</h2>
                    <p className="text-sm text-muted-foreground">Sync your trade history directly from MetaTrader 5</p>
                </div>
                <div className="flex items-center gap-2">
                    {isAvailable === true && (
                        <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            LIVE
                        </span>
                    )}
                    {isAvailable === false && (
                        <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                            <WifiOff className="w-3 h-3" />
                            OFFLINE
                        </span>
                    )}
                    <Button onClick={fetchTrades} disabled={isLoading} variant="outline" size="sm" className="gap-2">
                        {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Sync
                    </Button>
                    {mt5Trades.length > 0 && (
                        <Button onClick={importAll} disabled={isLoading} size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Download className="w-4 h-4" />
                            Import All
                        </Button>
                    )}
                </div>
            </div>

            {/* Not yet connected — premium idle state */}
            {isAvailable === null && !isLoading && (
                <div className="border border-dashed border-border/50 rounded-xl p-8 text-center space-y-3">
                    <div className="w-10 h-10 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-1">
                        <Zap className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold">MT5 Not Connected</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">Click Sync to attempt a live connection to your MetaTrader 5 account.</p>
                    <Button onClick={fetchTrades} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                        <RefreshCw className="w-3.5 h-3.5" /> Connect Now
                    </Button>
                </div>
            )}

            {/* MT5 not available — show setup instructions */}
            {isAvailable === false && (
                <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <WifiOff className="w-4 h-4 text-amber-500" />
                        <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">MT5 Bridge Unavailable</p>
                    </div>
                    <p className="text-xs text-muted-foreground">The Python bridge script could not connect to MetaTrader 5. Make sure:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-none">
                        {[
                            "MetaTrader 5 is running on this PC",
                            "Python is installed (python --version)",
                            "The MT5 Python library is installed (pip install MetaTrader5)",
                            "The bridge script is at: scripts/mt5_bridge.py",
                        ].map((step, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <CheckCircle2 className="w-3 h-3 text-amber-500/50 mt-0.5 shrink-0" />
                                {step}
                            </li>
                        ))}
                    </ul>
                    <p className="text-[10px] text-muted-foreground/60 font-mono">Alternatively, use the <a href="/import" className="text-emerald-500 underline">Import Hub</a> to upload your report directly.</p>
                </div>
            )}

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm">
                    {error}
                </div>
            )}

            <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr className="border-b border-border text-left">
                            <th className="p-3 font-medium text-muted-foreground">Ticket</th>
                            <th className="p-3 font-medium text-muted-foreground">Time</th>
                            <th className="p-3 font-medium text-muted-foreground">Symbol</th>
                            <th className="p-3 font-medium text-muted-foreground">Type</th>
                            <th className="p-3 font-medium text-muted-foreground">Lot Size</th>
                            <th className="p-3 font-medium text-muted-foreground">Price</th>
                            <th className="p-3 font-medium text-muted-foreground">Profit</th>
                            <th className="p-3 font-medium text-muted-foreground text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {mt5Trades.length > 0 ? (
                            mt5Trades.map((trade) => {
                                const imported = isImported(trade.ticket);
                                return (
                                    <tr key={trade.ticket} className={`hover:bg-muted/50 transition-colors ${imported ? "bg-muted/30 opacity-70" : ""}`}>
                                        <td className="p-3 font-mono">{trade.ticket}</td>
                                        <td className="p-3 text-muted-foreground">{new Date(trade.time).toLocaleString()}</td>
                                        <td className="p-3 font-semibold">{trade.symbol}</td>
                                        <td className="p-3 uppercase text-xs font-bold">
                                            {trade.type === 0 ? <span className="text-emerald-500">Buy</span> :
                                                trade.type === 1 ? <span className="text-red-500">Sell</span> :
                                                    <span className="text-muted-foreground">Balance</span>}
                                        </td>
                                        <td className="p-3 font-mono">{trade.volume}</td>
                                        <td className="p-3 font-mono">{trade.price}</td>
                                        <td className={`p-3 font-mono font-bold ${trade.profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                            {trade.profit.toFixed(2)}
                                        </td>
                                        <td className="p-3 text-right">
                                            {imported ? (
                                                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">Imported</span>
                                            ) : (
                                                <Button variant="ghost" size="sm" onClick={() => importTrade(trade)} className="h-8 gap-1 hover:text-emerald-500">
                                                    Import <ArrowRight className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                    {isLoading ? "Fetching trades from MT5..." : "No trades fetched yet. Click Sync to start."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
