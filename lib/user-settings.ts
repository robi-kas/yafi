import { randomBytes } from 'crypto'
import prisma from '@/lib/db'

/** Loads the user's settings row, creating it (with a fresh webhook token) on first use. */
export async function getOrCreateSettings(userId: string) {
  const existing = await prisma.userSettings.findUnique({ where: { userId } })
  if (existing) return existing
  return prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId, webhookToken: randomBytes(24).toString('hex') },
  })
}
