export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserId, unauthorized } from '@/lib/auth';
import { formatTrades, loadFormattedTrade, tradeInclude } from '@/lib/format-trade';
import { syncTradeScreenshots, removeObjects } from '@/lib/screenshots';

// Fields a client may never set directly on a row.
function stripProtected(body: any) {
    const data = { ...body };
    delete data.id;
    delete data.userId;
    delete data.riskPercent; // Not in schema
    delete data.strategy;    // Nested object / name, resolved to strategyId
    delete data.account;
    delete data.screenshots; // Stored separately
    delete data.createdAt;
    delete data.updatedAt;
    return data;
}

async function ownsAccount(userId: string, id: string) {
    return !!(await prisma.account.findFirst({ where: { id, userId }, select: { id: true } }));
}

async function ownsStrategy(userId: string, id: string) {
    return !!(await prisma.strategy.findFirst({ where: { id, userId }, select: { id: true } }));
}

async function strategyIdFromName(userId: string, name: string) {
    const strat = await prisma.strategy.upsert({
        where: { userId_name: { userId, name } },
        update: {},
        create: { userId, name, description: '' }
    });
    return strat.id;
}

function jsonArr(v: any) {
    return v ? JSON.stringify(v) : null;
}

export async function GET(request: Request) {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    try {
        if (type === 'trades') {
            const trades = await prisma.trade.findMany({
                where: { userId },
                include: tradeInclude,
                orderBy: { entryTime: 'desc' }
            });
            const formatted = await formatTrades(trades);
            return NextResponse.json(formatted);
        } else if (type === 'strategies') {
            const strategies = await prisma.strategy.findMany({ where: { userId } });
            return NextResponse.json(strategies.map(s => ({
                ...s,
                markets: s.markets ? JSON.parse(s.markets) : []
            })));
        } else if (type === 'accounts') {
            const accounts = await prisma.account.findMany({ where: { userId } });
            return NextResponse.json(accounts);
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error: any) {
        console.error('API GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const userId = await getUserId();
    if (!userId) return unauthorized();

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

            let accountId = body.accountId;
            if (accountId) {
                if (!(await ownsAccount(userId, accountId))) {
                    return NextResponse.json({ error: 'Account not found' }, { status: 400 });
                }
            } else {
                const defaultAcc = await prisma.account.findFirst({ where: { userId } });
                accountId = defaultAcc
                    ? defaultAcc.id
                    : (await prisma.account.create({
                        data: { userId, name: 'Default Account', type: 'personal', broker: 'Unknown', balance: 10000 }
                    })).id;
            }

            let strategyId = body.strategyId;
            if (strategyId) {
                if (!(await ownsStrategy(userId, strategyId))) {
                    return NextResponse.json({ error: 'Strategy not found' }, { status: 400 });
                }
            } else if (typeof body.strategy === 'string' && body.strategy) {
                strategyId = await strategyIdFromName(userId, body.strategy);
            }

            const data = stripProtected(body);
            const trade = await prisma.trade.create({
                data: {
                    ...data,
                    entryTime: body.entryTime ? new Date(body.entryTime) : new Date(),
                    exitTime: body.exitTime ? new Date(body.exitTime) : null,
                    tags: jsonArr(body.tags),
                    confluences: jsonArr(body.confluences),
                    mistakes: jsonArr(body.mistakes),
                    emotionTags: jsonArr(body.emotionTags),
                    mistakeTags: jsonArr(body.mistakeTags),
                    accountId,
                    strategyId: strategyId || null,
                    userId,
                }
            });
            await syncTradeScreenshots(userId, trade.id, body.screenshots);
            return NextResponse.json(await loadFormattedTrade(trade.id));
        } else if (type === 'strategies') {
            const strategy = await prisma.strategy.create({
                data: {
                    userId,
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
                    userId,
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
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    try {
        if (type === 'trades') {
            const existingTrade = await prisma.trade.findFirst({ where: { id, userId } });
            if (!existingTrade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 });

            const { getTradeEditMode } = await import('@/lib/trade-mode');
            const mode = getTradeEditMode(existingTrade);

            const updateData = stripProtected(body);

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

            if (updateData.accountId && !(await ownsAccount(userId, updateData.accountId))) {
                return NextResponse.json({ error: 'Account not found' }, { status: 400 });
            }

            let strategyId = updateData.strategyId;
            if (strategyId) {
                if (!(await ownsStrategy(userId, strategyId))) {
                    return NextResponse.json({ error: 'Strategy not found' }, { status: 400 });
                }
            } else if (typeof body.strategy === 'string' && body.strategy) {
                strategyId = await strategyIdFromName(userId, body.strategy);
            }

            const trade = await prisma.trade.update({
                where: { id },
                data: {
                    ...updateData,
                    entryTime: updateData.entryTime ? new Date(updateData.entryTime) : undefined,
                    exitTime: updateData.exitTime ? new Date(updateData.exitTime) : undefined,
                    tags: updateData.tags ? JSON.stringify(updateData.tags) : undefined,
                    confluences: updateData.confluences ? JSON.stringify(updateData.confluences) : undefined,
                    mistakes: updateData.mistakes ? JSON.stringify(updateData.mistakes) : undefined,
                    emotionTags: updateData.emotionTags ? JSON.stringify(updateData.emotionTags) : undefined,
                    mistakeTags: updateData.mistakeTags ? JSON.stringify(updateData.mistakeTags) : undefined,
                    strategyId: strategyId !== undefined ? strategyId : undefined,
                }
            });
            await syncTradeScreenshots(userId, trade.id, body.screenshots);
            return NextResponse.json(await loadFormattedTrade(trade.id));
        } else if (type === 'strategies') {
            if (!(await ownsStrategy(userId, id))) return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
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
            if (!(await ownsAccount(userId, id))) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
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
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    try {
        if (type === 'trades') {
            const shots = await prisma.tradeScreenshot.findMany({ where: { tradeId: id, trade: { userId } }, select: { path: true } });
            const { count } = await prisma.trade.deleteMany({ where: { id, userId } });
            if (!count) return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
            await removeObjects(shots.map(s => s.path));
            return NextResponse.json({ success: true });
        } else if (type === 'strategies') {
            if (!(await ownsStrategy(userId, id))) return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
            await prisma.trade.updateMany({ where: { strategyId: id, userId }, data: { strategyId: null } });
            await prisma.strategy.delete({ where: { id } });
            return NextResponse.json({ success: true });
        } else if (type === 'accounts') {
            if (!(await ownsAccount(userId, id))) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
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
