ALTER TABLE public.transactions ALTER COLUMN is_essential SET DEFAULT NULL;
ALTER TABLE public.transactions ALTER COLUMN is_essential DROP NOT NULL;