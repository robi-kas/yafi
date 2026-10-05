import { NextResponse } from 'next/server';
import { FileStorageAdapter } from '@/lib/storage/file-adapter';

const db = new FileStorageAdapter();

export async function POST(request: Request) {
    try {
        const data = await request.json();
        
        if (!data || !data.deals) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        console.log(`Received ${data.deals.length} deals from MT5 Account: ${data.account}`);
        
        let saved = 0;
        // Fetch existing trades to prevent duplicates
        const trades = await db.getTrades();
        
        for (const deal of data.deals) {
            const tradeId = `mt5-${deal.ticket}`;
            
            // Skip if we already synced this trade
            if (trades.some(t => t.id === tradeId)) {
                continue;
            }

            const pnl = deal.profit;
            let status = 'BREAKEVEN';
            if (pnl > 0.01) status = 'WIN';
            else if (pnl < -0.01) status = 'LOSS';

            // DEAL_TYPE_BUY = 0, DEAL_TYPE_SELL = 1
            // A DEAL_ENTRY_OUT (closing) deal that is a BUY means the original position was a SELL.
            const direction = deal.type === 0 ? 'SELL' : 'BUY';

            const newTrade = {
                id: tradeId,
                symbol: deal.symbol,
                direction: direction,
                status: status,
                pnl: pnl,
                positionSize: deal.volume,
                // MT5 sends seconds timestamp
                entryTime: new Date(deal.time * 1000).toISOString(),
                exitTime: new Date(deal.time * 1000).toISOString(),
                tags: ['MT5 Auto-Sync'],
                notes: `Auto-synced from MT5 Account ${data.account}`
            };

            await db.saveTrade(newTrade);
            saved++;
        }

        return NextResponse.json({ success: true, saved, message: `Synced ${saved} new trades` });

    } catch (err: any) {
        console.error('MT5 Webhook Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
