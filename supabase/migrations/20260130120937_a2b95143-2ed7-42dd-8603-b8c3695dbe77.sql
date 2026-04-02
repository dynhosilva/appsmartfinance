-- Create enum for profile types
CREATE TYPE public.profile_type AS ENUM ('personal', 'business');

-- Add profile_type column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN profile_type public.profile_type NOT NULL DEFAULT 'personal';

-- Add profile_type column to banks table
ALTER TABLE public.banks 
ADD COLUMN profile_type public.profile_type NOT NULL DEFAULT 'personal';

-- Add profile_type column to categories table (for profile-specific categories)
ALTER TABLE public.categories 
ADD COLUMN profile_type public.profile_type DEFAULT 'personal';

-- Create indexes for better query performance
CREATE INDEX idx_transactions_profile_type ON public.transactions(profile_type);
CREATE INDEX idx_transactions_user_profile ON public.transactions(user_id, profile_type);
CREATE INDEX idx_banks_profile_type ON public.banks(profile_type);
CREATE INDEX idx_banks_user_profile ON public.banks(user_id, profile_type);