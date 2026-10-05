const fs = require('fs');
let content = fs.readFileSync('.env.local');
// Convert from UTF-16 LE back to string and remove null bytes
let clean = Buffer.from(content.toString('utf16le').replace(/\u0000/g, '')).toString('utf8');
// It seems it was written with UTF-16 from Powershell.
// Let's just create a new env file.
