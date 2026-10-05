"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Activity,
  BarChart3,
  BookOpen,
  Target,
  Brain,
  Upload,
  Settings,
  Search,
  Command,
  X,
  Zap,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  StickyNote
} from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/", label: "Dashboard", icon: Activity, description: "Overview" },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon, description: "Trade Schedule" },
  { href: "/journal", label: "Journal", icon: BookOpen, description: "Trade Log" },
  { href: "/notes", label: "Notes", icon: StickyNote, description: "Sticky Notes" },
  { href: "/import", label: "Import", icon: Upload, description: "Bulk Import" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, description: "Performance" },
  { href: "/strategies", label: "Strategies", icon: Target, description: "Management" },
  { href: "/discipline", label: "Discipline", icon: Brain, description: "Psychology" },
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

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-screen flex flex-col border-r border-border bg-background z-50 transition-all duration-300",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "w-20" : "w-64"
      )}>
        {/* Logo & Theme Toggle */}
        <div className={cn("p-6 border-b border-border transition-all", isCollapsed && "p-4")}>
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
              <div className="w-8 h-8 flex items-center justify-center bg-sidebar-ring shrink-0">
                <span className="text-background font-mono text-sm font-bold">Y</span>
              </div>
              {!isCollapsed && <span className="text-lg font-semibold tracking-tight">YAFI</span>}
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-surface-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {!isOpen && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 hover:bg-surface-hover rounded transition-colors text-muted-foreground"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
          </div>
          {!isCollapsed && <ThemeToggle />}
        </div>

        {/* Search Trigger */}
        <div className={cn("p-4", isCollapsed && "p-2")}>
          <button
            onClick={onOpenCommand}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground bg-surface border border-border hover:bg-surface-hover transition-colors",
              isCollapsed && "px-0 justify-center"
            )}
          >
            <Search className="w-4 h-4 shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">Search...</span>
                <kbd className="flex items-center gap-1 text-xs font-mono bg-background px-1.5 py-0.5 border border-border">
                  <Command className="w-3 h-3" />K
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm transition-all group relative",
                  isActive
                    ? "text-accent-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover",
                  isCollapsed && "justify-center px-0"
                )}
              >
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-lime lime-glow-sm" />
                )}
                {isActive && isCollapsed && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-lime lime-glow-sm" />
                )}
                <item.icon
                  className={cn(
                    "w-4 h-4 transition-all shrink-0",
                    isActive ? "text-accent-foreground" : ""
                  )}
                />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
                {!isCollapsed && (
                  <span className="ml-auto text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.description}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-border">
          <Link
            href="/settings"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors",
              isCollapsed && "justify-center px-0"
            )}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </Link>

          {/* User */}
          <div className={cn("mt-4 flex items-center gap-3 px-3", isCollapsed && "px-0 justify-center")}>
            <div className="w-8 h-8 bg-surface border border-border flex items-center justify-center shrink-0">
              <span className="text-xs font-mono text-muted-foreground">TR</span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Yafet fx </p>
                <p className="text-xs text-muted-foreground truncate">trader</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
