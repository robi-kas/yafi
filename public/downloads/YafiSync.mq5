//+------------------------------------------------------------------+
//| YafiSync.mq5                                                      |
//| Sends your closed MT5 positions to your YAFI Journal.            |
//|                                                                   |
//| Setup (once):                                                     |
//|  1. MT5: Tools > Options > Expert Advisors > tick                 |
//|     "Allow WebRequest for listed URL" and add                     |
//|     https://yafijournal.com                                       |
//|  2. Copy this file to File > Open Data Folder > MQL5 > Experts,   |
//|     open it in MetaEditor and press Compile (F7).                 |
//|  3. Drag "YafiSync" onto ANY chart, paste your webhook token      |
//|     (YAFI > Settings > MT5 sync), enable Algo Trading.            |
//| It only READS history and never places or changes trades.        |
//+------------------------------------------------------------------+
#property copyright "YAFI Journal"
#property link      "https://yafijournal.com"
#property version   "1.00"

input string InpToken       = "";                                         // Webhook token (YAFI > Settings > MT5 sync)
input string InpWebhookUrl  = "https://yafijournal.com/api/mt5/webhook";  // Webhook URL
input int    InpHistoryDays = 90;                                         // Days of history to send the first time

#define BATCH_SIZE      100
#define FULL_SYNC_SECS  600   // re-check recent history every 10 minutes

bool     g_pending    = true;   // a sync is due
datetime g_lastFull   = 0;
string   g_gvLastSync;          // terminal global variable holding the last successful sync time
int      g_lastCreated = 0, g_lastUpdated = 0, g_lastLinked = 0;

//+------------------------------------------------------------------+
int OnInit()
  {
   if(StringLen(InpToken) < 20)
     {
      Alert("YafiSync: paste your webhook token from YAFI > Settings > MT5 sync.");
      return(INIT_PARAMETERS_INCORRECT);
     }
   g_gvLastSync = "YafiSync_" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "_last";
   EventSetTimer(5);
   g_pending = true;
   Status("starting...");
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
   Comment("");
  }

// A position (or part of one) was closed: sync shortly.
void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result)
  {
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD) return;
   if(!HistoryDealSelect(trans.deal)) return;
   long entry = HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
   if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY || entry == DEAL_ENTRY_INOUT)
      g_pending = true;
  }

void OnTimer()
  {
   if(!g_pending && TimeCurrent() - g_lastFull < FULL_SYNC_SECS) return;
   if(!TerminalInfoInteger(TERMINAL_CONNECTED)) { Status("waiting for broker connection"); return; }
   g_pending = false;
   g_lastFull = TimeCurrent();

   datetime last = (datetime)GlobalVariableGet(g_gvLastSync);
   datetime from = (last > 0) ? last - 2 * 86400                      // overlap: the server ignores duplicates
                              : TimeCurrent() - InpHistoryDays * 86400;
   if(SyncSince(from))
      GlobalVariableSet(g_gvLastSync, (double)TimeCurrent());
   else
      g_pending = true; // retry on the next timer tick
  }

//+------------------------------------------------------------------+
//| Collect closed positions since `from` and send them in batches.   |
//+------------------------------------------------------------------+
bool SyncSince(datetime from)
  {
   // 1. Which positions had a closing deal in the window?
   if(!HistorySelect(from, TimeCurrent() + 86400)) { Status("could not read history"); return(false); }
   ulong ids[];
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong deal = HistoryDealGetTicket(i);
      if(deal == 0) continue;
      long type  = HistoryDealGetInteger(deal, DEAL_TYPE);
      long entry = HistoryDealGetInteger(deal, DEAL_ENTRY);
      if(type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL) continue;
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY && entry != DEAL_ENTRY_INOUT) continue;
      ulong pid = (ulong)HistoryDealGetInteger(deal, DEAL_POSITION_ID);
      if(pid > 0 && !Contains(ids, pid)) { int n = ArraySize(ids); ArrayResize(ids, n + 1); ids[n] = pid; }
     }

   double netDeposits = NetDeposits();
   int count = ArraySize(ids);
   if(count == 0) { Status("up to date"); return(SendBatch("", netDeposits)); }

   // 2. Build each fully closed position and send in batches.
   string batch = "";
   int inBatch = 0;
   bool ok = true;
   for(int k = 0; k < count; k++)
     {
      string json;
      if(!BuildPosition(ids[k], json)) continue;
      batch += (inBatch > 0 ? "," : "") + json;
      inBatch++;
      if(inBatch >= BATCH_SIZE)
        {
         ok = SendBatch(batch, netDeposits) && ok;
         batch = ""; inBatch = 0;
        }
     }
   if(inBatch > 0) ok = SendBatch(batch, netDeposits) && ok;
   return(ok);
  }

//+------------------------------------------------------------------+
//| Aggregate all deals of one position (handles partial closes).    |
//+------------------------------------------------------------------+
bool BuildPosition(ulong pid, string &json)
  {
   if(PositionSelectByTicket(pid)) return(false);          // still (partly) open
   if(!HistorySelectByPosition(pid)) return(false);

   string symbol = "";
   string side = "";
   double inVol = 0, inValue = 0, outVol = 0, outValue = 0;
   double profit = 0, commission = 0, swap = 0, sl = 0, tp = 0;
   datetime openTime = 0, closeTime = 0;

   int n = HistoryDealsTotal();
   for(int i = 0; i < n; i++)
     {
      ulong deal = HistoryDealGetTicket(i);
      if(deal == 0) continue;
      long type  = HistoryDealGetInteger(deal, DEAL_TYPE);
      if(type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL) continue;
      long entry    = HistoryDealGetInteger(deal, DEAL_ENTRY);
      double vol    = HistoryDealGetDouble(deal, DEAL_VOLUME);
      double price  = HistoryDealGetDouble(deal, DEAL_PRICE);
      datetime time = (datetime)HistoryDealGetInteger(deal, DEAL_TIME);
      commission   += HistoryDealGetDouble(deal, DEAL_COMMISSION);
      swap         += HistoryDealGetDouble(deal, DEAL_SWAP);
      profit       += HistoryDealGetDouble(deal, DEAL_PROFIT);

      if(entry == DEAL_ENTRY_IN)
        {
         if(symbol == "") symbol = HistoryDealGetString(deal, DEAL_SYMBOL);
         if(side == "")   side = (type == DEAL_TYPE_BUY) ? "buy" : "sell";
         if(openTime == 0 || time < openTime) openTime = time;
         inVol   += vol;
         inValue += vol * price;
         // Initial stop/target from the opening order (what you risked at entry).
         if(sl == 0 || tp == 0)
           {
            ulong order = (ulong)HistoryDealGetInteger(deal, DEAL_ORDER);
            if(order > 0 && HistoryOrderSelect(order))
              {
               if(sl == 0) sl = HistoryOrderGetDouble(order, ORDER_SL);
               if(tp == 0) tp = HistoryOrderGetDouble(order, ORDER_TP);
              }
           }
        }
      else if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY || entry == DEAL_ENTRY_INOUT)
        {
         outVol   += vol;
         outValue += vol * price;
         if(time > closeTime) closeTime = time;
        }
     }

   if(inVol <= 0 || outVol <= 0 || symbol == "") return(false);
   if(outVol + 1e-8 < inVol) return(false);                // not fully closed yet

   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   if(digits <= 0) digits = 5;

   json = "{\"positionId\":\"" + IntegerToString((long)pid) + "\""
        + ",\"symbol\":\"" + Esc(symbol) + "\""
        + ",\"type\":\"" + side + "\""
        + ",\"volume\":" + DoubleToString(inVol, 2)
        + ",\"openTime\":" + IntegerToString((long)ToUtc(openTime))
        + ",\"closeTime\":" + IntegerToString((long)ToUtc(closeTime))
        + ",\"openPrice\":" + DoubleToString(inValue / inVol, digits)
        + ",\"closePrice\":" + DoubleToString(outValue / outVol, digits)
        + ",\"sl\":" + DoubleToString(sl, digits)
        + ",\"tp\":" + DoubleToString(tp, digits)
        + ",\"profit\":" + DoubleToString(profit, 2)
        + ",\"commission\":" + DoubleToString(commission, 2)
        + ",\"swap\":" + DoubleToString(swap, 2)
        + "}";
   return(true);
  }

//+------------------------------------------------------------------+
//| Deposits minus withdrawals over the whole account history.       |
//+------------------------------------------------------------------+
double NetDeposits()
  {
   double sum = 0;
   if(!HistorySelect(0, TimeCurrent() + 86400)) return(0);
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong deal = HistoryDealGetTicket(i);
      if(deal == 0) continue;
      if(HistoryDealGetInteger(deal, DEAL_TYPE) == DEAL_TYPE_BALANCE)
         sum += HistoryDealGetDouble(deal, DEAL_PROFIT);
     }
   return(sum);
  }

//+------------------------------------------------------------------+
bool SendBatch(string positionsJson, double netDeposits)
  {
   string body = "{\"version\":1"
               + ",\"login\":\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\""
               + ",\"server\":\"" + Esc(AccountInfoString(ACCOUNT_SERVER)) + "\""
               + ",\"company\":\"" + Esc(AccountInfoString(ACCOUNT_COMPANY)) + "\""
               + ",\"currency\":\"" + Esc(AccountInfoString(ACCOUNT_CURRENCY)) + "\""
               + ",\"balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2)
               + ",\"netDeposits\":" + DoubleToString(netDeposits, 2)
               + ",\"positions\":[" + positionsJson + "]}";

   char data[], result[];
   StringToCharArray(body, data, 0, WHOLE_ARRAY, CP_UTF8);
   int len = ArraySize(data);
   if(len > 0 && data[len - 1] == 0) ArrayResize(data, len - 1);   // drop the C string terminator

   string headers = "Content-Type: application/json\r\nx-yafi-token: " + InpToken + "\r\n";
   string responseHeaders;
   ResetLastError();
   int code = WebRequest("POST", InpWebhookUrl, headers, 20000, data, result, responseHeaders);
   string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);

   if(code == -1)
     {
      int err = GetLastError();
      if(err == 4014)
         Status("allow WebRequest for https://yafijournal.com in Tools > Options > Expert Advisors");
      else
         Status("network error " + IntegerToString(err) + ", will retry");
      return(false);
     }
   if(code == 401) { Status("token rejected: copy it again from YAFI > Settings > MT5 sync"); return(false); }
   if(code < 200 || code >= 300)
     {
      Status("server error " + IntegerToString(code) + ": " + StringSubstr(response, 0, 120));
      return(false);
     }

   g_lastCreated = JsonInt(response, "created");
   g_lastUpdated = JsonInt(response, "updated");
   g_lastLinked  = JsonInt(response, "linked");
   Status(StringFormat("synced %s  (new %d, updated %d, linked %d)",
                       TimeToString(TimeLocal(), TIME_DATE | TIME_MINUTES), g_lastCreated, g_lastUpdated, g_lastLinked));
   return(true);
  }

//+------------------------------------------------------------------+
//| Helpers                                                           |
//+------------------------------------------------------------------+
// Broker server time -> UTC (offset rounded to 15 minutes).
datetime ToUtc(datetime serverTime)
  {
   long offset = (long)TimeTradeServer() - (long)TimeGMT();
   offset = (long)MathRound(offset / 900.0) * 900;
   return((datetime)((long)serverTime - offset));
  }

bool Contains(const ulong &arr[], ulong v)
  {
   for(int i = ArraySize(arr) - 1; i >= 0; i--) if(arr[i] == v) return(true);
   return(false);
  }

string Esc(string s)
  {
   StringReplace(s, "\\", "\\\\");
   StringReplace(s, "\"", "\\\"");
   return(s);
  }

// Reads an integer field from a flat JSON response, e.g. "created":3
int JsonInt(string json, string key)
  {
   int p = StringFind(json, "\"" + key + "\":");
   if(p < 0) return(0);
   p += StringLen(key) + 3;
   int e = p;
   while(e < StringLen(json) && StringGetCharacter(json, e) >= '0' && StringGetCharacter(json, e) <= '9') e++;
   return((int)StringToInteger(StringSubstr(json, p, e - p)));
  }

void Status(string text)
  {
   Comment("YafiSync  |  " + text);
   Print("YafiSync: ", text);
  }
//+------------------------------------------------------------------+
