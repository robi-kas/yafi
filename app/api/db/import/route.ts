import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserId, unauthorized } from '@/lib/auth';
import { syncTradeScreenshots } from '@/lib/screenshots';

const jsonArr = (v: any) => (v ? JSON.stringify(v) : null);

export async function POST(request: Request) {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    try {
        let data: any;
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file') as File | null;
            if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
            data = JSON.parse(await file.text());
        } else {
            data = await request.json();
        }

        if (!data || (!data.trades && !data.accounts && !data.strategies)) {
            return NextResponse.json({ error: 'Invalid import file format' }, { status: 400 });
        }

        let saved = 0;
        const errors: string[] = [];

        // Import accounts
        for (const acc of data.accounts || []) {
            try {
                const fields = {
                    name: acc.name,
                    type: acc.type || "Live",
                    broker: acc.broker,
                    balance: acc.balance,
                    currency: acc.currency || "USD",
                    lastUpdated: new Date()
                };
                const existing = acc.id
                    ? await prisma.account.findUnique({ where: { id: acc.id }, select: { userId: true } })
                    : null;
                if (existing && existing.userId !== userId) {
                    errors.push(`Account "${acc.name || '?'}": ID belongs to another user, skipped`);
                    continue;
                }
                if (existing) {
                    await prisma.account.update({ where: { id: acc.id }, data: fields });
                } else {
                    await prisma.account.create({ data: { ...fields, id: acc.id || undefined, userId } });
                }
                saved++;
            } catch (err: any) {
                errors.push(`Account "${acc.name || '?'}": ${err.message}`);
            }
        }

        // Import strategies (names are unique per user)
        for (const strat of data.strategies || []) {
            try {
                const fields = {
                    name: strat.name,
                    description: strat.description || '',
                    rules: strat.rules,
                    markets: strat.markets ? JSON.stringify(strat.markets) : null
                };
                const byId = strat.id
                    ? await prisma.strategy.findUnique({ where: { id: strat.id }, select: { id: true, userId: true } })
                    : null;
                if (byId && byId.userId !== userId) {
                    errors.push(`Strategy "${strat.name || '?'}": ID belongs to another user, skipped`);
                    continue;
                }
                const target = byId || await prisma.strategy.findFirst({ where: { userId, name: strat.name }, select: { id: true } });
                if (target) {
                    await prisma.strategy.update({ where: { id: target.id }, data: fields });
                } else {
                    await prisma.strategy.create({ data: { ...fields, id: strat.id || undefined, userId } });
                }
                saved++;
            } catch (err: any) {
                errors.push(`Strategy "${strat.name || '?'}": ${err.message}`);
            }
        }

        // Import trades
        if (data.trades?.length) {
            const ownedAccounts = new Set(
                (await prisma.account.findMany({ where: { userId }, select: { id: true } })).map(a => a.id)
            );
            const ownedStrategies = new Set(
                (await prisma.strategy.findMany({ where: { userId }, select: { id: true } })).map(s => s.id)
            );

            let defaultAccountId = ownedAccounts.values().next().value as string | undefined;
            if (!defaultAccountId) {
                const newAcc = await prisma.account.create({
                    data: { userId, name: 'Imported Account', type: 'Live', broker: 'Unknown', balance: 0, currency: 'USD' }
                });
                defaultAccountId = newAcc.id;
                ownedAccounts.add(newAcc.id);
            }

            for (const trade of data.trades) {
                try {
                    const existing = trade.id
                        ? await prisma.trade.findUnique({ where: { id: trade.id }, select: { userId: true } })
                        : null;
                    if (existing && existing.userId !== userId) {
                        errors.push(`Trade "${trade.symbol || '?'}": ID belongs to another user, skipped`);
                        continue;
                    }

                    const dataToSave = { ...trade };
                    for (const k of ['id', 'userId', 'riskPercent', 'strategy', 'account', 'screenshots']) {
                        delete dataToSave[k];
                    }

                    // Exports record the strategy by name; link it (creating it if needed).
                    let strategyId: string | null = ownedStrategies.has(trade.strategyId) ? trade.strategyId : null;
                    const strategyName = typeof trade.strategy === 'string' ? trade.strategy.trim() : '';
                    if (!strategyId && strategyName) {
                        const strat = await prisma.strategy.upsert({
                            where: { userId_name: { userId, name: strategyName } },
                            update: {},
                            create: { userId, name: strategyName, description: '' },
                            select: { id: true },
                        });
                        strategyId = strat.id;
                        ownedStrategies.add(strat.id);
                    }

                    const fields = {
                        ...dataToSave,
                        rrPlanned: dataToSave.rrPlanned ? parseFloat(dataToSave.rrPlanned) : null,
                        rrAchieved: dataToSave.rrAchieved ? parseFloat(dataToSave.rrAchieved) : null,
                        accountId: ownedAccounts.has(trade.accountId) ? trade.accountId : defaultAccountId,
                        strategyId,
                        entryTime: trade.entryTime ? new Date(trade.entryTime) : new Date(),
                        exitTime: trade.exitTime ? new Date(trade.exitTime) : null,
                        tags: jsonArr(trade.tags),
                        confluences: jsonArr(trade.confluences),
                        mistakes: jsonArr(trade.mistakes),
                        emotionTags: jsonArr(trade.emotionTags),
                        mistakeTags: jsonArr(trade.mistakeTags),
                    };

                    const savedTrade = existing
                        ? await prisma.trade.update({ where: { id: trade.id }, data: fields })
                        : await prisma.trade.create({ data: { ...fields, id: trade.id || undefined, userId } });
                    // The client uploads embedded images first and sends storage paths here.
                    if (Array.isArray(trade.screenshots) && trade.screenshots.length) {
                        await syncTradeScreenshots(userId, savedTrade.id, trade.screenshots);
                    }
                    saved++;
                } catch (err: any) {
                    errors.push(`Trade "${trade.symbol || '?'}": ${err.message}`);
                }
            }
        }

        return NextResponse.json({
            saved,
            accounts: data.accounts?.length || 0,
            strategies: data.strategies?.length || 0,
            trades: data.trades?.length || 0,
            errors,
        });
    } catch (err: any) {
        console.error('Import error:', err);
        return NextResponse.json({ error: err.message || 'Import failed' }, { status: 500 });
    }
}
