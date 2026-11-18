import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserId, unauthorized } from '@/lib/auth';

// Wipes the signed-in user's trades, strategies and accounts only.
export async function POST() {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    try {
        await prisma.trade.deleteMany({ where: { userId } });
        await prisma.strategy.deleteMany({ where: { userId } });
        await prisma.account.deleteMany({ where: { userId } });
        return NextResponse.json({ success: true, message: 'Your data was wiped successfully' });
    } catch (err: any) {
        console.error('Failed to clear database:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
