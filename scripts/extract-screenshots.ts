import fs from 'fs/promises'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'database.json')
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'trades')
const OPTIMIZED_DB_PATH = path.join(process.cwd(), 'database_optimized.json')

async function ensureDir(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (err: any) {
    if (err.code !== 'EEXIST') throw err
  }
}

async function extractScreenshots() {
  console.log('Starting base64 screenshot extraction...')
  await ensureDir(UPLOADS_DIR)

  console.log(`Reading ${DB_PATH}...`)
  const rawData = await fs.readFile(DB_PATH, 'utf-8')
  const db = JSON.parse(rawData)

  if (!db.trades) {
    console.log('No trades found. Exiting.')
    return
  }

  let extractedCount = 0
  let skippedCount = 0

  for (const trade of db.trades) {
    if (!trade.screenshots || !Array.isArray(trade.screenshots)) continue

    const optimizedScreenshots: string[] = []

    for (let i = 0; i < trade.screenshots.length; i++) {
      const b64Data = trade.screenshots[i]
      
      // If it's already a URL/path, skip it
      if (b64Data.startsWith('/uploads/') || b64Data.startsWith('http')) {
        optimizedScreenshots.push(b64Data)
        skippedCount++
        continue
      }

      // Handle raw base64 or data URLs
      let rawBase64 = b64Data
      let ext = 'png'
      
      if (b64Data.startsWith('data:image')) {
        const matches = b64Data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/)
        if (matches && matches.length === 3) {
          ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
          rawBase64 = matches[2]
        }
      }

      const fileName = `${trade.id}_${i}.${ext}`
      const filePath = path.join(UPLOADS_DIR, fileName)
      
      try {
        await fs.writeFile(filePath, Buffer.from(rawBase64, 'base64'))
        optimizedScreenshots.push(`/uploads/trades/${fileName}`)
        extractedCount++
      } catch (err) {
        console.error(`Failed to write screenshot for trade ${trade.id}:`, err)
        optimizedScreenshots.push(b64Data) // Keep original if failed
      }
    }

    trade.screenshots = optimizedScreenshots
  }

  console.log(`Writing optimized database to ${OPTIMIZED_DB_PATH}...`)
  await fs.writeFile(OPTIMIZED_DB_PATH, JSON.stringify(db, null, 2), 'utf-8')

  console.log(`\nExtraction Complete!`)
  console.log(`- Extracted ${extractedCount} base64 images to physical files`)
  console.log(`- Skipped ${skippedCount} already-processed paths`)
  console.log(`- Saved optimized database array to database_optimized.json`)
}

extractScreenshots().catch(console.error)
