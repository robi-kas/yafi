import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { parseGenericCsv } from '../lib/import/parser';
import { detectDuplicates } from '../lib/import/duplicate-detector';
import { PrismaClient } from '@prisma/client';

describe('Phase 3A Import Engine', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    // ALWAYS USE TEST DB
    prisma = new PrismaClient({ datasourceUrl: 'file:./database_test.db' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should parse a normal generic CSV closed trade', async () => {
    const csv = `Ticket,Symbol,Type,Volume,Open Time,Close Time,Profit\n1234,XAUUSD,Buy,1.0,2026-09-01T10:00:00Z,2026-09-01T11:00:00Z,500.00`;
    const res = parseGenericCsv(csv);
    expect(res.records.length).toBe(1);
    expect(res.records[0].classification).toBe('CLOSED_POSITION');
    expect(res.records[0].netPnl).toBe(500);
    expect(res.records[0].displaySymbol).toBe('XAUUSD');
    
    const deduped = await detectDuplicates(prisma, res.records);
    expect(deduped[0].duplicateStatus).toBe('NEW_RECORD'); // Ticket 1234 does not exist in DB yet
  });

  it('should exclude deposits from trade P&L by classifying correctly', () => {
    const csv = `Ticket,Symbol,Type,Volume,Open Time,Profit\n9999,,Deposit,,2026-09-01T10:00:00Z,10000.00`;
    const res = parseGenericCsv(csv);
    expect(res.records[0].classification).toBe('DEPOSIT');
  });

  it('should exclude withdrawals from trade P&L by classifying correctly', () => {
    const csv = `Ticket,Symbol,Type,Volume,Open Time,Profit\n9998,,Withdrawal,,2026-09-01T10:00:00Z,-500.00`;
    const res = parseGenericCsv(csv);
    expect(res.records[0].classification).toBe('WITHDRAWAL');
  });

  it('should normalize XAUUSD.x', () => {
    const csv = `Ticket,Symbol,Type,Volume,Open Time,Profit\n111,XAUUSD.x,Buy,1.0,2026-09-01,10`;
    const res = parseGenericCsv(csv);
    expect(res.records[0].originalSymbol).toBe('XAUUSD.x');
    expect(res.records[0].displaySymbol).toBe('XAUUSD');
  });

  it('should parse a malformed CSV with no headers gracefully', () => {
    const csv = `\n\n\n`; // PapaParse skips empty lines
    const res = parseGenericCsv(csv);
    expect(res.records.length).toBe(0);
  });
});
