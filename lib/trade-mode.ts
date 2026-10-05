export type TradeMode = 'CREATE_MANUAL_TRADE' | 'EDIT_MANUAL_TRADE' | 'EDIT_IMPORTED_TRADE';

export function getTradeEditMode(trade: any | null | undefined): TradeMode {
  if (!trade) {
    return 'CREATE_MANUAL_TRADE';
  }

  // Priority A & B: Explicit stored source/import metadata or markers
  if (
    trade.importBatchId ||
    trade.brokerPositionId ||
    trade.source || // In case it gets added
    trade.brokerTicket ||
    trade.dealId ||
    trade.orderId
  ) {
    return 'EDIT_IMPORTED_TRADE';
  }

  // Priority C: Legacy fallback for MT5 auto-sync
  if (trade.id && typeof trade.id === 'string' && trade.id.startsWith('mt5-')) {
    return 'EDIT_IMPORTED_TRADE';
  }

  return 'EDIT_MANUAL_TRADE';
}
