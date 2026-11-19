"use client"

import React, { useState } from "react"

import { Sidebar } from "./sidebar"
import { cn } from "@/lib/utils"
import { CommandSearch, useCommandSearch } from "./command-search"
import { NotificationToast } from "./notification-toast"
import { MobileNav } from "./mobile-nav"
import { motion, AnimatePresence } from "framer-motion"
import { Search } from "@/components/icons"
import Link from "next/link"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { open, setOpen } = useCommandSearch()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="fixed left-0 right-0 top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between h-full px-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <img src="/logo-mark.png" alt="YAFI logo" width={24} height={24} className="w-6 h-6" />
                <span className="font-semibold tracking-tight">YAFI</span>
              </Link>
            </div>
            <button
              onClick={() => setOpen(true)}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </header>

        <Sidebar
          onOpenCommand={() => setOpen(true)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <CommandSearch open={open} onOpenChange={setOpen} />

        <main className={cn(
          "pb-28 pt-14 transition-all duration-300 lg:pb-0 lg:pt-0",
          sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <MobileNav onMore={() => setSidebarOpen(true)} />
        <NotificationToast />
      </div>
    </>
  )
}
