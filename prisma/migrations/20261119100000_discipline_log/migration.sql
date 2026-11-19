-- Persisted daily discipline log (one entry per user per day). Idempotent.
CREATE TABLE IF NOT EXISTS "DisciplineLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "followedRules" BOOLEAN NOT NULL DEFAULT true,
    "emotionalControl" INTEGER NOT NULL DEFAULT 7,
    "notes" TEXT NOT NULL DEFAULT '',
    "violations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DisciplineLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DisciplineLog_userId_idx" ON "DisciplineLog"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "DisciplineLog_userId_date_key" ON "DisciplineLog"("userId", "date");

-- Same as every other table: only the app (via Prisma) may touch it.
ALTER TABLE "DisciplineLog" ENABLE ROW LEVEL SECURITY;
