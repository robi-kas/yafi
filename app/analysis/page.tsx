"use client"

import React, { useMemo } from "react";
import { useDashboard } from "../../context/dashboard-context";
import { getWinLossCounts, calculateWinRate } from "@/lib/trading-metrics";

export default function AnalysisPage() {
  const { trades, strategies } = useDashboard();

  const stats = useMemo(() => {
    const total = trades.length;
    const { wins: won, losses: lost } = getWinLossCounts(trades);
    const totalPnl = trades.reduce((s, t) => s + (t.profitLoss ?? 0), 0);

    const byStrategy: Record<string, { count: number; pnl: number }> = {};
    trades.forEach((t) => {
      const key = t.strategy || "(none)";
      byStrategy[key] = byStrategy[key] || { count: 0, pnl: 0 };
      byStrategy[key].count += 1;
      byStrategy[key].pnl += (t.profitLoss ?? 0);
    });

    const topStrategies = Object.entries(byStrategy)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);

    return { total, won, lost, totalPnl, topStrategies };
  }, [trades]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Analysis</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Total Trades</div>
          <div className="text-xl font-bold">{stats.total}</div>
        </div>

        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Win Rate</div>
          <div className="text-xl font-bold">{stats.total ? calculateWinRate(stats.won, stats.lost).toFixed(1) + "%" : "—"}</div>
        </div>

        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Total PnL</div>
          <div className="text-xl font-bold">{stats.totalPnl.toFixed(2)}</div>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-2">Top Strategies</h2>
        <div className="space-y-2">
          {stats.topStrategies.map((s) => (
            <div key={s.name} className="p-2 border rounded flex justify-between">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-sm text-muted-foreground">{s.count} trades</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{s.pnl.toFixed(2)}</div>
              </div>
            </div>
          ))}
          {stats.topStrategies.length === 0 && <div className="text-sm text-muted-foreground">No strategy data</div>}
        </div>
      </section>
    </div>
  );
}
