"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { DashboardIcon, BookOpen, AnalyticsIcon, Menu, Plus } from "@/components/icons"

/** Event the Trades page listens for to open the "new trade" form in place. */
export const NEW_TRADE_EVENT = "yafi:new-trade"

const tabs = [
  { href: "/", label: "Home", icon: DashboardIcon },
  { href: "/journal", label: "Trades", icon: BookOpen },
  null, // center action
  { href: "/analytics", label: "Analytics", icon: AnalyticsIcon },
] as const

export function MobileNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href))

  const logTrade = () => {
    if (navigator.vibrate) navigator.vibrate(8)
    if (pathname?.startsWith("/journal")) window.dispatchEvent(new Event(NEW_TRADE_EVENT))
    else router.push("/journal?new=1")
  }

  const item = "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors"

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden"
    >
      <div className="relative mx-auto flex h-16 max-w-md items-stretch rounded-2xl border border-border bg-card/85 px-1 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        {tabs.map((tab, i) =>
          tab === null ? (
            <div key="action" className="flex flex-1 items-start justify-center">
              <button
                type="button"
                onClick={logTrade}
                aria-label="Log a trade"
                className="group -mt-6 flex size-14 items-center justify-center rounded-2xl bg-brand text-primary-foreground shadow-[0_8px_24px_-4px_var(--lime-glow)] ring-4 ring-background transition-transform active:scale-95"
              >
                <Plus className="size-6 transition-transform group-active:rotate-90" strokeWidth={2.25} />
              </button>
            </div>
          ) : (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive(tab.href) ? "page" : undefined}
              className={cn(item, isActive(tab.href) ? "text-brand" : "text-muted-foreground active:text-foreground")}
            >
              {isActive(tab.href) && (
                <span className="absolute top-1 h-1 w-1 rounded-full bg-brand shadow-[0_0_8px_var(--lime-glow)]" />
              )}
              <tab.icon className="size-[22px]" strokeWidth={isActive(tab.href) ? 2.1 : 1.75} />
              {tab.label}
            </Link>
          )
        )}
        <button type="button" onClick={onMore} className={cn(item, "text-muted-foreground active:text-foreground")}>
          <Menu className="size-[22px]" />
          More
        </button>
      </div>
    </nav>
  )
}
