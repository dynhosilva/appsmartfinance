import { ReactNode, useEffect, useState, memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import ProfileSwitcher, { FinancialProfile } from "@/components/dashboard/ProfileSwitcher";
import { User, Building2, Menu } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useUserPlan } from "@/hooks/useUserPlan";
import { UpgradePrompt } from "@/components/plans/UpgradePrompt";

interface AppLayoutProps {
  children: ReactNode;
  currentProfile?: FinancialProfile;
  onProfileChange?: (profile: FinancialProfile) => void;
  showProfileSwitcher?: boolean;
  title?: string;
}

export const AppLayout = memo(function AppLayout({ 
  children, 
  currentProfile = "personal",
  onProfileChange,
  showProfileSwitcher = false,
  title
}: AppLayoutProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { canUseBusinessProfile, loading: planLoading } = useUserPlan();

  useEffect(() => {
    let isMounted = true;
    let redirectTimer: number | null = null;
    let subscription: { unsubscribe: () => void } | null = null;

    const finishWithSession = (session: any) => {
      setUser(session.user);
      setLoading(false);
    };

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      // If we already have a session, render immediately
      if (session?.user) {
        finishWithSession(session);
        return;
      }

      // Otherwise, wait briefly for session rehydration/auth event before redirecting
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!isMounted) return;
        if (nextSession?.user) {
          if (redirectTimer) window.clearTimeout(redirectTimer);
          finishWithSession(nextSession);
        }
      });
      subscription = data.subscription;

      redirectTimer = window.setTimeout(async () => {
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (retrySession?.user) {
          finishWithSession(retrySession);
          return;
        }

        setLoading(false);
        navigate("/auth");
      }, 800);
    };

    init();

    return () => {
      isMounted = false;
      if (redirectTimer) window.clearTimeout(redirectTimer);
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const isPersonal = currentProfile === "personal";

  // Memoize user initial to prevent recalculation
  const userInitial = useMemo(() => {
    return user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U";
  }, [user?.user_metadata?.full_name, user?.email]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-40 flex h-12 sm:h-14 items-center gap-2 sm:gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 sm:px-4">
          <SidebarTrigger className="-ml-1 shrink-0">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          
          {title && (
            <>
              <Separator orientation="vertical" className="h-5 hidden sm:block" />
              <h1 className="text-sm sm:text-lg font-semibold truncate">{title}</h1>
            </>
          )}
          
          <div className="flex-1 min-w-0" />
          
          {/* Profile Switcher - simplified for mobile */}
          {showProfileSwitcher && onProfileChange && (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className={`p-1 sm:p-1.5 rounded-full ${isPersonal ? 'bg-primary/10' : 'bg-secondary/10'}`}>
                {isPersonal ? (
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                ) : (
                  <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-secondary" />
                )}
              </div>
              <ProfileSwitcher 
                currentProfile={currentProfile} 
                onProfileChange={(profile) => {
                  if (profile === "business" && !canUseBusinessProfile()) {
                    setShowUpgradeModal(true);
                    return;
                  }
                  onProfileChange(profile);
                }} 
              />
            </div>
          )}
          
          {/* Upgrade modal for business profile */}
          <UpgradePrompt
            feature="Controle PF/PJ"
            description="O controle separado de perfil Pessoal e Empresarial está disponível no plano Pro Plus."
            variant="modal"
            requiredPlan="pro_plus"
            open={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            benefits={["Controle separado PF e PJ", "Caixa empresarial", "Relatório de rentabilidade", "Dashboard avançado consolidado"]}
          />
          
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* User Avatar */}
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs sm:text-sm font-medium text-primary">
              {userInitial}
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 bg-muted/30 overflow-x-hidden max-w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
});
