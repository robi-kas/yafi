"use client"

// Shared page building blocks so every screen uses the same spacing,
// typography and surfaces. Prefer these over hand-rolled card markup.
import React from "react"
import { cn } from "@/lib/utils"
import type { IconComponent } from "@/components/icons"

/* ---------- Page ---------- */

export function Page({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-8", className)}>{children}</div>
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ---------- Panel (card) ---------- */

export function Panel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function PanelHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: IconComponent
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{title}</h3>
          {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  )
}

export function PanelBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>
}

/* ---------- Stat ---------- */

type Tone = "default" | "profit" | "loss" | "brand" | "muted"

const toneText: Record<Tone, string> = {
  default: "text-foreground",
  profit: "text-profit",
  loss: "text-loss",
  brand: "text-brand",
  muted: "text-muted-foreground",
}

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
  icon: Icon,
  children,
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: Tone
  icon?: IconComponent
  children?: React.ReactNode
  className?: string
}) {
  return (
    <Panel className={cn("relative overflow-hidden p-5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon && <Icon className="size-4 text-muted-foreground/70" />}
      </div>
      <div className={cn("mt-2 font-mono text-2xl font-semibold tracking-tight tabular", toneText[tone])}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      {children}
    </Panel>
  )
}

/* ---------- Empty state ---------- */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: IconComponent
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {Icon && (
        <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Icon className="size-5" />
        </span>
      )}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ---------- Badges ---------- */

export function ResultBadge({ result }: { result?: string | null }) {
  const r = (result || "").toLowerCase()
  const style =
    r === "win"
      ? "bg-profit/10 text-profit"
      : r === "loss"
        ? "bg-loss/10 text-loss"
        : "bg-secondary text-muted-foreground"
  const label = r === "win" ? "Win" : r === "loss" ? "Loss" : r === "breakeven" ? "BE" : r ? r : "Open"
  return <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium", style)}>{label}</span>
}

export function DirectionBadge({ direction }: { direction?: string | null }) {
  const d = (direction || "").toLowerCase()
  const isBuy = d === "buy" || d === "long"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium uppercase",
        isBuy ? "bg-sky-500/10 text-sky-400" : "bg-orange-500/10 text-orange-400"
      )}
    >
      {isBuy ? "Buy" : "Sell"}
    </span>
  )
}

/* ---------- Formatting ---------- */

export function formatMoney(n: number | null | undefined, opts: { sign?: boolean; compact?: boolean } = {}) {
  const v = Number(n) || 0
  const abs = Math.abs(v)
  const body = opts.compact && abs >= 10000
    ? `$${(abs / 1000).toFixed(abs >= 100000 ? 0 : 1)}k`
    : `$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (v < 0) return `-${body}`
  return opts.sign && v > 0 ? `+${body}` : body
}

export function pnlTone(n: number | null | undefined): Tone {
  const v = Number(n) || 0
  return v > 0 ? "profit" : v < 0 ? "loss" : "default"
}
