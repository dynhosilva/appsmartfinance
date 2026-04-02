import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminHook {
  isAdmin: boolean;
  loading: boolean;
  checkIsAdmin: () => Promise<boolean>;
}

export function useAdmin(): AdminHook {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkIsAdmin = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return false;
      }

      const { data, error } = await supabase
        .rpc("has_role", { _user_id: user.id, _role: "admin" });

      if (error) {
        console.error("Error checking admin role:", error);
        setIsAdmin(false);
        return false;
      }

      setIsAdmin(data === true);
      return data === true;
    } catch (error) {
      console.error("Error in checkIsAdmin:", error);
      setIsAdmin(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkIsAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkIsAdmin();
    });

    return () => subscription.unsubscribe();
  }, [checkIsAdmin]);

  return { isAdmin, loading, checkIsAdmin };
}
