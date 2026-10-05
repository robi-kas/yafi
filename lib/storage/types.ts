export type TradeResult = "win" | "loss" | "breakeven"
export type TradeMarket = "forex" | "crypto" | "stocks" | "indices" | "metal"
export type TradeDirection = "buy" | "sell"
export type TradeStatus = "open" | "closed"

export interface Trade {
    id: string
    symbol: string
    market: TradeMarket
    direction: TradeDirection
    entryPrice: number
    stopLoss: number
    takeProfit: number
    exitPrice?: number
    lotSize: number
    profitLoss?: number
    result?: TradeResult
    riskToReward?: number
    strategy: string
    entryTime: string
    exitTime?: string
    emotionalState?: string
    notes?: string
    tags: string[]
    screenshots?: string[]
    confluences?: string[]
    mistakes?: string[]
    createdAt?: string

    // ICT / Session fields
    session?: string
    killZone?: string
    htfTimeframe?: string
    htfBias?: string
    trendAlignment?: string
    entryModel?: string

    // Entry requirement checkboxes
    htfPoi?: boolean
    liquiditySweep?: boolean
    mssConfirmed?: boolean
    fvgPresent?: boolean
    ifvgPresent?: boolean
    breakerBlockRetest?: boolean
    orderBlockRetest?: boolean
    fibonacciRetracement?: boolean

    // Emotional tracking
    emotionBefore?: number
    emotionAfter?: number
    emotionTags?: string[]

    // Mistake tagging
    mistakeTags?: string[]

    // Journal quality
    entryReason?: string
    exitReason?: string
    tradeCause?: string
    invalidation?: string
    retakeTrade?: string
    lessonLearned?: string

    // Planned vs achieved
    rrPlanned?: number
    rrAchieved?: number

    // Trade status
    tradeStatus?: TradeStatus
}

export interface Strategy {
    id: string
    name: string
    description: string
    rules?: string
    markets?: string[]
    riskPerTrade?: number
    trades: number
    winRate: number
    avgWin: number
    avgLoss: number
}

export interface Account {
    id: string
    name: string
    broker: string
    balance: number
    currency: string
    isLive: boolean
    type?: "personal" | "prop_firm" | "demo"
    lastUpdated?: string
}

export interface StorageAdapter {
    // Trades
    getTrades(): Promise<Trade[]>
    saveTrade(trade: Partial<Trade>): Promise<Trade>
    updateTrade(id: string, trade: Partial<Trade>): Promise<Trade>
    deleteTrade(id: string): Promise<boolean>

    // Strategies
    getStrategies(): Promise<Strategy[]>
    saveStrategy(strategy: Partial<Strategy>): Promise<Strategy>
    updateStrategy(id: string, strategy: Partial<Strategy>): Promise<Strategy>
    deleteStrategy(id: string): Promise<boolean>

    // Accounts
    getAccounts(): Promise<Account[]>
    saveAccount(account: Partial<Account>): Promise<Account>
    updateAccount(id: string, account: Partial<Account>): Promise<Account>
    deleteAccount(id: string): Promise<boolean>
}
