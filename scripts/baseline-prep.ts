import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

async function verifyDb(dbPath: string) {
  const prisma = new PrismaClient({ datasourceUrl: `file:./${path.basename(dbPath)}` });
  let result = { 
    trades: 0, 
    netPnl: 0, 
    validRCount: 0,
    mt5Trades: 0,
    tables: [] as string[],
    migrations: false
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
    result.migrations = result.tables.includes('_prisma_migrations');

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
  const backupDir = 'prisma/backups';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  
  const backupPath = `${backupDir}/database_pre_baseline_${timestamp}.db`;
  fs.copyFileSync(activeDbPath, backupPath);

  const stat = fs.statSync(backupPath);
  if (stat.size === 0) throw new Error("Backup file is empty");

  fs.copyFileSync(backupPath, 'prisma/temp_baseline_verify.db');
  const backupStats = await verifyDb('prisma/temp_baseline_verify.db');
  fs.unlinkSync('prisma/temp_baseline_verify.db');

  console.log(JSON.stringify(backupStats, null, 2));
}

run().catch(console.error);
