"use client"

import React, { useState, useCallback, useRef } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useDashboard } from "@/context/dashboard-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Upload, Check, ArrowRight, FileText, Table2, Image,
  X, TrendingUp, TrendingDown, RefreshCw,
  AlertCircle, Loader2, CheckCircle2, FileUp, BookOpen
} from "@/components/icons"
import {
  parseTradeFile, ParsedTrade, ImportFormat
} from "@/lib/trade-import-parser"
import { Page, PageHeader, Panel, PanelHeader, PanelBody, StatCard, DirectionBadge, formatMoney, pnlTone } from "@/components/kit"

// Broker configs
const BROKERS = [
  {
    id: "mt5", name: "MetaTrader 5", logo: "MT5",
    supported: ["HTML Statement", "CSV"],
    desc: "Export from MT5: Account > Reports > Full Report",
  },
  {
    id: "mt4", name: "MetaTrader 4", logo: "MT4",
    supported: ["HTML Statement", "CSV"],
    desc: "Export from MT4: History > Account History > Save as Report",
  },
  {
    id: "exness", name: "Exness", logo: "EX",
    supported: ["CSV", "HTML"],
    desc: "Download from Exness Personal Area > History",
  },
  {
    id: "ftmo", name: "FTMO", logo: "FT",
    supported: ["CSV", "HTML"],
    desc: "Download from FTMO Client Area > Trading Account > History",
  },
  {
    id: "ictm", name: "IC Markets", logo: "IC",
    supported: ["CSV"],
    desc: "Download from Client Portal > Trade History",
  },
  {
    id: "generic", name: "Generic CSV", logo: "CSV",
    supported: ["CSV"],
    desc: "Any CSV with columns: symbol, type, volume, open/close price, profit",
  },
]

type Step = "broker" | "upload" | "review" | "complete"

interface ImportStats {
  total: number
  imported: number
  skipped: number
  totalPL: number
  wins: number
  losses: number
}

function BrokerCard({ broker, selected, onSelect }: {
  broker: typeof BROKERS[0], selected: boolean, onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors",
        selected ? "border-brand/60 bg-brand-soft" : "border-border hover:border-foreground/20 hover:bg-accent/40"
      )}
    >
      {selected && (
        <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-brand text-primary-foreground">
          <Check className="size-3" />
        </span>
      )}
      <span className="flex size-10 items-center justify-center rounded-lg bg-secondary font-mono text-xs font-semibold text-foreground">
        {broker.logo}
      </span>
      <div>
        <p className="text-sm font-medium">{broker.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{broker.desc}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {broker.supported.map(fmt => (
          <span key={fmt} className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {fmt}
          </span>
        ))}
      </div>
    </button>
  )
}

function Checkbox({ checked, partial }: { checked: boolean; partial?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-4 items-center justify-center rounded border transition-colors",
        checked || partial ? "border-brand bg-brand text-primary-foreground" : "border-input"
      )}
    >
      {checked ? <Check className="size-3" /> : partial ? <span className="h-0.5 w-2 rounded bg-current" /> : null}
    </span>
  )
}

function TradeRow({ trade, selected, onToggle }: {
  trade: ParsedTrade & { _id: string }, selected: boolean, onToggle: () => void
}) {
  const pnl = trade.profitLoss
  return (
    <tr
      className={cn(
        "cursor-pointer select-none border-t border-border text-sm transition-colors hover:bg-accent/40",
        !selected && "opacity-50"
      )}
      onClick={onToggle}
    >
      <td className="px-3 py-2.5"><Checkbox checked={selected} /></td>
      <td className="px-3 py-2.5 font-medium">{trade.symbol}</td>
      <td className="px-3 py-2.5"><DirectionBadge direction={trade.direction} /></td>
      <td className="px-3 py-2.5 font-mono tabular text-muted-foreground">{trade.lotSize}</td>
      <td className="hidden px-3 py-2.5 font-mono tabular text-muted-foreground md:table-cell">{trade.entryPrice}</td>
      <td className="hidden px-3 py-2.5 font-mono tabular text-muted-foreground md:table-cell">{trade.exitPrice || "—"}</td>
      <td className={cn("px-3 py-2.5 text-right font-mono tabular", pnl === undefined ? "text-muted-foreground" : pnl > 0 ? "text-profit" : pnl < 0 ? "text-loss" : "")}>
        {pnl !== undefined ? formatMoney(pnl, { sign: true }) : "—"}
      </td>
      <td className="hidden px-3 py-2.5 text-muted-foreground sm:table-cell">
        {new Date(trade.entryTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
      </td>
    </tr>
  )
}

export default function ImportPage() {
  const { addTrade, trades: existingTrades } = useDashboard()

  const [step, setStep] = useState<Step>("broker")
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [parsedTrades, setParsedTrades] = useState<(ParsedTrade & { _id: string })[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [importFormat, setImportFormat] = useState<ImportFormat>("unknown")
  const [importStats, setImportStats] = useState<ImportStats | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // For screenshot mode
  const [mode, setMode] = useState<"report" | "screenshot">("report")
  const [screenshots, setScreenshots] = useState<string[]>([])

  const handleFileRead = useCallback((content: string, filename: string) => {
    setFileError(null)
    const { trades, format } = parseTradeFile(content, filename)

    if (trades.length === 0) {
      setFileError("No trades could be parsed from this file. Make sure it's a valid MT5 HTML statement or CSV.")
      return
    }

    const withIds = trades.map((t, i) => ({ ...t, _id: `parsed-${i}-${Date.now()}` }))
    setParsedTrades(withIds)
    setSelectedIds(new Set(withIds.map(t => t._id)))
    setImportFormat(format)
    setStep("review")
  }, [])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => handleFileRead(ev.target?.result as string, file.name)
    reader.readAsText(file)
  }, [handleFileRead])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => handleFileRead(ev.target?.result as string, file.name)
    reader.readAsText(file)
  }

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onloadend = () => setScreenshots(prev => [...prev, reader.result as string])
        reader.readAsDataURL(file)
      })
    }
  }

  const toggleTrade = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === parsedTrades.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(parsedTrades.map(t => t._id)))
    }
  }

  // Duplicate detection: compare symbol + date vicinity
  const isDuplicate = (trade: ParsedTrade): boolean => {
    return existingTrades.some(ex => {
      const timeMatch = Math.abs(new Date(ex.entryTime).getTime() - new Date(trade.entryTime).getTime()) < 60000
      const symbolMatch = ex.symbol?.toLowerCase() === trade.symbol?.toLowerCase()
      const priceMatch = Math.abs((ex.entryPrice || 0) - (trade.entryPrice || 0)) < 0.001
      return timeMatch && symbolMatch && priceMatch
    })
  }

  const handleBulkImport = async () => {
    setIsImporting(true)
    setImportProgress(0)
    const toImport = parsedTrades.filter(t => selectedIds.has(t._id))
    let imported = 0
    let skipped = 0
    let totalPL = 0
    let wins = 0
    let losses = 0

    for (let i = 0; i < toImport.length; i++) {
      const t = toImport[i]
      setImportProgress(Math.round(((i + 1) / toImport.length) * 100))

      if (isDuplicate(t)) {
        skipped++
        continue
      }

      await addTrade({
        symbol: t.symbol,
        market: "forex",
        direction: t.direction,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        stopLoss: t.stopLoss || 0,
        takeProfit: t.takeProfit || 0,
        lotSize: t.lotSize,
        profitLoss: t.profitLoss,
        result: t.result,
        entryTime: t.entryTime,
        exitTime: t.exitTime,
        strategy: "Imported — " + (selectedBroker || "Broker"),
        notes: t.comment || "",
        tags: ["imported", selectedBroker || "broker", t.ticket ? `ticket-${t.ticket}` : ""].filter(Boolean),
      })

      imported++
      if (t.result === "win") wins++
      if (t.result === "loss") losses++
      totalPL += t.profitLoss || 0

      // Give React a tick to breathe
      await new Promise(r => setTimeout(r, 20))
    }

    setImportStats({ total: toImport.length, imported, skipped, totalPL, wins, losses })
    setIsImporting(false)
    setStep("complete")
  }

  const reset = () => {
    setStep("broker")
    setSelectedBroker(null)
    setParsedTrades([])
    setSelectedIds(new Set())
    setImportStats(null)
    setImportProgress(0)
    setFileError(null)
    setScreenshots([])
  }

  const STEPS: { key: Step; label: string }[] = [
    { key: "broker", label: "Choose source" },
    { key: "upload", label: "Upload file" },
    { key: "review", label: "Review trades" },
    { key: "complete", label: "Done" },
  ]

  const stepIndex = STEPS.findIndex(s => s.key === step)
  const selectedPL = parsedTrades.filter(t => selectedIds.has(t._id)).reduce((s, t) => s + (t.profitLoss || 0), 0)
  const broker = BROKERS.find(b => b.id === selectedBroker)

  return (
    <DashboardLayout>
      <Page className="max-w-6xl md:mx-0">
        <PageHeader
          title="Import"
          description="Bring in trades from broker reports and CSV files"
          actions={step !== "broker" && step !== "complete" ? (
            <Button variant="ghost" size="sm" onClick={reset} disabled={isImporting}>
              <X /> Start over
            </Button>
          ) : undefined}
        />

        {/* Steps */}
        <ol className="mb-6 flex items-center gap-2 md:mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.key}>
              <li className={cn(
                "flex items-center gap-2 text-sm",
                i === stepIndex ? "text-foreground" : i < stepIndex ? "text-muted-foreground" : "text-muted-foreground/50"
              )}>
                <span className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium tabular",
                  i < stepIndex ? "bg-brand text-primary-foreground" :
                    i === stepIndex ? "border border-brand text-brand" : "border border-border"
                )}>
                  {i < stepIndex ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className="hidden font-medium sm:inline">{s.label}</span>
              </li>
              {i < STEPS.length - 1 && (
                <li aria-hidden className={cn("h-px flex-1", i < stepIndex ? "bg-brand/50" : "bg-border")} />
              )}
            </React.Fragment>
          ))}
        </ol>

        {/* STEP 1: Source */}
        {step === "broker" && (
          <div className="space-y-6">
            <div className="inline-flex rounded-lg border border-border bg-card p-1">
              {([
                ["report", "Broker report", FileText],
                ["screenshot", "Screenshots", Image],
              ] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    mode === key ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>

            {mode === "report" ? (
              <>
                <div>
                  <p className="mb-3 text-sm font-medium">Select your broker</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {BROKERS.map(b => (
                      <BrokerCard
                        key={b.id}
                        broker={b}
                        selected={selectedBroker === b.id}
                        onSelect={() => setSelectedBroker(b.id)}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button disabled={!selectedBroker} onClick={() => setStep("upload")}>
                    Continue <ArrowRight />
                  </Button>
                </div>
              </>
            ) : (
              <Panel>
                <PanelBody className="space-y-5">
                  <div
                    className="cursor-pointer rounded-xl border-2 border-dashed border-border p-10 text-center transition-colors hover:border-brand/50 hover:bg-accent/30"
                    onClick={() => document.getElementById("screenshot-upload")?.click()}
                  >
                    <input type="file" id="screenshot-upload" multiple accept="image/*" onChange={handleScreenshotUpload} className="hidden" />
                    <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                      <Upload className="size-5" />
                    </span>
                    <p className="text-sm font-medium">Upload trade screenshots</p>
                    <p className="mt-1 text-xs text-muted-foreground">PNG or JPG, up to 10 MB each</p>
                  </div>
                  {screenshots.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {screenshots.map((src, i) => (
                        <div key={i} className="group relative overflow-hidden rounded-lg border border-border">
                          <img src={src} alt="" className="h-24 w-full object-cover" />
                          <button
                            onClick={() => setScreenshots(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute right-1.5 top-1.5 rounded-md bg-background/80 p-1 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                            aria-label="Remove screenshot"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {screenshots.length > 0 && (
                    <Button onClick={() => window.location.href = "/journal"} className="w-full">
                      Continue to log the trade <ArrowRight />
                    </Button>
                  )}
                </PanelBody>
              </Panel>
            )}
          </div>
        )}

        {/* STEP 2: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            {broker && (
              <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary font-mono text-xs font-semibold">{broker.logo}</span>
                <div>
                  <p className="text-sm font-medium">How to export from {broker.name}</p>
                  <p className="text-sm text-muted-foreground">{broker.desc}</p>
                </div>
              </div>
            )}

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors md:p-16",
                dragOver ? "border-brand bg-brand-soft" : "border-border bg-card hover:border-brand/50 hover:bg-accent/30"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <span className={cn(
                  "flex size-14 items-center justify-center rounded-full transition-colors",
                  dragOver ? "bg-brand/20 text-brand" : "bg-secondary text-muted-foreground"
                )}>
                  <FileUp className="size-6" />
                </span>
                <div>
                  <p className="font-medium">{dragOver ? "Drop your file here" : "Drag and drop your report here"}</p>
                  <p className="text-sm text-muted-foreground">or <span className="font-medium text-brand">click to browse</span></p>
                </div>
                <div className="mt-1 flex gap-1.5">
                  {[".html", ".htm", ".csv"].map(fmt => (
                    <span key={fmt} className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">{fmt}</span>
                  ))}
                </div>
              </div>
            </div>

            {fileError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>{fileError}</p>
              </div>
            )}

            <Button variant="outline" onClick={() => setStep("broker")}>Back</Button>
          </div>
        )}

        {/* STEP 3: Review */}
        {step === "review" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
              <StatCard label="Detected" value={parsedTrades.length} icon={FileText} />
              <StatCard label="Selected" value={selectedIds.size} icon={CheckCircle2} />
              <StatCard
                label="Selected P&L"
                value={formatMoney(selectedPL, { sign: true })}
                tone={pnlTone(selectedPL)}
                icon={selectedPL >= 0 ? TrendingUp : TrendingDown}
              />
              <StatCard
                label="Format"
                value={<span className="font-sans text-lg">{importFormat === "mt5-html" ? "MT5 HTML" : importFormat === "mt4-html" ? "MT4 HTML" : "CSV"}</span>}
                icon={Table2}
              />
            </div>

            <Panel className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <button onClick={toggleAll} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground">
                  <Checkbox checked={selectedIds.size === parsedTrades.length} partial={selectedIds.size > 0} />
                  <span><span className="tabular text-foreground">{selectedIds.size}</span> of <span className="tabular">{parsedTrades.length}</span> selected</span>
                </button>
                <p className="text-xs text-muted-foreground">Click a row to include or skip it. Duplicates are skipped automatically.</p>
              </div>
              <div className="max-h-[440px] overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-card">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="w-10 px-3 py-2 font-medium"></th>
                      <th className="px-3 py-2 font-medium">Symbol</th>
                      <th className="px-3 py-2 font-medium">Side</th>
                      <th className="px-3 py-2 font-medium">Lots</th>
                      <th className="hidden px-3 py-2 font-medium md:table-cell">Entry</th>
                      <th className="hidden px-3 py-2 font-medium md:table-cell">Exit</th>
                      <th className="px-3 py-2 text-right font-medium">P&L</th>
                      <th className="hidden px-3 py-2 font-medium sm:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTrades.map(trade => (
                      <TradeRow
                        key={trade._id}
                        trade={trade}
                        selected={selectedIds.has(trade._id)}
                        onToggle={() => toggleTrade(trade._id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            {isImporting && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${importProgress}%` }} />
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("upload")} disabled={isImporting}>
                Back
              </Button>
              <Button onClick={handleBulkImport} disabled={isImporting || selectedIds.size === 0}>
                {isImporting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Importing… <span className="tabular">{importProgress}%</span>
                  </>
                ) : (
                  <>
                    <Upload />
                    Import {selectedIds.size} trade{selectedIds.size !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Complete */}
        {step === "complete" && importStats && (
          <Panel className="mx-auto max-w-lg">
            <PanelBody className="space-y-6 p-8 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
                <CheckCircle2 className="size-7" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Import complete</h2>
                <p className="mt-1 text-sm text-muted-foreground">Your trades have been added to the journal.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  { label: "Imported", value: String(importStats.imported), cls: "" },
                  { label: "Skipped (duplicates)", value: String(importStats.skipped), cls: "text-muted-foreground" },
                  { label: "Total P&L", value: formatMoney(importStats.totalPL, { sign: true }), cls: importStats.totalPL > 0 ? "text-profit" : importStats.totalPL < 0 ? "text-loss" : "" },
                  { label: "Win rate", value: importStats.imported > 0 ? `${Math.round((importStats.wins / importStats.imported) * 100)}%` : "—", cls: "" },
                ].map(stat => (
                  <div key={stat.label} className="rounded-lg border border-border bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className={cn("mt-1 font-mono text-lg font-semibold tabular", stat.cls)}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={reset} className="flex-1">
                  <RefreshCw /> Import more
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/journal"><BookOpen /> View journal</Link>
                </Button>
              </div>
            </PanelBody>
          </Panel>
        )}
      </Page>
    </DashboardLayout>
  )
}
