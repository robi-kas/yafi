import { PrismaClient } from '@prisma/client'; 
import { calculateMetrics } from '../lib/trading-metrics'; 

const prisma = new PrismaClient(); 
async function run() { 
  const trades = await prisma.trade.findMany({ orderBy: { entryTime: 'desc' } }); 
  const m = calculateMetrics(trades); 
  console.log('Trade Count:', m.totalTrades);
  console.log('Wins:', m.wins);
  console.log('Losses:', m.losses);
  console.log('Breakevens:', m.breakevens);
  console.log('Net P&L:', m.netPnl.toFixed(2));
  console.log('Profit Factor:', m.profitFactor.toFixed(2));
  console.log('Expectancy:', m.expectancyPerClosed.toFixed(2));
  console.log('Valid R Count:', m.validRCount);
  console.log('Total R:', m.totalR.toFixed(2));
  await prisma.$disconnect(); 
} 
run().catch(console.error);
