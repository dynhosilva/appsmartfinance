import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Users, 
  Crown, 
  Shield, 
  TrendingUp, 
  Calendar,
  Search,
  MoreVertical,
  UserCheck,
  UserX,
  Mail,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserWithPlan {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
  phone_number: string | null;
  subscription_status: string | null;
  plan_type: string | null;
  plan_name: string | null;
}

interface DashboardStats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  newUsersThisMonth: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [users, setUsers] = useState<UserWithPlan[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    proUsers: 0,
    freeUsers: 0,
    newUsersThisMonth: 0,
  });
  const [plans, setPlans] = useState<{ id: string; name: string; plan_type: string }[]>([]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Acesso negado. Você não tem permissão para acessar esta página.");
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadPlans();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, planFilter]);

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from("plans")
      .select("id, name, plan_type")
      .eq("is_active", true);

    if (!error && data) {
      setPlans(data);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get all subscriptions with plan info
      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select(`
          user_id,
          status,
          plans (
            name,
            plan_type
          )
        `);

      if (subsError) throw subsError;

      // Merge data
      const usersWithPlans: UserWithPlan[] = (profiles || []).map((profile) => {
        const subscription = subscriptions?.find(s => s.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          created_at: profile.created_at,
          phone_number: profile.phone_number,
          subscription_status: subscription?.status || null,
          plan_type: subscription?.plans?.plan_type || "free",
          plan_name: subscription?.plans?.name || "Gratuito",
        };
      });

      setUsers(usersWithPlans);

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const proCount = usersWithPlans.filter(u => 
        u.subscription_status === "active" && u.plan_type !== "free"
      ).length;
      
      const newThisMonth = usersWithPlans.filter(u => 
        u.created_at && new Date(u.created_at) >= startOfMonth
      ).length;

      setStats({
        totalUsers: usersWithPlans.length,
        proUsers: proCount,
        freeUsers: usersWithPlans.length - proCount,
        newUsersThisMonth: newThisMonth,
      });
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email?.toLowerCase().includes(term) ||
          u.full_name?.toLowerCase().includes(term)
      );
    }

    if (planFilter !== "all") {
      if (planFilter === "pro") {
        filtered = filtered.filter(u => u.subscription_status === "active" && u.plan_type !== "free");
      } else if (planFilter === "free") {
        filtered = filtered.filter(u => !u.subscription_status || u.subscription_status !== "active" || u.plan_type === "free");
      }
    }

    setFilteredUsers(filtered);
  };

  const handleSetPlan = async (userId: string, planType: "free" | "pro" | "business") => {
    try {
      if (planType === "free") {
        // Remove subscription
        const { error } = await supabase
          .from("subscriptions")
          .delete()
          .eq("user_id", userId);

        if (error) throw error;
        toast.success("Usuário alterado para plano Gratuito");
      } else {
        // Find the plan ID
        const plan = plans.find(p => p.plan_type === planType);
        if (!plan) {
          toast.error("Plano não encontrado");
          return;
        }

        // Check if user already has a subscription
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (existingSub) {
          // Update existing subscription
          const { error } = await supabase
            .from("subscriptions")
            .update({
              plan_id: plan.id,
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq("user_id", userId);

          if (error) throw error;
        } else {
          // Create new subscription
          const { error } = await supabase
            .from("subscriptions")
            .insert({
              user_id: userId,
              plan_id: plan.id,
              status: "active",
              billing_period: "yearly",
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            });

          if (error) throw error;
        }

        toast.success(`Usuário alterado para plano ${plan.name}`);
      }

      loadUsers();
    } catch (error) {
      console.error("Error setting plan:", error);
      toast.error("Erro ao alterar plano do usuário");
    }
  };

  if (adminLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie usuários e assinaturas do Smart Finance</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total de Usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                Usuários Pro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{stats.proUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                Usuários Free
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.freeUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Novos Este Mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{stats.newUsersThisMonth}</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Usuários</CardTitle>
            <CardDescription>
              Visualize e gerencie todos os usuários cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrar por plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os planos</SelectItem>
                  <SelectItem value="pro">Plano Pro/Business</SelectItem>
                  <SelectItem value="free">Plano Gratuito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="font-medium">{user.full_name || "Sem nome"}</div>
                            <div className="text-sm text-muted-foreground sm:hidden">
                              {user.email}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              {user.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.subscription_status === "active" && user.plan_type !== "free"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {user.plan_name}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {user.created_at
                                ? format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })
                                : "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleSetPlan(user.id, "free")}>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Definir como Free
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSetPlan(user.id, "pro")}>
                                  <Crown className="h-4 w-4 mr-2" />
                                  Definir como Pro
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSetPlan(user.id, "business")}>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Definir como Business
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 text-sm text-muted-foreground">
              Mostrando {filteredUsers.length} de {users.length} usuários
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Admin;
