import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
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
        let defaultAccountId = '';
        const firstAcc = await prisma.account.findFirst();
        if (firstAcc) {
            defaultAccountId = firstAcc.id;
        } else {
            const newAcc = await prisma.account.create({ data: { name: 'Imported Account', type: 'Live', broker: 'Unknown', balance: 0, currency: 'USD' } });
            defaultAccountId = newAcc.id;
        }
        const errors: string[] = [];

        // Import accounts
        if (data.accounts?.length) {
            for (const acc of data.accounts) {
                try {
                    await prisma.account.upsert({
                        where: { id: acc.id || "missing" },
                        update: {
                            name: acc.name,
                            type: acc.type || "Live",
                            broker: acc.broker,
                            balance: acc.balance,
                            currency: acc.currency || "USD",
                            lastUpdated: new Date()
                        },
                        create: {
                            id: acc.id,
                            name: acc.name,
                            type: acc.type || "Live",
                            broker: acc.broker,
                            balance: acc.balance,
                            currency: acc.currency || "USD",
                            lastUpdated: new Date()
                        }
                    });
                    saved++;
                } catch (err: any) {
                    errors.push(`Account "${acc.name || '?'}": ${err.message}`);
                }
            }
        }

        // Import strategies
        if (data.strategies?.length) {
            for (const strat of data.strategies) {
                try {
                    await prisma.strategy.upsert({
                        where: { id: strat.id || "missing" },
                        update: {
                            name: strat.name,
                            description: strat.description || '',
                            rules: strat.rules,
                            markets: strat.markets ? JSON.stringify(strat.markets) : null
                        },
                        create: {
                            id: strat.id,
                            name: strat.name,
                            description: strat.description || '',
                            rules: strat.rules,
                            markets: strat.markets ? JSON.stringify(strat.markets) : null
                        }
                    });
                    saved++;
                } catch (err: any) {
                    errors.push(`Strategy "${strat.name || '?'}": ${err.message}`);
                }
            }
        }

        // Import trades
        if (data.trades?.length) {
            for (const trade of data.trades) {
                try {
                    const dataToSave = { ...trade };
                    delete dataToSave.id;
                    delete dataToSave.riskPercent; // Strip extraneous fields
                    delete dataToSave.strategy;

                    // If accountId is not present but account is, or we just rely on imported IDs:
                    await prisma.trade.upsert({
                        where: { id: trade.id || "missing" },
                        update: {
                            ...dataToSave,
                            rrPlanned: dataToSave.rrPlanned ? parseFloat(dataToSave.rrPlanned) : null,
                            rrAchieved: dataToSave.rrAchieved ? parseFloat(dataToSave.rrAchieved) : null,
                            accountId: trade.accountId || defaultAccountId,
                            entryTime: trade.entryTime ? new Date(trade.entryTime) : new Date(),
                            exitTime: trade.exitTime ? new Date(trade.exitTime) : null,
                            tags: trade.tags ? JSON.stringify(trade.tags) : null,
                            confluences: trade.confluences ? JSON.stringify(trade.confluences) : null,
                            mistakes: trade.mistakes ? JSON.stringify(trade.mistakes) : null,
                            emotionTags: trade.emotionTags ? JSON.stringify(trade.emotionTags) : null,
                            mistakeTags: trade.mistakeTags ? JSON.stringify(trade.mistakeTags) : null,
                            screenshots: undefined
                        },
                        create: {
                            ...dataToSave,
                            rrPlanned: dataToSave.rrPlanned ? parseFloat(dataToSave.rrPlanned) : null,
                            rrAchieved: dataToSave.rrAchieved ? parseFloat(dataToSave.rrAchieved) : null,
                            id: trade.id, // preserve imported ID
                            accountId: trade.accountId || defaultAccountId,
                            entryTime: trade.entryTime ? new Date(trade.entryTime) : new Date(),
                            exitTime: trade.exitTime ? new Date(trade.exitTime) : null,
                            tags: trade.tags ? JSON.stringify(trade.tags) : null,
                            confluences: trade.confluences ? JSON.stringify(trade.confluences) : null,
                            mistakes: trade.mistakes ? JSON.stringify(trade.mistakes) : null,
                            emotionTags: trade.emotionTags ? JSON.stringify(trade.emotionTags) : null,
                            mistakeTags: trade.mistakeTags ? JSON.stringify(trade.mistakeTags) : null,
                            screenshots: undefined
                        }
                    });
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
