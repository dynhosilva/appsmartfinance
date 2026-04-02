import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SplitRule {
  id: string;
  name: string;
  personal_percentage: number;
  reserve_percentage: number;
  business_percentage: number;
  is_active: boolean;
}

export function useSplitRules() {
  const [rules, setRules] = useState<SplitRule[]>([]);
  const [activeRule, setActiveRule] = useState<SplitRule | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRules = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("split_rules")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const typed = (data || []) as SplitRule[];
      setRules(typed);
      setActiveRule(typed.find(r => r.is_active) || null);
    } catch (err) {
      console.error("Error loading split rules:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const saveRule = useCallback(async (rule: Omit<SplitRule, "id">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não encontrado");

    // Deactivate all other rules if this one is active
    if (rule.is_active) {
      await supabase
        .from("split_rules")
        .update({ is_active: false })
        .eq("user_id", user.id);
    }

    const { error } = await supabase
      .from("split_rules")
      .insert({
        user_id: user.id,
        name: rule.name,
        personal_percentage: rule.personal_percentage,
        reserve_percentage: rule.reserve_percentage,
        business_percentage: rule.business_percentage,
        is_active: rule.is_active,
      });

    if (error) throw error;
    await loadRules();
  }, [loadRules]);

  const updateRule = useCallback(async (id: string, updates: Partial<SplitRule>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não encontrado");

    // Deactivate all other rules if activating this one
    if (updates.is_active) {
      await supabase
        .from("split_rules")
        .update({ is_active: false })
        .eq("user_id", user.id);
    }

    const { error } = await supabase
      .from("split_rules")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    await loadRules();
  }, [loadRules]);

  const deleteRule = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("split_rules")
      .delete()
      .eq("id", id);

    if (error) throw error;
    await loadRules();
  }, [loadRules]);

  return { rules, activeRule, loading, loadRules, saveRule, updateRule, deleteRule };
}
