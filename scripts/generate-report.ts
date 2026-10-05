import fs from 'fs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function runReport() {
    const origDb = JSON.parse(fs.readFileSync('d:/yafu/database.json', 'utf8'));
    const sqTrades = await prisma.trade.findMany();
    
    let report = '# Data Reconciliation Report\n\n';
    
    // Counts
    report += '## Record Counts\n';
    report += `| Metric | User Expected | JSON Database | SQLite Database | Mismatch |\n`;
    report += `|--------|---------------|---------------|-----------------|----------|\n`;
    
    const jTrades = origDb.trades.length;
    const sTrades = sqTrades.length;
    report += `| Trades | 36 | ${jTrades} | ${sTrades} | ${jTrades === 36 ? 'No' : 'Yes'} |\n`;
    
    const countResults = (trades: any[]) => {
        let w=0, l=0, b=0, pnl=0;
        trades.forEach(t => {
            if (t.profitLoss > 0) w++;
            else if (t.profitLoss < 0) l++;
            else b++;
            pnl += (t.profitLoss || 0);
        });
        return {w,l,b,pnl};
    };
    
    const jRes = countResults(origDb.trades);
    const sRes = countResults(sqTrades);
    
    report += `| Wins | 14 | ${jRes.w} | ${sRes.w} | ${jRes.w === 14 ? 'No' : 'Yes'} |\n`;
    report += `| Losses | 18 | ${jRes.l} | ${sRes.l} | ${jRes.l === 18 ? 'No' : 'Yes'} |\n`;
    report += `| Breakevens | 4 | ${jRes.b} | ${sRes.b} | ${jRes.b === 4 ? 'No' : 'Yes'} |\n`;
    report += `| Net P&L | ~$468.04 | $${jRes.pnl.toFixed(2)} | $${sRes.pnl.toFixed(2)} | ${Math.abs(jRes.pnl - 468.04) < 1 ? 'No' : 'Yes'} |\n`;
    
    // Mismatches
    report += '\n## Mismatch Analysis\n';
    if (jTrades !== 36) {
        report += `**Original Value**: 36 trades\n`;
        report += `**New Value**: ${jTrades} trades in JSON\n`;
        report += `**Difference**: ${jTrades - 36} trades\n`;
        report += `**Likely Cause**: MT5 Auto-Sync pushed new trades to the database via webhook during the audit, OR deleted trades were not fully purged from the JSON file by the legacy system.\n`;
        report += `**Safe Repair**: Review the 4 extra trades manually and delete them if they are duplicates or unwanted.\n`;
    }

    fs.writeFileSync('C:/Users/Robi/.gemini/antigravity/brain/f67ef042-4c1b-4cad-bf93-412416058a84/data_reconciliation_report.md', report);
}

runReport()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
