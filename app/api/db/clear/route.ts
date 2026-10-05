import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
    try {
        await prisma.trade.deleteMany();
        await prisma.strategy.deleteMany();
        await prisma.account.deleteMany();
        return NextResponse.json({ success: true, message: 'Database wiped successfully' });
    } catch (err: any) {
        console.error('Failed to clear database:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
