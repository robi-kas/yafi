import { ParsedStagedRecord } from './types';
import { PrismaClient } from '@prisma/client';

export async function detectDuplicates(
  prisma: PrismaClient,
  records: ParsedStagedRecord[]
): Promise<ParsedStagedRecord[]> {
  for (const r of records) {
    if (['DEPOSIT', 'WITHDRAWAL', 'CREDIT', 'BALANCE_OPERATION'].includes(r.classification || '')) {
      r.duplicateStatus = 'NEW_RECORD';
      continue;
    }

    if (r.dealId || r.orderId || r.positionId || r.brokerTicket) {
      // Primary Matching
      let conflict = false;
      let exact = false;
      
      if (r.dealId) {
        const existingDeal = await prisma.brokerDeal.findUnique({ where: { brokerDealId: r.dealId } });
        if (existingDeal) {
          if (Math.abs(existingDeal.price - (r.entryPrice || r.exitPrice || 0)) > 0.0001) conflict = true;
          else exact = true;
        }
      } else if (r.positionId) {
        const existingPos = await prisma.trade.findUnique({ where: { brokerPositionId: r.positionId } });
        if (existingPos) {
          if (Math.abs((existingPos.profitLoss || 0) - (r.netPnl || 0)) > 0.01) conflict = true;
          else exact = true;
        }
      }

      if (conflict) {
        r.duplicateStatus = 'CONFLICT';
        r.duplicateReason = 'Identifiers match but financial data differs.';
      } else if (exact) {
        r.duplicateStatus = 'EXACT_DUPLICATE';
        r.duplicateReason = 'Primary identifier perfectly matches existing record.';
      } else {
        r.duplicateStatus = 'NEW_RECORD';
      }
    } else {
      // Secondary Matching
      if (!r.entryTime && !r.exitTime) {
        r.duplicateStatus = 'MISSING_IDENTIFIER';
        r.duplicateReason = 'No stable IDs and no timestamps to match.';
        continue;
      }
      
      // Look for a possible match
      const existing = await prisma.trade.findFirst({
        where: {
          displaySymbol: r.displaySymbol,
          direction: r.direction,
          lotSize: r.volume,
        }
      });

      if (existing) {
        // Very basic time/price check for possible duplicate
        const timeDiff = Math.abs((existing.entryTime?.getTime() || 0) - (r.entryTime?.getTime() || 0));
        if (timeDiff < 60000) { // 1 min
          r.duplicateStatus = 'POSSIBLE_DUPLICATE';
          r.duplicateReason = 'Matched time, asset, and volume heuristically.';
          continue;
        }
      }

      r.duplicateStatus = 'NEW_RECORD';
    }
  }

  return records;
}
