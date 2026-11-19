"use client"

import * as React from "react"
import { useDashboard, Trade } from "@/context/dashboard-context"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns"
import { AnimatePresence } from "framer-motion"
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, Target, BookOpen } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { getWinLossCounts, calculateWinRate, calcResult } from "@/lib/trading-metrics"
import { TradeEntryForm } from "./trade-entry-form"
import { TradeHeatmap } from "./trade-heatmap"
import { ImageViewer } from "@/components/ui/image-viewer"
import {
    Page,
    PageHeader,
    Panel,
    PanelHeader,
    PanelBody,
    StatCard,
    EmptyState,
    ResultBadge,
    DirectionBadge,
    formatMoney,
    pnlTone,
} from "@/components/kit"

export function TradeCalendar() {
    const { trades } = useDashboard()
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date())
    const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())
    const [showEntryForm, setShowEntryForm] = React.useState(false)
    const [prefillEntryTime, setPrefillEntryTime] = React.useState<string | undefined>()
    const [viewerImage, setViewerImage] = React.useState<string | null>(null)

    // Group trades by day
    const dailyStats = React.useMemo(() => {
        const stats: Record<string, { trades: Trade[]; netPL: number; result: "win" | "loss" | "breakeven" }> = {}

        trades.forEach((trade) => {
            // Realised P&L belongs to the day the trade closed.
            const dateKey = format(parseISO(trade.exitTime || trade.entryTime), "yyyy-MM-dd")
            if (!stats[dateKey]) {
                stats[dateKey] = { trades: [], netPL: 0, result: "breakeven" }
            }
            stats[dateKey].trades.push(trade)
            stats[dateKey].netPL += trade.profitLoss || 0
        })

        Object.keys(stats).forEach((date) => {
            if (stats[date].netPL > 0.01) stats[date].result = "win"
            else if (stats[date].netPL < -0.01) stats[date].result = "loss"
            else stats[date].result = "breakeven"
        })

        return stats
    }, [trades])

    // Monthly stats
    const monthlyStats = React.useMemo(() => {
        const start = startOfMonth(currentMonth)
        const end = endOfMonth(currentMonth)

        const monthTrades = trades.filter((t) => isWithinInterval(parseISO(t.exitTime || t.entryTime), { start, end }))

        const totalPL = monthTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0)
        const { wins, losses } = getWinLossCounts(monthTrades)
        const winRate = calculateWinRate(wins, losses)
        const tradingDays = new Set(monthTrades.map((t) => format(parseISO(t.exitTime || t.entryTime), "yyyy-MM-dd")))
        let greenDays = 0
        tradingDays.forEach((d) => {
            if ((dailyStats[d]?.netPL || 0) > 0.01) greenDays++
        })

        return {
            totalTrades: monthTrades.length,
            totalPL,
            winRate,
            wins,
            losses,
            tradingDays: tradingDays.size,
            greenDays,
        }
    }, [trades, currentMonth, dailyStats])

    // Trades for selected day
    const selectedDayTrades = React.useMemo(() => {
        if (!selectedDate) return []
        const dateKey = format(selectedDate, "yyyy-MM-dd")
        return dailyStats[dateKey]?.trades || []
    }, [selectedDate, dailyStats])
    const selectedDayPL = selectedDayTrades.reduce((s, t) => s + (t.profitLoss || 0), 0)

    // Open the form with a pre-filled entry time
    const handleAddTradeForDate = (date: Date) => {
        // Local ISO-like string for datetime-local input
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        const hours = String(new Date().getHours()).padStart(2, "0")
        const minutes = String(new Date().getMinutes()).padStart(2, "0")
        setPrefillEntryTime(`${year}-${month}-${day}T${hours}:${minutes}`)
        setShowEntryForm(true)
    }

    const shiftMonth = (delta: number) => {
        const next = new Date(currentMonth)
        next.setDate(1)
        next.setMonth(next.getMonth() + delta)
        setCurrentMonth(next)
    }

    return (
        <Page>
            <PageHeader
                title="Calendar"
                description="Your daily P&L at a glance"
                actions={
                    <Button size="sm" onClick={() => handleAddTradeForDate(selectedDate || new Date())}>
                        <Plus /> Log trade
                    </Button>
                }
            />

            {/* Month KPIs */}
            <div className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:gap-4 xl:grid-cols-4">
                <StatCard
                    label={`${format(currentMonth, "MMMM")} P&L`}
                    value={formatMoney(monthlyStats.totalPL, { sign: true })}
                    tone={pnlTone(monthlyStats.totalPL)}
                    icon={TrendingUp}
                    sub={`${monthlyStats.totalTrades} trades`}
                />
                <StatCard
                    label="Win rate"
                    value={`${monthlyStats.winRate}%`}
                    icon={Target}
                    sub={`${monthlyStats.wins} wins · ${monthlyStats.losses} losses`}
                />
                <StatCard
                    label="Trading days"
                    value={String(monthlyStats.tradingDays)}
                    icon={CalendarIcon}
                    sub={`${monthlyStats.greenDays} green · ${monthlyStats.tradingDays - monthlyStats.greenDays} red/flat`}
                />
                <StatCard
                    label="Avg per trading day"
                    value={formatMoney(monthlyStats.tradingDays ? monthlyStats.totalPL / monthlyStats.tradingDays : 0, { sign: true })}
                    tone={pnlTone(monthlyStats.totalPL)}
                    icon={BookOpen}
                    sub="Net P&L ÷ days traded"
                />
            </div>

            {/* Month grid */}
            <Panel className="mb-4 overflow-hidden md:mb-6">
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                    <h2 className="text-base font-semibold tracking-tight">{format(currentMonth, "MMMM yyyy")}</h2>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon-sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                            <ChevronLeft />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setCurrentMonth(new Date())
                                setSelectedDate(new Date())
                            }}
                        >
                            Today
                        </Button>
                        <Button variant="outline" size="icon-sm" onClick={() => shiftMonth(1)} aria-label="Next month">
                            <ChevronRight />
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        className="w-full p-0 md:min-w-[640px]"
                        classNames={{
                            root: "w-full",
                            months: "w-full",
                            month: "w-full",
                            nav: "hidden",
                            month_caption: "hidden",
                            caption_label: "hidden",
                            month_grid: "w-full border-collapse",
                            weekdays: "grid grid-cols-7 border-b border-border bg-secondary/40",
                            weekday: "py-2 text-center text-[11px] font-medium text-muted-foreground md:text-xs",
                            week: "grid grid-cols-7 border-b border-border last:border-b-0",
                            day: "relative min-h-[58px] w-full min-w-0 border-r border-border p-0 last:border-r-0 focus-within:z-20 md:min-h-[96px]",
                            today: "bg-transparent",
                            selected: "bg-transparent",
                            outside: "",
                        }}
                        components={{
                            DayButton: ({ day, modifiers: dayModifiers }) => {
                                const dateKey = format(day.date, "yyyy-MM-dd")
                                const stats = dailyStats[dateKey]
                                const isSelected = selectedDate && isSameDay(day.date, selectedDate)
                                const isOutside = dayModifiers.outside
                                const isToday = isSameDay(day.date, new Date())

                                return (
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedDate(day.date)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault()
                                                setSelectedDate(day.date)
                                            }
                                        }}
                                        className={cn(
                                            "group relative flex h-full min-h-[58px] w-full min-w-0 cursor-pointer flex-col p-1 text-left transition-colors hover:bg-accent/50 md:min-h-[96px] md:p-2",
                                            stats?.result === "win" && "bg-profit/10 hover:bg-profit/15",
                                            stats?.result === "loss" && "bg-loss/10 hover:bg-loss/15",
                                            isSelected && "ring-2 ring-inset ring-foreground/20",
                                            isOutside && "opacity-40"
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <span
                                                className={cn(
                                                    "flex h-5 min-w-5 items-center justify-center rounded-md px-0.5 text-[11px] font-medium tabular md:h-6 md:min-w-6 md:px-1 md:text-xs",
                                                    isToday ? "bg-brand-soft text-brand ring-1 ring-brand" : "text-muted-foreground group-hover:text-foreground"
                                                )}
                                            >
                                                <span className="md:hidden">{day.date.getDate()}</span>
                                                <span className="hidden md:inline">{day.date.getDate() === 1 ? format(day.date, "MMM d") : day.date.getDate()}</span>
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleAddTradeForDate(day.date)
                                                }}
                                                className="hidden rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus:opacity-100 group-hover:opacity-100 md:block"
                                                aria-label={`Log trade on ${format(day.date, "MMM d")}`}
                                                title="Log trade"
                                            >
                                                <Plus className="size-3.5" />
                                            </button>
                                        </div>

                                        {stats && (
                                            <div className="mt-auto pt-1 md:pt-2">
                                                {/* Phone: compact whole dollars (e.g. +$219) so 7 days fit */}
                                                <div
                                                    className={cn(
                                                        "truncate font-mono text-[10px] font-semibold tabular md:hidden",
                                                        stats.netPL > 0.01 ? "text-profit" : stats.netPL < -0.01 ? "text-loss" : "text-muted-foreground"
                                                    )}
                                                >
                                                    {stats.netPL > 0.01 ? "+" : stats.netPL < -0.01 ? "-" : ""}${Math.abs(stats.netPL) >= 1000 ? `${(Math.abs(stats.netPL) / 1000).toFixed(1)}k` : Math.round(Math.abs(stats.netPL))}
                                                </div>
                                                <div
                                                    className={cn(
                                                        "hidden font-mono text-sm font-semibold tabular md:block",
                                                        stats.netPL > 0.01 ? "text-profit" : stats.netPL < -0.01 ? "text-loss" : "text-muted-foreground"
                                                    )}
                                                >
                                                    {formatMoney(stats.netPL, { sign: true })}
                                                </div>
                                                <div className="hidden text-xs text-muted-foreground md:block">
                                                    {stats.trades.length} {stats.trades.length === 1 ? "trade" : "trades"}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            },
                        }}
                    />
                </div>
            </Panel>

            {/* Selected day */}
            <Panel className="mb-4 md:mb-6">
                <PanelHeader
                    title={selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a day"}
                    description={
                        selectedDayTrades.length
                            ? `${selectedDayTrades.length} ${selectedDayTrades.length === 1 ? "trade" : "trades"} · ${formatMoney(selectedDayPL, { sign: true })}`
                            : "No trades on this day"
                    }
                    icon={CalendarIcon}
                    actions={
                        selectedDate && (
                            <Button variant="ghost" size="sm" onClick={() => handleAddTradeForDate(selectedDate)}>
                                <Plus /> Add trade
                            </Button>
                        )
                    }
                />
                <PanelBody>
                    {selectedDayTrades.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {selectedDayTrades.map((trade) => (
                                <div key={trade.id} className="rounded-lg border border-border bg-background/40 p-4 transition-colors hover:border-foreground/20">
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="truncate text-sm font-semibold">{trade.symbol}</span>
                                            <DirectionBadge direction={trade.direction} />
                                            <ResultBadge result={trade.tradeStatus === "open" ? "" : calcResult(trade)} />
                                        </div>
                                        <span
                                            className={cn(
                                                "font-mono text-sm font-semibold tabular",
                                                (trade.profitLoss || 0) > 0 ? "text-profit" : (trade.profitLoss || 0) < 0 ? "text-loss" : "text-muted-foreground"
                                            )}
                                        >
                                            {formatMoney(trade.profitLoss, { sign: true })}
                                        </span>
                                    </div>

                                    <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
                                        <dt className="text-muted-foreground">Time</dt>
                                        <dd className="text-right font-mono tabular">{format(parseISO(trade.entryTime), "HH:mm")}</dd>
                                        <dt className="text-muted-foreground">Lot size</dt>
                                        <dd className="text-right font-mono tabular">{trade.lotSize}</dd>
                                        <dt className="text-muted-foreground">Strategy</dt>
                                        <dd className="truncate text-right">{trade.strategy || "—"}</dd>
                                    </dl>

                                    {trade.screenshots && trade.screenshots.length > 0 && (
                                        <button
                                            className="mt-3 block w-full overflow-hidden rounded-md border border-border"
                                            onClick={() => setViewerImage(trade.screenshots![0])}
                                        >
                                            <img
                                                src={trade.screenshots[0]}
                                                alt={`${trade.symbol} screenshot`}
                                                className="aspect-video w-full object-cover transition-transform hover:scale-105"
                                            />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={CalendarIcon}
                            title="No trades recorded for this date"
                            description="Pick another day or log a trade for this one."
                            action={
                                selectedDate && (
                                    <Button size="sm" variant="outline" onClick={() => handleAddTradeForDate(selectedDate)}>
                                        <Plus /> Add trade
                                    </Button>
                                )
                            }
                        />
                    )}
                </PanelBody>
            </Panel>

            {/* Year heatmap */}
            <TradeHeatmap />

            {viewerImage && <ImageViewer src={viewerImage} onClose={() => setViewerImage(null)} />}

            <AnimatePresence>
                {showEntryForm && (
                    <TradeEntryForm
                        onClose={() => {
                            setShowEntryForm(false)
                            setPrefillEntryTime(undefined)
                        }}
                        defaultEntryTime={prefillEntryTime}
                    />
                )}
            </AnimatePresence>
        </Page>
    )
}
