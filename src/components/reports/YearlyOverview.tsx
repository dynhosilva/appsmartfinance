import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, TrendingUp, TrendingDown, ChevronDown, ChevronRight, User, Building2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  date: string;
  description: string | null;
  profile_type: "personal" | "business";
  categories: {
    name: string;
    icon: string;
    color: string;
  } | null;
  banks: {
    name: string;
  } | null;
}

interface MonthData {
  month: number;
  monthName: string;
  personal: {
    income: number;
    expenses: number;
    balance: number;
    transactions: Transaction[];
    topCategories: { name: string; icon: string; value: number }[];
  };
  business: {
    income: number;
    expenses: number;
    balance: number;
    transactions: Transaction[];
    topCategories: { name: string; icon: string; value: number }[];
  };
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function YearlyOverview() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthsData, setMonthsData] = useState<MonthData[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<number[]>([new Date().getMonth()]);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    loadYearData();
  }, [selectedYear]);

  const loadYearData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      const { data: transactions } = await supabase
        .from("transactions")
        .select(`
          id, amount, type, date, description, profile_type,
          categories (name, icon, color),
          banks (name)
        `)
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      const monthsMap: MonthData[] = MONTHS.map((monthName, index) => ({
        month: index,
        monthName,
        personal: { income: 0, expenses: 0, balance: 0, transactions: [], topCategories: [] },
        business: { income: 0, expenses: 0, balance: 0, transactions: [], topCategories: [] },
      }));

      if (transactions) {
        transactions.forEach((t: Transaction) => {
          const monthIndex = parseISO(t.date).getMonth();
          const monthData = monthsMap[monthIndex];
          const profileData = t.profile_type === "personal" ? monthData.personal : monthData.business;
          const amount = parseFloat(t.amount.toString());

          profileData.transactions.push(t);
          if (t.type === "income") {
            profileData.income += amount;
          } else {
            profileData.expenses += amount;
          }
        });

        // Calculate balances and top categories for each month
        monthsMap.forEach(month => {
          ["personal", "business"].forEach(profileType => {
            const profile = month[profileType as "personal" | "business"];
            profile.balance = profile.income - profile.expenses;

            // Calculate top categories for expenses
            const categoryMap = new Map<string, { name: string; icon: string; value: number }>();
            profile.transactions
              .filter(t => t.type === "expense")
              .forEach(t => {
                const catName = t.categories?.name || "Sem Categoria";
                const catIcon = t.categories?.icon || "📦";
                const amount = parseFloat(t.amount.toString());
                
                if (categoryMap.has(catName)) {
                  categoryMap.get(catName)!.value += amount;
                } else {
                  categoryMap.set(catName, { name: catName, icon: catIcon, value: amount });
                }
              });

            profile.topCategories = Array.from(categoryMap.values())
              .sort((a, b) => b.value - a.value)
              .slice(0, 3);
          });
        });
      }

      setMonthsData(monthsMap);
    } catch (error) {
      console.error("Error loading year data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMonth = (month: number) => {
    setExpandedMonths(prev =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderProfileSection = (
    profileData: MonthData["personal"],
    profileType: "personal" | "business",
    monthIndex: number
  ) => {
    const hasData = profileData.transactions.length > 0;
    const isPersonal = profileType === "personal";

    return (
      <div className={`p-4 rounded-lg border ${isPersonal ? 'border-primary/20 bg-primary/5' : 'border-secondary/20 bg-secondary/5'}`}>
        <div className="flex items-center gap-2 mb-3">
          {isPersonal ? (
            <User className="h-4 w-4 text-primary" />
          ) : (
            <Building2 className="h-4 w-4 text-secondary" />
          )}
          <span className="font-medium text-sm">{isPersonal ? 'Pessoal' : 'Empresarial'}</span>
        </div>

        {!hasData ? (
          <p className="text-xs text-muted-foreground">Nenhuma movimentação</p>
        ) : (
          <div className="space-y-3">
            {/* Summary Row */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Receitas</p>
                <p className="font-medium text-success">{formatCurrency(profileData.income)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Despesas</p>
                <p className="font-medium text-danger">{formatCurrency(profileData.expenses)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`font-bold ${profileData.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(profileData.balance)}
                </p>
              </div>
            </div>

            {/* Top Categories */}
            {profileData.topCategories.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Maiores gastos:</p>
                <div className="flex flex-wrap gap-1">
                  {profileData.topCategories.map((cat, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {cat.icon} {cat.name}: {formatCurrency(cat.value)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction Count */}
            <p className="text-xs text-muted-foreground">
              {profileData.transactions.length} transação(ões)
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Calculate year totals
  const yearTotals = {
    personal: { income: 0, expenses: 0, balance: 0 },
    business: { income: 0, expenses: 0, balance: 0 },
  };
  monthsData.forEach(m => {
    yearTotals.personal.income += m.personal.income;
    yearTotals.personal.expenses += m.personal.expenses;
    yearTotals.business.income += m.business.income;
    yearTotals.business.expenses += m.business.expenses;
  });
  yearTotals.personal.balance = yearTotals.personal.income - yearTotals.personal.expenses;
  yearTotals.business.balance = yearTotals.business.income - yearTotals.business.expenses;

  return (
    <div className="space-y-6">
      {/* Header with Year Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Resumo Anual</h2>
        </div>
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year Summary Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Totais de {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Totals */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium">Pessoal</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Receitas</p>
                  <p className="font-medium text-success">{formatCurrency(yearTotals.personal.income)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Despesas</p>
                  <p className="font-medium text-danger">{formatCurrency(yearTotals.personal.expenses)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className={`font-bold ${yearTotals.personal.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(yearTotals.personal.balance)}
                  </p>
                </div>
              </div>
            </div>

            {/* Business Totals */}
            <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-secondary" />
                <span className="font-medium">Empresarial</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Receitas</p>
                  <p className="font-medium text-success">{formatCurrency(yearTotals.business.income)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Despesas</p>
                  <p className="font-medium text-danger">{formatCurrency(yearTotals.business.expenses)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className={`font-bold ${yearTotals.business.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(yearTotals.business.balance)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      <div className="space-y-3">
        {monthsData.map((monthData) => {
          const isExpanded = expandedMonths.includes(monthData.month);
          const hasPersonalData = monthData.personal.transactions.length > 0;
          const hasBusinessData = monthData.business.transactions.length > 0;
          const hasAnyData = hasPersonalData || hasBusinessData;
          const totalBalance = monthData.personal.balance + monthData.business.balance;

          return (
            <Collapsible key={monthData.month} open={isExpanded}>
              <Card className={`transition-all ${isExpanded ? 'border-primary/30' : 'border-border'}`}>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => toggleMonth(monthData.month)}
                >
                  <CardHeader className="py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{monthData.monthName}</span>
                        {!hasAnyData && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Sem movimentações
                          </Badge>
                        )}
                      </div>
                      {hasAnyData && (
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`font-medium ${totalBalance >= 0 ? 'text-success' : 'text-danger'}`}>
                            {totalBalance >= 0 ? <TrendingUp className="h-4 w-4 inline mr-1" /> : <TrendingDown className="h-4 w-4 inline mr-1" />}
                            {formatCurrency(totalBalance)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <AnimatePresence>
                  {isExpanded && (
                    <CollapsibleContent forceMount>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CardContent className="pt-0 pb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderProfileSection(monthData.personal, "personal", monthData.month)}
                            {renderProfileSection(monthData.business, "business", monthData.month)}
                          </div>
                        </CardContent>
                      </motion.div>
                    </CollapsibleContent>
                  )}
                </AnimatePresence>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
