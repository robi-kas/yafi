"use client"

import React, { useRef, useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useDashboard, Trade } from "@/context/dashboard-context"
import { getWinLossCounts, calculateWinRate } from "@/lib/trading-metrics"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
    Download,
    Upload,
    Database,
    Settings as SettingsIcon,
    User,
    Palette,
    FileJson,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Server,
    RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const settingsSections = [
    {
        title: "Account Information",
        icon: User,
        description: "Manage your personal details and broker connections",
        items: [
            { label: "Email", value: "yafettadele339@gmail.com" },
            { label: "Role", value: "Forex Trader" },
        ],
    },
    {
        title: "Preferences",
        icon: Palette,
        description: "Customize your trading experience",
        items: [
            { label: "Theme", value: "Dark", toggle: true },
            { label: "Trade Notifications", value: "Enabled", toggle: true },
            { label: "Daily Summary", value: "Enabled", toggle: true },
        ],
    },
]

export default function SettingsPage() {
    const { trades, accounts, strategies, addTrade, addAccount, addStrategy, refreshMetrics, addNotification } = useDashboard()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [importing, setImporting] = useState(false)
    const [exporting, setExporting] = useState<'json' | 'pdf' | null>(null)
    const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null)

    // MT5 Sync State
    const [mt5Account, setMt5Account] = useState("")
    const [mt5Password, setMt5Password] = useState("")
    const [mt5Server, setMt5Server] = useState("Exness-MT5Real27")
    const [syncPeriod, setSyncPeriod] = useState("30days")
    const [customFrom, setCustomFrom] = useState("")
    const [customTo, setCustomTo] = useState("")
    const [syncingMt5, setSyncingMt5] = useState(false)

    // Load saved MT5 credentials on mount from backend
    useEffect(() => {
        fetch('/api/mt5/config')
            .then(res => res.json())
            .then(data => {
                if (data.account) setMt5Account(data.account)
                if (data.password) setMt5Password(data.password)
                if (data.server) setMt5Server(data.server)
            })
            .catch(console.error)
    }, [])

    const saveCredentials = async () => {
        try {
            await fetch('/api/mt5/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account: mt5Account, password: mt5Password, server: mt5Server })
            })
            addNotification({ title: 'Saved', message: 'Credentials saved permanently to disk', type: 'success' })
        } catch (e) {
            addNotification({ title: 'Error', message: 'Failed to save credentials', type: 'error' })
        }
    }

    const handleSyncMT5 = async () => {
        if (!mt5Account || !mt5Password || !mt5Server) {
            addNotification({ title: 'Missing Fields', message: 'Please enter account, password, and server', type: 'error' })
            return
        }
        
        if (syncPeriod === 'custom' && (!customFrom || !customTo)) {
            addNotification({ title: 'Missing Dates', message: 'Please select both start and end dates', type: 'error' })
            return
        }
        
        // Save for future use
        saveCredentials()
        
        let fromDate = new Date()
        let toDate = new Date()
        
        switch (syncPeriod) {
            case "today":
                fromDate.setHours(0, 0, 0, 0)
                break
            case "yesterday":
                fromDate.setDate(fromDate.getDate() - 1)
                fromDate.setHours(0, 0, 0, 0)
                toDate.setDate(toDate.getDate() - 1)
                toDate.setHours(23, 59, 59, 999)
                break
            case "week":
                fromDate.setDate(fromDate.getDate() - fromDate.getDay())
                fromDate.setHours(0, 0, 0, 0)
                break
            case "month":
                fromDate.setDate(1)
                fromDate.setHours(0, 0, 0, 0)
                break
            case "year":
                fromDate.setMonth(0, 1)
                fromDate.setHours(0, 0, 0, 0)
                break
            case "custom":
                fromDate = new Date(customFrom)
                fromDate.setHours(0, 0, 0, 0)
                toDate = new Date(customTo)
                toDate.setHours(23, 59, 59, 999)
                break
            case "30days":
            default:
                fromDate.setDate(fromDate.getDate() - 30)
                break
        }
        
        const formatLocalISO = (d: Date) => {
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
        };

        setSyncingMt5(true)
        try {
            const res = await fetch('/api/mt5/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    account: mt5Account, 
                    password: mt5Password, 
                    server: mt5Server,
                    fromDate: formatLocalISO(fromDate),
                    toDate: formatLocalISO(toDate)
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to sync')
            
            addNotification({ title: 'MT5 Sync Complete', message: `Found ${data.totalDealsFound} deals. Synced ${data.saved} new trades!`, type: 'success' })
            if (data.saved > 0) {
                await refreshMetrics()
            }
        } catch (err: any) {
            addNotification({ title: 'MT5 Sync Failed', message: err.message, type: 'error' })
        } finally {
            setSyncingMt5(false)
        }
    }

    const handleExportJSON = async () => {
        setExporting('json')
        try {
            // Fetch full trade data including screenshots directly from API
            const [tradesRes, strategiesRes, accountsRes] = await Promise.all([
                fetch('/api/db?type=trades&full=true'),
                fetch('/api/db?type=strategies'),
                fetch('/api/db?type=accounts'),
            ])
            const [fullTrades, fullStrategies, fullAccounts] = await Promise.all([
                tradesRes.json(),
                strategiesRes.json(),
                accountsRes.json(),
            ])
            const exportData = {
                exportedAt: new Date().toISOString(),
                version: "1.0",
                accounts: fullAccounts,
                strategies: fullStrategies,
                trades: fullTrades,
            }
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `yafu_export_${new Date().toISOString().split("T")[0]}.json`
            a.click()
            URL.revokeObjectURL(url)
            addNotification({ title: 'Export Successful', message: `Exported ${fullTrades.length} trades`, type: 'success' })
        } catch (err: any) {
            addNotification({ title: 'Export Failed', message: err.message || 'Could not export data', type: 'error' })
        } finally {
            setExporting(null)
        }
    }

    const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setImporting(true)
        setImportResult(null)
        
        try {
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/db/import', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()
            
            if (!res.ok) {
                throw new Error(data.error || 'Import failed')
            }

            setImportResult({ success: data.saved, errors: data.errors || [] })
            if (data.saved > 0) {
                await refreshMetrics()
            }
        } catch (err: any) {
            setImportResult({ success: 0, errors: [err.message || "Failed to import file"] })
        } finally {
            setImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const handleExportPDF = async () => {
        setExporting('pdf')
        try {
            const tradesRes = await fetch('/api/db?type=trades&full=true')
            const pdfTrades: Trade[] = await tradesRes.json()

            const doc = new jsPDF()
            const { wins, losses } = getWinLossCounts(pdfTrades)
            const stats = {
                totalTrades: pdfTrades.length,
                wins,
                losses,
                totalPL: pdfTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0)
            }
            const winRate = calculateWinRate(wins, losses).toFixed(1)

            let yPos = 0

            // Top Header Strip (Dark Mode Style)
            doc.setFillColor(15, 23, 42) // Slate-900
            doc.rect(0, 0, 210, 45, 'F')

            doc.setFontSize(28)
            doc.setTextColor(255, 255, 255)
            doc.setFont("helvetica", "bold")
            doc.text("YAFU Journal", 15, 25)

            doc.setFontSize(10)
            doc.setTextColor(16, 185, 129) // Emerald-500
            doc.text("TRADING REPORT", 15, 32)

            // Summary Stats in Header
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(9)
            doc.text("TOTAL P&L", 140, 18)
            doc.setFontSize(14)
            const plColor = stats.totalPL >= 0 ? [16, 185, 129] : [239, 68, 68]
            doc.setTextColor(plColor[0], plColor[1], plColor[2])
            doc.text(`$${stats.totalPL.toLocaleString()}`, 140, 25)

            doc.setTextColor(255, 255, 255)
            doc.setFontSize(9)
            doc.text("WIN RATE", 175, 18)
            doc.setFontSize(14)
            doc.text(`${winRate}%`, 175, 25)

            yPos = 55
            doc.setTextColor(100, 116, 139) // Slate-500
            doc.setFontSize(8)
            doc.setFont("helvetica", "normal")
            doc.text(`Generated: ${new Date().toLocaleString()}`, 15, yPos)
            yPos += 15

            pdfTrades.forEach((t: Trade) => {
                const wrappedNotes = t.notes ? doc.splitTextToSize(t.notes, 160) : ["No notes recorded."]
                const noteLines = wrappedNotes.length
                const imageCount = t.screenshots?.length || 0

                const baseCardHeight = 40
                const notesSectionHeight = Math.max(10, noteLines * 4.5)
                const totalSectionHeight = baseCardHeight + notesSectionHeight + (imageCount > 0 ? imageCount * 65 : 0) + 15

                if (yPos + totalSectionHeight > 280) {
                    doc.addPage()
                    yPos = 20
                }

                doc.setFillColor(248, 250, 252)
                doc.setDrawColor(226, 232, 240)
                doc.roundedRect(14, yPos, 182, baseCardHeight + notesSectionHeight + 5, 2, 2, 'FD')

                const resultColor = t.direction === 'buy' ? [16, 185, 129] : t.direction === 'sell' ? [239, 68, 68] : [100, 116, 139]
                doc.setFillColor(resultColor[0], resultColor[1], resultColor[2])
                doc.rect(14, yPos, 2, baseCardHeight + notesSectionHeight + 5, 'F')

                let contentY = yPos + 8

                doc.setFontSize(12)
                doc.setFont("helvetica", "bold")
                doc.setTextColor(30, 41, 59)
                doc.text(`${t.symbol} ${t.direction.toUpperCase()}`, 22, contentY)

                doc.setFontSize(9)
                doc.setTextColor(resultColor[0], resultColor[1], resultColor[2])
                doc.text(t.direction?.toUpperCase() || "OPEN", 175, contentY, { align: 'right' })

                contentY += 8
                doc.setDrawColor(226, 232, 240)
                doc.line(22, contentY - 3, 185, contentY - 3)

                doc.setFontSize(8)
                doc.setTextColor(100, 116, 139)
                doc.setFont("helvetica", "bold")
                doc.text("BASICS", 22, contentY); doc.text("LEVELS", 75, contentY); doc.text("TIMING", 130, contentY)
                contentY += 5

                doc.setFont("helvetica", "normal")
                doc.setTextColor(71, 85, 105)
                doc.text(`Market: ${t.market}`, 22, contentY);
                doc.text(`Entry: ${t.entryPrice.toLocaleString()}`, 75, contentY);
                doc.text(`Entered: ${new Date(t.entryTime).toLocaleDateString()}`, 130, contentY)
                contentY += 4
                doc.text(`Size: ${(t as any).positionSize ?? (t as any).lotSize ?? '-'}`, 22, contentY);
                doc.text(`SL: ${t.stopLoss.toLocaleString()}`, 75, contentY);
                doc.text(`Time: ${new Date(t.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 130, contentY)
                contentY += 4
                doc.text(`Strategy: ${t.strategy}`, 22, contentY);
                doc.text(`TP: ${t.takeProfit.toLocaleString()}`, 75, contentY)
                contentY += 10

                doc.setFillColor(resultColor[0], resultColor[1], resultColor[2])
                doc.rect(22, contentY - 4, 163, notesSectionHeight + 6, 'F')
                doc.setFont("helvetica", "bold")
                doc.setTextColor(255, 255, 255)
                doc.text(`P/L: $${(t.profitLoss || 0).toLocaleString()}`, 26, contentY + 1)
                doc.setTextColor(255, 255, 255)
                doc.setFont("helvetica", "normal")
                doc.text(wrappedNotes, 75, contentY + 1)

                yPos += baseCardHeight + notesSectionHeight + 10

                if (t.screenshots && t.screenshots.length > 0) {
                    t.screenshots.forEach((imgBase64) => {
                        if (yPos > 220) { doc.addPage(); yPos = 20; }
                        try {
                            if (imgBase64.startsWith('data:image')) {
                                const format = imgBase64.toLowerCase().includes('png') ? 'PNG' : 'JPEG'
                                doc.addImage(imgBase64, format, 22, yPos, 163, 60, undefined, 'FAST')
                                yPos += 65
                            }
                        } catch (e) { console.error("Could not add image to PDF", e) }
                    })
                }
                yPos += 10
            })

            doc.setFont("helvetica", "normal")
            doc.setFontSize(8)
            doc.setTextColor(148, 163, 184)
            doc.text("YAFU Journal - Confidence in Discipline", 105, 285, { align: 'center' })

            doc.save(`yafu_journal_${new Date().toISOString().split('T')[0]}.pdf`)
            addNotification({ title: 'PDF Exported', message: `Generated PDF for ${pdfTrades.length} trades`, type: 'success' })
        } catch (err: any) {
            addNotification({ title: 'PDF Export Failed', message: err.message || 'Could not generate PDF', type: 'error' })
        } finally {
            setExporting(null)
        }
    }

    return (
        <DashboardLayout>
            <div className="p-8 max-w-4xl">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <SettingsIcon className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                            Account Settings
                        </span>
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your profile and trading preferences
                    </p>
                </div>

                <div className="space-y-6">
                    {settingsSections.map((section) => (
                        <div key={section.title} className="bg-card border border-border rounded-lg overflow-hidden">
                            <div className="p-6 border-b border-border bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <section.icon className="w-5 h-5 text-emerald-500" />
                                    <h2 className="text-lg font-semibold">{section.title}</h2>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                            </div>
                            <div className="p-0">
                                {section.items.map((item, idx) => (
                                    <div
                                        key={item.label}
                                        className={`flex items-center justify-between p-4 px-6 ${idx !== section.items.length - 1 ? 'border-b border-border' : ''
                                            }`}
                                    >
                                        <span className="text-sm font-medium">{item.label}</span>
                                        <span className="text-sm text-muted-foreground font-mono">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* MT5 Auto-Sync Section */}
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <div className="p-6 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-3">
                                <Server className="w-5 h-5 text-emerald-500" />
                                <h2 className="text-lg font-semibold">MT5 Broker Connection</h2>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Connect your investor account to automatically sync your trading history</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Account Number</label>
                                    <input 
                                        type="text" 
                                        value={mt5Account}
                                        onChange={(e) => setMt5Account(e.target.value)}
                                        placeholder="e.g. 12345678"
                                        className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Investor Password</label>
                                    <input 
                                        type="password" 
                                        value={mt5Password}
                                        onChange={(e) => setMt5Password(e.target.value)}
                                        placeholder="Read-only password"
                                        className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Server</label>
                                    <input 
                                        type="text" 
                                        value={mt5Server}
                                        onChange={(e) => setMt5Server(e.target.value)}
                                        placeholder="e.g. Exness-MT5Real27"
                                        className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Time Period</label>
                                    <select 
                                        value={syncPeriod}
                                        onChange={(e) => setSyncPeriod(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                    >
                                        <option value="today">Today</option>
                                        <option value="yesterday">Yesterday</option>
                                        <option value="week">This Week</option>
                                        <option value="month">This Month</option>
                                        <option value="year">This Year</option>
                                        <option value="30days">Last 30 Days</option>
                                        <option value="custom">Custom Date Range</option>
                                    </select>
                                </div>
                                {syncPeriod === 'custom' && (
                                    <>
                                        <div>
                                            <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Start Date</label>
                                            <input 
                                                type="date" 
                                                value={customFrom}
                                                onChange={(e) => setCustomFrom(e.target.value)}
                                                className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1.5 block text-muted-foreground">End Date</label>
                                            <input 
                                                type="date" 
                                                value={customTo}
                                                onChange={(e) => setCustomTo(e.target.value)}
                                                className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <Button onClick={saveCredentials} className="gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                                    <Database className="w-4 h-4" />
                                    Save Credentials
                                </Button>
                                <Button onClick={handleSyncMT5} disabled={syncingMt5} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <Download className="w-4 h-4" />
                                    {syncingMt5 ? 'Syncing...' : 'Auto-Sync Trades'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Data & Export Section */}
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <div className="p-6 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-3">
                                <Database className="w-5 h-5 text-emerald-500" />
                                <h2 className="text-lg font-semibold">Data & Export</h2>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Manage your trading data and generate reports</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">
                                <div>
                                    <h3 className="text-sm font-medium">Export Trading Journal</h3>
                                    <p className="text-xs text-muted-foreground mt-1">Generate a high-quality PDF report of all your trades</p>
                                </div>
                                <Button onClick={handleExportPDF} disabled={exporting !== null} className="gap-2">
                                    {exporting === 'pdf' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4" />
                                    )}
                                    {exporting === 'pdf' ? 'Generating...' : 'Export PDF'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Import / Export All Data */}
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <div className="p-6 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-3">
                                <FileJson className="w-5 h-5 text-emerald-500" />
                                <h2 className="text-lg font-semibold">Import / Export All Data</h2>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Transfer all accounts, strategies, trades, and screenshots as JSON
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">
                                <div>
                                    <h3 className="text-sm font-medium">Export All Data</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Download accounts ({accounts.length}), strategies ({strategies.length}), and trades ({trades.length}) including screenshots
                                    </p>
                                </div>
                                <Button onClick={handleExportJSON} disabled={exporting !== null} className="gap-2">
                                    {exporting === 'json' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4" />
                                    )}
                                    {exporting === 'json' ? 'Exporting...' : 'Export JSON'}
                                </Button>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">
                                <div>
                                    <h3 className="text-sm font-medium">Import All Data</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Upload a previously exported JSON file to restore accounts, strategies, and trades
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {importResult && (
                                        <div className={`text-xs ${importResult.errors.length === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                                            {importResult.success} imported
                                            {importResult.errors.length > 0 && `, ${importResult.errors.length} failed`}
                                        </div>
                                    )}
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={importing}
                                        className="gap-2"
                                    >
                                        {importing ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Upload className="w-4 h-4" />
                                        )}
                                        {importing ? "Importing..." : "Import JSON"}
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json"
                                        onChange={handleImportJSON}
                                        className="hidden"
                                    />
                                </div>
                            </div>
                            {importResult && importResult.errors.length > 0 && (
                                <div className="p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-medium text-amber-400">Import completed with {importResult.errors.length} error(s)</p>
                                            <ul className="mt-1 space-y-0.5">
                                                {importResult.errors.slice(0, 5).map((err, i) => (
                                                    <li key={i} className="text-[10px] text-amber-400/70">{err}</li>
                                                ))}
                                                {importResult.errors.length > 5 && (
                                                    <li className="text-[10px] text-amber-400/70">...and {importResult.errors.length - 5} more</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {importResult && importResult.errors.length === 0 && importResult.success > 0 && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <p className="text-xs text-emerald-400">Successfully imported {importResult.success} item(s)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Danger Zone Section */}
                    <div className="bg-card border border-red-500/30 rounded-lg overflow-hidden">
                        <div className="p-6 border-b border-border bg-red-500/5">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                <h2 className="text-lg font-semibold text-red-500">Danger Zone</h2>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Destructive actions that cannot be undone
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">
                                <div>
                                    <h3 className="text-sm font-medium text-red-500">Clear All Data</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Permanently delete all trades, accounts, strategies, and settings.
                                    </p>
                                </div>
                                <Button 
                                    onClick={async () => {
                                        if (window.confirm("Are you absolutely sure? This will wipe your entire journal and cannot be undone.")) {
                                            try {
                                                const res = await fetch('/api/db/clear', { method: 'POST' });
                                                if (!res.ok) throw new Error("Failed to clear database");
                                                addNotification({ title: 'Data Wiped', message: 'All data has been cleared.', type: 'success' });
                                                // Hard reload to reset all states globally
                                                setTimeout(() => window.location.reload(), 1000);
                                            } catch (err: any) {
                                                addNotification({ title: 'Error', message: err.message, type: 'error' });
                                            }
                                        }
                                    }} 
                                    className="gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30"
                                    variant="outline"
                                >
                                    Clear Database
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
