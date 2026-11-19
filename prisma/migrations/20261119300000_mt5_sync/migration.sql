-- MT5 auto-sync (YafiSync EA). Idempotent: safe to run again.

-- Each MT5 login becomes its own journal account.
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "brokerLogin" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "brokerServer" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_userId_brokerLogin_brokerServer_key"
  ON "Account"("userId", "brokerLogin", "brokerServer");

-- Broker costs, kept for reference (profitLoss already includes them).
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "brokerCommission" DOUBLE PRECISION;
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "brokerSwap" DOUBLE PRECISION;

-- The old Python-bridge sync stored MT5 logins and investor passwords here.
-- The EA needs no password, so wipe them.
UPDATE "UserSettings" SET "mt5Config" = NULL WHERE "mt5Config" IS NOT NULL;

SELECT 'ok' AS mt5_sync_migration;
