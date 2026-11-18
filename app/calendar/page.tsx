"use client"

import React from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { TradeCalendar } from "@/components/dashboard/trade-calendar"
import { useDashboard } from "@/context/dashboard-context"
import BounceLoader from "@/components/ui/bounce-loader"

function CalendarPageInner() {
    const { isLoading } = useDashboard()
    if (isLoading) return <BounceLoader />
    return <TradeCalendar />
}

export default function CalendarPage() {
    return (
        <DashboardLayout>
            <CalendarPageInner />
        </DashboardLayout>
    )
}
