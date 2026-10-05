"use client"

import React, { useState, useCallback, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useDashboard } from "@/context/dashboard-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Upload, Check, ArrowRight, FileText, Table2, Image,
  X, ChevronDown, TrendingUp, TrendingDown, Zap, RefreshCw,
  ShieldCheck, AlertCircle, Loader2, CheckCircle2, FileUp
} from "lucide-react"
import {
  parseTradeFile, ParsedTrade, ImportFormat
} from "@/lib/trade-import-parser"

// Broker configs
const BROKERS = [
  {
    id: "mt5", name: "MetaTrader 5", logo: "MT5",
    color: "from-blue-600 to-blue-800", supported: ["HTML Statement", "CSV"],
    desc: "Export from MT5: Account > Reports > Full Report",
  },
  {
    id: "mt4", name: "MetaTrader 4", logo: "MT4",
    color: "from-indigo-600 to-indigo-800", supported: ["HTML Statement", "CSV"],
    desc: "Export from MT4: History > Account History > Save as Report",
  },
  {
    id: "exness", name: "Exness", logo: "EX",
    color: "from-emerald-600 to-emerald-800", supported: ["CSV", "HTML"],
    desc: "Download from Exness Personal Area > History",
  },
  {
    id: "ftmo", name: "FTMO", logo: "FT",
    color: "from-orange-600 to-orange-800", supported: ["CSV", "HTML"],
    desc: "Download from FTMO Client Area > Trading Account > History",
  },
  {
    id: "ictm", name: "IC Markets", logo: "IC",
    color: "from-sky-600 to-sky-800", supported: ["CSV"],
    desc: "Download from Client Portal > Trade History",
  },
  {
    id: "generic", name: "Generic CSV", logo: "CSV",
    color: "from-slate-600 to-slate-800", supported: ["CSV"],
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
        "relative flex flex-col gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02] group",
        selected
          ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
          : "border-border/50 bg-card hover:border-border hover:bg-muted/30"
      )}
    >
      {selected && (
        <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <div className={cn(
        "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-black text-sm font-mono",
        broker.color
      )}>
        {broker.logo}
      </div>
      <div>
        <p className="text-sm font-semibold">{broker.name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{broker.desc}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {broker.supported.map(fmt => (
          <span key={fmt} className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-wider">
            {fmt}
          </span>
        ))}
      </div>
    </button>
  )
}

function TradeRow({ trade, selected, onToggle }: {
  trade: ParsedTrade & { _id: string }, selected: boolean, onToggle: () => void
}) {
  const isWin = trade.result === "win"
  const isLoss = trade.result === "loss"
  return (
    <tr
      className={cn(
        "border-b border-border/30 text-xs transition-colors cursor-pointer select-none",
        selected ? "bg-emerald-500/5" : "hover:bg-muted/30",
        !selected && "opacity-60"
      )}
      onClick={onToggle}
    >
      <td className="px-3 py-2.5">
        <div className={cn(
          "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
          selected ? "border-emerald-500 bg-emerald-500" : "border-border"
        )}>
          {selected && <Check className="w-2.5 h-2.5 text-white" />}
        </div>
      </td>
      <td className="px-3 py-2.5 font-mono font-semibold text-foreground">{trade.symbol}</td>
      <td className="px-3 py-2.5">
        <span className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
          trade.direction === "buy"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-red-500/10 text-red-600 dark:text-red-400"
        )}>
          {trade.direction}
        </span>
      </td>
      <td className="px-3 py-2.5 font-mono text-muted-foreground">{trade.lotSize}</td>
      <td className="px-3 py-2.5 font-mono text-muted-foreground">{trade.entryPrice}</td>
      <td className="px-3 py-2.5 font-mono text-muted-foreground">{trade.exitPrice || "—"}</td>
      <td className={cn(
        "px-3 py-2.5 font-mono font-bold",
        isWin ? "text-emerald-600 dark:text-emerald-400" : isLoss ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
      )}>
        {trade.profitLoss !== undefined
          ? `${trade.profitLoss >= 0 ? "+" : ""}$${trade.profitLoss.toFixed(2)}`
          : "—"}
      </td>
      <td className="px-3 py-2.5 text-muted-foreground font-mono">
        {new Date(trade.entryTime).toLocaleDateString()}
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
    { key: "broker", label: "Select Broker" },
    { key: "upload", label: "Upload File" },
    { key: "review", label: "Review Trades" },
    { key: "complete", label: "Done" },
  ]

  const stepIndex = STEPS.findIndex(s => s.key === step)

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <FileUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Trade Import Hub</h1>
              <p className="text-sm text-muted-foreground">Import your broker reports, CSVs, or log trades manually</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all",
                i < stepIndex ? "text-emerald-600 dark:text-emerald-400" :
                  i === stepIndex ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" :
                    "text-muted-foreground/50"
              )}>
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                  i < stepIndex ? "bg-emerald-500 text-white" :
                    i === stepIndex ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40" :
                      "bg-muted text-muted-foreground/40"
                )}>
                  {i < stepIndex ? <Check className="w-2.5 h-2.5" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-px",
                  i < stepIndex ? "bg-emerald-500/40" : "bg-border/30"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* STEP 1: Broker Selection */}
        {step === "broker" && (
          <div className="space-y-6">
            <div className="flex gap-3 mb-4">
              <Button
                variant={mode === "report" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("report")}
                className={mode === "report" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
              >
                <FileText className="w-4 h-4 mr-2" />
                Broker Report
              </Button>
              <Button
                variant={mode === "screenshot" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("screenshot")}
                className={mode === "screenshot" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
              >
                <Image className="w-4 h-4 mr-2" />
                Screenshot Entry
              </Button>
            </div>

            {mode === "report" ? (
              <>
                <div>
                  <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider text-[10px] font-mono">Select Your Broker</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {BROKERS.map(broker => (
                      <BrokerCard
                        key={broker.id}
                        broker={broker}
                        selected={selectedBroker === broker.id}
                        onSelect={() => setSelectedBroker(broker.id)}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    disabled={!selectedBroker}
                    onClick={() => setStep("upload")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              // Screenshot entry mode
              <div className="bg-card border border-border rounded-xl p-8 space-y-6">
                <div
                  className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-emerald-500/40 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("screenshot-upload")?.click()}
                >
                  <input type="file" id="screenshot-upload" multiple accept="image/*" onChange={handleScreenshotUpload} className="hidden" />
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-7 h-7 text-emerald-500" />
                  </div>
                  <p className="text-base font-semibold mb-1">Upload Trade Screenshots</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG (max 10MB each)</p>
                </div>
                {screenshots.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {screenshots.map((s, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
                        <img src={s} alt="" className="w-full h-24 object-cover" />
                        <button
                          onClick={() => setScreenshots(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {screenshots.length > 0 && (
                  <Button onClick={() => window.location.href = "/journal"} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                    Continue to Journal → Log Trade
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: File Upload */}
        {step === "upload" && (
          <div className="space-y-6">
            {/* Instructions */}
            {selectedBroker && (
              <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Export Instructions — {BROKERS.find(b => b.id === selectedBroker)?.name}</p>
                <p className="text-sm text-foreground/80">{BROKERS.find(b => b.id === selectedBroker)?.desc}</p>
              </div>
            )}

            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200",
                dragOver
                  ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
                  : "border-border/60 bg-card hover:border-emerald-500/40 hover:bg-emerald-500/5"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-4">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors",
                  dragOver ? "bg-emerald-500/20" : "bg-muted/50"
                )}>
                  <Upload className={cn("w-8 h-8 transition-colors", dragOver ? "text-emerald-500" : "text-muted-foreground")} />
                </div>
                <div>
                  <p className="text-lg font-semibold mb-1">
                    {dragOver ? "Drop your file here..." : "Drag & drop your report here"}
                  </p>
                  <p className="text-sm text-muted-foreground">or <span className="text-emerald-600 dark:text-emerald-400 font-medium">click to browse</span></p>
                </div>
                <div className="flex gap-2 mt-2">
                  {["HTML", "CSV", "HTM"].map(fmt => (
                    <span key={fmt} className="px-2.5 py-1 bg-muted/70 rounded-md text-xs font-mono font-bold text-muted-foreground">
                      .{fmt.toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {fileError && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-sm">{fileError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("broker")}>Back</Button>
            </div>
          </div>
        )}

        {/* STEP 3: Review Trades */}
        {step === "review" && (
          <div className="space-y-4">
            {/* Summary Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Detected", value: parsedTrades.length, icon: FileText, color: "text-blue-500" },
                { label: "Selected", value: selectedIds.size, icon: CheckCircle2, color: "text-emerald-500" },
                {
                  label: "Est. P&L",
                  value: `${parsedTrades.filter(t => selectedIds.has(t._id)).reduce((s, t) => s + (t.profitLoss || 0), 0) >= 0 ? "+" : ""}$${parsedTrades.filter(t => selectedIds.has(t._id)).reduce((s, t) => s + (t.profitLoss || 0), 0).toFixed(2)}`,
                  icon: TrendingUp, color: "text-emerald-500"
                },
                {
                  label: "Format",
                  value: importFormat === "mt5-html" ? "MT5 HTML" : importFormat === "mt4-html" ? "MT4 HTML" : "CSV",
                  icon: Table2, color: "text-muted-foreground"
                },
              ].map(stat => (
                <div key={stat.label} className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-sm font-bold font-mono">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trade Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleAll}
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                      selectedIds.size === parsedTrades.length
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-border hover:border-emerald-500/50"
                    )}
                  >
                    {selectedIds.size === parsedTrades.length && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                  <p className="text-xs font-mono text-muted-foreground">
                    {selectedIds.size} of {parsedTrades.length} selected
                  </p>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{importFormat.toUpperCase()}</p>
              </div>
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-muted/20 sticky top-0 z-10">
                    <tr className="border-b border-border/50 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      <th className="px-3 py-2 text-left w-8"></th>
                      <th className="px-3 py-2 text-left">Symbol</th>
                      <th className="px-3 py-2 text-left">Dir</th>
                      <th className="px-3 py-2 text-left">Lots</th>
                      <th className="px-3 py-2 text-left">Entry</th>
                      <th className="px-3 py-2 text-left">Exit</th>
                      <th className="px-3 py-2 text-left">P/L</th>
                      <th className="px-3 py-2 text-left">Date</th>
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
            </div>

            {/* Import Button */}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setStep("upload")} disabled={isImporting}>
                Back
              </Button>
              <Button
                onClick={handleBulkImport}
                disabled={isImporting || selectedIds.size === 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-lg shadow-emerald-500/10 h-11"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing... {importProgress}%
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    Import {selectedIds.size} Trade{selectedIds.size !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
            {isImporting && (
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Complete */}
        {step === "complete" && importStats && (
          <div className="max-w-lg mx-auto">
            <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Import Complete!</h2>
                <p className="text-muted-foreground text-sm">Your trades have been added to the journal</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  { label: "Imported", value: importStats.imported, color: "text-emerald-500" },
                  { label: "Skipped (duplicates)", value: importStats.skipped, color: "text-muted-foreground" },
                  { label: "Total P&L", value: `${importStats.totalPL >= 0 ? "+" : ""}$${importStats.totalPL.toFixed(2)}`, color: importStats.totalPL >= 0 ? "text-emerald-500" : "text-red-500" },
                  { label: "Win Rate", value: importStats.imported > 0 ? `${Math.round((importStats.wins / importStats.imported) * 100)}%` : "—", color: "text-blue-500" },
                ].map(stat => (
                  <div key={stat.label} className="bg-muted/30 rounded-xl p-4 border border-border/30">
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{stat.label}</p>
                    <p className={cn("text-xl font-black font-mono mt-1", stat.color)}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={reset} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Import More
                </Button>
                <Button
                  onClick={() => window.location.href = "/journal"}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  View Journal →
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
