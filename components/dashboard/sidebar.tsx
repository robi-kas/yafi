"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  DashboardIcon,
  AnalyticsIcon,
  BookOpen,
  Target,
  Brain,
  Upload,
  Settings,
  Search,
  X,
  Calendar as CalendarIcon,
  StickyNote,
  Wallet,
  LogOut,
  PanelLeftIcon,
} from "@/components/icons"
import { ThemeToggle } from "./theme-toggle"
import { useCurrentUser, signOut } from "@/hooks/use-current-user"

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: DashboardIcon },
      { href: "/analytics", label: "Analytics", icon: AnalyticsIcon },
      { href: "/calendar", label: "Calendar", icon: CalendarIcon },
    ],
  },
  {
    label: "Journal",
    items: [
      { href: "/journal", label: "Trades", icon: BookOpen },
      { href: "/strategies", label: "Strategies", icon: Target },
      { href: "/discipline", label: "Discipline", icon: Brain },
      { href: "/notes", label: "Notes", icon: StickyNote },
    ],
  },
  {
    label: "Data",
    items: [
      { href: "/accounts", label: "Accounts", icon: Wallet },
      { href: "/import", label: "Import", icon: Upload },
    ],
  },
]

interface SidebarProps {
  onOpenCommand?: () => void
  isOpen?: boolean
  onClose?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ onOpenCommand, isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const user = useCurrentUser()
  const displayName = (user?.user_metadata?.full_name as string | undefined) || user?.email?.split("@")[0] || ""
  const initials = (displayName || "?").slice(0, 2).toUpperCase()
  const collapsed = !!isCollapsed && !isOpen

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href))

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: typeof DashboardIcon }) => {
    const active = isActive(href)
    return (
      <Link
        href={href}
        onClick={onClose}
        title={collapsed ? label : undefined}
        className={cn(
          "group relative flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors",
          active
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          collapsed && "justify-center px-0"
        )}
      >
        {active && <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" />}
        <Icon className={cn("size-[18px] shrink-0", active && "text-brand")} />
        {!collapsed && <span className="truncate font-medium">{label}</span>}
      </Link>
    )
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-300",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        {/* Brand */}
        <div className={cn("flex h-16 items-center justify-between px-5", collapsed && "justify-center px-0")}>
          <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
            <img src="/logo-mark.png" alt="YAFI logo" width={28} height={28} className="size-7 shrink-0" />
            {!collapsed && (
              <span className="text-[15px] font-semibold tracking-tight">
                YAFI <span className="font-normal text-muted-foreground">Journal</span>
              </span>
            )}
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:flex"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftIcon className="size-4" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <button
            onClick={onOpenCommand}
            title={collapsed ? "Search (Ctrl K)" : undefined}
            className={cn(
              "flex h-9 w-full items-center gap-2.5 rounded-md border border-border bg-background/50 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            <Search className="size-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Search</span>
                <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  Ctrl K
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-hide">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              {!collapsed ? (
                <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
              ) : (
                <div className="mx-auto mb-2 h-px w-6 bg-border" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <NavLink href="/settings" label="Settings" icon={Settings} />
          {collapsed ? (
            <div className="mt-2 flex flex-col items-center gap-1">
              <button
                onClick={onToggleCollapse}
                className="hidden rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:flex"
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <PanelLeftIcon className="size-4 rotate-180" />
              </button>
              <ThemeToggle />
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2.5 rounded-md px-2 py-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName || "…"}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
              </div>
              <ThemeToggle />
              <button
                onClick={signOut}
                title="Sign out"
                aria-label="Sign out"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
