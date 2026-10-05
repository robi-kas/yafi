"use client"

import * as React from "react"
import { useDashboard, Trade } from "@/context/dashboard-context"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion, AnimatePresence } from "framer-motion"
import { TrendingUp, TrendingDown, Calendar as CalendarIcon, ArrowLeft, ArrowRight, Info, Plus, ChevronLeft, ChevronRight, LayoutGrid, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getWinLossCounts, calculateWinRate } from "@/lib/trading-metrics"
import { TradeEntryForm } from "./trade-entry-form"
import { TradeHeatmap } from "./trade-heatmap"
import { ImageViewer } from "@/components/ui/image-viewer"

export function TradeCalendar() {
    const { trades } = useDashboard()
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date())
    const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())
    const [showEntryForm, setShowEntryForm] = React.useState(false)
    const [prefillEntryTime, setPrefillEntryTime] = React.useState<string | undefined>()
    const [viewerImage, setViewerImage] = React.useState<string | null>(null)

    // Group trades by day
    const dailyStats = React.useMemo(() => {
        const stats: Record<string, { trades: Trade[], netPL: number, result: "win" | "loss" | "breakeven" }> = {}

        trades.forEach(trade => {
            const dateKey = format(parseISO(trade.entryTime), "yyyy-MM-dd")
            if (!stats[dateKey]) {
                stats[dateKey] = { trades: [], netPL: 0, result: "breakeven" }
            }
            stats[dateKey].trades.push(trade)
            stats[dateKey].netPL += trade.profitLoss || 0
        })

        Object.keys(stats).forEach(date => {
            if (stats[date].netPL > 0.01) stats[date].result = "win"
            else if (stats[date].netPL < -0.01) stats[date].result = "loss"
            else stats[date].result = "breakeven"
        })

        return stats
    }, [trades])

    // Calculate monthly stats
    const monthlyStats = React.useMemo(() => {
        const start = startOfMonth(currentMonth)
        const end = endOfMonth(currentMonth)

        const monthTrades = trades.filter(t => {
            const date = parseISO(t.entryTime)
            return isWithinInterval(date, { start, end })
        })

        const totalPL = monthTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0)
        const { wins, losses } = getWinLossCounts(monthTrades)
        const winRate = calculateWinRate(wins, losses)

        return {
            totalTrades: monthTrades.length,
            totalPL,
            winRate,
            wins,
            losses,
        }
    }, [trades, currentMonth])

    // Get trades for selected day
    const selectedDayTrades = React.useMemo(() => {
        if (!selectedDate) return []
        const dateKey = format(selectedDate, "yyyy-MM-dd")
        return dailyStats[dateKey]?.trades || []
    }, [selectedDate, dailyStats])

    const modifiers = {
        win: (date: Date) => dailyStats[format(date, "yyyy-MM-dd")]?.result === "win",
        loss: (date: Date) => dailyStats[format(date, "yyyy-MM-dd")]?.result === "loss",
        trade: (date: Date) => !!dailyStats[format(date, "yyyy-MM-dd")]
    }

    // Helper to open the form with a pre‑filled entry time
    const handleAddTradeForDate = (date: Date) => {
        // Create a local ISO‑like string for datetime-local input
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(new Date().getHours()).padStart(2, '0')
        const minutes = String(new Date().getMinutes()).padStart(2, '0')
        const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`
        setPrefillEntryTime(localDateTime)
        setShowEntryForm(true)
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full bg-background overflow-hidden flex flex-col"
        >
            {/* Custom Header */}
            <div className="p-3 px-6 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-foreground tracking-tight">
                        {format(currentMonth, "MMMM yyyy")}
                    </h2>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                {/* Activity Heatmap */}
                <TradeHeatmap />

                {/* Calendar Navigation & Controls */}
                <div className="flex items-center justify-between px-1">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground gap-2 h-9 border-border/50 bg-card/30 backdrop-blur-sm px-4"
                        onClick={() => { }}
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span className="text-[12px] font-bold uppercase tracking-wider">Manage Entries</span>
                    </Button>

                    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/50 backdrop-blur-sm">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-all"
                            onClick={() => {
                                const prev = new Date(currentMonth)
                                prev.setMonth(prev.getMonth() - 1)
                                setCurrentMonth(prev)
                            }}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-background px-3 rounded-lg transition-all"
                            onClick={() => setCurrentMonth(new Date())}
                        >
                            Today
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-all"
                            onClick={() => {
                                const next = new Date(currentMonth)
                                next.setMonth(next.getMonth() + 1)
                                setCurrentMonth(next)
                            }}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="border border-border rounded-xl overflow-hidden bg-muted/5 flex flex-col">
                    <TooltipProvider>
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            className="w-full p-0 flex-1 flex flex-col"
                            classNames={{
                                root: "w-full flex-1 flex flex-col",
                                months: "w-full flex-1 flex flex-col",
                                month: "w-full flex-1 flex flex-col",
                                caption: "hidden",
                                month_caption: "hidden",
                                caption_label: "hidden",
                                table: "w-full border-collapse flex-1 flex flex-col",
                                head_cell: "text-muted-foreground font-semibold text-[10px] py-1.5 text-center uppercase tracking-widest",
                                row: "grid grid-cols-7 border-b border-border last:border-0 w-full flex-1",
                                day: "min-h-[100px] w-full p-0 relative border-r border-border last:border-r-0 focus-within:z-20",
                                today: "bg-transparent",
                                selected: "bg-transparent", // Remove default bright highlight
                                day_outside: "opacity-20",
                            }}
                            components={{
                                DayButton: ({ day, modifiers: dayModifiers, ...props }) => {
                                    const { onAnimationStart, onDragStart, onDragEnd, onDrag, ...safeProps } = props as any;
                                    const dateKey = format(day.date, "yyyy-MM-dd")
                                    const stats = dailyStats[dateKey]
                                    const isSelected = selectedDate && isSameDay(day.date, selectedDate)
                                    const isOutside = dayModifiers.outside

                                    return (
                                        <div
                                            onClick={() => setSelectedDate(day.date)}
                                            className={cn(
                                                "group relative w-full h-full p-2 transition-colors hover:bg-accent/50 cursor-pointer",
                                                isSelected && "bg-accent/30",
                                                isOutside && "bg-muted/20"
                                            )}
                                        >
                                            {/* Date Number (Top Right) */}
                                            <div className="absolute top-2.5 right-3">
                                                <span className={cn(
                                                    "text-[12px] font-bold px-1.5 py-0.5 rounded-md transition-colors",
                                                    isSameDay(day.date, new Date())
                                                        ? "text-primary bg-primary/20 ring-1 ring-primary/30"
                                                        : "text-foreground/40 group-hover:text-foreground"
                                                )}>
                                                    {day.date.getDate() === 1 ? format(day.date, "MMM d") : day.date.getDate()}
                                                </span>
                                            </div>

                                            {/* Plus Button (Top Left on Hover) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddTradeForDate(day.date);
                                                }}
                                                className="absolute top-2.5 left-2.5 p-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Trade Summary Card (Single Aggregate) */}
                                            <div className="mt-6 px-1 pb-2">
                                                {stats && (
                                                    <div className={cn(
                                                        "bg-card border rounded-md p-1.5 shadow-sm flex flex-col gap-0.5 transition-all",
                                                        stats.result === "win" ? "border-[#10b981]/30 bg-[#10b981]/5" :
                                                            stats.result === "loss" ? "border-red-500/30 bg-red-500/5" :
                                                                "border-border bg-muted/30"
                                                    )}>
                                                        <div className="flex items-center justify-between">
                                                            <span className={cn(
                                                                "text-sm font-black",
                                                                stats.netPL > 0 ? "text-[#10b981]" : stats.netPL < 0 ? "text-red-500" : "text-muted-foreground"
                                                            )}>
                                                                {stats.netPL >= 0 ? "+" : "-"}${Math.abs(stats.netPL).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tight">
                                                                {stats.trades.length} {stats.trades.length === 1 ? "TRADE" : "TRADES"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                }
                            }}
                        />
                    </TooltipProvider>
                </div>

                {/* Daily Details Section */}
                <div className="border-t border-border bg-muted/10 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">
                                {selectedDate ? format(selectedDate, "EEEE, MMMM do") : "Select a day"}
                            </h3>
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-bold tracking-tight">
                                Daily Activity
                            </span>
                        </div>
                        <div className="text-[11px] text-white/40">
                            {selectedDayTrades.length} {selectedDayTrades.length === 1 ? "Trade" : "Trades"} recorded
                        </div>
                    </div>

                    <div className="space-y-3">
                        {selectedDayTrades.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {selectedDayTrades.map((trade) => (
                                    <div
                                        key={trade.id}
                                        className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    trade.result === "win" ? "bg-[#10b981]" : "bg-red-500"
                                                )} />
                                                <span className="text-sm font-bold text-foreground/90 uppercase">{trade.symbol}</span>
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-mono font-bold px-2 py-0.5 rounded",
                                                (trade.profitLoss || 0) >= 0 ? "text-[#10b981] bg-[#10b981]/10" : "text-red-400 bg-red-400/10"
                                            )}>
                                                {(trade.profitLoss || 0) >= 0 ? "+" : ""}${trade.profitLoss?.toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                                            <div className="text-muted-foreground">Direction</div>
                                            <div className={cn(
                                                "text-right font-medium uppercase",
                                                trade.direction === "buy" ? "text-[#10b981]" : "text-red-400"
                                            )}>{trade.direction === "buy" ? "Long" : "Short"}</div>

                                            <div className="text-muted-foreground">Lot Size</div>
                                            <div className="text-right text-foreground/80">{trade.lotSize}</div>

                                            <div className="text-muted-foreground">Strategy</div>
                                            <div className="text-right text-foreground/80 italic">{trade.strategy || "No strategy"}</div>
                                        </div>

                                        {trade.screenshots && trade.screenshots.length > 0 && (
                                            <div
                                                className="mt-4 rounded-lg overflow-hidden border border-white/5 cursor-pointer"
                                                onClick={() => setViewerImage(trade.screenshots![0])}
                                            >
                                                <img
                                                    src={trade.screenshots[0]}
                                                    alt="Full view"
                                                    className="w-full aspect-video object-cover hover:scale-105 transition-transform"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white/[0.02] rounded-xl border border-dashed border-white/5">
                                <p className="text-sm text-white/20 italic">No trades recorded for this date</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 text-white/40 hover:text-white"
                                    onClick={() => selectedDate && handleAddTradeForDate(selectedDate)}
                                >
                                    + Add Trade
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Image Viewer */}
            {viewerImage && (
                <ImageViewer src={viewerImage} onClose={() => setViewerImage(null)} />
            )}

            {/* Entry Form Modal */}
            <AnimatePresence>
                {showEntryForm && (
                    <TradeEntryForm
                        onClose={() => {
                            setShowEntryForm(false)
                            setPrefillEntryTime(undefined)
                        }}
                        defaultEntryTime={prefillEntryTime} // new prop
                    />
                )}
            </AnimatePresence>
        </motion.div>
    )
}