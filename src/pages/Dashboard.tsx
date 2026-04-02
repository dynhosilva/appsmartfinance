import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { 
  Target, 
  Plus, 
  PieChart as PieChartIcon,
  Award,
  FolderKanban,
  Wallet,
  Target as TargetIcon,
  User,
  Building2,
  Eye,
  EyeOff,
  Calendar,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import CashFlowChart from "@/components/dashboard/CashFlowChart";
import BalanceEvolutionChart from "@/components/dashboard/BalanceEvolutionChart";
import MonthlySummary from "@/components/dashboard/MonthlySummary";
import ProfileStats from "@/components/dashboard/ProfileStats";
import ProfileSummaryCard from "@/components/dashboard/ProfileSummaryCard";
import { BanksSummaryCard } from "@/components/dashboard/BanksSummaryCard";
import { useFinancialProfile } from "@/hooks/useFinancialProfile";
import { useBanks } from "@/hooks/useBanks";
import { AppLayout } from "@/components/layout/AppLayout";
import { FinancialNewsTicker } from "@/components/dashboard/FinancialNewsTicker";
import { SmartIndicators } from "@/components/dashboard/SmartIndicators";
import ConsolidatedCard from "@/components/dashboard/ConsolidatedCard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [hideValues, setHideValues] = useState(() => {
    const saved = localStorage.getItem("dashboard-hide-values");
    return saved === "true";
  });
  const [reserveData, setReserveData] = useState({
    reserveAmount: 0,
    reserveGoal: 0,
    reservePercentage: 0,
  });

  // Update current time every minute instead of every second (reduces re-renders)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const toggleHideValues = useCallback(() => {
    const newValue = !hideValues;
    setHideValues(newValue);
    localStorage.setItem("dashboard-hide-values", String(newValue));
  }, [hideValues]);

  const formatCurrency = useCallback((value: number) => {
    if (hideValues) return "••••••";
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }, [hideValues]);
  // Saldo disponível agora é calculado automaticamente dos bancos ativos

  const { 
    currentProfile, 
    setCurrentProfile, 
    currentData, 
    totals,
    loading: profileLoading 
  } = useFinancialProfile(user?.id);

  const { banks, loading: banksLoading } = useBanks(currentProfile);

  // Memoize available balance calculation
  const availableBalance = useMemo(() => 
    banks.filter(b => b.is_active).reduce((sum, bank) => sum + bank.current_balance, 0),
    [banks]
  );

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      await loadAdditionalData(session.user.id);
    } catch (error: any) {
      toast.error("Erro ao carregar dados");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdditionalData = async (userId: string) => {
    try {
      // Load emergency goal
      const { data: emergencyGoal } = await supabase
        .from("emergency_goals")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      // Load fixed costs
      const { data: fixedCosts } = await supabase
        .from("fixed_costs")
        .select("*")
        .eq("user_id", userId);

      const monthlyFixedCosts = fixedCosts?.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;
      
      // Calculate reserve goal based on goal_type
      let reserveGoal = 0;
      const goalType = emergencyGoal?.goal_type || 'months';
      const targetMonths = emergencyGoal?.target_months || 6;
      const targetAmount = emergencyGoal?.target_amount || 0;

      switch (goalType) {
        case 'months':
          reserveGoal = monthlyFixedCosts * targetMonths;
          break;
        case 'amount':
          reserveGoal = targetAmount;
          break;
        case 'both':
          reserveGoal = Math.max(monthlyFixedCosts * targetMonths, targetAmount);
          break;
        default:
          reserveGoal = monthlyFixedCosts * targetMonths;
      }

      const reserveAmount = emergencyGoal?.current_amount || 0;
      const reservePercentage = reserveGoal > 0 ? Math.min((reserveAmount / reserveGoal) * 100, 100) : 0;
      
      setReserveData({
        reserveAmount,
        reserveGoal,
        reservePercentage,
      });
    } catch (error) {
      console.error("Error loading additional data:", error);
    }
  };


  const currentMonthName = format(new Date(), 'MMMM', { locale: ptBR });
  const capitalizedMonthName = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const isPersonal = currentProfile === "personal";

  return (
    <AppLayout 
      showProfileSwitcher 
      currentProfile={currentProfile} 
      onProfileChange={setCurrentProfile}
    >
      <div className="space-y-6 max-w-full overflow-x-hidden">
        {/* Financial News Ticker - TOP OF PAGE */}
        <FinancialNewsTicker />

        {/* Welcome Section with Profile Indicator */}
        <motion.div 
          key={currentProfile}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isPersonal ? 'bg-primary/10' : 'bg-secondary/10'}`}>
                {isPersonal ? (
                  <User className={`h-6 w-6 text-primary`} />
                ) : (
                  <Building2 className={`h-6 w-6 text-secondary`} />
                )}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  Olá, {user?.user_metadata?.full_name || "Usuário"}! 👋
                </h1>
                <p className="text-muted-foreground">
                  Visualizando perfil <span className={`font-semibold ${isPersonal ? 'text-primary' : 'text-secondary'}`}>
                    {isPersonal ? 'Pessoal' : 'Empresarial'}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Date and Time Display - Mobile: date only, Desktop: full */}
              <div className="flex items-center gap-2 sm:gap-3 bg-muted/50 rounded-lg px-3 sm:px-4 py-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 hidden sm:block" />
                  <span className="text-xs sm:text-sm font-medium capitalize">
                    <span className="sm:hidden">{format(currentDateTime, "dd/MM")}</span>
                    <span className="hidden sm:inline">{format(currentDateTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
                  </span>
                </div>
                <div className="w-px h-4 bg-border hidden sm:block" />
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 hidden sm:block" />
                  <span className="text-xs sm:text-sm font-medium tabular-nums">
                    {format(currentDateTime, "HH:mm")}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleHideValues}
                className="h-9 w-9 sm:h-10 sm:w-10"
                title={hideValues ? "Mostrar valores" : "Ocultar valores"}
              >
                {hideValues ? (
                  <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Available Balance Section */}
        <Card 
          className="border-2 border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => navigate("/banks")}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary to-primary-glow p-3 rounded-full">
                <Wallet className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">Saldo Disponível</CardTitle>
              <CardDescription>
                Soma de {banks.filter(b => b.is_active).length} {banks.filter(b => b.is_active).length !== 1 ? 'contas' : 'conta'} {isPersonal ? (banks.filter(b => b.is_active).length !== 1 ? 'pessoais' : 'pessoal') : (banks.filter(b => b.is_active).length !== 1 ? 'empresariais' : 'empresarial')}
              </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-4xl sm:text-5xl font-bold ${availableBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(availableBalance)}
            </p>
            {banks.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Cadastre seus bancos para ver o saldo consolidado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Profile-specific Stats */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentProfile}
            initial={{ opacity: 0, x: isPersonal ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isPersonal ? 20 : -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentData && (
              <ProfileStats
                profile={currentProfile}
                income={hideValues ? 0 : currentData.currentMonthStats.income}
                expenses={hideValues ? 0 : currentData.currentMonthStats.expenses}
                balance={hideValues ? 0 : currentData.currentMonthStats.balance}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Distribution Card + Banks + Reserve */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ProfileSummaryCard
            profile={currentProfile}
            personalIncome={hideValues ? 0 : totals.personalIncome}
            personalExpenses={hideValues ? 0 : totals.personalExpenses}
            businessIncome={hideValues ? 0 : totals.businessIncome}
            businessExpenses={hideValues ? 0 : totals.businessExpenses}
          />

          {/* Banks Summary */}
          <BanksSummaryCard banks={hideValues ? [] : banks} loading={banksLoading} />

          {/* Emergency Reserve Progress */}
          <Card className="border-primary/20 cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate("/emergency-reserve")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Reserva de Emergência
              </CardTitle>
              <CardDescription>
                {reserveData.reserveGoal > 0 
                  ? `${reserveData.reservePercentage.toFixed(0)}% da meta atingida`
                  : "Configure seus custos fixos"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reserveData.reserveGoal > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Atual</span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(reserveData.reserveAmount)}
                    </span>
                  </div>
                  <Progress value={hideValues ? 0 : reserveData.reservePercentage} className="h-3" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Meta</span>
                    <span className="font-semibold">
                      {formatCurrency(reserveData.reserveGoal)}
                    </span>
                  </div>
                  {reserveData.reservePercentage >= 100 ? (
                    <p className="text-xs text-success font-medium text-center">
                      🎉 Parabéns! Meta atingida!
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center">
                      Faltam {formatCurrency(reserveData.reserveGoal - reserveData.reserveAmount)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground mb-2">
                    Cadastre seus custos fixos para calcular a meta
                  </p>
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={(e) => {
                e.stopPropagation();
                navigate("/emergency-reserve");
              }}>
                {reserveData.reserveGoal > 0 ? 'Ver Detalhes' : 'Configurar'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Consolidated Card */}
        {!hideValues && (
          <ConsolidatedCard
            personalIncome={totals.personalIncome}
            personalExpenses={totals.personalExpenses}
            businessIncome={totals.businessIncome}
            businessExpenses={totals.businessExpenses}
            hideValues={hideValues}
          />
        )}

        {/* Smart Indicators */}
        {user && (
          <SmartIndicators userId={user.id} hideValues={hideValues} />
        )}

        {/* Monthly Summary + Cash Flow Chart */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`charts-${currentProfile}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {currentData && !hideValues && (
              <>
                <MonthlySummary 
                  currentMonth={currentData.currentMonthStats}
                  previousMonth={currentData.previousMonthStats}
                  monthName={capitalizedMonthName}
                />
                <CashFlowChart data={currentData.monthlyData} />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Balance Evolution + Category Distribution */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`details-${currentProfile}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {currentData && !hideValues && (
              <>
                <BalanceEvolutionChart data={currentData.balanceEvolution} />
                
                {/* Expenses by Category Pie Chart */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5 text-primary" />
                      Despesas por Categoria
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isPersonal ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                        {isPersonal ? 'Pessoal' : 'Empresarial'}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Distribuição dos seus gastos {isPersonal ? 'pessoais' : 'empresariais'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {currentData.categoryExpenses.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        Nenhuma despesa {isPersonal ? 'pessoal' : 'empresarial'} registrada ainda
                      </div>
                    ) : (
                      <div className="w-full overflow-hidden">
                        <ResponsiveContainer width="100%" height={320}>
                          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <Pie
                              data={currentData.categoryExpenses}
                              cx="50%"
                              cy="40%"
                              labelLine={false}
                              label={({ percent }) => {
                                if (percent < 0.10) return null;
                                return `${(percent * 100).toFixed(0)}%`;
                              }}
                              outerRadius={70}
                              innerRadius={25}
                              fill="#8884d8"
                              dataKey="value"
                              paddingAngle={2}
                            >
                              {currentData.categoryExpenses.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number, name: string) => [
                                `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                                name
                              ]}
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                              }}
                            />
                            <Legend 
                              layout="horizontal"
                              align="center"
                              verticalAlign="bottom"
                              wrapperStyle={{ 
                                paddingTop: '4px',
                                maxWidth: '100%',
                                overflow: 'hidden'
                              }}
                              iconType="circle"
                              iconSize={6}
                              formatter={(value) => {
                                const truncated = value.length > 8 ? value.substring(0, 7) + '…' : value;
                                return <span className="text-[9px] sm:text-[10px] text-foreground">{truncated}</span>;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
