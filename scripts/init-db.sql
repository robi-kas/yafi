-- YAFI Trading Journal Database Schema

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT CHECK (account_type IN ('live', 'demo', 'prop-firm')),
  broker TEXT,
  initial_balance DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create strategies table
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create trades table (core feature)
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  
  -- Trade details
  market TEXT NOT NULL CHECK (market IN ('forex', 'crypto', 'stocks', 'indices', 'metal')),
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  
  -- Entry and exit
  entry_price DECIMAL(15, 8) NOT NULL,
  stop_loss DECIMAL(15, 8),
  take_profit DECIMAL(15, 8),
  exit_price DECIMAL(15, 8),
  
  -- Position sizing
  position_size DECIMAL(15, 8) NOT NULL,
  risk_amount DECIMAL(15, 2),
  reward_amount DECIMAL(15, 2),
  
  -- Results
  profit_loss DECIMAL(15, 2),
  win_loss TEXT CHECK (win_loss IN ('win', 'loss', 'breakeven')),
  risk_reward_ratio DECIMAL(10, 2),
  
  -- Timing
  entry_time TIMESTAMP NOT NULL,
  exit_time TIMESTAMP,
  trading_session TEXT CHECK (trading_session IN ('asia', 'london', 'newyork', 'us-afternoon')),
  
  -- Psychology
  emotional_state TEXT CHECK (emotional_state IN ('calm', 'confident', 'anxious', 'frustrated', 'greedy', 'neutral')),
  tags TEXT ARRAY,
  notes TEXT,
  screenshot_url TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, id)
);

-- Create performance metrics view
CREATE TABLE IF NOT EXISTS daily_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  trade_date DATE NOT NULL,
  
  -- Daily stats
  total_trades INT DEFAULT 0,
  winning_trades INT DEFAULT 0,
  losing_trades INT DEFAULT 0,
  breakeven_trades INT DEFAULT 0,
  
  daily_profit_loss DECIMAL(15, 2) DEFAULT 0,
  win_rate DECIMAL(5, 2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, account_id, trade_date)
);

-- Create discipline tracking
CREATE TABLE IF NOT EXISTS discipline_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  
  -- Pre-trade checklist
  pre_trade_checklist JSONB,
  
  -- Post-trade reflection
  followed_rules BOOLEAN,
  mistakes_made TEXT ARRAY,
  reflection_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_account_id ON trades(account_id);
CREATE INDEX idx_trades_strategy_id ON trades(strategy_id);
CREATE INDEX idx_trades_entry_time ON trades(entry_time);
CREATE INDEX idx_trades_market ON trades(market);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_strategies_user_id ON strategies(user_id);
CREATE INDEX idx_daily_performance_user_id ON daily_performance(user_id);
CREATE INDEX idx_daily_performance_date ON daily_performance(trade_date);
CREATE INDEX idx_discipline_entries_user_id ON discipline_entries(user_id);
CREATE INDEX idx_discipline_entries_trade_id ON discipline_entries(trade_id);

-- Enable Row Level Security (RLS)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE discipline_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own accounts" ON accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts" ON accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts" ON accounts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own strategies" ON strategies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own strategies" ON strategies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies" ON strategies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies" ON strategies
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own trades" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades" ON trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades" ON trades
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own daily performance" ON daily_performance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own discipline entries" ON discipline_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own discipline entries" ON discipline_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own discipline entries" ON discipline_entries
  FOR UPDATE USING (auth.uid() = user_id);
