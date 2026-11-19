import 'server-only'
import prisma from '@/lib/db'
import { signScreenshotPaths } from '@/lib/screenshots'

const parseArr = (v: string | null) => {
  if (!v) return []
  try {
    const parsed = JSON.parse(v)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const tradeInclude = {
  screenshots: { orderBy: { createdAt: 'asc' as const } },
  strategy: { select: { name: true } },
}

type TradeRow = Awaited<ReturnType<typeof prisma.trade.findMany<{ include: typeof tradeInclude }>>>[number]

/** Shapes trades the way the client expects (arrays parsed, strategy name, signed screenshot URLs). */
export async function formatTrades(trades: TradeRow[]) {
  const signed = await signScreenshotPaths(trades.flatMap((t) => t.screenshots.map((s) => s.path)))
  return trades.map((t) => ({
    ...t,
    strategy: t.strategy?.name ?? '',
    tags: parseArr(t.tags),
    confluences: parseArr(t.confluences),
    mistakes: parseArr(t.mistakes),
    emotionTags: parseArr(t.emotionTags),
    mistakeTags: parseArr(t.mistakeTags),
    screenshots: t.screenshots.map((s) => signed.get(s.path) ?? s.path),
  }))
}

export async function loadFormattedTrade(id: string) {
  const t = await prisma.trade.findUnique({ where: { id }, include: tradeInclude })
  return t ? (await formatTrades([t]))[0] : null
}
