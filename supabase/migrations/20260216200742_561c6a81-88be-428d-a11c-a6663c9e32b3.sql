
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS cashflow_projection_enabled boolean DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS export_enabled boolean DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS split_enabled boolean DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS business_profile_enabled boolean DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS advanced_dashboard_enabled boolean DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS annual_projection_enabled boolean DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS history_months integer DEFAULT 3;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS monthly_planning_enabled boolean DEFAULT false;
