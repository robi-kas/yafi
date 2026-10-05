export type RawSourceRow = Record<string, string>;

export interface ParsedStagedRecord {
  rawSourceRow: string;
  sourceRowNum: number;
  detectedBroker: string;
  brokerAccountId?: string;
  brokerTicket?: string;
  orderId?: string;
  dealId?: string;
  positionId?: string;
  originalSymbol?: string;
  displaySymbol?: string;
  direction?: string; // "buy" | "sell"
  volume?: number;
  entryTime?: Date;
  exitTime?: Date;
  entryPrice?: number;
  exitPrice?: number;
  commission?: number;
  swap?: number;
  grossPnl?: number;
  netPnl?: number;
  rawRecordType?: string;
  classification?: string;
  classificationReason?: string;
  duplicateStatus?: string;
  duplicateReason?: string;
  parseWarnings?: string;
  parseErrors?: string;
}

export type ParseResult = {
  records: ParsedStagedRecord[];
  errors: string[];
};
