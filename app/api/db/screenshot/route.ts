import { NextResponse } from 'next/server';
import { FileStorageAdapter } from '@/lib/storage/file-adapter';

const db = new FileStorageAdapter();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const indexStr = searchParams.get('index');
    
    if (!id || !indexStr) {
        return new NextResponse('Missing id or index', { status: 400 });
    }

    const index = parseInt(indexStr, 10);

    try {
        const trades = await db.getTrades();
        const trade = trades.find(t => t.id === id);
        
        if (!trade || !trade.screenshots || !trade.screenshots[index]) {
            return new NextResponse('Screenshot not found', { status: 404 });
        }

        const b64 = trade.screenshots[index];
        // The screenshot is stored as a base64 string, e.g. "data:image/png;base64,iVBORw0KGgo..."
        const match = b64.match(/^data:(image\/\w+);base64,(.+)$/);
        
        if (!match) {
            // If it's a regular URL somehow, redirect to it
            if (b64.startsWith('http')) {
                return NextResponse.redirect(b64);
            }
            return new NextResponse('Invalid image format stored', { status: 500 });
        }

        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': mimeType,
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });
    } catch (err: any) {
        console.error('API Screenshot Error:', err);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
