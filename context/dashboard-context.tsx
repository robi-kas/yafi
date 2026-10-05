"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react"
import { StorageAdapter, Trade as StorageTrade, Strategy as StorageStrategy, Account as StorageAccount } from "@/lib/storage/types"
import { ApiStorageAdapter } from "@/lib/storage/api-adapter"
import { calculateWinRate, getWinLossCounts, calcResult, calculateMetrics } from "@/lib/trading-metrics"

// Types (Legacy/UI compatible)
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
  profitLoss?: number      // In pips/points × lotSize (not dollars)
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

  // Relations
  accountId?: string
}

export interface Account {
  id: string
  name: string
  type: "personal" | "prop_firm" | "demo"
  broker: string
  balance: number
  lastUpdated: string
  currency: string
  isLive: boolean
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

export interface PerformanceMetrics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  breakevenTrades: number
  winRate: number
  profitFactor: number
  avgWin: number
  avgLoss: number
  totalProfitLoss: number
  maxDrawdown: number
  consistency: number
  winRateChange?: number
  profitFactorChange?: number
  avgWinChange?: number
  totalProfitLossChange?: number
  sparklineData: number[]
  totalDeposit: number
  netBalance: number
  roi: number
  roiChange?: number
  calculatedStrategies?: Strategy[]
}

export interface Notification {
  id: string
  title: string
  message: string
  type: "success" | "warning" | "error" | "info"
  timestamp: Date
}

interface Campaign {
  id: string
  name: string
  status: string
  spend: number
  impressions: number
  channel: string
}

interface Asset {
  id: string
  name: string
  type: string
  thumbnail: string
}

interface BudgetItem {
  channel: string
  allocated: number
  spent: number
}

interface AudienceSegment {
  id: string
  name: string
  size: number
}

interface DashboardState {
  trades: Trade[]
  selectedTradeId: string | null
  accounts: Account[]
  selectedAccountId: string | null
  strategies: Strategy[]
  performanceMetrics: PerformanceMetrics
  notifications: Notification[]
  isLoading: boolean
  campaigns: Campaign[]
  assets: Asset[]
  channelBudgets: BudgetItem[]
  audienceSegments: AudienceSegment[]
}

interface DashboardContextType extends DashboardState {
  addTrade: (trade: Partial<Trade>) => Promise<void>
  updateTrade: (id: string, updates: Partial<Trade>) => Promise<void>
  deleteTrade: (id: string) => Promise<void>
  selectTrade: (id: string | null) => void
  addAccount: (account: Partial<Account>) => Promise<void>
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  selectAccount: (id: string | null) => void
  addStrategy: (strategy: Partial<Strategy>) => Promise<void>
  updateStrategy: (id: string, updates: Partial<Strategy>) => Promise<void>
  deleteStrategy: (id: string) => Promise<void>
  refreshMetrics: () => Promise<void>
  addNotification: (notification: Omit<Notification, "id" | "timestamp">) => void
  dismissNotification: (id: string) => void
  updateMetrics: () => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const storage = useMemo<StorageAdapter>(() => new ApiStorageAdapter(), [])

  const [trades, setTrades] = useState<Trade[]>([])
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    breakevenTrades: 0,
    winRate: 0,
    profitFactor: 0,
    avgWin: 0,
    avgLoss: 0,
    totalProfitLoss: 0,
    maxDrawdown: 0,
    consistency: 0,
    sparklineData: [],
    totalDeposit: 0,
    netBalance: 0,
    roi: 0,
  })

  const prevMetricsRef = useRef<PerformanceMetrics | null>(null)

  // Demo fallback state (not used if storage is working)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [channelBudgets, setChannelBudgets] = useState<BudgetItem[]>([])
  const [audienceSegments, setAudienceSegments] = useState<AudienceSegment[]>([])

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp">) => {
    const id = `notif-${Date.now()}`
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
    }
    setNotifications((prev: Notification[]) => [newNotification, ...prev].slice(0, 5))
    setTimeout(() => {
      setNotifications((prev: Notification[]) => prev.filter((n: Notification) => n.id !== id))
    }, 5000)
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev: Notification[]) => prev.filter((n: Notification) => n.id !== id))
  }, [])

  const refreshMetrics = useCallback(async () => {
    setIsLoading(true)
    try {
      const [tData, sData, aData] = await Promise.all([
        storage.getTrades(),
        storage.getStrategies(),
        storage.getAccounts()
      ])
      setTrades(tData as Trade[])
      setStrategies(sData as Strategy[])
      setAccounts(aData as Account[])
    } catch (err: any) {
      addNotification({ title: 'Fetch Error', message: err.message || 'Failed to sync data', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [storage, addNotification])

  useEffect(() => {
    refreshMetrics()
  }, [refreshMetrics])

  const updateMetrics = useCallback(() => {
    if (trades.length === 0) return

    // Auto-discover and calculate performance for strategies
    const strategyMap = new Map<string, Strategy>()

    // Initialize from existing strategies
    strategies.forEach(s => strategyMap.set(s.name, { ...s, trades: 0, winRate: 0, avgWin: 0, avgLoss: 0 }))

    // Calculate for all strategies found in trades
    trades.forEach(t => {
      const sName = t.strategy || "Default"
      if (!strategyMap.has(sName)) {
        strategyMap.set(sName, {
          id: `auto-${sName}`,
          name: sName,
          trades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          description: "Auto-discovered strategy"
        })
      }

      const s = strategyMap.get(sName)!
      const sTrades = trades.filter(tr => (tr.strategy || "Default") === sName)
      const { wins: sWins, losses: sLosses } = getWinLossCounts(sTrades)
      const sGrossProfit = sTrades.filter(tr => calcResult(tr) === "win").reduce((sum, tr) => sum + (tr.profitLoss || 0), 0)
      const sGrossLoss = Math.abs(sTrades.filter(tr => calcResult(tr) === "loss").reduce((sum, tr) => sum + (tr.profitLoss || 0), 0))

      s.trades = sTrades.length
      s.winRate = calculateWinRate(sWins, sLosses)
      s.avgWin = sWins > 0 ? Number((sGrossProfit / sWins).toFixed(2)) : 0
      s.avgLoss = sLosses > 0 ? Number((sGrossLoss / sLosses).toFixed(2)) : 0
    })

    const calculatedStrategies = Array.from(strategyMap.values())

    const metrics = calculateMetrics(trades)
    const totalDeposit = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
    const netBalance = totalDeposit + metrics.netPnl
    const roi = totalDeposit > 0 ? (metrics.netPnl / totalDeposit) * 100 : 0

    // Calculate Consistency Score
    const journalScore = trades.reduce((acc, t) => acc + (t.notes ? 0.5 : 0) + (t.strategy ? 0.5 : 0), 0) / trades.length * 100
    const sizes = trades.map(t => t.lotSize).filter((s): s is number => typeof s === 'number')
    const avgSize = sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0
    const sizeVariance = sizes.length > 0 ? sizes.reduce((a, b) => a + Math.pow(b - avgSize, 2), 0) / sizes.length : 0
    const stdDevSize = Math.sqrt(sizeVariance)
    const sizeConsistency = Math.max(0, 100 - (avgSize > 0 ? (stdDevSize / avgSize) * 100 : 0))
    const consistency = trades.length > 0 ? (journalScore * 0.4 + sizeConsistency * 0.6) : 0

    const current: PerformanceMetrics = {
      totalTrades: metrics.totalTrades,
      winningTrades: metrics.wins,
      losingTrades: metrics.losses,
      breakevenTrades: metrics.breakevens,
      winRate: metrics.winRateIncludingBreakevens,
      profitFactor: metrics.profitFactor,
      avgWin: metrics.averageWinner,
      avgLoss: metrics.averageLoser,
      totalProfitLoss: metrics.netPnl,
      maxDrawdown: Math.round(metrics.maxDrawdown * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      sparklineData: trades.slice(-12).map(t => t.profitLoss || 0),
      totalDeposit: totalDeposit,
      netBalance: netBalance,
      roi: roi,
    }

    // Percentage changes
    const prev = prevMetricsRef.current
    if (prev) {
      const getChange = (curr: number, old: number) => old === 0 ? 0 : ((curr - old) / Math.abs(old)) * 100
      current.winRateChange = getChange(current.winRate, prev.winRate)
      current.profitFactorChange = getChange(current.profitFactor, prev.profitFactor)
      current.avgWinChange = getChange(current.avgWin, prev.avgWin)
      current.totalProfitLossChange = getChange(current.totalProfitLoss, prev.totalProfitLoss)
      current.roiChange = getChange(current.roi || 0, prev.roi || 0)
    }

    current.calculatedStrategies = calculatedStrategies

    setPerformanceMetrics(current)
    prevMetricsRef.current = current
  }, [trades, accounts, strategies])

  useEffect(() => {
    updateMetrics()
  }, [trades, accounts, updateMetrics])

  // Trade actions
  const addTrade = useCallback(async (trade: Partial<Trade>) => {
    setIsLoading(true)
    try {
      const saved = await storage.saveTrade(trade as any)
      setTrades((prev: Trade[]) => [saved as any, ...prev])
      addNotification({ title: 'Trade Saved', message: `Added ${saved.symbol}`, type: 'success' })
    } catch (err: any) {
      addNotification({ title: 'Add Trade Error', message: err.message, type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [storage, addNotification])

  const updateTrade = useCallback(async (id: string, updates: Partial<Trade>) => {
    setIsLoading(true)
    try {
      const updated = await storage.updateTrade(id, updates as any)
      setTrades((prev: Trade[]) => prev.map((t: Trade) => t.id === id ? updated as any : t))
      addNotification({ title: 'Trade Updated', message: `Updated ${updated.symbol}`, type: 'success' })
    } catch (err: any) {
      addNotification({ title: 'Update Trade Error', message: err.message, type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [storage, addNotification])

  const deleteTrade = useCallback(async (id: string) => {
    setIsLoading(true)
    try {
      await storage.deleteTrade(id)
      setTrades((prev: Trade[]) => prev.filter((t: Trade) => t.id !== id))
      addNotification({ title: 'Trade Deleted', message: 'Removed trade', type: 'info' })
    } catch (err: any) {
      addNotification({ title: 'Delete Trade Error', message: err.message, type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [storage, addNotification])

  const selectTrade = useCallback((id: string | null) => setSelectedTradeId(id), [])

  // Account actions
  const addAccount = useCallback(async (account: Partial<Account>) => {
    setIsLoading(true)
    try {
      const saved = await storage.saveAccount(account as any)
      setAccounts((prev: Account[]) => [...prev, saved as any])
      addNotification({ title: 'Account Added', message: saved.name, type: 'success' })
    } catch (err: any) {
      addNotification({ title: 'Add Account Error', message: err.message, type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [storage, addNotification])

  const updateAccount = useCallback(async (id: string, updates: Partial<Account>) => {
    setIsLoading(true)
    try {
      const updated = await storage.updateAccount(id, updates as any)
      setAccounts((prev: Account[]) => prev.map((a: Account) => a.id === id ? updated as any : a))
      addNotification({ title: 'Account Updated', message: updated.name, type: 'success' })
    } catch (err: any) {
      addNotification({ title: 'Update Account Error', message: err.message, type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [storage, addNotification])

  const deleteAccount = useCallback(async (id: string) => {
    setIsLoading(true)
    try {
      await storage.deleteAccount(id)
      setAccounts((prev: Account[]) => prev.filter((a: Account) => a.id !== id))
      addNotification({ title: 'Account Deleted', message: 'Removed account', type: 'info' })
    } catch (err: any) {
      addNotification({ title: 'Delete Account Error', message: err.message, type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [storage, addNotification])

  const selectAccount = useCallback((id: string | null) => setSelectedAccountId(id), [])

  // Strategy actions
  const addStrategy = useCallback(async (strategy: Partial<Strategy>) => {
    setIsLoading(true)
    try {
      const saved = await storage.saveStrategy(strategy as any)
      setStrategies((prev: Strategy[]) => [...prev, saved as any])
      addNotification({ title: 'Strategy Added', message: saved.name, type: 'success' })
    } catch (err: any) {
      addNotification({ title: 'Add Strategy Error', message: err.message, type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [storage, addNotification])

  const updateStrategy = useCallback(async (id: string, updates: Partial<Strategy>) => {
    setIsLoading(true)
    try {
      // Get old strategy to find it's name before update
      const oldStrategy = strategies.find(s => s.id === id)
      const oldName = oldStrategy?.name

      const updated = await storage.updateStrategy(id, updates as any)

      // If name changed, update all trades referencing the old name
      if (oldName && updates.name && updates.name !== oldName) {
        const tradesToUpdate = trades.filter(t => t.strategy === oldName)
        if (tradesToUpdate.length > 0) {
          await Promise.all(tradesToUpdate.map(t =>
            storage.updateTrade(t.id, { strategy: updates.name })
          ))
          // Refresh trades to sync UI
          const tData = await storage.getTrades()
          setTrades(tData as Trade[])
        }
      }

      setStrategies((prev: Strategy[]) => prev.map((s: Strategy) => s.id === id ? updated as any : s))
      addNotification({ title: 'Strategy Updated', message: updated.name, type: 'success' })
    } catch (err: any) {
      addNotification({ title: 'Update Strategy Error', message: err.message, type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [storage, addNotification, strategies, trades])

  const deleteStrategy = useCallback(async (id: string) => {
    setIsLoading(true)
    try {
      await storage.deleteStrategy(id)
      setStrategies((prev: Strategy[]) => prev.filter((s: Strategy) => s.id !== id))
      addNotification({ title: 'Strategy Deleted', message: 'Removed strategy', type: 'info' })
    } catch (err: any) {
      addNotification({ title: 'Delete Strategy Error', message: err.message, type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [storage, addNotification])

  const value: DashboardContextType = {
    trades, selectedTradeId, accounts, selectedAccountId, strategies,
    performanceMetrics, notifications, isLoading, campaigns, assets,
    channelBudgets, audienceSegments, addTrade, updateTrade, deleteTrade,
    selectTrade, addAccount, updateAccount, deleteAccount, selectAccount,
    addStrategy, updateStrategy, deleteStrategy, refreshMetrics,
    addNotification, dismissNotification,
    updateMetrics,
  }

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

const defaultContextValue: DashboardContextType = {
  trades: [], selectedTradeId: null, accounts: [], selectedAccountId: null, strategies: [],
  performanceMetrics: {
    totalTrades: 0, winningTrades: 0, losingTrades: 0, breakevenTrades: 0, winRate: 0, profitFactor: 0,
    avgWin: 0, avgLoss: 0, totalProfitLoss: 0, maxDrawdown: 0, consistency: 0, sparklineData: [],
    totalDeposit: 0, netBalance: 0, roi: 0
  },
  notifications: [], isLoading: false, campaigns: [], assets: [], channelBudgets: [], audienceSegments: [],
  addTrade: async () => { }, updateTrade: async () => { }, deleteTrade: async () => { }, selectTrade: () => { },
  addAccount: async () => { }, updateAccount: async () => { }, deleteAccount: async () => { }, selectAccount: () => { },
  addStrategy: async () => { }, updateStrategy: async () => { }, deleteStrategy: async () => { }, refreshMetrics: async () => { },
  addNotification: () => { }, dismissNotification: () => { },
  updateMetrics: () => { }
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  return context === undefined ? defaultContextValue : context
}