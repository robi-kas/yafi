import { PrismaClient } from '@prisma/client';
import fs from 'fs';

async function inspectDb(path: string) {
  if (!fs.existsSync(path)) return null;
  const stat = fs.statSync(path);
  
  const prisma = new PrismaClient({ datasourceUrl: `file:./${path.replace('prisma/', '')}` });
  
  try {
    const tablesRaw = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
    const tables = (tablesRaw as any[]).map(t => t.name);

    let trades = [{ count: 0 }];
    try {
      trades = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM Trade`) as any[];
    } catch(e) {}

    let cols = [];
    try {
      cols = await prisma.$queryRawUnsafe(`PRAGMA table_info(Trade)`) as any[];
    } catch(e) {}

    let migrations = [];
    try {
      migrations = await prisma.$queryRawUnsafe(`SELECT * FROM _prisma_migrations`) as any[];
    } catch(e) {}

    await prisma.$disconnect();

    const hasNewTables = tables.includes('BrokerOrder') && tables.includes('BrokerDeal') && tables.includes('ImportBatch');

    return {
      path,
      size: stat.size,
      mtime: stat.mtime,
      tables,
      tradeCount: Number(trades[0]?.count || 0),
      hasNewTables,
      tradeColumns: cols.map(c => c.name),
      migrations: migrations.map(m => m.migration_name)
    };
  } catch (e) {
    await prisma.$disconnect();
    return { path, error: String(e) };
  }
}

async function run() {
  const audit = {
    active: await inspectDb('prisma/database.db'),
    test: await inspectDb('prisma/database_test.db'),
    backup: await inspectDb('prisma/database_backup.db'),
  };
  fs.writeFileSync('C:\\Users\\Robi\\.gemini\\antigravity\\brain\\f67ef042-4c1b-4cad-bf93-412416058a84\\phase2-target-audit.json', JSON.stringify(audit, null, 2));
  console.log('Audit completed');
}
run();
