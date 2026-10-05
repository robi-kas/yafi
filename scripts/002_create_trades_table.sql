-- Create trades table for Yafu app
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  market text CHECK (market IN ('forex', 'crypto', 'stocks', 'indices', 'metal')),
  direction text CHECK (direction IN ('buy', 'sell', 'long', 'short')),
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  exit_price numeric,
  position_size numeric,
  profit_loss numeric,
  result text CHECK (result IN ('win', 'loss', 'breakeven')),
  risk_to_reward numeric,
  strategy text,
  entry_time timestamptz,
  exit_time timestamptz,
  emotional_state text,
  notes text,
  tags text[],
  screenshots text[],
  created_at timestamptz DEFAULT now()
);
