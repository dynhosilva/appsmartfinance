
-- Step 1: Add new enum values
ALTER TYPE public.plan_type ADD VALUE IF NOT EXISTS 'starter';
ALTER TYPE public.plan_type ADD VALUE IF NOT EXISTS 'pro_plus';
