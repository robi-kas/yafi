import { NextResponse } from 'next/server';
import { FileStorageAdapter } from '@/lib/storage/file-adapter';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const db = new FileStorageAdapter();

export async function POST(request: Request) {
    try {
        const { account, password, server, fromDate, toDate } = await request.json();
        
        if (!account || !password || !server) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        // The python script lives at root/scripts/mt5_bridge.py
        const scriptPath = path.join(process.cwd(), 'scripts', 'mt5_bridge.py');
        
        // Execute the python script with credentials and optional dates
        let cmd = `python "${scriptPath}" "${account}" "${password}" "${server}"`;
        if (fromDate && toDate) {
            cmd += ` "${fromDate}" "${toDate}"`;
        }
        
        console.log(`Running MT5 Bridge for account: ${account} on server: ${server} from ${fromDate || 'default'} to ${toDate || 'default'}`);
        const { stdout, stderr } = await execAsync(cmd);
        
        // Attempt to parse the JSON output from the python script
        let data;
        try {
            data = JSON.parse(stdout.trim());
        } catch (e) {
            console.error('Failed to parse Python output:', stdout);
            return NextResponse.json({ error: 'Failed to read data from MT5 terminal. Is it installed and running?', details: stderr || stdout }, { status: 500 });
        }

        if (data.error) {
            return NextResponse.json({ error: data.error }, { status: 500 });
        }
        
        if (!data.data || !Array.isArray(data.data)) {
            return NextResponse.json({ error: 'Invalid data format from MT5' }, { status: 500 });
        }

        const deals = data.data;
        const accountInfo = data.account_info || {};
        const exactBalance = accountInfo.balance || 0;
        let saved = 0;
        
        // Fetch existing trades to prevent duplicates
        const trades = await db.getTrades();
        
        // Create or update the linked Account in YAFU
        const accounts = await db.getAccounts();
        const accountId = `mt5-acc-${account}`;
        const existingAcc = accounts.find((a: any) => a.id === accountId);
        
        if (existingAcc) {
            await db.updateAccount(accountId, { lastUpdated: new Date().toISOString() });
        } else {
            // For a brand new account, we don't know their starting deposit.
            // We temporarily set it to their exact balance, but they can edit it in the UI to match their prop firm size.
            await db.saveAccount({
                id: accountId,
                name: `MT5 Account ${account}`,
                type: 'prop_firm',
                broker: server,
                balance: exactBalance,
                lastUpdated: new Date().toISOString(),
                currency: accountInfo.currency || 'USD',
                isLive: true
            } as any);
        }
        
        // Group deals by position_id to extract entry and exit prices
        const positions = new Map();
        for (const deal of deals) {
            if (!deal.position_id || deal.position_id === 0) continue; // skip deposits
            if (!positions.has(deal.position_id)) {
                positions.set(deal.position_id, { inDeal: null, outDeal: null });
            }
            if (deal.entry === 0) positions.get(deal.position_id).inDeal = deal;
            else if (deal.entry === 1) positions.get(deal.position_id).outDeal = deal;
        }

        // Map orders to get SL and TP per position
        const orders = data.orders || [];
        const positionOrders = new Map();
        for (const order of orders) {
            if (order.position_id && order.sl && order.sl > 0) {
                if (!positionOrders.has(order.position_id)) positionOrders.set(order.position_id, { sl: 0, tp: 0 });
                positionOrders.get(order.position_id).sl = order.sl;
            }
            if (order.position_id && order.tp && order.tp > 0) {
                if (!positionOrders.has(order.position_id)) positionOrders.set(order.position_id, { sl: 0, tp: 0 });
                positionOrders.get(order.position_id).tp = order.tp;
            }
        }
        
        for (const [posId, { inDeal, outDeal }] of positions) {
            // We only process fully closed positions
            if (!outDeal) continue;
            
            const tradeId = `mt5-${outDeal.ticket}`;
            
            // Skip if we already synced this trade
            if (trades.some(t => t.id === tradeId)) {
                continue;
            }

            const pnl = outDeal.profit;
            let result = 'breakeven';
            if (pnl > 0.01) result = 'win';
            else if (pnl < -0.01) result = 'loss';

            // DEAL_TYPE_BUY = 0, DEAL_TYPE_SELL = 1
            const direction = outDeal.type === 0 ? 'sell' : 'buy';
            
            const entryPrice = inDeal ? inDeal.price : 0;
            const exitPrice = outDeal.price;
            
            // Get SL/TP
            const ordInfo = positionOrders.get(posId) || { sl: 0, tp: 0 };
            const stopLoss = ordInfo.sl;
            const takeProfit = ordInfo.tp;
            
            // Calculate RR
            let rr = 0;
            if (entryPrice > 0 && stopLoss > 0) {
                const risk = Math.abs(entryPrice - stopLoss);
                if (risk > 0) {
                    const profit = direction === 'buy' ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
                    rr = parseFloat((profit / risk).toFixed(2));
                }
            }

            // Session Logic based on Entry Hour (UTC)
            const entryDate = inDeal ? new Date(inDeal.time) : new Date(outDeal.time);
            const hour = entryDate.getUTCHours();
            let session = 'UNKNOWN';
            if (hour >= 0 && hour < 7) session = 'Asia';
            else if (hour >= 7 && hour < 12) session = 'London';
            else if (hour >= 12 && hour < 20) session = 'New York';
            else session = 'After Hours';
            
            // Assign correct market
            const sym = outDeal.symbol.toUpperCase();
            let marketType = 'forex';
            if (sym.includes('XAU') || sym.includes('XAG') || sym.includes('XPT') || sym.includes('XPD')) marketType = 'metal';
            else if (sym.includes('BTC') || sym.includes('ETH')) marketType = 'crypto';
            else if (sym.includes('US30') || sym.includes('NAS') || sym.includes('SPX') || sym.includes('GER')) marketType = 'indices';

            const newTrade = {
                id: tradeId,
                symbol: outDeal.symbol,
                market: marketType,
                direction: direction,
                result: result,
                profitLoss: pnl,
                lotSize: outDeal.volume,
                entryPrice: entryPrice,
                exitPrice: exitPrice,
                stopLoss: stopLoss,
                takeProfit: takeProfit,
                riskToReward: rr,
                rrAchieved: rr,
                session: session,
                strategy: 'MT5 Sync',
                entryTime: entryDate.toISOString(),
                exitTime: new Date(outDeal.time).toISOString(),
                tags: ['MT5 Auto-Sync'],
                notes: `Auto-synced from MT5 Account ${account}`
            };

            await db.saveTrade(newTrade);
            saved++;
        }

        return NextResponse.json({ success: true, saved, totalDealsFound: deals.length });

    } catch (err: any) {
        console.error('MT5 Sync Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
