const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        env[match[1]] = value;
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
    'accounts',
    'trades',
    'strategies',
    'campaigns',
    'assets',
    'channel_budgets',
    'audience_segments'
];

async function checkTables() {
    console.log('Checking tables in Supabase...');
    for (const table of tables) {
        try {
            const { data, error, status } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`❌ Table "${table}": ${error.message} (Status: ${status})`);
            } else {
                console.log(`✅ Table "${table}": OK (Status: ${status})`);
            }
        } catch (e) {
            console.log(`💥 Table "${table}": Exception: ${e.message}`);
        }
    }
}

checkTables();
