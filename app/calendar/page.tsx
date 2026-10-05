"use client"

import React from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { TradeCalendar } from "@/components/dashboard/trade-calendar"
import { useDashboard } from "@/context/dashboard-context"
import BounceLoader from "@/components/ui/bounce-loader"

function CalendarPageInner() {
    const { isLoading } = useDashboard()

    if (isLoading) {
        return <BounceLoader />
    }

    return (
        <div className="h-[calc(100vh-theme(spacing.14))] lg:h-screen w-full overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0">
                <TradeCalendar />
            </div>
        </div>
    )
}

export default function CalendarPage() {
    return (
        <DashboardLayout>
            <CalendarPageInner />
        </DashboardLayout>
    )
}
