"use client"

import React, { useEffect, useState } from "react"
import { useDashboard } from "@/context/dashboard-context"
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Server, Download, Copy, RefreshCw, Eye, EyeOff, CheckCircle2, Loader2 } from "@/components/icons"
import { cn } from "@/lib/utils"

function timeAgo(iso?: string | null) {
  if (!iso) return "never"
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

const STEPS = [
  {
    title: "Allow YAFI in MT5",
    body: (
      <>
        Tools → Options → Expert Advisors → tick <b>Allow WebRequest for listed URL</b> and add{" "}
        <code className="rounded bg-secondary px-1 font-mono text-xs">https://yafijournal.com</code>
      </>
    ),
  },
  {
    title: "Install the EA",
    body: (
      <>
        Download YafiSync, then in MT5: File → Open Data Folder → <b>MQL5 → Experts</b>, put the file there, open it in
        MetaEditor and press <b>Compile</b>.
      </>
    ),
  },
  {
    title: "Attach and paste your token",
    body: (
      <>
        Drag <b>YafiSync</b> onto any chart, paste the token below, and turn on <b>Algo Trading</b>. It only reads your
        history; it never places or changes trades.
      </>
    ),
  },
]

export function Mt5SyncSettings() {
  const { accounts, addNotification, refreshMetrics } = useDashboard() as any
  const [token, setToken] = useState<string>("")
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    fetch("/api/mt5/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.webhookToken && setToken(d.webhookToken))
      .catch(() => {})
  }, [])

  const synced = (accounts || []).filter((a: any) => a.brokerLogin)

  const copy = async () => {
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const regenerate = async () => {
    if (!window.confirm("Create a new token? The EA stops syncing until you paste the new token into it.")) return
    setRegenerating(true)
    try {
      const res = await fetch("/api/mt5/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate" }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Could not create a new token")
      setToken(d.webhookToken)
      setShow(true)
      addNotification?.({ title: "New token created", message: "Paste it into the YafiSync EA inputs.", type: "success" })
    } catch (err: any) {
      addNotification?.({ title: "Token not changed", message: err.message, type: "error" })
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="MT5 sync"
        description="Closed trades flow in automatically from MetaTrader 5"
        icon={Server}
        actions={
          <Button variant="outline" size="sm" asChild>
            <a href="/downloads/YafiSync.mq5" download>
              <Download /> Download EA
            </a>
          </Button>
        }
      />
      <PanelBody className="space-y-6">
        {/* Steps */}
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-lg border border-border bg-background/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-brand-soft font-mono text-xs font-semibold text-brand">
                  {i + 1}
                </span>
                <p className="text-sm font-medium">{s.title}</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>

        {/* Token */}
        <div>
          <p className="text-sm font-medium">Your webhook token</p>
          <p className="mb-2 text-xs text-muted-foreground">Private to your account: anyone with it can add trades to your journal.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex h-9 min-w-0 flex-1 items-center rounded-md border border-input bg-background px-3 font-mono text-xs">
              <span className="truncate">{token ? (show ? token : "•".repeat(Math.min(token.length, 48))) : "Loading…"}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide token" : "Show token"} disabled={!token}>
                {show ? <EyeOff /> : <Eye />}
              </Button>
              <Button variant="outline" onClick={copy} disabled={!token}>
                {copied ? <CheckCircle2 className="text-profit" /> : <Copy />} {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="ghost" onClick={regenerate} disabled={regenerating || !token} title="Create a new token">
                {regenerating ? <Loader2 className="animate-spin" /> : <RefreshCw />} New
              </Button>
            </div>
          </div>
        </div>

        {/* Connected accounts */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Synced accounts</p>
            <Button variant="ghost" size="sm" onClick={() => refreshMetrics?.()}>
              <RefreshCw /> Refresh
            </Button>
          </div>
          {synced.length ? (
            <div className="divide-y divide-border rounded-lg border border-border">
              {synced.map((a: any) => {
                const fresh = a.lastSyncAt && Date.now() - new Date(a.lastSyncAt).getTime() < 30 * 60 * 1000
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={cn("size-2 shrink-0 rounded-full", fresh ? "bg-profit shadow-[0_0_8px_var(--profit)]" : "bg-muted-foreground/40")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        #{a.brokerLogin} · {a.brokerServer}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">synced {timeAgo(a.lastSyncAt)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border">
              <EmptyState
                icon={Server}
                title="No MT5 account connected yet"
                description="Follow the three steps above. Your account appears here after the EA's first sync, along with your last 90 days of trades."
              />
            </div>
          )}
        </div>
      </PanelBody>
    </Panel>
  )
}
