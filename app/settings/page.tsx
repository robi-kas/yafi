"use client"

import React, { useRef, useState, useEffect, Suspense } from "react"
import { ProfileSettings } from "@/components/settings/profile-settings"
import { Mt5SyncSettings } from "@/components/settings/mt5-sync-settings"
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
    FileText,
} from "@/components/icons"
import { Copy } from "@/components/icons"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Page, PageHeader, Panel, PanelHeader, PanelBody } from "@/components/kit"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/hooks/use-current-user"
import { isDataUrl, uploadScreenshots, urlToDataUrl, toJpegDataUrl } from "@/lib/screenshot-upload"

export default function SettingsPage() {
    const currentUser = useCurrentUser()
    const { trades, accounts, strategies, addTrade, addAccount, addStrategy, refreshMetrics, addNotification } = useDashboard()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [importing, setImporting] = useState(false)
    const [importStatus, setImportStatus] = useState<string | null>(null)
    const [exporting, setExporting] = useState<'json' | 'pdf' | null>(null)
    const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null)

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
            // Embed screenshots (signed URLs expire) so the backup is self-contained.
            const tradesWithImages = []
            for (const t of fullTrades as any[]) {
                const shots: string[] = Array.isArray(t.screenshots) ? t.screenshots : []
                const embedded = (await Promise.all(shots.map(urlToDataUrl))).filter((x): x is string => !!x)
                tradesWithImages.push({ ...t, screenshots: embedded })
            }
            const exportData = {
                exportedAt: new Date().toISOString(),
                version: "1.1",
                accounts: fullAccounts,
                strategies: fullStrategies,
                trades: tradesWithImages,
            }
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `yafi_export_${new Date().toISOString().split("T")[0]}.json`
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
            let parsed: any
            try {
                parsed = JSON.parse(await file.text())
            } catch {
                throw new Error('Selected file is not valid JSON')
            }
            if (!parsed || (!parsed.trades && !parsed.accounts && !parsed.strategies)) {
                throw new Error('Invalid import file format')
            }

            // Embedded screenshots (base64) are uploaded straight to storage from
            // the browser and replaced with their storage paths, so each request
            // to our API stays far below Vercel's 4.5 MB body limit.
            const sourceTrades: any[] = parsed.trades || []
            const totalShots = sourceTrades.reduce((n, t) => n + (Array.isArray(t.screenshots) ? t.screenshots.filter(isDataUrl).length : 0), 0)
            let doneShots = 0
            const shotErrors: string[] = []
            const trades: any[] = []
            for (const t of sourceTrades) {
                const embedded: string[] = Array.isArray(t.screenshots) ? t.screenshots.filter(isDataUrl) : []
                let paths: string[] = []
                if (embedded.length) {
                    setImportStatus(`Uploading screenshots ${doneShots + 1}–${doneShots + embedded.length} of ${totalShots}…`)
                    try {
                        paths = await uploadScreenshots(embedded.map((dataUrl) => ({ kind: "img" as const, dataUrl })))
                    } catch (err: any) {
                        shotErrors.push(`Screenshots for ${t.symbol || "a trade"}: ${err?.message || "upload failed"}`)
                    }
                    doneShots += embedded.length
                }
                const { screenshots, ...rest } = t
                trades.push(paths.length ? { ...rest, screenshots: paths } : rest)
            }
            setImportStatus("Saving trades…")
            const batches: any[] = [{ accounts: parsed.accounts || [], strategies: parsed.strategies || [] }]
            const BATCH_SIZE = 50
            for (let i = 0; i < trades.length; i += BATCH_SIZE) {
                batches.push({ trades: trades.slice(i, i + BATCH_SIZE) })
            }

            let saved = 0
            const errors: string[] = [...shotErrors]
            for (const batch of batches) {
                if (!batch.trades?.length && !batch.accounts?.length && !batch.strategies?.length) continue
                const res = await fetch('/api/db/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(batch)
                })
                const text = await res.text()
                let data: any
                try {
                    data = JSON.parse(text)
                } catch {
                    throw new Error(`Server error (${res.status}): ${text.slice(0, 200)}`)
                }
                if (!res.ok) {
                    throw new Error(data.error || 'Import failed')
                }
                saved += data.saved || 0
                errors.push(...(data.errors || []))
            }

            setImportResult({ success: saved, errors })
            if (saved > 0) {
                await refreshMetrics()
            }
        } catch (err: any) {
            setImportResult({ success: 0, errors: [err.message || "Failed to import file"] })
        } finally {
            setImporting(false)
            setImportStatus(null)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const handleExportPDF = async () => {
        setExporting('pdf')
        try {
            const tradesRes = await fetch('/api/db?type=trades&full=true')
            const pdfTrades: Trade[] = await tradesRes.json()

            // jsPDF only embeds PNG/JPEG data, so convert stored screenshots first.
            const pdfImages = new Map<string, string[]>()
            for (const t of pdfTrades) {
                if (!t.screenshots?.length) continue
                const imgs = (await Promise.all(t.screenshots.map((src) => toJpegDataUrl(src)))).filter((x): x is string => !!x)
                pdfImages.set(t.id, imgs)
            }

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

                for (const img of pdfImages.get(t.id) || []) {
                    if (yPos > 220) { doc.addPage(); yPos = 20; }
                    try {
                        doc.addImage(img, 'JPEG', 22, yPos, 163, 60, undefined, 'FAST')
                        yPos += 65
                    } catch (e) { console.error("Could not add image to PDF", e) }
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


    const Row = ({ title, description, children, className }: { title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode; className?: string }) => (
        <div className={cn("flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between", className)}>
            <div className="min-w-0">
                <p className="text-sm font-medium">{title}</p>
                {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
            </div>
            {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
        </div>
    )

    return (
        <DashboardLayout>
            <Page className="max-w-4xl md:mx-0">
                <PageHeader title="Settings" description="Your profile, broker connection and data" />

                <div className="space-y-4 md:space-y-6">
                    {/* Profile: name, email, password */}
                    <Suspense fallback={null}>
                        <ProfileSettings />
                    </Suspense>

                    {/* Preferences */}
                    <Panel>
                        <PanelHeader title="Preferences" description="Customize your trading experience" icon={Palette} />
                        <PanelBody className="divide-y divide-border">
                            <Row title="Theme" description="Switch between light and dark with the button at the bottom of the sidebar." />
                            {["Trade notifications", "Daily summary"].map((label) => (
                                <Row key={label} title={label}>
                                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">Coming soon</span>
                                </Row>
                            ))}
                        </PanelBody>
                    </Panel>

                    {/* MT5 auto-sync */}
                    <Mt5SyncSettings />

                    {/* Data */}
                    <Panel>
                        <PanelHeader title="Data" description="Back up, restore and export your journal" icon={FileJson} />
                        <PanelBody className="divide-y divide-border">
                            <Row
                                title="Export all data"
                                description={`Download ${accounts.length} account${accounts.length === 1 ? "" : "s"}, ${strategies.length} strateg${strategies.length === 1 ? "y" : "ies"} and ${trades.length} trade${trades.length === 1 ? "" : "s"} as JSON.`}
                            >
                                <Button variant="outline" onClick={handleExportJSON} disabled={exporting !== null}>
                                    {exporting === 'json' ? <Loader2 className="animate-spin" /> : <Download />}
                                    {exporting === 'json' ? 'Exporting…' : 'Export JSON'}
                                </Button>
                            </Row>
                            <Row title="Import data" description={importStatus ?? "Restore accounts, strategies, trades and screenshots from a YAFI JSON export. Existing items are updated, not duplicated."}>
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                                    {importing ? <Loader2 className="animate-spin" /> : <Upload />}
                                    {importing ? "Importing…" : "Import JSON"}
                                </Button>
                                <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                            </Row>
                            {importResult && (
                                <div className="py-4">
                                    {importResult.errors.length > 0 ? (
                                        <div className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/10 p-3 text-warning">
                                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                            <div className="min-w-0 text-sm">
                                                <p className="font-medium">
                                                    {importResult.success} imported, {importResult.errors.length} failed
                                                </p>
                                                <ul className="mt-1 space-y-0.5 text-xs opacity-80">
                                                    {importResult.errors.slice(0, 5).map((err, i) => (
                                                        <li key={i} className="break-words">{err}</li>
                                                    ))}
                                                    {importResult.errors.length > 5 && <li>…and {importResult.errors.length - 5} more</li>}
                                                </ul>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 rounded-lg border border-profit/25 bg-profit/10 p-3 text-sm text-profit">
                                            <CheckCircle2 className="size-4 shrink-0" />
                                            Imported {importResult.success} item{importResult.success === 1 ? "" : "s"} successfully.
                                        </div>
                                    )}
                                </div>
                            )}
                            <Row title="PDF report" description="A printable summary of your performance and every trade.">
                                <Button variant="outline" onClick={handleExportPDF} disabled={exporting !== null}>
                                    {exporting === 'pdf' ? <Loader2 className="animate-spin" /> : <FileText />}
                                    {exporting === 'pdf' ? 'Generating…' : 'Export PDF'}
                                </Button>
                            </Row>
                        </PanelBody>
                    </Panel>

                    {/* Danger zone */}
                    <Panel className="border-destructive/30">
                        <PanelHeader title={<span className="text-destructive">Danger zone</span>} description="These actions can't be undone" icon={AlertTriangle} />
                        <PanelBody>
                            <Row
                                title="Clear all data"
                                description="Permanently delete all of your trades, strategies and accounts. Export a backup first."
                            >
                                <Button
                                    variant="outline"
                                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
                                >
                                    Clear data
                                </Button>
                            </Row>
                        </PanelBody>
                    </Panel>
                </div>
            </Page>
        </DashboardLayout>
    )
}
