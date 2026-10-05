---
name: MT5 Bridge Setup
description: How to setup, debug, and manage the Python MetaTrader5 bridge in the YAFU project
---

# MT5 Bridge Setup & Debugging

The YAFU project uses a Node.js/Electron frontend but relies on a background Python script (`scripts/mt5_bridge.py`) to communicate with MetaTrader 5 brokers. 

## Core Dependencies
If the bridge fails with a `ModuleNotFoundError` (especially `MetaTrader5`), it means the Python environment is missing the required packages.

**To fix missing dependencies, always run:**
`pip install MetaTrader5`

## Packaging Considerations
When building the Windows `.exe` via Electron, the end-user's computer must either:
1. Have Python installed with the `MetaTrader5` package globally.
2. Have the Python script packaged via PyInstaller into a standalone executable that the Node backend calls instead of raw `.py` scripts.

When touching the MT5 sync functionality, always verify the Python bridge dependencies are intact.
