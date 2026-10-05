@echo off
:: Silent YAFU Launcher
cd /d "d:\yafu"

:: Start the server in the background (within this hidden process)
start /b "" npm run dev

:: Give the server a moment to bind to the port
timeout /t 2 /nobreak > nul

:: Open the browser
start "" http://localhost:3000

:: Exit this hidden script
exit
