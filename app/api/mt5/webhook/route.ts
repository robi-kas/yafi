import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
    try {
        const data = await request.json();
        
        if (!data || !data.deals) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        console.log(`Received ${data.deals.length} deals from MT5 Account: ${data.account}`);
        
        let saved = 0;
        
        // Find or create a default account for the MT5 sync
        let accountId = '';
        const existingAccount = await prisma.account.findFirst({
            where: { name: { contains: data.account?.toString() || 'MT5' } }
        });
        
        if (existingAccount) {
            accountId = existingAccount.id;
        } else {
            const firstAcc = await prisma.account.findFirst();
            if (firstAcc) {
                accountId = firstAcc.id;
            } else {
                const newAcc = await prisma.account.create({ 
                    data: { name: `MT5 Account ${data.account || ''}`, type: 'Live', broker: 'MetaTrader 5', balance: 0, currency: 'USD' } 
                });
                accountId = newAcc.id;
            }
        }
        
        for (const deal of data.deals) {
            const tradeId = `mt5-${deal.ticket}`;
            
            // Skip if we already synced this trade
            const existingTrade = await prisma.trade.findUnique({
                where: { id: tradeId }
            });
            
            if (existingTrade) {
                continue;
            }

            const pnl = deal.profit;
            let status = 'BREAKEVEN';
            if (pnl > 0.01) status = 'WIN';
            else if (pnl < -0.01) status = 'LOSS';

            // DEAL_TYPE_BUY = 0, DEAL_TYPE_SELL = 1
            const direction = deal.type === 0 ? 'SELL' : 'BUY';

            await prisma.trade.create({
                data: {
                    id: tradeId,
                    accountId: accountId,
                    symbol: deal.symbol,
                    market: 'forex', // Default assumption for MT5 unless otherwise specified
                    direction: direction,
                    entryPrice: deal.price || 0, // Using deal price as entry
                    stopLoss: 0,
                    takeProfit: 0,
                    exitPrice: deal.price || 0,
                    lotSize: deal.volume,
                    profitLoss: pnl,
                    result: status,
                    entryTime: new Date(deal.time * 1000),
                    exitTime: new Date(deal.time * 1000),
                    notes: `Auto-synced from MT5 Account ${data.account}`
                }
            });
            
            saved++;
        }

        return NextResponse.json({ success: true, saved, message: `Synced ${saved} new trades` });

    } catch (err: any) {
        console.error('MT5 Webhook Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
