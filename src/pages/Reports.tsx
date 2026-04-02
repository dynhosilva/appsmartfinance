import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, PieChart as PieChartIcon, List, User, Building2, CalendarDays, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { TransactionsList } from "@/components/TransactionsList";
import { FinancialProfile } from "@/components/dashboard/ProfileSwitcher";
import { ReportFilters, ReportFiltersState, defaultFilters } from "@/components/reports/ReportFilters";
import { YearlyOverview } from "@/components/reports/YearlyOverview";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { useUserPlan } from "@/hooks/useUserPlan";
import { UpgradePrompt } from "@/components/plans/UpgradePrompt";

const Reports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [currentProfile, setCurrentProfile] = useState<FinancialProfile>("personal");
  const [filters, setFilters] = useState<ReportFiltersState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReportFiltersState>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const { loading: planLoading, canUseReports } = useUserPlan();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [currentProfile, appliedFilters]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ ...filters });
  }, [filters]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Build query with filters
      let query = supabase
        .from("transactions")
        .select(`
          *,
          categories (
            name,
            icon,
            color
          )
        `)
        .eq("user_id", user.id)
        .eq("profile_type", currentProfile);

      // Apply category filter
      if (appliedFilters.categories.length > 0) {
        query = query.in("category_id", appliedFilters.categories);
      }

      // Apply transaction type filter
      if (appliedFilters.transactionType !== "all") {
        query = query.eq("type", appliedFilters.transactionType);
      }

      // Apply date filters
      if (appliedFilters.dateFrom) {
        query = query.gte("date", format(appliedFilters.dateFrom, "yyyy-MM-dd"));
      }
      if (appliedFilters.dateTo) {
        query = query.lte("date", format(appliedFilters.dateTo, "yyyy-MM-dd"));
      }

      // Apply amount filters
      if (appliedFilters.minAmount) {
        query = query.gte("amount", parseFloat(appliedFilters.minAmount));
      }
      if (appliedFilters.maxAmount) {
        query = query.lte("amount", parseFloat(appliedFilters.maxAmount));
      }

      const { data: transactions } = await query.order("date", { ascending: false });

      if (transactions) {
        // Group by category
        const categoryMap = new Map();
        transactions.forEach(t => {
          const categoryName = t.categories?.name || "Sem Categoria";
          if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, {
              name: categoryName,
              icon: t.categories?.icon || "📦",
              income: 0,
              expense: 0,
              total: 0
            });
          }
          const category = categoryMap.get(categoryName);
          const amount = parseFloat(t.amount.toString());
          if (t.type === "income") {
            category.income += amount;
            category.total += amount;
          } else {
            category.expense += amount;
            category.total -= amount;
          }
        });

        setCategoryData(Array.from(categoryMap.values()));
      }
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Build query with applied filters
      let query = supabase
        .from("transactions")
        .select(`
          *,
          categories (name, icon),
          banks (name)
        `)
        .eq("user_id", user.id)
        .eq("profile_type", currentProfile);

      // Apply same filters as the report view
      if (appliedFilters.categories.length > 0) {
        query = query.in("category_id", appliedFilters.categories);
      }
      if (appliedFilters.transactionType !== "all") {
        query = query.eq("type", appliedFilters.transactionType);
      }
      if (appliedFilters.dateFrom) {
        query = query.gte("date", format(appliedFilters.dateFrom, "yyyy-MM-dd"));
      }
      if (appliedFilters.dateTo) {
        query = query.lte("date", format(appliedFilters.dateTo, "yyyy-MM-dd"));
      }
      if (appliedFilters.minAmount) {
        query = query.gte("amount", parseFloat(appliedFilters.minAmount));
      }
      if (appliedFilters.maxAmount) {
        query = query.lte("amount", parseFloat(appliedFilters.maxAmount));
      }

      const { data: transactions } = await query.order("date", { ascending: false });

      if (!transactions || transactions.length === 0) {
        toast.error("Nenhuma transação para exportar");
        return;
      }

      const profileLabel = currentProfile === "personal" ? "Pessoal" : "Empresarial";
      const exportDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm");

      // Calculate totals
      let totalIncome = 0;
      let totalExpense = 0;
      transactions.forEach(t => {
        const amount = parseFloat(t.amount.toString());
        if (t.type === "income") {
          totalIncome += amount;
        } else {
          totalExpense += amount;
        }
      });
      const balance = totalIncome - totalExpense;

      // Format currency
      const formatCurrency = (value: number) => 
        value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // Format date
      const formatDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
      };

      // Build CSV content with proper formatting
      const csvLines: string[] = [];
      
      // Header section
      csvLines.push("RELATÓRIO FINANCEIRO - SMARTFINANCE");
      csvLines.push(`Perfil: ${profileLabel}`);
      csvLines.push(`Exportado em: ${exportDate}`);
      csvLines.push(`Total de transações: ${transactions.length}`);
      csvLines.push("");
      
      // Filter info if any filters applied
      const hasFilters = appliedFilters.categories.length > 0 || 
        appliedFilters.transactionType !== "all" || 
        appliedFilters.dateFrom || 
        appliedFilters.dateTo || 
        appliedFilters.minAmount || 
        appliedFilters.maxAmount;
      
      if (hasFilters) {
        csvLines.push("FILTROS APLICADOS:");
        if (appliedFilters.dateFrom || appliedFilters.dateTo) {
          const from = appliedFilters.dateFrom ? format(appliedFilters.dateFrom, "dd/MM/yyyy") : "Início";
          const to = appliedFilters.dateTo ? format(appliedFilters.dateTo, "dd/MM/yyyy") : "Hoje";
          csvLines.push(`Período: ${from} a ${to}`);
        }
        if (appliedFilters.transactionType !== "all") {
          csvLines.push(`Tipo: ${appliedFilters.transactionType === "income" ? "Receitas" : "Despesas"}`);
        }
        if (appliedFilters.minAmount || appliedFilters.maxAmount) {
          const min = appliedFilters.minAmount ? `R$ ${appliedFilters.minAmount}` : "0";
          const max = appliedFilters.maxAmount ? `R$ ${appliedFilters.maxAmount}` : "Sem limite";
          csvLines.push(`Valor: ${min} a ${max}`);
        }
        csvLines.push("");
      }

      // Summary section
      csvLines.push("RESUMO");
      csvLines.push(`Total de Receitas:,"R$ ${formatCurrency(totalIncome)}"`);
      csvLines.push(`Total de Despesas:,"R$ ${formatCurrency(totalExpense)}"`);
      csvLines.push(`Saldo:,"R$ ${formatCurrency(balance)}"`);
      csvLines.push("");
      csvLines.push("");

      // Transactions header
      csvLines.push("TRANSAÇÕES DETALHADAS");
      csvLines.push("Data,Hora de Registro,Tipo,Valor,Categoria,Meio de Pagamento,Descrição");
      
      // Transaction rows
      transactions.forEach(t => {
        const createdTime = t.created_at ? format(new Date(t.created_at), "HH:mm:ss") : "";
        const row = [
          formatDate(t.date),
          createdTime,
          t.type === "income" ? "Receita" : "Despesa",
          `R$ ${formatCurrency(parseFloat(t.amount.toString()))}`,
          t.categories?.name || "Sem Categoria",
          t.banks?.name || "Dinheiro",
          (t.description || "").replace(/"/g, '""') // Escape quotes
        ];
        csvLines.push(row.map(cell => `"${cell}"`).join(","));
      });

      // Footer
      csvLines.push("");
      csvLines.push("");
      csvLines.push("---");
      csvLines.push("Gerado automaticamente pelo SmartFinance");

      const csvContent = csvLines.join("\n");

      // Download file with BOM for Excel compatibility
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const fileName = `SmartFinance_${profileLabel}_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Relatório exportado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao exportar: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  // If reports are not enabled for this plan, show upgrade prompt (only after plan loaded)
  if (!planLoading && !canUseReports()) {
    return (
      <AppLayout title="Relatórios">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PieChartIcon className="h-6 w-6 text-primary" />
              Relatórios
            </h1>
            <p className="text-muted-foreground">
              Análise detalhada das suas finanças
            </p>
          </div>
          
          <UpgradePrompt 
            feature="Relatórios Financeiros"
            description="Acesse relatórios detalhados, análises por categoria, exportação para CSV e muito mais. Tenha uma visão completa das suas finanças."
            requiredPlan="pro"
            benefits={["Relatórios inteligentes", "Exportação PDF/Excel", "Projeção de fluxo de caixa", "Planejamento mensal"]}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      showProfileSwitcher
      currentProfile={currentProfile}
      onProfileChange={setCurrentProfile}
      title="Relatórios"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PieChartIcon className="h-6 w-6 text-primary" />
              Relatórios
            </h1>
            <p className="text-muted-foreground">
              Análise detalhada das suas finanças
            </p>
          </div>
          <Button 
            onClick={exportToCSV}
            className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 shrink-0"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Filters */}
        <ReportFilters
          profileType={currentProfile}
          filters={filters}
          onFiltersChange={setFilters}
          onApplyFilters={handleApplyFilters}
        />

        <Tabs defaultValue="yearly" className="space-y-6 mt-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="yearly" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Anual
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-2">
              <PieChartIcon className="h-4 w-4" />
              Resumo
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <List className="h-4 w-4" />
              Transações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="yearly">
            <YearlyOverview />
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            {/* Summary by Category */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Resumo por Categoria</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Visão geral das suas transações agrupadas por categoria
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {categoryData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    Nenhuma transação registrada ainda
                  </p>
                ) : (
                  <div className="space-y-3">
                    {categoryData.map((category, index) => (
                      <div 
                        key={index}
                        className="p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        {/* Top Row: Icon + Name + Total */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="text-xl shrink-0">{category.icon}</div>
                            <p className="font-semibold text-sm truncate">{category.name}</p>
                          </div>
                          <p className={`text-base font-bold whitespace-nowrap shrink-0 ${
                            category.total >= 0 ? "text-success" : "text-danger"
                          }`}>
                            {category.total >= 0 ? "+" : "-"}R$ {Math.abs(category.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        {/* Bottom Row: Income + Expense */}
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1 ml-8">
                          <span className="text-success">
                            Receita: R$ {category.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-danger">
                            Despesa: R$ {category.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Exportar Dados</CardTitle>
                <CardDescription>
                  Faça backup dos seus dados financeiros
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={exportToCSV}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar todas as transações (CSV)
                </Button>
                <p className="text-sm text-muted-foreground">
                  O arquivo CSV pode ser aberto no Excel, Google Sheets ou qualquer editor de planilhas.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transações Filtradas</CardTitle>
                <CardDescription>
                  {appliedFilters.categories.length > 0 || appliedFilters.transactionType !== "all" || appliedFilters.dateFrom || appliedFilters.dateTo || appliedFilters.minAmount || appliedFilters.maxAmount
                    ? "Exibindo transações com base nos filtros aplicados"
                    : "Edite ou exclua suas transações"}
                </CardDescription>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por descrição..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <TransactionsList 
                  profileType={currentProfile} 
                  filters={{
                    categories: appliedFilters.categories,
                    transactionType: appliedFilters.transactionType,
                    dateFrom: appliedFilters.dateFrom,
                    dateTo: appliedFilters.dateTo,
                    minAmount: appliedFilters.minAmount,
                    maxAmount: appliedFilters.maxAmount,
                  }}
                  searchQuery={searchQuery}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reports;