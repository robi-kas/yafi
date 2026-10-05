import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const tables = [
    'accounts',
    'trades',
    'strategies',
    'campaigns',
    'assets',
    'channel_budgets',
    'audience_segments'
]

async function checkTables() {
    console.log('Checking tables in Supabase...')
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1)
        if (error) {
            console.log(`❌ Table "${table}": ${error.message}`)
        } else {
            console.log(`✅ Table "${table}": OK`)
        }
    }
}

checkTables()
