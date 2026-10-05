import { ParsedStagedRecord } from './types';

export function classifyRecord(record: ParsedStagedRecord): ParsedStagedRecord {
  let cls = 'UNKNOWN';
  let reason = '';

  const { entryPrice, exitPrice, volume, grossPnl, netPnl, commission, swap, direction, originalSymbol } = record;
  const t = record.rawRecordType?.toLowerCase() || '';
  const isDeposit = t.includes('deposit') || t.includes('balance') || originalSymbol?.toLowerCase().includes('balance');
  const isWithdrawal = t.includes('withdraw');
  const isCredit = t.includes('credit');

  if (isDeposit && (netPnl || 0) > 0) {
    cls = 'DEPOSIT';
    reason = 'Balance operation with positive amount';
  } else if (isWithdrawal || (isDeposit && (netPnl || 0) < 0)) {
    cls = 'WITHDRAWAL';
    reason = 'Balance operation with negative amount';
  } else if (isCredit) {
    cls = 'CREDIT';
    reason = 'Credit operation';
  } else if (t.includes('order')) {
    cls = 'ORDER';
    reason = 'Explicit order type';
  } else if (t.includes('deal')) {
    cls = 'DEAL';
    reason = 'Explicit deal type';
  } else if (volume && volume > 0) {
    // If it has volume but no explicit type, check if it's open/closed
    if ((!exitPrice || exitPrice === 0) && (!exitTime(record))) {
      cls = 'OPEN_POSITION';
      reason = 'Volume present but no exit time/price';
    } else {
      cls = 'CLOSED_POSITION';
      reason = 'Volume and exit data present';
    }
  }

  record.classification = cls;
  record.classificationReason = reason;
  return record;
}

function exitTime(r: ParsedStagedRecord) {
  return r.exitTime !== undefined && r.exitTime !== null;
}
