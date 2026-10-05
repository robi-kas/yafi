import Papa from 'papaparse';
import crypto from 'crypto';
import { ParsedStagedRecord, ParseResult, RawSourceRow } from './types';
import { normalizeSymbol } from './symbol-normalizer';
import { classifyRecord } from './classifier';

export function parseGenericCsv(csvContent: string, format: string = 'GENERIC'): ParseResult {
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const errors = result.errors.map(e => e.message);
  if (result.errors.length > 0 && result.data.length === 0) {
    return { records: [], errors };
  }

  const records: ParsedStagedRecord[] = [];
  const rows = result.data as RawSourceRow[];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawString = JSON.stringify(row);
    
    // Very basic mapping trying to guess columns
    const getVal = (keys: string[]) => {
      for (const k of keys) {
        const found = Object.keys(row).find(key => key.toLowerCase().includes(k));
        if (found) return row[found];
      }
      return undefined;
    };

    const sym = getVal(['symbol', 'item', 'asset']);
    const dir = getVal(['type', 'direction', 'side']);
    const vol = parseFloat(getVal(['volume', 'lot', 'size']) || '0');
    const dealId = getVal(['deal', 'ticket', 'order']);
    const pnl = parseFloat(getVal(['profit', 'pnl']) || '0');
    const openTime = getVal(['open', 'entry', 'time']); // 'time' is ambiguous but often means open
    const closeTime = getVal(['close', 'exit']);
    
    const { displaySymbol } = normalizeSymbol(sym);

    let parsedDir = 'buy';
    if (dir && dir.toLowerCase().includes('sell')) parsedDir = 'sell';

    let r: ParsedStagedRecord = {
      rawSourceRow: rawString,
      sourceRowNum: i + 1,
      detectedBroker: format,
      dealId: dealId || undefined,
      originalSymbol: sym,
      displaySymbol,
      direction: parsedDir,
      volume: vol || undefined,
      netPnl: pnl,
      rawRecordType: dir,
      entryTime: openTime ? new Date(openTime) : undefined,
      exitTime: closeTime ? new Date(closeTime) : undefined,
    };

    r = classifyRecord(r);
    records.push(r);
  }

  return { records, errors };
}
