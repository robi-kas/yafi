import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { getUserId, unauthorized } from '@/lib/auth';
import path from 'path';

export const runtime = 'nodejs'; // Force Node.js runtime for child_process
export const dynamic = 'force-dynamic'; // Disable caching

export async function GET() {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const scriptPath = path.join(process.cwd(), 'scripts', 'mt5_bridge.py');

    return new Promise<Response>((resolve) => {
        // Check if python is available, otherwise try python3
        // In a real environment, this command might need to be configured
        execFile('python', [scriptPath], { timeout: 10000, env: process.env }, (error, stdout, stderr) => {
            if (error) {
                console.warn(`MT5 bridge unavailable: ${error.message}`);
                // Return a graceful unavailable state — not a 500
                resolve(NextResponse.json({
                    available: false,
                    data: [],
                    message: 'MT5 bridge not available. Make sure MetaTrader 5 is running and the bridge script is installed.',
                }));
                return;
            }

            try {
                const data = JSON.parse(stdout);
                resolve(NextResponse.json(data));
            } catch (e) {
                console.error('Failed to parse Python output:', stdout);
                resolve(NextResponse.json({ error: 'Invalid output from script', raw: stdout }, { status: 500 }));
            }
        });
    });
}
