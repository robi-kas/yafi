import { NextResponse } from 'next/server';
import { getUserId, unauthorized } from '@/lib/auth';
import { createUploadTargets } from '@/lib/screenshots';

export const runtime = 'nodejs';

// Issues one-time Supabase Storage upload URLs inside the caller's own folder.
// Body: { files: [{ kind: 'htf'|'entry'|'exit'|'img', contentType: 'image/webp' }] }
export async function POST(request: Request) {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    try {
        const { files } = await request.json();
        if (!Array.isArray(files) || files.length === 0 || files.length > 20) {
            return NextResponse.json({ error: 'Provide between 1 and 20 files' }, { status: 400 });
        }
        const targets = await createUploadTargets(userId, files);
        return NextResponse.json({ targets });
    } catch (err: any) {
        console.error('upload-url error:', err);
        return NextResponse.json({ error: err.message || 'Could not prepare upload' }, { status: 500 });
    }
}
