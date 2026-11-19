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
  { href: "/analytics", label: "Analytics", icon: AnalyticsIcon },
] as const

// Floating dark pill: the active tab expands into a green capsule with its
// label, others are icon-only. A round "+" button is fused to its
// right end. The pill and circle are drawn in a background layer merged by an
// SVG "goo" filter, which produces the liquid neck between them; the icons sit
// on top, unfiltered.
const PILL_COLOR = "#1a1a1f"
const BAR_H = 60 // px, pill height
const FAB = 60 // px, circle diameter
const GAP = 3 // px between pill end and ring (bridged by the goo filter)

export function MobileNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href))

  const logTrade = () => {
    if (navigator.vibrate) navigator.vibrate(8)
    if (pathname?.startsWith("/journal")) window.dispatchEvent(new Event(NEW_TRADE_EVENT))
    else router.push("/journal?new=1")
  }

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),0.9rem)] lg:hidden"
    >
      {/* SVG filter that fuses overlapping shapes into one smooth blob */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="yafi-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="pointer-events-auto relative w-full max-w-sm" style={{ height: FAB + 8 }}>
        {/* Background shapes (filtered) */}
        <div className="absolute inset-0 drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)]" aria-hidden="true">
          <div className="absolute inset-0" style={{ filter: "url(#yafi-goo)" }}>
            {/* pill ends just before the ring; the goo filter grows a narrow neck between them */}
            <div
              className="absolute left-0 rounded-full"
              style={{ top: (FAB + 8 - BAR_H) / 2, height: BAR_H, right: FAB + 8 + GAP, background: PILL_COLOR }}
            />
            {/* ring around the + button, same colour as the pill */}
            <div className="absolute right-0 top-0 rounded-full" style={{ width: FAB + 8, height: FAB + 8, background: PILL_COLOR }} />
          </div>
        </div>

        {/* Foreground: icons and + button */}
        <div className="relative flex h-full items-center">
          <div className="flex items-center pl-2" style={{ height: BAR_H, width: `calc(100% - ${FAB + 8 + GAP}px)` }}>
            {tabs.map((tab) => {
              const active = isActive(tab.href)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-label={tab.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full min-w-0 items-center justify-center transition-[flex-grow] duration-300 ease-out",
                    active ? "flex-[2]" : "flex-1"
                  )}
                >
                  {/* Active tab expands into a soft green capsule with its name */}
                  <span
                    className={cn(
                      "flex h-10 items-center rounded-full transition-all duration-300 ease-out",
                      active
                        ? "gap-2 bg-[#6ad62f]/15 px-3.5 text-[#86e651]"
                        : "gap-0 px-2.5 text-zinc-400 active:text-zinc-100"
                    )}
                  >
                    <tab.icon className="size-[22px] shrink-0" strokeWidth={active ? 2 : 1.6} />
                    <span
                      className={cn(
                        "overflow-hidden whitespace-nowrap text-[13px] font-semibold transition-all duration-300 ease-out",
                        active ? "max-w-[84px] opacity-100" : "max-w-0 opacity-0"
                      )}
                    >
                      {tab.label}
                    </span>
                  </span>
                </Link>
              )
            })}
            <button type="button" onClick={onMore} aria-label="More" className="flex h-full flex-1 items-center justify-center text-zinc-400 transition-colors active:text-zinc-100">
              <span className="flex h-10 items-center rounded-full px-2.5">
                <Menu className="size-[22px]" strokeWidth={1.6} />
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={logTrade}
            aria-label="Log a trade"
            className="group absolute right-1 top-1 flex items-center justify-center rounded-full bg-brand text-primary-foreground shadow-[0_6px_20px_-4px_var(--lime-glow)] transition-transform active:scale-90"
            style={{ width: FAB, height: FAB }}
          >
            <Plus className="size-7 transition-transform duration-200 group-active:rotate-90" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </nav>
  )
}
