import fs from 'fs/promises'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const OPTIMIZED_DB_PATH = path.join(process.cwd(), 'database_optimized.json')

async function migrate() {
  console.log('Starting migration to SQLite...')

  const rawData = await fs.readFile(OPTIMIZED_DB_PATH, 'utf-8')
  const db = JSON.parse(rawData)

  console.log('Migrating Accounts...')
  const accountMap = new Map<string, string>() // Old ID -> New SQLite ID
  
  // Create a default legacy account for orphaned trades
  const legacyAccount = await prisma.account.create({
    data: {
      name: 'Legacy Default Account',
      type: 'personal',
      broker: 'Unknown',
      balance: 10000,
    }
  })
  
  if (db.accounts) {
    for (const acc of db.accounts) {
      const newAcc = await prisma.account.create({
        data: {
          id: acc.id, // Preserve ID if possible
          name: acc.name || 'Unnamed',
          type: acc.type || 'personal',
          broker: acc.broker || 'Unknown',
          balance: acc.balance || 0,
          currency: acc.currency || 'USD',
          isLive: acc.isLive || false,
          lastUpdated: acc.lastUpdated ? new Date(acc.lastUpdated) : new Date(),
        }
      })
      accountMap.set(acc.id, newAcc.id)
    }
  }

  console.log('Migrating Strategies...')
  const strategyMap = new Map<string, string>() // Name -> ID
  if (db.strategies) {
    for (const strat of db.strategies) {
      const newStrat = await prisma.strategy.upsert({
        where: { name: strat.name },
        update: {},
        create: {
          id: strat.id,
          name: strat.name,
          description: strat.description || '',
          rules: strat.rules,
          markets: strat.markets ? JSON.stringify(strat.markets) : null,
          riskPerTrade: strat.riskPerTrade,
        }
      })
      strategyMap.set(strat.name, newStrat.id)
    }
  }

  console.log('Migrating Trades...')
  if (db.trades) {
    for (const t of db.trades) {
      // Find or create strategy if missing
      let strategyId = null
      if (t.strategy) {
        if (strategyMap.has(t.strategy)) {
          strategyId = strategyMap.get(t.strategy)
        } else {
          const newStrat = await prisma.strategy.create({
            data: {
              name: t.strategy,
              description: 'Auto-migrated strategy',
            }
          })
          strategyMap.set(t.strategy, newStrat.id)
          strategyId = newStrat.id
        }
      }

      const createdTrade = await prisma.trade.create({
        data: {
          id: t.id,
          symbol: t.symbol || 'Unknown',
          market: t.market || 'forex',
          direction: t.direction || 'buy',
          entryPrice: t.entryPrice || 0,
          stopLoss: t.stopLoss || 0,
          takeProfit: t.takeProfit || 0,
          exitPrice: t.exitPrice,
          lotSize: t.lotSize || 0,
          profitLoss: t.profitLoss,
          result: t.result,
          riskToReward: t.riskToReward,
          entryTime: t.entryTime ? new Date(t.entryTime) : new Date(),
          exitTime: t.exitTime ? new Date(t.exitTime) : null,
          
          emotionalState: t.emotionalState,
          notes: t.notes,
          tags: t.tags ? JSON.stringify(t.tags) : null,
          confluences: t.confluences ? JSON.stringify(t.confluences) : null,
          mistakes: t.mistakes ? JSON.stringify(t.mistakes) : null,

          session: t.session,
          killZone: t.killZone,
          htfTimeframe: t.htfTimeframe,
          htfBias: t.htfBias,
          trendAlignment: t.trendAlignment,
          entryModel: t.entryModel,

          htfPoi: t.htfPoi || false,
          liquiditySweep: t.liquiditySweep || false,
          mssConfirmed: t.mssConfirmed || false,
          fvgPresent: t.fvgPresent || false,
          ifvgPresent: t.ifvgPresent || false,
          breakerBlockRetest: t.breakerBlockRetest || false,
          orderBlockRetest: t.orderBlockRetest || false,
          fibonacciRetracement: t.fibonacciRetracement || false,

          emotionBefore: t.emotionBefore,
          emotionAfter: t.emotionAfter,
          emotionTags: t.emotionTags ? JSON.stringify(t.emotionTags) : null,
          mistakeTags: t.mistakeTags ? JSON.stringify(t.mistakeTags) : null,

          entryReason: t.entryReason,
          exitReason: t.exitReason,
          tradeCause: t.tradeCause,
          invalidation: t.invalidation,
          retakeTrade: t.retakeTrade,
          lessonLearned: t.lessonLearned,

          rrPlanned: typeof t.rrPlanned === 'string' ? parseFloat(t.rrPlanned) : t.rrPlanned,
          rrAchieved: typeof t.rrAchieved === 'string' ? parseFloat(t.rrAchieved) : t.rrAchieved,
          tradeStatus: t.tradeStatus || (t.exitPrice ? 'closed' : 'open'),

          // Use the legacy account as fallback for orphaned trades
          accountId: legacyAccount.id,
          strategyId: strategyId,
        }
      })

      if (t.screenshots && Array.isArray(t.screenshots)) {
        for (const path of t.screenshots) {
          await prisma.tradeScreenshot.create({
            data: {
              path: path,
              tradeId: createdTrade.id
            }
          })
        }
      }
    }
  }

  console.log('Migration successfully completed!')
}

migrate()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
