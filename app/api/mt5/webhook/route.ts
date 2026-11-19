import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { mapPosition, positionKey, validatePosition, type Mt5Payload } from '@/lib/mt5';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Called by the YafiSync Expert Advisor running in the user's MT5 terminal.
// No browser session: the user's private webhook token (Settings -> MT5) is
// sent as the `x-yafi-token` header (or `?token=`) and decides whose journal
// receives the trades.
//
// Body (see mt5/YafiSync.mq5): { login, server, company, currency, balance,
// netDeposits, positions: [{ positionId, symbol, type, volume, openTime,
// closeTime, openPrice, closePrice, sl, tp, profit, commission, swap }] }
export async function POST(request: Request) {
    const token = request.headers.get('x-yafi-token') || new URL(request.url).searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Missing webhook token' }, { status: 401 });
    const settings = await prisma.userSettings.findUnique({ where: { webhookToken: token } });
    if (!settings) return NextResponse.json({ error: 'Invalid webhook token' }, { status: 401 });
    const userId = settings.userId;

    let body: Mt5Payload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
    }

    const login = String(body?.login ?? '').trim();
    const server = String(body?.server ?? '').trim();
    if (!login || !server || !Array.isArray(body.positions)) {
        return NextResponse.json({ error: 'Expected { login, server, positions[] }' }, { status: 400 });
    }
    if (body.positions.length > 500) {
        return NextResponse.json({ error: 'Send at most 500 positions per request' }, { status: 413 });
    }

    try {
        // One journal account per MT5 login + server.
        const isDemo = /demo|trial|contest/i.test(server);
        const accountFields = {
            currency: body.currency || 'USD',
            isLive: !isDemo,
            lastSyncAt: new Date(),
            lastUpdated: new Date(),
            // "balance" is the journal's starting capital: net deposits, so
            // balance + synced P&L equals the real account balance.
            ...(typeof body.netDeposits === 'number' && Number.isFinite(body.netDeposits) ? { balance: body.netDeposits } : {}),
        };
        const account = await prisma.account.upsert({
            where: { userId_brokerLogin_brokerServer: { userId, brokerLogin: login, brokerServer: server } },
            update: accountFields,
            create: {
                userId,
                brokerLogin: login,
                brokerServer: server,
                name: `${body.company || 'MT5'} ${login}`,
                broker: body.company || server,
                type: isDemo ? 'demo' : 'personal',
                balance: typeof body.netDeposits === 'number' ? body.netDeposits : (Number(body.balance) || 0),
                ...accountFields,
            },
        });

        let created = 0, updated = 0, linked = 0, skipped = 0;
        const errors: string[] = [];

        for (const p of body.positions) {
            const invalid = validatePosition(p);
            if (invalid) {
                errors.push(`Position ${p?.positionId ?? '?'}: ${invalid}`);
                skipped++;
                continue;
            }
            const key = positionKey(server, login, p.positionId);
            const m = mapPosition(p);

            // Fields the broker owns: always refreshed from MT5.
            const brokerFields = {
                originalBrokerSymbol: m.originalBrokerSymbol,
                entryPrice: m.entryPrice,
                exitPrice: m.exitPrice,
                stopLoss: m.stopLoss,
                takeProfit: m.takeProfit,
                lotSize: m.lotSize,
                profitLoss: m.profitLoss,
                brokerCommission: m.brokerCommission,
                brokerSwap: m.brokerSwap,
                result: m.result,
                entryTime: m.entryTime,
                exitTime: m.exitTime,
                tradeStatus: m.tradeStatus,
                initialPlannedRiskUsd: m.initialPlannedRiskUsd,
                rStatus: m.rStatus,
                accountId: account.id,
            };

            try {
                const existing = await prisma.trade.findUnique({
                    where: { brokerPositionId: key },
                    select: { id: true, userId: true, rrAchieved: true, riskToReward: true, session: true },
                });
                if (existing && existing.userId !== userId) {
                    skipped++;
                    continue;
                }
                if (existing) {
                    await prisma.trade.update({
                        where: { id: existing.id },
                        data: {
                            ...brokerFields,
                            // Keep anything the user set by hand.
                            rrAchieved: existing.rrAchieved ?? m.rrAchieved,
                            riskToReward: existing.riskToReward ?? m.riskToReward,
                            session: existing.session ?? m.session,
                        },
                    });
                    updated++;
                    continue;
                }

                // Link a trade that was imported or logged by hand before sync
                // existed, instead of creating a duplicate (keeps journal notes).
                // Older imports may have stored broker-server time, so allow a
                // few hours of clock difference, but require exact lot size and
                // near-identical entry price.
                const windowMs = 4 * 60 * 60 * 1000;
                const candidates = await prisma.trade.findMany({
                    where: {
                        userId,
                        brokerPositionId: null,
                        symbol: { in: [m.symbol, m.originalBrokerSymbol] },
                        direction: { in: [m.direction, m.direction.toUpperCase()] },
                        lotSize: m.lotSize,
                        entryTime: { gte: new Date(m.entryTime.getTime() - windowMs), lte: new Date(m.entryTime.getTime() + windowMs) },
                    },
                    select: { id: true, entryPrice: true, entryTime: true, rrAchieved: true, riskToReward: true, session: true },
                });
                const tolerance = Math.max(m.entryPrice * 0.0005, 1e-9);
                const match = candidates
                    .filter((c) => Math.abs(c.entryPrice - m.entryPrice) <= tolerance)
                    .sort((a, b) => Math.abs(a.entryTime.getTime() - m.entryTime.getTime()) - Math.abs(b.entryTime.getTime() - m.entryTime.getTime()))[0];

                if (match) {
                    await prisma.trade.update({
                        where: { id: match.id },
                        data: {
                            ...brokerFields,
                            brokerPositionId: key,
                            rrAchieved: match.rrAchieved ?? m.rrAchieved,
                            riskToReward: match.riskToReward ?? m.riskToReward,
                            session: match.session ?? m.session,
                        },
                    });
                    linked++;
                    continue;
                }

                await prisma.trade.create({
                    data: {
                        ...brokerFields,
                        userId,
                        brokerPositionId: key,
                        symbol: m.symbol,
                        displaySymbol: m.displaySymbol,
                        market: m.market,
                        direction: m.direction,
                        session: m.session,
                        rrAchieved: m.rrAchieved,
                        riskToReward: m.riskToReward,
                        tags: JSON.stringify(['MT5 sync']),
                    },
                });
                created++;
            } catch (err: any) {
                errors.push(`Position ${p.positionId}: ${err.message}`);
            }
        }

        return NextResponse.json({
            success: errors.length === 0,
            account: { id: account.id, name: account.name },
            created, updated, linked, skipped,
            errors: errors.slice(0, 20),
        });
    } catch (err: any) {
        console.error('MT5 webhook error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
