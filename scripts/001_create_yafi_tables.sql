-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trading accounts table
CREATE TABLE IF NOT EXISTS public.trading_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('personal', 'prop_firm', 'demo')),
  broker TEXT,
  starting_balance DECIMAL(15, 2),
  current_balance DECIMAL(15, 2),
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create strategies table
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT,
  markets TEXT[] DEFAULT '{}',
  risk_per_trade DECIMAL(5, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trades table (core feature)
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('forex', 'crypto', 'stocks', 'indices')),
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  entry_price DECIMAL(15, 8) NOT NULL,
  stop_loss DECIMAL(15, 8),
  take_profit DECIMAL(15, 8),
  exit_price DECIMAL(15, 8),
  position_size DECIMAL(15, 8) NOT NULL,
  risk_amount DECIMAL(15, 2),
  reward_amount DECIMAL(15, 2),
  profit_loss DECIMAL(15, 2),
  result TEXT CHECK (result IN ('win', 'loss', 'breakeven')),
  risk_to_reward_ratio DECIMAL(10, 2),
  trading_session TEXT CHECK (trading_session IN ('asia', 'london', 'new_york')),
  emotional_state TEXT,
  custom_tags TEXT[] DEFAULT '{}',
  notes TEXT,
  screenshot_urls TEXT[] DEFAULT '{}',
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  exit_time TIMESTAMP WITH TIME ZONE,
  duration_hours DECIMAL(10, 2),
  rule_violations TEXT[] DEFAULT '{}',
  is_imported BOOLEAN DEFAULT FALSE,
  source_broker TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_trades INT DEFAULT 0,
  winning_trades INT DEFAULT 0,
  losing_trades INT DEFAULT 0,
  breakeven_trades INT DEFAULT 0,
  win_rate DECIMAL(5, 2),
  profit_factor DECIMAL(10, 2),
  average_win DECIMAL(15, 2),
  average_loss DECIMAL(15, 2),
  expectancy DECIMAL(15, 2),
  largest_win DECIMAL(15, 2),
  largest_loss DECIMAL(15, 2),
  total_profit_loss DECIMAL(15, 2),
  max_drawdown DECIMAL(15, 2),
  consistency_score DECIMAL(5, 2),
  risk_efficiency DECIMAL(10, 2),
  daily_pnl DECIMAL(15, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, metric_date, account_id, strategy_id)
);

-- Create discipline_entries table
CREATE TABLE IF NOT EXISTS public.discipline_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('pre_trade_checklist', 'post_trade_reflection')),
  content TEXT,
  checklist_items JSONB DEFAULT '{}'::jsonb,
  emotional_state TEXT,
  rule_followed BOOLEAN,
  discipline_score DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create equity_history table for tracking equity over time
CREATE TABLE IF NOT EXISTS public.equity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  balance DECIMAL(15, 2) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equity_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- RLS Policies for trading_accounts
CREATE POLICY "trading_accounts_select_own" ON public.trading_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trading_accounts_insert_own" ON public.trading_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trading_accounts_update_own" ON public.trading_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trading_accounts_delete_own" ON public.trading_accounts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for strategies
CREATE POLICY "strategies_select_own" ON public.strategies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "strategies_insert_own" ON public.strategies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "strategies_update_own" ON public.strategies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "strategies_delete_own" ON public.strategies FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for trades
CREATE POLICY "trades_select_own" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trades_insert_own" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trades_update_own" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trades_delete_own" ON public.trades FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for performance_metrics
CREATE POLICY "performance_metrics_select_own" ON public.performance_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "performance_metrics_insert_own" ON public.performance_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "performance_metrics_update_own" ON public.performance_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "performance_metrics_delete_own" ON public.performance_metrics FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for discipline_entries
CREATE POLICY "discipline_entries_select_own" ON public.discipline_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "discipline_entries_insert_own" ON public.discipline_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "discipline_entries_update_own" ON public.discipline_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "discipline_entries_delete_own" ON public.discipline_entries FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for equity_history
CREATE POLICY "equity_history_select_own" ON public.equity_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "equity_history_insert_own" ON public.equity_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "equity_history_update_own" ON public.equity_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "equity_history_delete_own" ON public.equity_history FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'first_name', NULL),
    COALESCE(new.raw_user_meta_data ->> 'last_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS trades_user_id_idx ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS trades_account_id_idx ON public.trades(account_id);
CREATE INDEX IF NOT EXISTS trades_strategy_id_idx ON public.trades(strategy_id);
CREATE INDEX IF NOT EXISTS trades_entry_time_idx ON public.trades(entry_time);
CREATE INDEX IF NOT EXISTS performance_metrics_user_id_idx ON public.performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS performance_metrics_date_idx ON public.performance_metrics(metric_date);
CREATE INDEX IF NOT EXISTS trading_accounts_user_id_idx ON public.trading_accounts(user_id);
CREATE INDEX IF NOT EXISTS strategies_user_id_idx ON public.strategies(user_id);
CREATE INDEX IF NOT EXISTS equity_history_account_id_idx ON public.equity_history(account_id);
CREATE INDEX IF NOT EXISTS equity_history_recorded_at_idx ON public.equity_history(recorded_at);
