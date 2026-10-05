-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text,
  thumbnail text,
  impressions integer DEFAULT 0,
  engagement integer DEFAULT 0,
  ctr numeric,
  campaign text,
  size text,
  created_at timestamptz DEFAULT now()
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text,
  spend numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  channel text,
  last_updated timestamptz,
  start_date date,
  end_date date,
  progress numeric DEFAULT 0,
  budget numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Strategies table
CREATE TABLE IF NOT EXISTS strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trades integer DEFAULT 0,
  win_rate numeric DEFAULT 0,
  avg_win numeric DEFAULT 0,
  avg_loss numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Channel budgets table
CREATE TABLE IF NOT EXISTS channel_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  allocated numeric DEFAULT 0,
  spent numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Audience segments table
CREATE TABLE IF NOT EXISTS audience_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  size integer DEFAULT 0,
  growth numeric DEFAULT 0,
  engagement numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
