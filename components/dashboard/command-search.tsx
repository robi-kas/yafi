"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  DashboardIcon,
  AnalyticsIcon,
  Calendar,
  BookOpen,
  Target,
  Brain,
  StickyNote,
  Wallet,
  Upload,
  Settings,
  Plus,
  Download,
} from "@/components/icons"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useDashboard } from "@/context/dashboard-context"
import { cn } from "@/lib/utils"

const pages = [
  { name: "Dashboard", href: "/", icon: DashboardIcon },
  { name: "Analytics", href: "/analytics", icon: AnalyticsIcon },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Trades", href: "/journal", icon: BookOpen },
  { name: "Strategies", href: "/strategies", icon: Target },
  { name: "Discipline", href: "/discipline", icon: Brain },
  { name: "Notes", href: "/notes", icon: StickyNote },
  { name: "Accounts", href: "/accounts", icon: Wallet },
  { name: "Import", href: "/import", icon: Upload },
  { name: "Settings", href: "/settings", icon: Settings },
]

const quickActions = [
  { name: "Log a new trade", href: "/journal", icon: Plus },
  { name: "Import trades from MT5", href: "/import", icon: Upload },
  { name: "Export / back up data", href: "/settings", icon: Download },
]

interface CommandSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Plain word matching: every typed word must appear in the item's text.
// (cmdk's default fuzzy matching made "xau" match "Export / back up".)
function matchWords(value: string, search: string, keywords?: string[]) {
  const hay = `${value} ${(keywords || []).join(" ")}`.toLowerCase()
  const words = search.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 1
  return words.every((w) => hay.includes(w)) ? 1 : 0
}

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const router = useRouter()
  const { trades } = useDashboard()

  const go = useCallback(
    (href: string) => {
      onOpenChange(false)
      router.push(href)
    },
    [router, onOpenChange]
  )

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} filter={matchWords}>
      <CommandInput placeholder="Search pages, actions or trades by symbol..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem key={page.href} value={`go ${page.name}`} onSelect={() => go(page.href)} className="flex cursor-pointer items-center gap-3">
              <page.icon className="size-4 text-muted-foreground" />
              <span>{page.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {quickActions.map((action) => (
            <CommandItem key={action.name} value={action.name} onSelect={() => go(action.href)} className="flex cursor-pointer items-center gap-3">
              <action.icon className="size-4 text-muted-foreground" />
              <span>{action.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {trades.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent trades">
              {trades.slice(0, 50).map((t) => {
                const pnl = t.profitLoss || 0
                return (
                  <CommandItem
                    key={t.id}
                    value={`${t.symbol} ${t.direction} ${t.strategy || ""} ${new Date(t.entryTime).toLocaleDateString()} ${new Date(t.entryTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} #${t.id}`}
                    onSelect={() => go("/journal")}
                    className="flex cursor-pointer items-center gap-3"
                  >
                    <BookOpen className="size-4 text-muted-foreground" />
                    <span className="font-medium">{t.symbol}</span>
                    <span className="text-xs uppercase text-muted-foreground">{t.direction}</span>
                    <span className="text-xs text-muted-foreground">{new Date(t.entryTime).toLocaleDateString()}</span>
                    <span className={cn("ml-auto font-mono text-xs tabular", pnl > 0 ? "text-profit" : pnl < 0 ? "text-loss" : "text-muted-foreground")}>
                      {pnl > 0 ? "+" : pnl < 0 ? "-" : ""}${Math.abs(pnl).toFixed(2)}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}

export function useCommandSearch() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return { open, setOpen }
}
