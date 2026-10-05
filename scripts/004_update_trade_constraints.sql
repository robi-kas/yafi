-- Migration script to update trade constraints
-- This script updates the 'trades' table to support the 'metal' market
-- and aligns the 'direction' values with the UI ('buy'/'sell').

-- 1. Update Market Constraint
-- First, we need to find the constraint name. In PostgreSQL it's usually automatic, 
-- but we'll try to drop the one from init-db.sql if it exists.
DO $$ 
BEGIN
    -- Drop old market check if it exists (might have a default name like trades_market_check)
    ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_market_check;
    
    -- Add updated market check
    ALTER TABLE trades ADD CONSTRAINT trades_market_check 
    CHECK (market IN ('forex', 'crypto', 'stocks', 'indices', 'metal'));
    
    -- Drop old direction check if it exists
    ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_direction_check;
    
    -- Add updated direction check
    ALTER TABLE trades ADD CONSTRAINT trades_direction_check 
    CHECK (direction IN ('buy', 'sell', 'long', 'short')); -- Keep long/short for backward compatibility if any
END $$;
