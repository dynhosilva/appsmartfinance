import { memo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  FolderKanban,
  PieChart,
  Target,
  ShoppingCart,
  Map,
  FileUp,
  Shield,
  LogOut,
  Building2,
  CreditCard,
  Bot,
  Smartphone,
  Crown,
  Settings,
  StickyNote,
  Percent,
  LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAdmin } from "@/hooks/useAdmin";
import logoSmartFinance from "@/assets/logo-smartfinance.png";

interface MenuItem {
  title: string;
  icon: LucideIcon;
  path: string;
  highlight?: boolean;
}

const menuItems: MenuItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Bancos", icon: Building2, path: "/banks" },
  { title: "Transações", icon: ArrowLeftRight, path: "/transactions" },
  { title: "Dívidas", icon: CreditCard, path: "/debts" },
  { title: "Categorias", icon: FolderKanban, path: "/categories" },
  { title: "Relatórios", icon: PieChart, path: "/reports" },
  { title: "Metas", icon: Target, path: "/goals" },
  { title: "Reserva de Emergência", icon: Shield, path: "/emergency-reserve" },
  { title: "Mercado", icon: ShoppingCart, path: "/market" },
  { title: "Jornada Financeira", icon: Map, path: "/independence-map" },
  { title: "Assistente Virtual", icon: Bot, path: "/whatsapp" },
  { title: "Divisão Automática", icon: Percent, path: "/split-config" },
  { title: "Bloco de Notas", icon: StickyNote, path: "/notes" },
  { title: "Importar Dados", icon: FileUp, path: "/import-data" },
  { title: "Instalar App", icon: Smartphone, path: "/install" },
  { title: "Planos e Preços", icon: Crown, path: "/upgrade", highlight: true },
];

// Memoized menu item to prevent unnecessary re-renders
const MemoizedMenuItem = memo(function MemoizedMenuItem({
  item,
  isActive,
  onClick,
}: {
  item: MenuItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        onClick={onClick}
        tooltip={item.title}
        className={
          isActive
            ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            : item.highlight
            ? "text-primary hover:text-primary"
            : ""
        }
      >
        <item.icon className={`h-4 w-4 ${item.highlight ? "text-primary" : ""}`} />
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});

export const AppSidebar = memo(function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast.success("Logout realizado com sucesso");
  }, [navigate]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => handleNavigate("/dashboard")}
        >
          <img 
            src={logoSmartFinance} 
            alt="Smart Finance" 
            className="h-8 w-auto"
            loading="lazy"
          />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <MemoizedMenuItem
                  key={item.path}
                  item={item}
                  isActive={location.pathname === item.path}
                  onClick={() => handleNavigate(item.path)}
                />
              ))}
              
              {/* Admin Menu Item - Only visible for admins */}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.pathname === "/admin"}
                    onClick={() => handleNavigate("/admin")}
                    tooltip="Painel Admin"
                    className={
                      location.pathname === "/admin"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                        : "text-destructive hover:text-destructive"
                    }
                  >
                    <Settings className="h-4 w-4" />
                    <span>Painel Admin</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2 space-y-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-sm text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
});
