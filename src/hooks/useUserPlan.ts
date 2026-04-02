import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanType = "starter" | "pro" | "pro_plus" | "free" | "business";

interface UserPlan {
  plan_type: PlanType;
  plan_name: string;
  is_active: boolean;
  max_banks: number;
  max_goals: number;
  max_reminders: number;
  whatsapp_enabled: boolean;
  reports_enabled: boolean;
  cashflow_projection_enabled: boolean;
  export_enabled: boolean;
  split_enabled: boolean;
  business_profile_enabled: boolean;
  advanced_dashboard_enabled: boolean;
  annual_projection_enabled: boolean;
  history_months: number;
  monthly_planning_enabled: boolean;
}

interface PlanUsage {
  banks_count: number;
  goals_count: number;
  reminders_count: number;
}

const DEFAULT_PLAN: UserPlan = {
  plan_type: "starter",
  plan_name: "Starter",
  is_active: true,
  max_banks: 999,
  max_goals: 1,
  max_reminders: 999,
  whatsapp_enabled: false,
  reports_enabled: false,
  cashflow_projection_enabled: false,
  export_enabled: false,
  split_enabled: false,
  business_profile_enabled: false,
  advanced_dashboard_enabled: false,
  annual_projection_enabled: false,
  history_months: 3,
  monthly_planning_enabled: false,
};

const ADMIN_PLAN: UserPlan = {
  plan_type: "pro_plus",
  plan_name: "Admin",
  is_active: true,
  max_banks: 999,
  max_goals: 999,
  max_reminders: 999,
  whatsapp_enabled: true,
  reports_enabled: true,
  cashflow_projection_enabled: true,
  export_enabled: true,
  split_enabled: true,
  business_profile_enabled: true,
  advanced_dashboard_enabled: true,
  annual_projection_enabled: true,
  history_months: 9999,
  monthly_planning_enabled: true,
};

// Cache for plan data to avoid redundant fetches
let planCache: { userId: string; plan: UserPlan; usage: PlanUsage; isAdmin: boolean; timestamp: number } | null = null;
const CACHE_TTL = 60000; // 1 minute

// Normalize legacy plan types
function normalizePlanType(type: string): PlanType {
  if (type === "free") return "starter";
  if (type === "business") return "pro_plus";
  return type as PlanType;
}

export function useUserPlan() {
  const [plan, setPlan] = useState<UserPlan>(DEFAULT_PLAN);
  const [usage, setUsage] = useState<PlanUsage>({ banks_count: 0, goals_count: 0, reminders_count: 0 });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadPlan = useCallback(async (forceRefresh = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check cache first
      if (!forceRefresh && planCache && planCache.userId === user.id && Date.now() - planCache.timestamp < CACHE_TTL) {
        setPlan(planCache.plan);
        setUsage(planCache.usage);
        setIsAdmin(planCache.isAdmin);
        setLoading(false);
        return;
      }

      // Check if user is admin
      const { data: adminCheck } = await supabase
        .rpc("has_role", { _user_id: user.id, _role: "admin" });

      if (adminCheck === true) {
        setIsAdmin(true);
        setPlan(ADMIN_PLAN);
        setUsage({ banks_count: 0, goals_count: 0, reminders_count: 0 });
        planCache = { userId: user.id, plan: ADMIN_PLAN, usage: { banks_count: 0, goals_count: 0, reminders_count: 0 }, isAdmin: true, timestamp: Date.now() };
        setLoading(false);
        return;
      }

      // Get user plan and usage in parallel
      const [planResult, banksResult, goalsResult, remindersResult] = await Promise.all([
        supabase.rpc("get_user_plan", { p_user_id: user.id }),
        supabase.from("banks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("custom_goals").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("reminders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      let userPlan = DEFAULT_PLAN;
      if (!planResult.error && planResult.data && planResult.data.length > 0) {
        const raw = planResult.data[0] as any;
        userPlan = {
          ...raw,
          plan_type: normalizePlanType(raw.plan_type),
          // Ensure new fields have defaults if not returned
          cashflow_projection_enabled: raw.cashflow_projection_enabled ?? false,
          export_enabled: raw.export_enabled ?? false,
          split_enabled: raw.split_enabled ?? false,
          business_profile_enabled: raw.business_profile_enabled ?? false,
          advanced_dashboard_enabled: raw.advanced_dashboard_enabled ?? false,
          annual_projection_enabled: raw.annual_projection_enabled ?? false,
          history_months: raw.history_months ?? 3,
          monthly_planning_enabled: raw.monthly_planning_enabled ?? false,
        };
      }

      const userUsage = {
        banks_count: banksResult.count || 0,
        goals_count: goalsResult.count || 0,
        reminders_count: remindersResult.count || 0,
      };

      setPlan(userPlan);
      setUsage(userUsage);
      setIsAdmin(false);
      
      // Update cache
      planCache = { userId: user.id, plan: userPlan, usage: userUsage, isAdmin: false, timestamp: Date.now() };
    } catch (error) {
      console.error("Error loading plan:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // Permission checks
  const canAddGoal = useCallback(() => {
    if (isAdmin || plan.max_goals >= 999) return true;
    return usage.goals_count < plan.max_goals;
  }, [isAdmin, plan.max_goals, usage.goals_count]);

  const canUseReports = useCallback(() => {
    return isAdmin || plan.reports_enabled;
  }, [isAdmin, plan.reports_enabled]);

  const canUseCashflowProjection = useCallback(() => {
    return isAdmin || plan.cashflow_projection_enabled;
  }, [isAdmin, plan.cashflow_projection_enabled]);

  const canExportData = useCallback(() => {
    return isAdmin || plan.export_enabled;
  }, [isAdmin, plan.export_enabled]);

  const canUseSplit = useCallback(() => {
    return isAdmin || plan.split_enabled;
  }, [isAdmin, plan.split_enabled]);

  const canUseBusinessProfile = useCallback(() => {
    return isAdmin || plan.business_profile_enabled;
  }, [isAdmin, plan.business_profile_enabled]);

  const canUseAdvancedDashboard = useCallback(() => {
    return isAdmin || plan.advanced_dashboard_enabled;
  }, [isAdmin, plan.advanced_dashboard_enabled]);

  const canUseAnnualProjection = useCallback(() => {
    return isAdmin || plan.annual_projection_enabled;
  }, [isAdmin, plan.annual_projection_enabled]);

  const canUseMonthlyPlanning = useCallback(() => {
    return isAdmin || plan.monthly_planning_enabled;
  }, [isAdmin, plan.monthly_planning_enabled]);

  const canUseWhatsApp = useCallback(() => {
    return isAdmin || plan.whatsapp_enabled;
  }, [isAdmin, plan.whatsapp_enabled]);

  const canUseMultipleGoals = useCallback(() => {
    return isAdmin || plan.max_goals > 1;
  }, [isAdmin, plan.max_goals]);

  // History months limit
  const historyMonths = useMemo(() => {
    if (isAdmin) return 9999;
    return plan.history_months;
  }, [isAdmin, plan.history_months]);

  // Get the required plan name for upgrade prompts
  const getRequiredPlanFor = useCallback((feature: string): "pro" | "pro_plus" => {
    const proPlusFeatures = ["business_profile", "advanced_dashboard", "annual_projection", "pf_pj"];
    if (proPlusFeatures.includes(feature)) return "pro_plus";
    return "pro";
  }, []);

  const refetch = useCallback(() => loadPlan(true), [loadPlan]);

  // Legacy helpers - banks and reminders are unlimited in all plans now
  const canAddBank = useCallback(() => true, []);
  const canAddReminder = useCallback(() => true, []);
  const getRemainingBanks = useCallback(() => "Ilimitado" as string | number, []);
  const getRemainingGoals = useCallback(() => {
    if (isAdmin || plan.max_goals >= 999) return "Ilimitado" as string | number;
    return Math.max(0, plan.max_goals - usage.goals_count) as string | number;
  }, [isAdmin, plan.max_goals, usage.goals_count]);
  const getRemainingReminders = useCallback(() => "Ilimitado" as string | number, []);

  return {
    plan,
    usage,
    loading,
    isAdmin,
    refetch,
    canAddBank,
    canAddGoal,
    canAddReminder,
    canUseReports,
    canUseCashflowProjection,
    canExportData,
    canUseSplit,
    canUseBusinessProfile,
    canUseAdvancedDashboard,
    getRemainingBanks,
    getRemainingGoals,
    getRemainingReminders,
    canUseAnnualProjection,
    canUseMonthlyPlanning,
    canUseWhatsApp,
    canUseMultipleGoals,
    historyMonths,
    getRequiredPlanFor,
  };
}
