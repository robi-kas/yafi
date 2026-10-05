-- Consolidated SQL schema for missing tables
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql/new)

-- 1. Strategies Table (Updated to include all fields used in the UI)
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT,
  risk_per_trade DECIMAL(5, 2) DEFAULT 2.0,
  trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  avg_win DECIMAL(15, 2) DEFAULT 0,
  avg_loss DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  spend DECIMAL(15, 2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  channel TEXT,
  last_updated TIMESTAMP WITH TIME ZONE,
  start_date DATE,
  end_date DATE,
  progress DECIMAL(5, 2) DEFAULT 0,
  budget DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Assets Table
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  thumbnail TEXT,
  impressions INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  ctr DECIMAL(10, 4),
  campaign TEXT,
  size TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Channel Budgets Table
CREATE TABLE IF NOT EXISTS public.channel_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  allocated DECIMAL(15, 2) DEFAULT 0,
  spent DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Audience Segments Table
CREATE TABLE IF NOT EXISTS public.audience_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size INTEGER DEFAULT 0,
  growth DECIMAL(10, 2) DEFAULT 0,
  engagement DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for all tables
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_segments ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies (adjust as needed for user_id)
-- Note: Using service role key in server-side routes will bypass these,
-- but they are good practice.

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategies' AND policyname = 'Allow service role') THEN
    CREATE POLICY "Allow service role" ON strategies FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'Allow service role') THEN
    CREATE POLICY "Allow service role" ON campaigns FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assets' AND policyname = 'Allow service role') THEN
    CREATE POLICY "Allow service role" ON assets FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'channel_budgets' AND policyname = 'Allow service role') THEN
    CREATE POLICY "Allow service role" ON channel_budgets FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audience_segments' AND policyname = 'Allow service role') THEN
    CREATE POLICY "Allow service role" ON audience_segments FOR ALL USING (true);
  END IF;
END $$;
