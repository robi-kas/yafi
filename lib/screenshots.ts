// Server-only helpers for trade screenshots in Supabase Storage.
//
// Files live in a PRIVATE bucket under `<userId>/<kind>-<uuid>.<ext>`.
// The database (TradeScreenshot.path) stores only that path. Browsers upload
// directly to Storage with one-time signed upload URLs issued by
// /api/screenshots/upload-url, and read through short-lived signed URLs, so
// images never pass through (or count against) Vercel's request body limit.
import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import prisma from '@/lib/db'

export const SCREENSHOT_BUCKET = 'trade-screenshots'
const SIGNED_URL_TTL = 60 * 60 * 24 // 24h
const SIGN_MARKER = `/storage/v1/object/sign/${SCREENSHOT_BUCKET}/`

let admin: SupabaseClient | null = null
function adminClient(): SupabaseClient {
  if (admin) return admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Screenshot storage is not configured (missing Supabase service key)')
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return admin
}

let bucketReady: Promise<void> | null = null
/** Creates the private bucket on first use (idempotent). */
export function ensureBucket(): Promise<void> {
  bucketReady ??= (async () => {
    const sb = adminClient()
    const { data } = await sb.storage.getBucket(SCREENSHOT_BUCKET)
    if (data) return
    const { error } = await sb.storage.createBucket(SCREENSHOT_BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    })
    if (error && !/already exists/i.test(error.message)) throw error
  })().catch((err) => {
    bucketReady = null // retry next time
    throw err
  })
  return bucketReady
}

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }
const KINDS = new Set(['htf', 'entry', 'exit', 'img'])

/** Issues one-time upload URLs for new files in the user's own folder. */
export async function createUploadTargets(userId: string, files: { kind?: string; contentType?: string }[]) {
  await ensureBucket()
  const sb = adminClient()
  return Promise.all(
    files.map(async (f) => {
      const ext = EXT[f.contentType || ''] || 'webp'
      const kind = KINDS.has(f.kind || '') ? f.kind : 'img'
      const path = `${userId}/${kind}-${crypto.randomUUID()}.${ext}`
      const { data, error } = await sb.storage.from(SCREENSHOT_BUCKET).createSignedUploadUrl(path)
      if (error || !data) throw error || new Error('Could not create upload URL')
      return { path, token: data.token }
    })
  )
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
  const storagePaths = [...new Set(paths.filter((p) => /^[0-9a-f-]{36}\//i.test(p)))]
  if (!storagePaths.length) return out
  try {
    const { data, error } = await adminClient()
      .storage.from(SCREENSHOT_BUCKET)
      .createSignedUrls(storagePaths, SIGNED_URL_TTL)
    if (error) throw error
    for (const item of data || []) if (item.path && item.signedUrl) out.set(item.path, item.signedUrl)
  } catch (err) {
    console.error('Signing screenshot URLs failed:', err)
  }
  return out
}

export async function removeObjects(paths: string[]) {
  const storagePaths = paths.filter((p) => /^[0-9a-f-]{36}\//i.test(p))
  if (!storagePaths.length) return
  const { error } = await adminClient().storage.from(SCREENSHOT_BUCKET).remove(storagePaths)
  if (error) console.error('Removing screenshots failed:', error)
}

/** Removes every object in the user's folder (used when wiping their data). */
export async function removeAllForUser(userId: string) {
  const sb = adminClient()
  for (;;) {
    const { data, error } = await sb.storage.from(SCREENSHOT_BUCKET).list(userId, { limit: 1000 })
    if (error || !data?.length) return
    await sb.storage.from(SCREENSHOT_BUCKET).remove(data.map((o) => `${userId}/${o.name}`))
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
