export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    try {
        console.log(`API GET Request: type=${type}`);
        if (type === 'trades') {
            const trades = await prisma.trade.findMany({
                include: { screenshots: true },
                orderBy: { entryTime: 'desc' }
            });
            
            // Format trades to match legacy API interface
            const formatted = trades.map(t => ({
                ...t,
                tags: t.tags ? JSON.parse(t.tags) : [],
                confluences: t.confluences ? JSON.parse(t.confluences) : [],
                mistakes: t.mistakes ? JSON.parse(t.mistakes) : [],
                emotionTags: t.emotionTags ? JSON.parse(t.emotionTags) : [],
                mistakeTags: t.mistakeTags ? JSON.parse(t.mistakeTags) : [],
                screenshots: t.screenshots.map(s => s.path)
            }));
            return NextResponse.json(formatted);
        } else if (type === 'strategies') {
            const strategies = await prisma.strategy.findMany();
            return NextResponse.json(strategies.map(s => ({
                ...s,
                markets: s.markets ? JSON.parse(s.markets) : []
            })));
        } else if (type === 'accounts') {
            const accounts = await prisma.account.findMany();
            return NextResponse.json(accounts);
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error: any) {
        console.error('API GET Error:', error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const body = await request.json();

    try {
        if (type === 'trades') {
            const { getTradeEditMode } = await import('@/lib/trade-mode');
            const mode = getTradeEditMode(body);
            
            if (mode === 'CREATE_MANUAL_TRADE') {
                const missing = [];
                if (!body.htfBias) missing.push('HTF Bias');
                if (!body.trendAlignment) missing.push('Trend Alignment');
                if (!body.session) missing.push('Session');
                if (!body.entryModel) missing.push('Entry Model');
                if (!body.entryReason) missing.push('Entry Reason');
                if (missing.length > 0) {
                    return NextResponse.json({ error: `Manual trade missing required fields: ${missing.join(', ')}` }, { status: 400 });
                }
            }

            // Need a default account if not provided
            let accountId = body.accountId;
            if (!accountId) {
                const defaultAcc = await prisma.account.findFirst();
                if (defaultAcc) {
                    accountId = defaultAcc.id;
                } else {
                    const newAcc = await prisma.account.create({
                        data: { name: 'Default Account', type: 'personal', broker: 'Unknown', balance: 10000 }
                    });
                    accountId = newAcc.id;
                }
            }

            let strategyId = body.strategyId;
            if (!strategyId && body.strategy) {
                const strat = await prisma.strategy.upsert({
                    where: { name: body.strategy },
                    update: {},
                    create: { name: body.strategy, description: '' }
                });
                strategyId = strat.id;
            }

            const trade = await prisma.trade.create({
                data: {
                    ...body,
                    id: undefined, // Let Prisma generate it
                    riskPercent: undefined, // Not in schema
                    entryTime: body.entryTime ? new Date(body.entryTime) : new Date(),
                    exitTime: body.exitTime ? new Date(body.exitTime) : null,
                    tags: body.tags ? JSON.stringify(body.tags) : null,
                    confluences: body.confluences ? JSON.stringify(body.confluences) : null,
                    mistakes: body.mistakes ? JSON.stringify(body.mistakes) : null,
                    emotionTags: body.emotionTags ? JSON.stringify(body.emotionTags) : null,
                    mistakeTags: body.mistakeTags ? JSON.stringify(body.mistakeTags) : null,
                    accountId,
                    strategyId,
                    strategy: undefined, // Remove nested strategy object if present
                    screenshots: undefined // Handle separately if needed
                }
            });
            return NextResponse.json(trade);
        } else if (type === 'strategies') {
            const strategy = await prisma.strategy.create({
                data: {
                    name: body.name,
                    description: body.description || '',
                    rules: body.rules,
                    markets: body.markets ? JSON.stringify(body.markets) : null
                }
            });
            return NextResponse.json(strategy);
        } else if (type === 'accounts') {
            const account = await prisma.account.create({
                data: {
                    name: body.name,
                    type: body.type,
                    broker: body.broker,
                    balance: body.balance,
                    currency: body.currency || "USD",
                    lastUpdated: new Date()
                }
            });
            return NextResponse.json(account);
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    try {
        if (type === 'trades') {
            const existingTrade = await prisma.trade.findUnique({ where: { id } });
            if (!existingTrade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 });

            const { getTradeEditMode } = await import('@/lib/trade-mode');
            const mode = getTradeEditMode(existingTrade);

            let updateData = { ...body }; delete updateData.riskPercent;

            // Validation blocks removed as requested
            if (mode === 'EDIT_MANUAL_TRADE') {
                const missing = [];
                // Fallback to existingTrade if the update payload omits it, since it's an update
                if (!(updateData.htfBias || existingTrade.htfBias)) missing.push('HTF Bias');
                if (!(updateData.trendAlignment || existingTrade.trendAlignment)) missing.push('Trend Alignment');
                if (!(updateData.session || existingTrade.session)) missing.push('Session');
                if (!(updateData.entryModel || existingTrade.entryModel)) missing.push('Entry Model');
                if (!(updateData.entryReason || existingTrade.entryReason)) missing.push('Entry Reason');
                
                if (missing.length > 0) {
                    return NextResponse.json({ error: `Manual trade missing required fields: ${missing.join(', ')}` }, { status: 400 });
                }
            }

            let strategyId = updateData.strategyId;
            if (!strategyId && updateData.strategy) {
                const strat = await prisma.strategy.upsert({
                    where: { name: updateData.strategy },
                    update: {},
                    create: { name: updateData.strategy, description: '' }
                });
                strategyId = strat.id;
            }

            const trade = await prisma.trade.update({
                where: { id },
                data: {
                    ...updateData,
                    id: undefined, // Don't update ID
                    entryTime: updateData.entryTime ? new Date(updateData.entryTime) : undefined,
                    exitTime: updateData.exitTime ? new Date(updateData.exitTime) : undefined,
                    tags: updateData.tags ? JSON.stringify(updateData.tags) : undefined,
                    confluences: updateData.confluences ? JSON.stringify(updateData.confluences) : undefined,
                    mistakes: updateData.mistakes ? JSON.stringify(updateData.mistakes) : undefined,
                    emotionTags: updateData.emotionTags ? JSON.stringify(updateData.emotionTags) : undefined,
                    mistakeTags: updateData.mistakeTags ? JSON.stringify(updateData.mistakeTags) : undefined,
                    strategyId: strategyId !== undefined ? strategyId : undefined,
                    strategy: undefined,
                    screenshots: undefined
                }
            });
            return NextResponse.json(trade);
        } else if (type === 'strategies') {
            const strategy = await prisma.strategy.update({
                where: { id },
                data: {
                    name: body.name !== undefined ? body.name : undefined,
                    description: body.description !== undefined ? body.description : undefined,
                    rules: body.rules !== undefined ? body.rules : undefined,
                    markets: body.markets ? JSON.stringify(body.markets) : undefined
                }
            });
            return NextResponse.json(strategy);
        } else if (type === 'accounts') {
            const account = await prisma.account.update({
                where: { id },
                data: {
                    name: body.name !== undefined ? body.name : undefined,
                    type: body.type !== undefined ? body.type : undefined,
                    broker: body.broker !== undefined ? body.broker : undefined,
                    balance: body.balance !== undefined ? body.balance : undefined,
                    currency: body.currency !== undefined ? body.currency : undefined,
                    lastUpdated: new Date()
                }
            });
            return NextResponse.json(account);
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    try {
        if (type === 'trades') {
            await prisma.trade.delete({ where: { id } });
            return NextResponse.json({ success: true });
        } else if (type === 'strategies') {
            await prisma.trade.updateMany({ where: { strategyId: id }, data: { strategyId: null } });
            await prisma.strategy.delete({ where: { id } });
            return NextResponse.json({ success: true });
        } else if (type === 'accounts') {
            const tradeCount = await prisma.trade.count({ where: { accountId: id } });
            if (tradeCount > 0) {
                return NextResponse.json({ error: `Cannot delete account: it contains ${tradeCount} trades. Please delete or move the trades first.` }, { status: 400 });
            }
            await prisma.account.delete({ where: { id } });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
