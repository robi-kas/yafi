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
    mt5Trades: 0,
    tables: [] as string[],
    cols: [] as string[],
    migrations: [] as string[]
  };
  
  try {
    const countRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM Trade`) as any[];
    result.trades = Number(countRes[0]?.c || 0);

    const pnlRes = await prisma.$queryRawUnsafe(`SELECT SUM(profitLoss) as s FROM Trade WHERE profitLoss IS NOT NULL`) as any[];
    result.netPnl = Number(pnlRes[0]?.s || 0);
    
    const mt5 = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM Trade WHERE id IN ('mt5-35845236', 'mt5-35867022', 'mt5-35924536', 'mt5-35935327')`) as any[];
    result.mt5Trades = Number(mt5[0]?.c || 0);

    const tablesRaw = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table'`) as any[];
    result.tables = tablesRaw.map(t => t.name);

    if (result.tables.includes('Trade')) {
      const cols = await prisma.$queryRawUnsafe(`PRAGMA table_info(Trade)`) as any[];
      result.cols = cols.map(c => c.name);
    }

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
  const activeStats = await verifyDb(activeDbPath);
  const activeHash = await calculateHash(activeDbPath);
  
  const report = {
    activeDbPath,
    activeStats,
    checksums: {
      activeDb: activeHash
    }
  };

  fs.writeFileSync('C:\\Users\\Robi\\.gemini\\antigravity\\brain\\f67ef042-4c1b-4cad-bf93-412416058a84\\phase2-resolve-post.json', JSON.stringify(report, null, 2));
  console.log("Post verify complete");
}

run().catch(console.error);
