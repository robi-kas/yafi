"use client"

import React, { useMemo } from "react"
import { useDashboard, Trade } from "@/context/dashboard-context"
import { format, subYears, eachDayOfInterval, startOfDay, isSameDay, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function TradeHeatmap() {
    const { trades } = useDashboard()
    const [viewYear, setViewYear] = React.useState(new Date().getFullYear())

    const heatmapData = useMemo(() => {
        const start = startOfDay(new Date(viewYear, 0, 1))
        const end = startOfDay(new Date(viewYear, 11, 31))
        const days = eachDayOfInterval({ start, end })

        // Aggregate trades by day
        const tradeMap: Record<string, { count: number, netPL: number }> = {}
        trades.forEach(trade => {
            const dateKey = format(parseISO(trade.entryTime), "yyyy-MM-dd")
            if (!tradeMap[dateKey]) {
                tradeMap[dateKey] = { count: 0, netPL: 0 }
            }
            tradeMap[dateKey].count += 1
            tradeMap[dateKey].netPL += trade.profitLoss || 0
        })

        return days.map(date => {
            const dateKey = format(date, "yyyy-MM-dd")
            const stats = tradeMap[dateKey] || { count: 0, netPL: 0 }

            // Intensity calculation (0-4)
            let intensity = 0
            if (stats.count >= 4) intensity = 4
            else if (stats.count >= 3) intensity = 3
            else if (stats.count >= 2) intensity = 2
            else if (stats.count >= 1) intensity = 1

            return {
                date,
                dateKey,
                count: stats.count,
                netPL: stats.netPL,
                intensity
            }
        })
    }, [trades, viewYear])

    // Group into weeks for the grid
    const weeks = useMemo(() => {
        const result: any[][] = []
        let currentWeek: any[] = []

        heatmapData.forEach((day, i) => {
            currentWeek.push(day)
            // If it's Saturday or the last day, start a new week
            if (day.date.getDay() === 6 || i === heatmapData.length - 1) {
                result.push(currentWeek)
                currentWeek = []
            }
        })
        return result
    }, [heatmapData])

    const getIntensityClass = (intensity: number) => {
        switch (intensity) {
            case 1: return "bg-emerald-500/25 dark:bg-emerald-500/20"
            case 2: return "bg-emerald-500/50 dark:bg-emerald-500/40"
            case 3: return "bg-emerald-500/80 dark:bg-emerald-500/70"
            case 4: return "bg-emerald-600 dark:bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
            default: return "bg-muted/15 dark:bg-muted/10 text-muted-foreground/20"
        }
    }

    return (
        <div className="w-full bg-card/60 dark:bg-card/50 border border-border/80 dark:border-border rounded-xl p-5 mb-6 relative overflow-hidden group shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 dark:from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        Trading Roadmap
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted/80 dark:bg-muted px-2 py-0.5 rounded-full uppercase tracking-tighter">{viewYear}</span>
                    </h3>
                    <div className="flex items-center bg-muted/30 rounded-lg p-0.5 border border-border/50">
                        <button
                            onClick={() => setViewYear(viewYear - 1)}
                            className="p-1 hover:bg-background rounded-md transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <ChevronLeft className="w-3 h-3" />
                        </button>
                        <div className="w-[1px] h-3 bg-border/50 mx-0.5" />
                        <button
                            onClick={() => setViewYear(viewYear + 1)}
                            className="p-1 hover:bg-background rounded-md transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 dark:bg-muted/30 rounded-lg border border-border/50">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Relaxed</span>
                    <div className="flex gap-1.5">
                        {[0, 1, 2, 3, 4].map((v) => (
                            <div key={v} className={cn("w-2.5 h-2.5 rounded-[2px]", getIntensityClass(v))} />
                        ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Intense</span>
                </div>
            </div>

            <div className="overflow-x-auto pb-4 scrollbar-hide relative z-10">
                <div className="flex gap-[4px] min-w-max">
                    <TooltipProvider delayDuration={0}>
                        {weeks.map((week, weekIndex) => {
                            const firstDayStr = format(week[0].date, "MMM")
                            const isNewMonth = weekIndex === 0 || format(weeks[weekIndex - 1][0].date, "MMM") !== firstDayStr

                            return (
                                <div key={weekIndex} className="flex flex-col gap-[3px] relative pt-6">
                                    {isNewMonth && (
                                        <div className="absolute top-0 left-0 text-[10px] font-black text-muted-foreground/80 dark:text-muted-foreground/60 uppercase tracking-tighter">
                                            {firstDayStr}
                                        </div>
                                    )}

                                    {isNewMonth && weekIndex !== 0 && (
                                        <div className="absolute top-0 bottom-0 -left-[2.5px] w-[1.5px] bg-border dark:bg-border/40" />
                                    )}

                                    {week.map((day) => (
                                        <Tooltip key={day.dateKey}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={cn(
                                                        "w-[12px] h-[12px] rounded-[2px] transition-all hover:scale-[1.4] hover:z-10 focus:outline-none cursor-crosshair border border-black/5 dark:border-white/5",
                                                        getIntensityClass(day.intensity),
                                                        day.intensity > 0 && "hover:ring-2 hover:ring-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                                                    )}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-[11px] p-0 bg-background/95 backdrop-blur-xl border-border shadow-2xl overflow-hidden rounded-lg min-w-[140px]">
                                                <div className="px-3 py-1.5 bg-muted/50 border-b border-border text-[10px] font-black text-muted-foreground uppercase tracking-widest">{format(day.date, "EEEE, MMM d, yyyy")}</div>
                                                <div className="px-3 py-2 space-y-1.5">
                                                    <div className="flex justify-between items-baseline gap-4">
                                                        <span className="text-muted-foreground font-medium text-[10px]">Volume</span>
                                                        <span className="font-bold text-foreground text-[10px]">{day.count} {day.count === 1 ? 'Trade' : 'Trades'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-baseline gap-4">
                                                        <span className="text-muted-foreground font-medium text-[10px]">Result</span>
                                                        <span className={cn(
                                                            "font-black text-[11px]",
                                                            day.netPL > 0 ? "text-emerald-500" : day.netPL < 0 ? "text-red-500" : "text-muted-foreground"
                                                        )}>
                                                            {day.netPL > 0 ? "+" : day.netPL < 0 ? "-" : ""}${Math.abs(day.netPL).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                </div>
                            )
                        })}
                    </TooltipProvider>
                </div>
            </div>

            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground/60 dark:text-muted-foreground/40 uppercase tracking-[0.25em] font-black px-1 border-t border-border/10 pt-4 relative z-10">
                <span className="bg-gradient-to-r from-muted-foreground/60 to-muted-foreground/20 bg-clip-text text-transparent">{viewYear - 1} Archive</span>
                <div className="flex gap-6">
                    <span className="opacity-50 tracking-normal italic font-medium">Performance Roadmap</span>
                    <span className="bg-gradient-to-l from-emerald-500 to-emerald-500/20 bg-clip-text text-transparent">{viewYear} Focus</span>
                </div>
            </div>
        </div>
    )
}
