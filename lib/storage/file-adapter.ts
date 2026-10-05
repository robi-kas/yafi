import fs from 'fs/promises';
import path from 'path';
import { Trade, Strategy, Account } from './types';

interface DatabaseSchema {
    trades: Trade[];
    strategies: Strategy[];
    accounts: Account[];
}

const DB_PATH = path.join(process.cwd(), 'database.json');

const defaultDb: DatabaseSchema = {
    trades: [],
    strategies: [],
    accounts: []
};

export class FileStorageAdapter {
    private lock: Promise<any> = Promise.resolve();

    private async withLock<T>(fn: () => Promise<T>): Promise<T> {
        const result = this.lock.then(fn);
        this.lock = result.catch(() => { });
        return result;
    }

    private async readDb(): Promise<DatabaseSchema> {
        try {
            const data = await fs.readFile(DB_PATH, 'utf-8');
            return JSON.parse(data) as DatabaseSchema;
        } catch (error: any) {
            // If the file doesn't exist, create it returning default schema
            if (error.code === 'ENOENT') {
                await this.writeDb(defaultDb);
                return defaultDb;
            }
            throw error;
        }
    }

    private async writeDb(data: DatabaseSchema): Promise<void> {
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    }

    // Trades
    async getTrades(): Promise<Trade[]> {
        return this.withLock(async () => {
            const db = await this.readDb();
            return db.trades.sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
        });
    }

    async saveTrade(trade: Partial<Trade>): Promise<Trade> {
        return this.withLock(async () => {
            const db = await this.readDb();
            const newTrade = {
                ...trade,
                id: trade.id || crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                tags: trade.tags || [],
                screenshots: trade.screenshots || [],
                confluences: trade.confluences || [],
                mistakes: trade.mistakes || []
            } as Trade;

            db.trades.push(newTrade);
            await this.writeDb(db);
            return newTrade;
        });
    }

    async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade> {
        return this.withLock(async () => {
            const db = await this.readDb();
            const index = db.trades.findIndex(t => t.id === id);
            if (index === -1) throw new Error('Trade not found');

            db.trades[index] = { ...db.trades[index], ...updates };
            await this.writeDb(db);
            return db.trades[index];
        });
    }

    async deleteTrade(id: string): Promise<boolean> {
        return this.withLock(async () => {
            const db = await this.readDb();
            db.trades = db.trades.filter(t => t.id !== id);
            await this.writeDb(db);
            return true;
        });
    }

    // Strategies
    async getStrategies(): Promise<Strategy[]> {
        return this.withLock(async () => {
            const db = await this.readDb();
            return db.strategies;
        });
    }

    async saveStrategy(strategy: Partial<Strategy>): Promise<Strategy> {
        return this.withLock(async () => {
            const db = await this.readDb();
            const newStrategy = {
                ...strategy,
                id: strategy.id || crypto.randomUUID(),
                markets: strategy.markets || [],
                trades: strategy.trades || 0,
                winRate: strategy.winRate || 0,
                avgWin: strategy.avgWin || 0,
                avgLoss: strategy.avgLoss || 0,
            } as Strategy;

            db.strategies.push(newStrategy);
            await this.writeDb(db);
            return newStrategy;
        });
    }

    async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy> {
        return this.withLock(async () => {
            const db = await this.readDb();
            const index = db.strategies.findIndex(s => s.id === id);
            if (index === -1) throw new Error('Strategy not found');

            db.strategies[index] = { ...db.strategies[index], ...updates };
            await this.writeDb(db);
            return db.strategies[index];
        });
    }

    async deleteStrategy(id: string): Promise<boolean> {
        return this.withLock(async () => {
            const db = await this.readDb();
            db.strategies = db.strategies.filter(s => s.id !== id);
            await this.writeDb(db);
            return true;
        });
    }

    // Accounts
    async getAccounts(): Promise<Account[]> {
        return this.withLock(async () => {
            const db = await this.readDb();
            return db.accounts;
        });
    }

    async saveAccount(account: Partial<Account>): Promise<Account> {
        return this.withLock(async () => {
            const db = await this.readDb();
            const newAccount = {
                ...account,
                id: account.id || crypto.randomUUID(),
                isLive: Boolean(account.isLive),
                balance: account.balance || 0
            } as Account;

            db.accounts.push(newAccount);
            await this.writeDb(db);
            return newAccount;
        });
    }

    async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
        return this.withLock(async () => {
            const db = await this.readDb();
            const index = db.accounts.findIndex(a => a.id === id);
            if (index === -1) throw new Error('Account not found');

            db.accounts[index] = { ...db.accounts[index], ...updates };
            await this.writeDb(db);
            return db.accounts[index];
        });
    }

    async deleteAccount(id: string): Promise<boolean> {
        return this.withLock(async () => {
            const db = await this.readDb();
            db.accounts = db.accounts.filter(a => a.id !== id);
            await this.writeDb(db);
            return true;
        });
    }

    async clearDatabase(): Promise<boolean> {
        return this.withLock(async () => {
            const db = { trades: [], strategies: [], accounts: [] };
            await this.writeDb(db);
            return true;
        });
    }
}
