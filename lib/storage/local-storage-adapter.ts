import { StorageAdapter, Trade, Strategy, Account } from './types'

const STORAGE_KEYS = {
    TRADES: 'yafu_trades',
    STRATEGIES: 'yafu_strategies',
    ACCOUNTS: 'yafu_accounts',
}

export class LocalStorageAdapter implements StorageAdapter {
    private getItem<T>(key: string): T[] {
        if (typeof window === 'undefined') return []
        const data = localStorage.getItem(key)
        return data ? JSON.parse(data) : []
    }

    private setItem<T>(key: string, items: T[]): void {
        if (typeof window === 'undefined') return
        localStorage.setItem(key, JSON.stringify(items))
    }

    // Trades
    async getTrades(): Promise<Trade[]> {
        return this.getItem<Trade>(STORAGE_KEYS.TRADES)
    }

    async saveTrade(trade: Partial<Trade>): Promise<Trade> {
        const trades = this.getItem<Trade>(STORAGE_KEYS.TRADES)
        const newTrade = {
            ...trade,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        } as Trade
        this.setItem(STORAGE_KEYS.TRADES, [newTrade, ...trades])
        return newTrade
    }

    async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade> {
        const trades = this.getItem<Trade>(STORAGE_KEYS.TRADES)
        const index = trades.findIndex(t => t.id === id)
        if (index === -1) throw new Error('Trade not found')

        trades[index] = { ...trades[index], ...updates }
        this.setItem(STORAGE_KEYS.TRADES, trades)
        return trades[index]
    }

    async deleteTrade(id: string): Promise<boolean> {
        const trades = this.getItem<Trade>(STORAGE_KEYS.TRADES)
        const filtered = trades.filter(t => t.id !== id)
        this.setItem(STORAGE_KEYS.TRADES, filtered)
        return true
    }

    // Strategies
    async getStrategies(): Promise<Strategy[]> {
        return this.getItem<Strategy>(STORAGE_KEYS.STRATEGIES)
    }

    async saveStrategy(strategy: Partial<Strategy>): Promise<Strategy> {
        const strategies = this.getItem<Strategy>(STORAGE_KEYS.STRATEGIES)
        const newStrategy = {
            ...strategy,
            id: crypto.randomUUID(),
            trades: 0,
            winRate: 0,
            avgWin: 0,
            avgLoss: 0,
        } as Strategy
        this.setItem(STORAGE_KEYS.STRATEGIES, [...strategies, newStrategy])
        return newStrategy
    }

    async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy> {
        const strategies = this.getItem<Strategy>(STORAGE_KEYS.STRATEGIES)
        const index = strategies.findIndex(s => s.id === id)
        if (index === -1) throw new Error('Strategy not found')

        strategies[index] = { ...strategies[index], ...updates }
        this.setItem(STORAGE_KEYS.STRATEGIES, strategies)
        return strategies[index]
    }

    async deleteStrategy(id: string): Promise<boolean> {
        const strategies = this.getItem<Strategy>(STORAGE_KEYS.STRATEGIES)
        const filtered = strategies.filter(s => s.id !== id)
        this.setItem(STORAGE_KEYS.STRATEGIES, filtered)
        return true
    }

    // Accounts
    async getAccounts(): Promise<Account[]> {
        return this.getItem<Account>(STORAGE_KEYS.ACCOUNTS)
    }

    async saveAccount(account: Partial<Account>): Promise<Account> {
        const accounts = this.getItem<Account>(STORAGE_KEYS.ACCOUNTS)
        const newAccount = {
            ...account,
            id: crypto.randomUUID(),
        } as Account
        this.setItem(STORAGE_KEYS.ACCOUNTS, [...accounts, newAccount])
        return newAccount
    }

    async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
        const accounts = this.getItem<Account>(STORAGE_KEYS.ACCOUNTS)
        const index = accounts.findIndex(a => a.id === id)
        if (index === -1) throw new Error('Account not found')

        accounts[index] = { ...accounts[index], ...updates }
        this.setItem(STORAGE_KEYS.ACCOUNTS, accounts)
        return accounts[index]
    }

    async deleteAccount(id: string): Promise<boolean> {
        const accounts = this.getItem<Account>(STORAGE_KEYS.ACCOUNTS)
        const filtered = accounts.filter(a => a.id !== id)
        this.setItem(STORAGE_KEYS.ACCOUNTS, filtered)
        return true
    }
}
