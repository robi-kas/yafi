const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');
if (fs.existsSync(dbPath)) {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Clear absolutely everything
    data.trades = [];
    data.accounts = [];
    data.strategies = [];
    
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    console.log("Entire database wiped completely clean!");
} else {
    console.log("database.json not found.");
}
