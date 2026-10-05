-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "importDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tradeCount" INTEGER NOT NULL,
    "hash" TEXT
);

-- CreateTable
CREATE TABLE "BrokerOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brokerOrderId" TEXT NOT NULL,
    "tradeId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedPrice" REAL,
    "volume" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrokerOrder_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BrokerDeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brokerDealId" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "dealType" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "volume" REAL NOT NULL,
    "commission" REAL NOT NULL DEFAULT 0,
    "swap" REAL NOT NULL DEFAULT 0,
    "time" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrokerDeal_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "broker" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "syncStatus" TEXT NOT NULL DEFAULT 'ACTIVE'
);
INSERT INTO "new_Account" ("balance", "broker", "currency", "id", "isLive", "lastUpdated", "name", "type") SELECT "balance", "broker", "currency", "id", "isLive", "lastUpdated", "name", "type" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE TABLE "new_Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "originalBrokerSymbol" TEXT,
    "displaySymbol" TEXT,
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
    "brokerPositionId" TEXT,
    "importBatchId" TEXT,
    "initialPlannedRiskUsd" REAL,
    "rStatus" TEXT NOT NULL DEFAULT 'VALID',
    "dataQualityStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "accountId" TEXT NOT NULL,
    "strategyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trade_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trade" ("accountId", "breakerBlockRetest", "confluences", "createdAt", "direction", "emotionAfter", "emotionBefore", "emotionTags", "emotionalState", "entryModel", "entryPrice", "entryReason", "entryTime", "exitPrice", "exitReason", "exitTime", "fibonacciRetracement", "fvgPresent", "htfBias", "htfPoi", "htfTimeframe", "id", "ifvgPresent", "invalidation", "killZone", "lessonLearned", "liquiditySweep", "lotSize", "market", "mistakeTags", "mistakes", "mssConfirmed", "notes", "orderBlockRetest", "profitLoss", "result", "retakeTrade", "riskToReward", "rrAchieved", "rrPlanned", "session", "stopLoss", "strategyId", "symbol", "tags", "takeProfit", "tradeCause", "tradeStatus", "trendAlignment", "updatedAt") SELECT "accountId", "breakerBlockRetest", "confluences", "createdAt", "direction", "emotionAfter", "emotionBefore", "emotionTags", "emotionalState", "entryModel", "entryPrice", "entryReason", "entryTime", "exitPrice", "exitReason", "exitTime", "fibonacciRetracement", "fvgPresent", "htfBias", "htfPoi", "htfTimeframe", "id", "ifvgPresent", "invalidation", "killZone", "lessonLearned", "liquiditySweep", "lotSize", "market", "mistakeTags", "mistakes", "mssConfirmed", "notes", "orderBlockRetest", "profitLoss", "result", "retakeTrade", "riskToReward", "rrAchieved", "rrPlanned", "session", "stopLoss", "strategyId", "symbol", "tags", "takeProfit", "tradeCause", "tradeStatus", "trendAlignment", "updatedAt" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
CREATE UNIQUE INDEX "Trade_brokerPositionId_key" ON "Trade"("brokerPositionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_hash_key" ON "ImportBatch"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerOrder_brokerOrderId_key" ON "BrokerOrder"("brokerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerDeal_brokerDealId_key" ON "BrokerDeal"("brokerDealId");

