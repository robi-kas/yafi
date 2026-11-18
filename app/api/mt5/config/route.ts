import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserId, unauthorized } from '@/lib/auth';
import { getOrCreateSettings } from '@/lib/user-settings';

const DEFAULT_CONFIG = { account: '', password: '', server: 'Exness-MT5Real27' };

export async function GET() {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    try {
        const settings = await getOrCreateSettings(userId);
        const config = (settings.mt5Config as Record<string, unknown> | null) ?? DEFAULT_CONFIG;
        return NextResponse.json({ ...config, webhookToken: settings.webhookToken });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    try {
        const { account = '', password = '', server = '' } = await request.json();
        await getOrCreateSettings(userId);
        await prisma.userSettings.update({
            where: { userId },
            data: { mt5Config: { account: String(account), password: String(password), server: String(server) } },
        });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
