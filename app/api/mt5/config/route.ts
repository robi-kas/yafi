import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserId, unauthorized } from '@/lib/auth';
import { getOrCreateSettings } from '@/lib/user-settings';

// Webhook token for the YafiSync EA. (The old Python-bridge login/password
// storage was removed: the EA needs no MT5 password.)
export async function GET() {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    try {
        const settings = await getOrCreateSettings(userId);
        return NextResponse.json({ webhookToken: settings.webhookToken });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST { action: "regenerate" } issues a new token; the old one stops working.
export async function POST(request: Request) {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    try {
        const { action } = await request.json().catch(() => ({}));
        if (action !== 'regenerate') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        await getOrCreateSettings(userId);
        const settings = await prisma.userSettings.update({
            where: { userId },
            data: { webhookToken: randomBytes(24).toString('hex'), mt5Config: undefined },
        });
        return NextResponse.json({ webhookToken: settings.webhookToken });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
