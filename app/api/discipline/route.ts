import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserId, unauthorized } from '@/lib/auth';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const shape = (l: any) => ({
    date: l.date,
    followedRules: l.followedRules,
    emotionalControl: l.emotionalControl,
    notes: l.notes,
    violations: l.violations ? JSON.parse(l.violations) : [],
});

export async function GET() {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    try {
        const logs = await prisma.disciplineLog.findMany({ where: { userId }, orderBy: { date: 'desc' } });
        return NextResponse.json(logs.map(shape));
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Creates or replaces the entry for that day.
export async function POST(request: Request) {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    try {
        const b = await request.json();
        if (!DATE_RE.test(b.date || '')) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        const data = {
            followedRules: !!b.followedRules,
            emotionalControl: Math.min(10, Math.max(1, Math.round(Number(b.emotionalControl) || 7))),
            notes: String(b.notes || '').slice(0, 5000),
            violations: JSON.stringify(Array.isArray(b.violations) ? b.violations.map(String).slice(0, 50) : []),
        };
        const log = await prisma.disciplineLog.upsert({
            where: { userId_date: { userId, date: b.date } },
            update: data,
            create: { ...data, userId, date: b.date },
        });
        return NextResponse.json(shape(log));
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const date = new URL(request.url).searchParams.get('date') || '';
    if (!DATE_RE.test(date)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    await prisma.disciplineLog.deleteMany({ where: { userId, date } });
    return NextResponse.json({ success: true });
}
