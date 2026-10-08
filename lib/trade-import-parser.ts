// Trade Import Parser
// Supports MT4/MT5 HTML statements and generic CSV files

export interface ParsedTrade {
    symbol: string
    direction: "buy" | "sell"
    lotSize: number
    entryPrice: number
    exitPrice?: number
    stopLoss?: number
    takeProfit?: number
    profitLoss?: number
    entryTime: string
    exitTime?: string
    ticket?: string
    comment?: string
    swap?: number
    commission?: number
    result?: "win" | "loss" | "breakeven"
}

export type ImportFormat = "mt4-html" | "mt5-html" | "csv-generic" | "unknown"

// ------- Format Detection -------

export function detectFormat(content: string): ImportFormat {
    const lower = content.toLowerCase()
    if (lower.includes("metatrader 5") || lower.includes("statement for account")) {
        return "mt5-html"
    }
    if (lower.includes("metatrader 4") || lower.includes("mt4")) {
        return "mt4-html"
    }
    // Check if it looks like a CSV (first line has comma separated values)
    const firstLine = content.split("\n")[0] || ""
    if ((firstLine.match(/,/g) || []).length >= 3) {
        return "csv-generic"
    }
    return "unknown"
}

// ------- MT5 HTML Parser -------

export function parseMT5HTML(html: string): ParsedTrade[] {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    const trades: ParsedTrade[] = []

    const tables = doc.querySelectorAll("table")

    for (const table of Array.from(tables)) {
        const rows = table.querySelectorAll("tr")
        let headerRow: string[] = []
        let inPositionsSection = false

        for (const row of Array.from(rows)) {
            const rawCells = Array.from(row.querySelectorAll("th, td"))
            
            // Stop parsing if we hit Orders or Deals sections
            const rowText = row.textContent?.toLowerCase() || ""
            if (rowText.includes("orders") && row.querySelectorAll("th").length > 0) {
                inPositionsSection = false
                break
            }
            
            const cells = rawCells
                .filter(c => !c.classList.contains("hidden") && c.getAttribute("class") !== "hidden")
                .map(c => c.textContent?.trim() || "")

            // Detect Positions header row
            if (cells.some(c => c.toLowerCase() === "position") && cells.some(c => c.toLowerCase() === "symbol")) {
                headerRow = cells.map(c => c.toLowerCase())
                inPositionsSection = true
                continue
            }

            if (!inPositionsSection || headerRow.length === 0) continue
            if (cells.length < 5) continue

            // The 'get' helper finds the index in the header row
            const get = (key: string, skipIndex = -1) => {
                const idx = headerRow.findIndex((h, i) => h.includes(key) && i > skipIndex)
                return { val: idx >= 0 ? cells[idx] : "", idx }
            }

            const symbol = get("symbol").val
            const typeStr = get("type").val

            // Skip balance/credit or invalid rows
            if (!symbol || typeStr.toLowerCase() === "balance" || typeStr.toLowerCase() === "credit") continue

            const direction: "buy" | "sell" = typeStr.toLowerCase().includes("buy") ? "buy" : "sell"
            
            // Volume is usually like "0.01 / 0.01" for closed, or "0.01" for open
            const volStr = get("volume").val
            const volume = parseFloat(volStr.split("/")[0]) || 0
            
            // Positions have two 'price' and 'time' columns (entry and exit)
            const entryTimeObj = get("time")
            const exitTimeObj = get("time", entryTimeObj.idx)
            
            const entryPriceObj = get("price")
            const exitPriceObj = get("price", entryPriceObj.idx)
            
            const entryPrice = parseFloat(entryPriceObj.val) || 0
            const exitPriceStr = exitPriceObj.val
            const exitPrice = exitPriceStr ? parseFloat(exitPriceStr) : undefined
            
            const profit = parseFloat(get("profit").val) || 0
            const swap = parseFloat(get("swap").val) || 0
            const commission = parseFloat(get("commission").val) || 0
            
            const entryTime = entryTimeObj.val || new Date().toISOString()
            const exitTime = exitTimeObj.val || undefined
            const ticket = get("position").val || ""

            const netProfit = profit + swap + commission
            const result: "win" | "loss" | "breakeven" =
                netProfit > 0 ? "win" : netProfit < 0 ? "loss" : "breakeven"

            trades.push({
                symbol,
                direction,
                lotSize: volume,
                entryPrice,
                exitPrice,
                profitLoss: profit !== undefined ? netProfit : undefined,
                entryTime,
                exitTime,
                swap,
                commission,
                ticket,
                result,
            })
        }
    }

    return trades
}

// ------- Generic CSV Parser -------

const KNOWN_COLUMNS: Record<string, string[]> = {
    symbol: ["symbol", "instrument", "pair", "asset"],
    direction: ["type", "direction", "side", "action", "order type"],
    lotSize: ["volume", "lots", "lot size", "size", "qty", "quantity"],
    entryPrice: ["open price", "entry price", "entry", "open", "price"],
    exitPrice: ["close price", "exit price", "exit", "close"],
    profitLoss: ["profit", "pl", "p&l", "pnl", "net p&l", "gain/loss"],
    entryTime: ["open time", "entry time", "time", "date", "open date"],
    exitTime: ["close time", "exit time", "close date"],
    stopLoss: ["sl", "stop loss", "stoploss"],
    takeProfit: ["tp", "take profit", "takeprofit"],
    swap: ["swap"],
    commission: ["commission", "fee"],
    ticket: ["ticket", "deal", "order", "id", "order id"],
}

function findColumnIndex(headers: string[], aliases: string[]): number {
    const lowerHeaders = headers.map(h => h.toLowerCase().trim())
    for (const alias of aliases) {
        const idx = lowerHeaders.findIndex(h => h === alias || h.includes(alias))
        if (idx >= 0) return idx
    }
    return -1
}

export function parseCSV(csv: string): ParsedTrade[] {
    const lines = csv.split("\n").filter(l => l.trim())
    if (lines.length < 2) return []

    // Auto-detect separator
    const firstLine = lines[0]
    const sep = firstLine.includes(";") ? ";" : ","

    const headers = firstLine.split(sep).map(h => h.replace(/"/g, "").trim())

    // Build column index map
    const colIdx: Record<string, number> = {}
    for (const [key, aliases] of Object.entries(KNOWN_COLUMNS)) {
        colIdx[key] = findColumnIndex(headers, aliases)
    }

    const trades: ParsedTrade[] = []

    for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(sep).map(c => c.replace(/"/g, "").trim())
        if (cells.length < 3) continue

        const get = (key: string): string => {
            const idx = colIdx[key]
            return idx >= 0 && idx < cells.length ? cells[idx] : ""
        }

        const symbol = get("symbol")
        if (!symbol) continue

        const dirRaw = get("direction").toLowerCase()
        const direction: "buy" | "sell" = dirRaw.includes("buy") || dirRaw === "0" ? "buy" : "sell"
        const lotSize = parseFloat(get("lotSize")) || 0
        const entryPrice = parseFloat(get("entryPrice")) || 0
        const exitPrice = parseFloat(get("exitPrice")) || undefined
        const profitLoss = parseFloat(get("profitLoss")) || undefined
        const swap = parseFloat(get("swap")) || 0
        const commission = parseFloat(get("commission")) || 0
        const entryTime = get("entryTime") || new Date().toISOString()
        const exitTime = get("exitTime") || undefined
        const stopLoss = parseFloat(get("stopLoss")) || undefined
        const takeProfit = parseFloat(get("takeProfit")) || undefined
        const ticket = get("ticket")

        const netProfit = (profitLoss || 0) + swap + commission
        const result: "win" | "loss" | "breakeven" =
            netProfit > 0 ? "win" : netProfit < 0 ? "loss" : "breakeven"

        trades.push({
            symbol,
            direction,
            lotSize,
            entryPrice,
            exitPrice,
            profitLoss: profitLoss !== undefined ? netProfit : undefined,
            entryTime,
            exitTime,
            stopLoss,
            takeProfit,
            swap,
            commission,
            ticket,
            result,
        })
    }

    return trades
}

// ------- Master Parse Function -------

export function parseTradeFile(content: string, filename: string): { trades: ParsedTrade[], format: ImportFormat } {
    const ext = filename.split(".").pop()?.toLowerCase()
    let format: ImportFormat

    if (ext === "html" || ext === "htm") {
        format = detectFormat(content)
        if (format === "unknown") format = "mt5-html"
        const trades = parseMT5HTML(content)
        return { trades, format }
    }

    if (ext === "csv") {
        format = "csv-generic"
        const trades = parseCSV(content)
        return { trades, format }
    }

    // Try auto-detect
    format = detectFormat(content)
    if (format === "mt5-html" || format === "mt4-html") {
        return { trades: parseMT5HTML(content), format }
    }
    if (format === "csv-generic") {
        return { trades: parseCSV(content), format }
    }

    return { trades: [], format: "unknown" }
}
