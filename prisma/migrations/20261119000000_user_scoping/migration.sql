-- Per-user data ownership (Supabase auth.users.id) + Row Level Security.
--
-- Idempotent: safe to run more than once. Existing rows must be assigned an
-- owner BEFORE this runs (see the one-time backfill run in the Supabase SQL
-- editor); otherwise SET NOT NULL fails and the migration aborts, which is
-- intentional so no data is left ownerless.

-- 1. Ownership columns
ALTER TABLE "Account"     ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Strategy"    ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "ImportBatch" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Trade"       ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "NoteFolder"  ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Note"        ADD COLUMN IF NOT EXISTS "userId" TEXT;

ALTER TABLE "Account"     ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Strategy"    ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "ImportBatch" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Trade"       ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "NoteFolder"  ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Note"        ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Account_userId_idx"     ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Strategy_userId_idx"    ON "Strategy"("userId");
CREATE INDEX IF NOT EXISTS "ImportBatch_userId_idx" ON "ImportBatch"("userId");
CREATE INDEX IF NOT EXISTS "Trade_userId_idx"       ON "Trade"("userId");
CREATE INDEX IF NOT EXISTS "NoteFolder_userId_idx"  ON "NoteFolder"("userId");
CREATE INDEX IF NOT EXISTS "Note_userId_idx"        ON "Note"("userId");

-- 2. Strategy names are unique per user, not globally
DROP INDEX IF EXISTS "Strategy_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Strategy_userId_name_key" ON "Strategy"("userId", "name");

-- 3. Per-user settings (MT5 config, webhook token)
CREATE TABLE IF NOT EXISTS "UserSettings" (
    "userId"       TEXT NOT NULL,
    "mt5Config"    JSONB,
    "webhookToken" TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserSettings_webhookToken_key" ON "UserSettings"("webhookToken");

-- 4. Row Level Security. The app reaches these tables only through Prisma,
-- which connects as the table owner and is unaffected. Enabling RLS with no
-- policies blocks the public Supabase REST API (anon / authenticated keys)
-- from reading or writing them directly.
ALTER TABLE "Account"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Strategy"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImportBatch"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StagedRecord"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrokerOrder"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrokerDeal"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Trade"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TradeScreenshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NoteFolder"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Note"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSettings"    ENABLE ROW LEVEL SECURITY;
