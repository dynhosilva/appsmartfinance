
-- Drop and recreate function with new return type
DROP FUNCTION IF EXISTS public.get_user_plan(uuid);

CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id uuid)
 RETURNS TABLE(
   plan_type plan_type, 
   plan_name text, 
   is_active boolean, 
   whatsapp_enabled boolean, 
   reports_enabled boolean, 
   max_reminders integer, 
   max_banks integer, 
   max_goals integer,
   cashflow_projection_enabled boolean,
   export_enabled boolean,
   split_enabled boolean,
   business_profile_enabled boolean,
   advanced_dashboard_enabled boolean,
   annual_projection_enabled boolean,
   history_months integer,
   monthly_planning_enabled boolean
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(pl.plan_type, 'starter'::public.plan_type) as plan_type,
    COALESCE(pl.name, 'Starter') as plan_name,
    COALESCE(s.status = 'active', false) as is_active,
    COALESCE(pl.whatsapp_enabled, false) as whatsapp_enabled,
    COALESCE(pl.reports_enabled, false) as reports_enabled,
    COALESCE(pl.max_reminders, 999) as max_reminders,
    COALESCE(pl.max_banks, 999) as max_banks,
    COALESCE(pl.max_goals, 1) as max_goals,
    COALESCE(pl.cashflow_projection_enabled, false) as cashflow_projection_enabled,
    COALESCE(pl.export_enabled, false) as export_enabled,
    COALESCE(pl.split_enabled, false) as split_enabled,
    COALESCE(pl.business_profile_enabled, false) as business_profile_enabled,
    COALESCE(pl.advanced_dashboard_enabled, false) as advanced_dashboard_enabled,
    COALESCE(pl.annual_projection_enabled, false) as annual_projection_enabled,
    COALESCE(pl.history_months, 3) as history_months,
    COALESCE(pl.monthly_planning_enabled, false) as monthly_planning_enabled
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.id AND s.status = 'active'
  LEFT JOIN public.plans pl ON pl.id = s.plan_id
  WHERE p.id = p_user_id;
END;
$function$;
