"use client"

import React, { useMemo } from "react"
import { useDashboard } from "@/context/dashboard-context"
import { format, eachDayOfInterval, startOfDay, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronLeft, ChevronRight, LayoutGrid } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Panel, PanelHeader, PanelBody, formatMoney } from "@/components/kit"

type Day = { date: Date; dateKey: string; count: number; netPL: number; level: number }

// Opacity steps for profit / loss days, weakest to strongest.
const PROFIT_STEPS = ["bg-profit/25", "bg-profit/45", "bg-profit/70", "bg-profit"]
const LOSS_STEPS = ["bg-loss/25", "bg-loss/45", "bg-loss/70", "bg-loss"]

function cellClass(day: Day) {
    if (!day.count) return "bg-secondary"
    if (day.netPL > 0.01) return PROFIT_STEPS[day.level]
    if (day.netPL < -0.01) return LOSS_STEPS[day.level]
    return "bg-muted-foreground/30" // traded, roughly flat
}

export function TradeHeatmap() {
    const { trades } = useDashboard()
    const [viewYear, setViewYear] = React.useState(new Date().getFullYear())

    const { days, yearStats } = useMemo(() => {
        const start = startOfDay(new Date(viewYear, 0, 1))
        const end = startOfDay(new Date(viewYear, 11, 31))

        const tradeMap: Record<string, { count: number; netPL: number }> = {}
        trades.forEach((trade) => {
            const dateKey = format(parseISO(trade.entryTime), "yyyy-MM-dd")
            tradeMap[dateKey] ??= { count: 0, netPL: 0 }
            tradeMap[dateKey].count += 1
            tradeMap[dateKey].netPL += trade.profitLoss || 0
        })

        const all = eachDayOfInterval({ start, end }).map((date) => {
            const dateKey = format(date, "yyyy-MM-dd")
            const s = tradeMap[dateKey] || { count: 0, netPL: 0 }
            return { date, dateKey, count: s.count, netPL: s.netPL, level: 0 }
        })

        // Shade by size of the day's P&L relative to the year's biggest day.
        const maxAbs = Math.max(0, ...all.map((d) => Math.abs(d.netPL)))
        for (const d of all) {
            if (!d.count || !maxAbs) continue
            const r = Math.abs(d.netPL) / maxAbs
            d.level = r > 0.66 ? 3 : r > 0.33 ? 2 : r > 0.1 ? 1 : 0
        }

        const traded = all.filter((d) => d.count)
        return {
            days: all,
            yearStats: {
                tradingDays: traded.length,
                green: traded.filter((d) => d.netPL > 0.01).length,
                red: traded.filter((d) => d.netPL < -0.01).length,
                netPL: traded.reduce((s, d) => s + d.netPL, 0),
            },
        }
    }, [trades, viewYear])

    // Columns are weeks (Sun..Sat). Pad the first week so every row is a weekday.
    const weeks = useMemo(() => {
        const result: (Day | null)[][] = []
        let current: (Day | null)[] = Array(days[0]?.date.getDay() ?? 0).fill(null)
        days.forEach((day, i) => {
            current.push(day)
            if (day.date.getDay() === 6 || i === days.length - 1) {
                result.push(current)
                current = []
            }
        })
        return result
    }, [days])

    const monthStart = (w: (Day | null)[], i: number) => {
        const first = w.find(Boolean) as Day | undefined
        if (!first) return null
        const prev = i > 0 ? (weeks[i - 1].find(Boolean) as Day | undefined) : undefined
        const label = format(first.date, "MMM")
        return !prev || format(prev.date, "MMM") !== label ? label : null
    }

    return (
        <Panel>
            <PanelHeader
                title={`${viewYear} activity`}
                description={`${yearStats.tradingDays} trading days · ${yearStats.green} green · ${yearStats.red} red · ${formatMoney(yearStats.netPL, { sign: true })}`}
                icon={LayoutGrid}
                actions={
                    <>
                        <Button variant="ghost" size="icon-sm" onClick={() => setViewYear(viewYear - 1)} aria-label="Previous year">
                            <ChevronLeft />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setViewYear(viewYear + 1)} aria-label="Next year">
                            <ChevronRight />
                        </Button>
                    </>
                }
            />
            <PanelBody>
                <div className="overflow-x-auto pb-2 scrollbar-hide">
                    <TooltipProvider delayDuration={0}>
                        <div className="flex min-w-max gap-[3px]">
                            <div className="mr-1 flex flex-col gap-[3px] pt-5 text-[10px] text-muted-foreground">
                                {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
                                    <span key={i} className="h-3 leading-3">
                                        {d}
                                    </span>
                                ))}
                            </div>
                            {weeks.map((week, wi) => {
                                const label = monthStart(week, wi)
                                return (
                                    <div key={wi} className="relative flex flex-col gap-[3px] pt-5">
                                        {label && <span className="absolute left-0 top-0 text-[10px] text-muted-foreground">{label}</span>}
                                        {week.map((day, di) =>
                                            day ? (
                                                <Tooltip key={day.dateKey}>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            className={cn(
                                                                "size-3 rounded-[3px] transition-transform hover:scale-125",
                                                                cellClass(day)
                                                            )}
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="text-xs">
                                                        <p className="font-medium">{format(day.date, "EEE, MMM d, yyyy")}</p>
                                                        {day.count ? (
                                                            <p>
                                                                {day.count} {day.count === 1 ? "trade" : "trades"} ·{" "}
                                                                <span className="font-mono tabular">{formatMoney(day.netPL, { sign: true })}</span>
                                                            </p>
                                                        ) : (
                                                            <p className="opacity-70">No trades</p>
                                                        )}
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : (
                                                <div key={`pad-${di}`} className="size-3" />
                                            )
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </TooltipProvider>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <span>Loss</span>
                        {[...LOSS_STEPS].reverse().map((c) => (
                            <span key={c} className={cn("size-3 rounded-[3px]", c)} />
                        ))}
                        <span className="size-3 rounded-[3px] bg-secondary" />
                        {PROFIT_STEPS.map((c) => (
                            <span key={c} className={cn("size-3 rounded-[3px]", c)} />
                        ))}
                        <span>Profit</span>
                    </div>
                </div>
            </PanelBody>
        </Panel>
    )
}
