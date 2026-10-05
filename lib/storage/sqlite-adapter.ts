// better-sqlite3 is a native module, we'll require it inside the initialization function
// to avoid bundling issues in Next.js/Turbopack
import path from 'path';
import { Trade, Strategy, Account } from '@/lib/storage/types';

// Connect to a local SQLite database file in the project root
const dbPath = path.join(process.cwd(), 'database.sqlite');
let db: any = null;

function getDb() {
  if (db) return db;
  try {
    console.log(`Connecting to SQLite at ${dbPath}`);
    // Dynamic require to help with native module resolution in Next.js
    const Database = require('better-sqlite3');
    db = new Database(dbPath);

    // Initialize tables if they don't exist
    db.exec(`
          CREATE TABLE IF NOT EXISTS trades (
            id TEXT PRIMARY KEY,
            symbol TEXT,
            market TEXT,
            direction TEXT,
            entryPrice REAL,
            stopLoss REAL,
            takeProfit REAL,
            exitPrice REAL,
            positionSize REAL,
            profitLoss REAL,
            result TEXT,
            riskToReward REAL,
            strategy TEXT,
            entryTime TEXT,
            exitTime TEXT,
            emotionalState TEXT,
            notes TEXT,
            tags TEXT,
            screenshots TEXT,
            confluences TEXT,
            mistakes TEXT,
            createdAt TEXT
          );

          CREATE TABLE IF NOT EXISTS strategies (
            id TEXT PRIMARY KEY,
            name TEXT,
            description TEXT,
            rules TEXT,
            markets TEXT,
            riskPerTrade REAL,
            trades INTEGER,
            winRate REAL,
            avgWin REAL,
            avgLoss REAL
          );

          CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            name TEXT,
            type TEXT,
            broker TEXT,
            balance REAL,
            lastUpdated TEXT,
            currency TEXT,
            isLive INTEGER
          );
        `);
    console.log('SQLite tables initialized');
    return db;
  } catch (err) {
    console.error('FAILED TO INITIALIZE SQLITE:', err);
    throw err;
  }
}

export class SQLiteStorageAdapter {
  // Trades
  async getTrades(): Promise<Trade[]> {
    const conn = getDb();
    const rows = conn.prepare('SELECT * FROM trades ORDER BY entryTime DESC').all();
    return rows.map((row: any) => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      screenshots: row.screenshots ? JSON.parse(row.screenshots) : [],
      confluences: row.confluences ? JSON.parse(row.confluences) : [],
      mistakes: row.mistakes ? JSON.parse(row.mistakes) : []
    }));
  }

  async saveTrade(trade: Partial<Trade>): Promise<Trade> {
    const id = trade.id || crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const stmt = getDb().prepare(`
      INSERT INTO trades (
        id, symbol, market, direction, entryPrice, stopLoss, takeProfit, exitPrice, 
        positionSize, profitLoss, result, riskToReward, strategy, entryTime, exitTime, 
        emotionalState, notes, tags, screenshots, confluences, mistakes, createdAt
      ) VALUES (
        @id, @symbol, @market, @direction, @entryPrice, @stopLoss, @takeProfit, @exitPrice,
        @positionSize, @profitLoss, @result, @riskToReward, @strategy, @entryTime, @exitTime,
        @emotionalState, @notes, @tags, @screenshots, @confluences, @mistakes, @createdAt
      )
    `);

    stmt.run({
      ...trade,
      id,
      createdAt,
      tags: trade.tags ? JSON.stringify(trade.tags) : '[]',
      screenshots: trade.screenshots ? JSON.stringify(trade.screenshots) : '[]',
      confluences: trade.confluences ? JSON.stringify(trade.confluences) : '[]',
      mistakes: trade.mistakes ? JSON.stringify(trade.mistakes) : '[]',
      entryPrice: trade.entryPrice ?? null,
      stopLoss: trade.stopLoss ?? null,
      takeProfit: trade.takeProfit ?? null,
      exitPrice: trade.exitPrice ?? null,
      lotSize: trade.lotSize ?? null,
      profitLoss: trade.profitLoss ?? null,
      riskToReward: trade.riskToReward ?? null,
    });

    const rows = getDb().prepare('SELECT * FROM trades WHERE id = ?').all(id);
    const row: any = rows[0];
    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      screenshots: row.screenshots ? JSON.parse(row.screenshots) : [],
      confluences: row.confluences ? JSON.parse(row.confluences) : [],
      mistakes: row.mistakes ? JSON.parse(row.mistakes) : []
    };
  }

  async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade> {
    // A simplified update for now: get existing, merge, resave
    // In a real app we'd build a dynamic UPDATE string
    const existingRows = getDb().prepare('SELECT * FROM trades WHERE id = ?').all(id);
    if (!existingRows.length) throw new Error('Trade not found');

    const existing: any = existingRows[0];
    const merged = { ...existing };
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) merged[k] = v;
    }

    const stmt = getDb().prepare(`
      UPDATE trades SET
        symbol = @symbol, market = @market, direction = @direction, entryPrice = @entryPrice, 
        stopLoss = @stopLoss, takeProfit = @takeProfit, exitPrice = @exitPrice, 
        lotSize = @lotSize, profitLoss = @profitLoss, result = @result, 
        riskToReward = @riskToReward, strategy = @strategy, entryTime = @entryTime, 
        exitTime = @exitTime, emotionalState = @emotionalState, notes = @notes, 
        tags = @tags, screenshots = @screenshots, confluences = @confluences, mistakes = @mistakes
      WHERE id = @id
    `);

    stmt.run({
      ...merged,
      tags: typeof merged.tags === 'string' ? merged.tags : JSON.stringify(merged.tags || []),
      screenshots: typeof merged.screenshots === 'string' ? merged.screenshots : JSON.stringify(merged.screenshots || []),
      confluences: typeof merged.confluences === 'string' ? merged.confluences : JSON.stringify(merged.confluences || []),
      mistakes: typeof merged.mistakes === 'string' ? merged.mistakes : JSON.stringify(merged.mistakes || []),
    });

    const updatedRows = getDb().prepare('SELECT * FROM trades WHERE id = ?').all(id);
    const row: any = updatedRows[0];
    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      screenshots: row.screenshots ? JSON.parse(row.screenshots) : [],
      confluences: row.confluences ? JSON.parse(row.confluences) : [],
      mistakes: row.mistakes ? JSON.parse(row.mistakes) : []
    };
  }

  async deleteTrade(id: string): Promise<boolean> {
    getDb().prepare('DELETE FROM trades WHERE id = ?').run(id);
    return true;
  }

  // Strategies
  async getStrategies(): Promise<Strategy[]> {
    const rows = getDb().prepare('SELECT * FROM strategies').all();
    return rows.map((row: any) => ({
      ...row,
      markets: row.markets ? JSON.parse(row.markets) : []
    }));
  }

  async saveStrategy(strategy: Partial<Strategy>): Promise<Strategy> {
    const id = strategy.id || crypto.randomUUID();

    const stmt = getDb().prepare(`
      INSERT INTO strategies (
        id, name, description, rules, markets, riskPerTrade, trades, winRate, avgWin, avgLoss
      ) VALUES (
        @id, @name, @description, @rules, @markets, @riskPerTrade, @trades, @winRate, @avgWin, @avgLoss
      )
    `);

    stmt.run({
      ...strategy,
      id,
      markets: strategy.markets ? JSON.stringify(strategy.markets) : '[]',
      trades: strategy.trades || 0,
      winRate: strategy.winRate || 0,
      avgWin: strategy.avgWin || 0,
      avgLoss: strategy.avgLoss || 0,
      riskPerTrade: strategy.riskPerTrade ?? null,
    });

    const rows = getDb().prepare('SELECT * FROM strategies WHERE id = ?').all(id);
    const row: any = rows[0];
    return {
      ...row,
      markets: row.markets ? JSON.parse(row.markets) : []
    };
  }

  async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy> {
    const existingRows = getDb().prepare('SELECT * FROM strategies WHERE id = ?').all(id);
    if (!existingRows.length) throw new Error('Strategy not found');

    const existing: any = existingRows[0];
    const merged = { ...existing };
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) merged[k] = v;
    }

    const stmt = getDb().prepare(`
      UPDATE strategies SET
        name = @name, description = @description, rules = @rules, markets = @markets, 
        riskPerTrade = @riskPerTrade, trades = @trades, winRate = @winRate, 
        avgWin = @avgWin, avgLoss = @avgLoss
      WHERE id = @id
    `);

    stmt.run({
      ...merged,
      markets: typeof merged.markets === 'string' ? merged.markets : JSON.stringify(merged.markets || []),
    });

    const updatedRows = getDb().prepare('SELECT * FROM strategies WHERE id = ?').all(id);
    const row: any = updatedRows[0];
    return {
      ...row,
      markets: row.markets ? JSON.parse(row.markets) : []
    };
  }

  async deleteStrategy(id: string): Promise<boolean> {
    getDb().prepare('DELETE FROM strategies WHERE id = ?').run(id);
    return true;
  }

  // Accounts
  async getAccounts(): Promise<Account[]> {
    const rows = getDb().prepare('SELECT * FROM accounts').all();
    return rows.map((row: any) => ({
      ...row,
      isLive: Boolean(row.isLive)
    }));
  }

  async saveAccount(account: Partial<Account>): Promise<Account> {
    const id = account.id || crypto.randomUUID();

    const stmt = getDb().prepare(`
      INSERT INTO accounts (
        id, name, type, broker, balance, lastUpdated, currency, isLive
      ) VALUES (
        @id, @name, @type, @broker, @balance, @lastUpdated, @currency, @isLive
      )
    `);

    stmt.run({
      ...account,
      id,
      isLive: account.isLive ? 1 : 0,
      balance: account.balance ?? 0,
    });

    const rows = getDb().prepare('SELECT * FROM accounts WHERE id = ?').all(id);
    const row: any = rows[0];
    return {
      ...row,
      isLive: Boolean(row.isLive)
    };
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
    const existingRows = getDb().prepare('SELECT * FROM accounts WHERE id = ?').all(id);
    if (!existingRows.length) throw new Error('Account not found');

    const existing: any = existingRows[0];
    const merged = { ...existing };
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) merged[k] = v;
    }

    const stmt = getDb().prepare(`
      UPDATE accounts SET
        name = @name, type = @type, broker = @broker, balance = @balance, 
        lastUpdated = @lastUpdated, currency = @currency, isLive = @isLive
      WHERE id = @id
    `);

    stmt.run({
      ...merged,
      isLive: merged.isLive ? 1 : 0
    });

    const updatedRows = getDb().prepare('SELECT * FROM accounts WHERE id = ?').all(id);
    const row: any = updatedRows[0];
    return {
      ...row,
      isLive: Boolean(row.isLive)
    };
  }

  async deleteAccount(id: string): Promise<boolean> {
    getDb().prepare('DELETE FROM accounts WHERE id = ?').run(id);
    return true;
  }
}
