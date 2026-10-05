"use client"

import React from "react";
import { useDashboard } from "../../context/dashboard-context";
import Link from "next/link";

export default function DbOverviewPage() {
  const {
    accounts,
    trades,
    assets,
    campaigns,
    strategies,
    channelBudgets,
    audienceSegments,
  } = useDashboard();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Database Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Accounts</div>
          <div className="text-xl font-bold">{accounts.length}</div>
          <Link href="/accounts" className="text-sm text-primary underline">View</Link>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Trades</div>
          <div className="text-xl font-bold">{trades.length}</div>
          <Link href="/journal" className="text-sm text-primary underline">View</Link>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Assets</div>
          <div className="text-xl font-bold">{assets.length}</div>
          <Link href="/assets" className="text-sm text-primary underline">View</Link>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Campaigns</div>
          <div className="text-xl font-bold">{campaigns.length}</div>
          <Link href="/campaigns" className="text-sm text-primary underline">View</Link>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Strategies</div>
          <div className="text-xl font-bold">{strategies.length}</div>
          <Link href="/strategies" className="text-sm text-primary underline">View</Link>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Budgets</div>
          <div className="text-xl font-bold">{channelBudgets.length}</div>
          <Link href="/budget" className="text-sm text-primary underline">View</Link>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Audience</div>
          <div className="text-xl font-bold">{audienceSegments.length}</div>
          <Link href="/audience" className="text-sm text-primary underline">View</Link>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-medium mb-2">Recent Trades</h2>
        <div className="space-y-2">
          {trades.slice(0, 8).map((t) => (
            <div key={t.id} className="p-2 border rounded">
              <div className="text-sm">{t.symbol} — {t.direction?.toUpperCase?.()}</div>
              <div className="text-xs text-muted-foreground">{t.entryPrice} → {t.exitPrice ?? "—"}</div>
            </div>
          ))}
          {trades.length === 0 && <div className="text-sm text-muted-foreground">No trades yet</div>}
        </div>
      </section>
    </div>
  );
}
