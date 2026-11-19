// Server-only helpers for trade screenshots in Supabase Storage.
//
// Files live in a PRIVATE bucket under `<userId>/<kind>-<uuid>.<ext>`.
// Everything runs as the signed-in user (their session cookie), and Storage
// policies (see supabase/storage-screenshots.sql) only allow a user to
// read, write or delete objects inside their own `<userId>/` folder. No
// service-role key is needed. The database (TradeScreenshot.path) stores only
// the path; browsers upload directly and read through short-lived signed URLs,
// so images never pass through Vercel's request body limit.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/db'

export const SCREENSHOT_BUCKET = 'trade-screenshots'
const SIGNED_URL_TTL = 60 * 60 * 24 // 24h
const SIGN_MARKER = `/storage/v1/object/sign/${SCREENSHOT_BUCKET}/`
const STORAGE_PATH = /^[0-9a-f-]{36}\//i

async function bucket() {
  const sb = await createClient()
  return sb.storage.from(SCREENSHOT_BUCKET)
}

/**
 * Turns a client-supplied screenshot reference (a storage path or one of our
 * signed URLs) into a storage path owned by `userId`, or null if it is not one.
 */
export function toOwnedPath(userId: string, ref: unknown): string | null {
  if (typeof ref !== 'string' || !ref) return null
  let path = ref
  const i = ref.indexOf(SIGN_MARKER)
  if (i !== -1) {
    path = decodeURIComponent(ref.slice(i + SIGN_MARKER.length).split('?')[0])
  }
  if (!path.startsWith(`${userId}/`) || path.includes('..')) return null
  return path
}

/** Maps storage paths to signed URLs; non-storage (legacy) values pass through unchanged. */
export async function signScreenshotPaths(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const storagePaths = [...new Set(paths.filter((p) => STORAGE_PATH.test(p)))]
  if (!storagePaths.length) return out
  try {
    const { data, error } = await (await bucket()).createSignedUrls(storagePaths, SIGNED_URL_TTL)
    if (error) throw error
    for (const item of data || []) if (item.path && item.signedUrl) out.set(item.path, item.signedUrl)
  } catch (err) {
    console.error('Signing screenshot URLs failed:', err)
  }
  return out
}

export async function removeObjects(paths: string[]) {
  const storagePaths = paths.filter((p) => STORAGE_PATH.test(p))
  if (!storagePaths.length) return
  const { error } = await (await bucket()).remove(storagePaths)
  if (error) console.error('Removing screenshots failed:', error)
}

/** Removes every object in the user's folder (used when wiping their data). */
export async function removeAllForUser(userId: string) {
  const b = await bucket()
  for (;;) {
    const { data, error } = await b.list(userId, { limit: 1000 })
    if (error || !data?.length) return
    await b.remove(data.map((o) => `${userId}/${o.name}`))
    if (data.length < 1000) return
  }
}

/**
 * Makes a trade's screenshots exactly `refs` (in order). `undefined` leaves
 * them untouched. Refs that aren't the user's own storage paths are ignored.
 * Files no longer referenced are deleted from Storage.
 */
export async function syncTradeScreenshots(userId: string, tradeId: string, refs: unknown) {
  if (refs === undefined) return
  const wanted = (Array.isArray(refs) ? refs : [])
    .map((r) => toOwnedPath(userId, r))
    .filter((p): p is string => !!p)
  const existing = await prisma.tradeScreenshot.findMany({ where: { tradeId }, orderBy: { createdAt: 'asc' } })
  const same = existing.length === wanted.length && existing.every((s, i) => s.path === wanted[i])
  if (same) return

  await prisma.$transaction([
    prisma.tradeScreenshot.deleteMany({ where: { tradeId } }),
    ...wanted.map((path, i) =>
      prisma.tradeScreenshot.create({ data: { tradeId, path, createdAt: new Date(Date.now() + i) } })
    ),
  ])
  const dropped = existing.map((s) => s.path).filter((p) => !wanted.includes(p))
  await removeObjects(dropped)
}
