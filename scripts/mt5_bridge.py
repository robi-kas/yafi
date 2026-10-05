import MetaTrader5 as mt5
import sys
import json
import os
from datetime import datetime, timedelta

def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Missing required arguments: account password server"}))
        return
        
    try:
        account = int(sys.argv[1])
    except ValueError:
        print(json.dumps({"error": "Account must be an integer"}))
        return
        
    password = sys.argv[2]
    server = sys.argv[3]

    # Initialize MT5
    # Check for custom path from environment variable
    custom_path = os.getenv("MT5_PATH")
    if custom_path and os.path.exists(custom_path):
        if not mt5.initialize(path=custom_path):
            print(json.dumps({"error": f"initialize() failed with custom path '{custom_path}', error code = {mt5.last_error()}"}))
            return
    # Try to initialize with default path first
    elif not mt5.initialize():
        # If default fails, try common Exness paths
        common_paths = [
            r"C:\Program Files\Exness MetaTrader 5\terminal64.exe",
            r"C:\Program Files (x86)\Exness MetaTrader 5\terminal64.exe",
            r"C:\Program Files\MetaTrader 5\terminal64.exe"
        ]
        
        initialized = False
        for path in common_paths:
            if os.path.exists(path):
                if mt5.initialize(path=path):
                    initialized = True
                    break
        
        if not initialized:
            print(json.dumps({"error": f"initialize() failed, error code = {mt5.last_error()}. Please ensure Exness MT5 is installed and running."}))
            return

    # Login
    authorized = mt5.login(account, password=password, server=server)
    if not authorized:
        print(json.dumps({"error": f"failed to connect at account #{account}, error code: {mt5.last_error()}"}))
        mt5.shutdown()
        return

    # Request trade history
    from_date = datetime.now() - timedelta(days=30)
    to_date = datetime.now()
    
    if len(sys.argv) >= 6:
        try:
            # Parse from ISO format (e.g. 2026-09-15T00:00:00)
            from_date = datetime.fromisoformat(sys.argv[4].replace('Z', ''))
            to_date = datetime.fromisoformat(sys.argv[5].replace('Z', ''))
        except Exception as e:
            pass
            
    # Get history of deals and orders
    deals = mt5.history_deals_get(from_date, to_date)
    orders = mt5.history_orders_get(from_date, to_date)

    if deals is None:
        deals_data = []
    else:
        deals_data = []
        for deal in deals:
            deal_dict = deal._asdict()
            deal_dict['time'] = datetime.fromtimestamp(deal_dict['time']).isoformat()
            deals_data.append(deal_dict)
            
    if orders is None:
        orders_data = []
    else:
        orders_data = []
        for order in orders:
            order_dict = order._asdict()
            orders_data.append(order_dict)
            
    # Fetch live account info
    account_info = mt5.account_info()
    if account_info is not None:
        acc_dict = account_info._asdict()
    else:
        acc_dict = {}
        
    print(json.dumps({"status": "success", "data": deals_data, "orders": orders_data, "account_info": acc_dict}))

    # Shutdown
    mt5.shutdown()

if __name__ == "__main__":
    main()
