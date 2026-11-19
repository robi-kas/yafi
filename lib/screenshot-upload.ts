"use client"

// Browser-side screenshot handling: downscale images, upload them straight to
// Supabase Storage via one-time signed URLs, and turn stored screenshots back
// into embeddable data URLs for JSON export.
import { createClient } from "@/lib/supabase/client"

export type ScreenshotKind = "htf" | "entry" | "exit" | "img"
const BUCKET = "trade-screenshots"
const MAX_SIDE = 2000

export const isDataUrl = (s: unknown): s is string => typeof s === "string" && s.startsWith("data:image/")

/** Downscales to MAX_SIDE and re-encodes as WebP (falls back to the original on failure). */
async function compress(dataUrl: string): Promise<Blob> {
  const original = await (await fetch(dataUrl)).blob()
  try {
    const bitmap = await createImageBitmap(original)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85))
    return webp && webp.size < original.size ? webp : original
  } catch {
    return original
  }
}

/** Uploads data-URL images and returns their storage paths, in the same order. */
export async function uploadScreenshots(items: { kind: ScreenshotKind; dataUrl: string }[]): Promise<string[]> {
  if (!items.length) return []
  const blobs = await Promise.all(items.map((i) => compress(i.dataUrl)))

  const res = await fetch("/api/screenshots/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files: items.map((i, n) => ({ kind: i.kind, contentType: blobs[n].type })) }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Could not prepare screenshot upload (${res.status})`)

  const storage = createClient().storage.from(BUCKET)
  return Promise.all(
    json.targets.map(async (t: { path: string; token: string }, n: number) => {
      const { error } = await storage.uploadToSignedUrl(t.path, t.token, blobs[n], { contentType: blobs[n].type })
      if (error) throw new Error(`Screenshot upload failed: ${error.message}`)
      return t.path
    })
  )
}

/**
 * Replaces any data-URL entries in a screenshot list with uploaded storage
 * paths; existing entries (signed URLs / paths) are kept as they are.
 */
export async function resolveScreenshotList(list: { kind: ScreenshotKind; value: string }[]): Promise<string[]> {
  const pending = list.filter((s) => isDataUrl(s.value))
  const uploaded = await uploadScreenshots(pending.map((s) => ({ kind: s.kind, dataUrl: s.value })))
  let i = 0
  return list.map((s) => (isDataUrl(s.value) ? uploaded[i++] : s.value))
}

/** Best-effort: which form slot a stored screenshot belongs to, from its file name. */
export function screenshotKind(ref: string): ScreenshotKind | null {
  const m = ref.match(/\/(htf|entry|exit|img)-[0-9a-f-]{36}\.\w+/i)
  return (m?.[1]?.toLowerCase() as ScreenshotKind) || null
}

/** Fetches an image URL and returns it as a data URL (for embedding in exports / PDFs). */
export async function urlToDataUrl(url: string): Promise<string | null> {
  if (isDataUrl(url)) return url
  try {
    const blob = await (await fetch(url)).blob()
    return await new Promise((resolve) => {
      const r = new FileReader()
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null)
      r.onerror = () => resolve(null)
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/** Loads an image (URL or data URL) and re-encodes it as a JPEG data URL, e.g. for jsPDF. */
export async function toJpegDataUrl(src: string, maxSide = 1600): Promise<string | null> {
  try {
    const blob = await (await fetch(src)).blob()
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return canvas.toDataURL("image/jpeg", 0.85)
  } catch {
    return null
  }
}
