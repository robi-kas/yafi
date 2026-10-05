-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "broker" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isLive" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rules" TEXT,
    "markets" TEXT,
    "riskPerTrade" REAL
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "entryPrice" REAL NOT NULL,
    "stopLoss" REAL NOT NULL,
    "takeProfit" REAL NOT NULL,
    "exitPrice" REAL,
    "lotSize" REAL NOT NULL,
    "profitLoss" REAL,
    "result" TEXT,
    "riskToReward" REAL,
    "entryTime" DATETIME NOT NULL,
    "exitTime" DATETIME,
    "emotionalState" TEXT,
    "notes" TEXT,
    "tags" TEXT,
    "confluences" TEXT,
    "mistakes" TEXT,
    "session" TEXT,
    "killZone" TEXT,
    "htfTimeframe" TEXT,
    "htfBias" TEXT,
    "trendAlignment" TEXT,
    "entryModel" TEXT,
    "htfPoi" BOOLEAN NOT NULL DEFAULT false,
    "liquiditySweep" BOOLEAN NOT NULL DEFAULT false,
    "mssConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "fvgPresent" BOOLEAN NOT NULL DEFAULT false,
    "ifvgPresent" BOOLEAN NOT NULL DEFAULT false,
    "breakerBlockRetest" BOOLEAN NOT NULL DEFAULT false,
    "orderBlockRetest" BOOLEAN NOT NULL DEFAULT false,
    "fibonacciRetracement" BOOLEAN NOT NULL DEFAULT false,
    "emotionBefore" REAL,
    "emotionAfter" REAL,
    "emotionTags" TEXT,
    "mistakeTags" TEXT,
    "entryReason" TEXT,
    "exitReason" TEXT,
    "tradeCause" TEXT,
    "invalidation" TEXT,
    "retakeTrade" TEXT,
    "lessonLearned" TEXT,
    "rrPlanned" REAL,
    "rrAchieved" REAL,
    "tradeStatus" TEXT,
    "accountId" TEXT NOT NULL,
    "strategyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradeScreenshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TradeScreenshot_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Strategy_name_key" ON "Strategy"("name");

