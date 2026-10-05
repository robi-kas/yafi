//+------------------------------------------------------------------+
//|                                                     YafuSync.mq5 |
//|                                            Copyright 2026, YAFU |
//+------------------------------------------------------------------+
#property copyright "YAFU"
#property link      "http://localhost:3000"
#property version   "1.00"
#property strict

input string ServerURL = "http://localhost:3000/api/mt5/webhook";
input int SyncIntervalSec = 30; // Sync every 30 seconds

int OnInit() {
    EventSetTimer(SyncIntervalSec);
    Print("YAFU Sync EA Started. Ensure WebRequest is allowed for: ", ServerURL);
    
    // Do an initial sync right away
    SyncTrades();
    
    return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) {
    EventKillTimer();
    Print("YAFU Sync EA Stopped.");
}

void OnTimer() {
    SyncTrades();
}

void SyncTrades() {
    // Select entire history
    if(!HistorySelect(0, TimeCurrent())) {
        Print("Failed to load trading history");
        return;
    }

    int total = HistoryDealsTotal();
    
    // Constructing JSON manually since MQL5 native JSON is complex
    string json = "{\"account\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + ",\"deals\":[";
    int count = 0;

    for(int i = 0; i < total; i++) {
        ulong ticket = HistoryDealGetTicket(i);
        long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
        
        // We only want closing deals (which contain the final profit of the trade)
        if (entry != DEAL_ENTRY_OUT) continue;
        
        long type = HistoryDealGetInteger(ticket, DEAL_TYPE);
        // Only Buy and Sell deals (ignore balance/deposit operations)
        if(type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL) continue;

        string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
        double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
        double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
        long time = HistoryDealGetInteger(ticket, DEAL_TIME);
        
        if(count > 0) json += ",";
        
        json += "{";
        json += "\"ticket\":" + IntegerToString(ticket) + ",";
        json += "\"symbol\":\"" + symbol + "\",";
        json += "\"type\":" + IntegerToString(type) + ",";
        json += "\"profit\":" + DoubleToString(profit, 2) + ",";
        json += "\"volume\":" + DoubleToString(volume, 2) + ",";
        json += "\"time\":" + IntegerToString(time);
        json += "}";
        count++;
    }
    json += "]}";

    // Send the data via HTTP POST
    char postData[];
    char result[];
    string headers;
    
    StringToCharArray(json, postData, 0, WHOLE_ARRAY, CP_UTF8);
    // Remove the null terminator that StringToCharArray adds
    ArrayResize(postData, ArraySize(postData) - 1);
    
    string reqHeaders = "Content-Type: application/json\r\n";
    
    int res = WebRequest("POST", ServerURL, reqHeaders, 5000, postData, result, headers);
    
    if(res == 200) {
        Print("YAFU: Sync successful! Processed ", count, " historical deals.");
    } else {
        Print("YAFU: Sync failed! Code: ", res, " -> IMPORTANT: Go to Tools -> Options -> Expert Advisors and check 'Allow WebRequest' and add 'http://localhost:3000' to the list.");
    }
}
