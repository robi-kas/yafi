import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

async function calculateHash(filePath: string) {
  return new Promise((resolve) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function verifyDb(dbPath: string) {
  // Use a temporary prisma client pointed to this DB path
  const prisma = new PrismaClient({ datasourceUrl: `file:./${path.basename(dbPath)}` });
  
  let result = { trades: 0, netPnl: 0 };
  try {
    const countRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM Trade`) as any[];
    result.trades = Number(countRes[0]?.c || 0);

    const pnlRes = await prisma.$queryRawUnsafe(`SELECT SUM(profitLoss) as s FROM Trade WHERE profitLoss IS NOT NULL`) as any[];
    result.netPnl = Number(pnlRes[0]?.s || 0);
  } catch (e) {
    console.error(`Error verifying ${dbPath}:`, e);
  } finally {
    await prisma.$disconnect();
  }
  return result;
}

async function run() {
  const activeDbPath = 'prisma/database.db';
  const migrationPath = 'prisma/migrations/20260922_phase2_additive_models/migration.sql';
  
  // 1. Create timestamped backup
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
  const backupDir = 'prisma/backups';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  
  const backupPath = `${backupDir}/database_pre_phase2_${timestamp}.db`;
  fs.copyFileSync(activeDbPath, backupPath);

  // 2. Verify backup file exists and is non-empty
  const stat = fs.statSync(backupPath);
  if (stat.size === 0) throw new Error("Backup file is empty");

  // 3. Verify data in backup (needs to be copied to root or prisma folder for relative sqlite path to work reliably if not absolute)
  // Actually, absolute paths in Prisma sqlite urls require special syntax, let's just copy it to prisma/temp_verify.db
  fs.copyFileSync(backupPath, 'prisma/temp_verify.db');
  const backupStats = await verifyDb('prisma/temp_verify.db');
  fs.unlinkSync('prisma/temp_verify.db');

  const activeStats = await verifyDb('prisma/database.db');

  // 4. Calculate checksums
  const activeHash = await calculateHash(activeDbPath);
  const backupHash = await calculateHash(backupPath);
  const migrationHash = await calculateHash(migrationPath);

  const report = {
    activeDbPath,
    backupPath,
    activeStats,
    backupStats,
    checksums: {
      activeDb: activeHash,
      backupDb: backupHash,
      migrationSql: migrationHash
    }
  };

  fs.writeFileSync('C:\\Users\\Robi\\.gemini\\antigravity\\brain\\f67ef042-4c1b-4cad-bf93-412416058a84\\phase2-deployment-prep.json', JSON.stringify(report, null, 2));
  console.log("Prep complete. Backup at", backupPath);
}

run().catch(console.error);
