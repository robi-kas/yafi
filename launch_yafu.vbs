Set WshShell = CreateObject("WScript.Shell")

' Launch the YAFU Next.js server (silently)
WshShell.Run "cmd /c D:\yafu\launch_yafu.bat", 0, False

' Launch the MT5 Python bridge (silently, keep it running in background)
WshShell.Run "cmd /c python D:\yafu\scripts\mt5_bridge.py >> D:\yafu\scripts\mt5_bridge.log 2>&1", 0, False
