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

async function verifyDb(dbPath: string, testDb: boolean = false) {
  const prisma = new PrismaClient({ datasourceUrl: `file:./${path.basename(dbPath)}` });
  let result = { 
    trades: 0, 
    netPnl: 0, 
    brokerOrders: 0,
    brokerDeals: 0,
    stagedRecords: 0,
    tables: [] as string[]
  };
  
  try {
    const countRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM Trade`) as any[];
    result.trades = Number(countRes[0]?.c || 0);

    const pnlRes = await prisma.$queryRawUnsafe(`SELECT SUM(profitLoss) as s FROM Trade WHERE profitLoss IS NOT NULL`) as any[];
    result.netPnl = Number(pnlRes[0]?.s || 0);

    const boRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM BrokerOrder`) as any[];
    result.brokerOrders = Number(boRes[0]?.c || 0);

    const bdRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM BrokerDeal`) as any[];
    result.brokerDeals = Number(bdRes[0]?.c || 0);

    const tablesRaw = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table'`) as any[];
    result.tables = tablesRaw.map(t => t.name);

    if (testDb && result.tables.includes('StagedRecord')) {
      const srRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM StagedRecord`) as any[];
      result.stagedRecords = Number(srRes[0]?.c || 0);
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
  const testDbPath = 'prisma/database_test.db';
  
  const activeStats = await verifyDb(activeDbPath, false);
  const testStats = await verifyDb(testDbPath, true);

  const report = {
    activeStats,
    testStats,
    checksums: {
      activeDb: await calculateHash(activeDbPath),
    }
  };

  fs.writeFileSync('C:\\Users\\Robi\\.gemini\\antigravity\\brain\\f67ef042-4c1b-4cad-bf93-412416058a84\\phase3a-verification.json', JSON.stringify(report, null, 2));
  console.log("Verification complete.");
}

run().catch(console.error);
