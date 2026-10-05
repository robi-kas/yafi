@echo off
echo Starting debug launch... > debug_log.txt
node -v >> debug_log.txt 2>&1
echo Node version check done. >> debug_log.txt
echo launching next... >> debug_log.txt
.\node_modules\.bin\next dev >> debug_log.txt 2>&1
