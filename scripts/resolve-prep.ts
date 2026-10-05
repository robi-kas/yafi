import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

async function calculateHash(filePath: string) {
  return new Promise<string>((resolve) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function verifyDb(dbPath: string) {
  const prisma = new PrismaClient({ datasourceUrl: `file:./${path.basename(dbPath)}` });
  let result = { 
    trades: 0, 
    netPnl: 0, 
    validRCount: 0,
    mt5Trades: 0,
    tables: [] as string[],
    migrations: [] as string[]
  };
  
  try {
    const countRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM Trade`) as any[];
    result.trades = Number(countRes[0]?.c || 0);

    const pnlRes = await prisma.$queryRawUnsafe(`SELECT SUM(profitLoss) as s FROM Trade WHERE profitLoss IS NOT NULL`) as any[];
    result.netPnl = Number(pnlRes[0]?.s || 0);
    
    // Check MT5 trades:
    const mt5 = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM Trade WHERE id IN ('mt5-35845236', 'mt5-35867022', 'mt5-35924536', 'mt5-35935327')`) as any[];
    result.mt5Trades = Number(mt5[0]?.c || 0);

    // tables
    const tablesRaw = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table'`) as any[];
    result.tables = tablesRaw.map(t => t.name);

    // check migrations table
    if (result.tables.includes('_prisma_migrations')) {
      const migs = await prisma.$queryRawUnsafe(`SELECT migration_name FROM _prisma_migrations`) as any[];
      result.migrations = migs.map(m => m.migration_name);
    }
  } catch (e) {
    console.error(`Error verifying ${dbPath}:`, e);
  } finally {
    await prisma.$disconnect();
  }
  return result;
}

async function run() {
  const activeDbPath = 'prisma/database.db';
  
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const backupPath = `prisma/backups/database_pre_resolve_${timestamp}.db`;
  fs.copyFileSync(activeDbPath, backupPath);

  const stat = fs.statSync(backupPath);
  if (stat.size === 0) throw new Error("Backup file is empty");

  fs.copyFileSync(backupPath, 'prisma/temp_resolve_verify.db');
  const backupStats = await verifyDb('prisma/temp_resolve_verify.db');
  fs.unlinkSync('prisma/temp_resolve_verify.db');

  const activeStats = await verifyDb('prisma/database.db');

  const report = {
    activeDbPath,
    backupPath,
    activeStats,
    backupStats,
    checksums: {
      activeDb: await calculateHash(activeDbPath),
      backupDb: await calculateHash(backupPath),
      migration0Init: await calculateHash('prisma/migrations/0_init/migration.sql'),
      migrationPhase2: await calculateHash('prisma/migrations/20260922_phase2_additive_models/migration.sql')
    }
  };

  fs.writeFileSync('C:\\Users\\Robi\\.gemini\\antigravity\\brain\\f67ef042-4c1b-4cad-bf93-412416058a84\\phase2-resolve-prep.json', JSON.stringify(report, null, 2));
  console.log("Prep complete. Backup at", backupPath);
}

run().catch(console.error);
