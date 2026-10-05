import { StorageAdapter, Trade, Strategy, Account } from './types'

export class ApiStorageAdapter implements StorageAdapter {
    private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const url = `/api/db${endpoint}`
        const defaultOptions: RequestInit = {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        }

        const response = await fetch(url, { ...defaultOptions, ...options })
        const text = await response.text()
        let json: any
        try {
            json = JSON.parse(text)
        } catch {
            throw new Error('Could not connect to the local database API (received HTML instead of JSON). Restart the app after rebuilding.')
        }

        if (!response.ok) {
            throw new Error(json.error || 'API Request failed')
        }

        return json
    }

    // Trades
    async getTrades(): Promise<Trade[]> {
        return this.request<Trade[]>('?type=trades')
    }

    async saveTrade(trade: Partial<Trade>): Promise<Trade> {
        return this.request<Trade>('?type=trades', {
            method: 'POST',
            body: JSON.stringify(trade)
        })
    }

    async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade> {
        return this.request<Trade>(`?type=trades&id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        })
    }

    async deleteTrade(id: string): Promise<boolean> {
        await this.request<{ success: boolean }>(`?type=trades&id=${id}`, {
            method: 'DELETE'
        })
        return true
    }

    // Strategies
    async getStrategies(): Promise<Strategy[]> {
        return this.request<Strategy[]>('?type=strategies')
    }

    async saveStrategy(strategy: Partial<Strategy>): Promise<Strategy> {
        return this.request<Strategy>('?type=strategies', {
            method: 'POST',
            body: JSON.stringify(strategy)
        })
    }

    async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy> {
        return this.request<Strategy>(`?type=strategies&id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        })
    }

    async deleteStrategy(id: string): Promise<boolean> {
        await this.request<{ success: boolean }>(`?type=strategies&id=${id}`, {
            method: 'DELETE'
        })
        return true
    }

    // Accounts
    async getAccounts(): Promise<Account[]> {
        return this.request<Account[]>('?type=accounts')
    }

    async saveAccount(account: Partial<Account>): Promise<Account> {
        return this.request<Account>('?type=accounts', {
            method: 'POST',
            body: JSON.stringify(account)
        })
    }

    async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
        return this.request<Account>(`?type=accounts&id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        })
    }

    async deleteAccount(id: string): Promise<boolean> {
        await this.request<{ success: boolean }>(`?type=accounts&id=${id}`, {
            method: 'DELETE'
        })
        return true
    }
}
