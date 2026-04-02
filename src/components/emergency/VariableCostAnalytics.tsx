import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Lightbulb,
  Calculator
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface FixedCost {
  id: string;
  name: string;
  amount: number;
  is_variable: boolean;
  category_id: string | null;
}

interface MonthlyData {
  month: string;
  monthLabel: string;
  amount: number;
}

interface CostAnalytics {
  costId: string;
  costName: string;
  categoryId: string | null;
  currentAmount: number;
  averageAmount: number;
  monthlyData: MonthlyData[];
  transactionCount: number;
  trend: "up" | "down" | "stable";
  trendPercentage: number;
}

interface VariableCostAnalyticsProps {
  variableCosts: FixedCost[];
  onUpdateCostAmount: (costId: string, newAmount: number) => void;
}

export function VariableCostAnalytics({ variableCosts, onUpdateCostAmount }: VariableCostAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<CostAnalytics[]>([]);
  const [expandedCosts, setExpandedCosts] = useState<Set<string>>(new Set());
  const [monthsToAnalyze] = useState(6);

  useEffect(() => {
    if (variableCosts.length > 0) {
      loadAnalytics();
    } else {
      setLoading(false);
      setAnalytics([]);
    }
  }, [variableCosts]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const analyticsData: CostAnalytics[] = [];

      for (const cost of variableCosts) {
        const monthlyData: MonthlyData[] = [];
        let totalAmount = 0;
        let transactionCount = 0;

        // Analyze last N months
        for (let i = 1; i <= monthsToAnalyze; i++) {
          const targetDate = subMonths(new Date(), i);
          const monthStart = format(startOfMonth(targetDate), "yyyy-MM-dd");
          const monthEnd = format(endOfMonth(targetDate), "yyyy-MM-dd");

          // Search transactions by category_id if available, otherwise fallback to name matching
          let query = supabase
            .from("transactions")
            .select("amount, date, description, category_id")
            .eq("user_id", user.id)
            .eq("type", "expense")
            .gte("date", monthStart)
            .lte("date", monthEnd);

          if (cost.category_id) {
            // Search by category
            query = query.eq("category_id", cost.category_id);
          } else {
            // Fallback to name matching
            query = query.or(`description.ilike.%${cost.name}%,description.ilike.%${cost.name.toLowerCase()}%`);
          }

          const { data: transactions, error } = await query;

          if (error) {
            console.error(`Error fetching transactions for ${cost.name}:`, error);
            continue;
          }

          const monthTotal = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          
          monthlyData.push({
            month: monthStart,
            monthLabel: format(targetDate, "MMM/yy", { locale: ptBR }),
            amount: monthTotal,
          });

          if (monthTotal > 0) {
            totalAmount += monthTotal;
            transactionCount += transactions?.length || 0;
          }
        }

        // Calculate average (only from months with data)
        const monthsWithData = monthlyData.filter(m => m.amount > 0).length;
        const averageAmount = monthsWithData > 0 ? totalAmount / monthsWithData : 0;

        // Calculate trend (comparing recent 3 months vs older 3 months)
        const recentMonths = monthlyData.slice(0, 3).filter(m => m.amount > 0);
        const olderMonths = monthlyData.slice(3).filter(m => m.amount > 0);
        
        const recentAvg = recentMonths.length > 0 
          ? recentMonths.reduce((s, m) => s + m.amount, 0) / recentMonths.length 
          : 0;
        const olderAvg = olderMonths.length > 0 
          ? olderMonths.reduce((s, m) => s + m.amount, 0) / olderMonths.length 
          : 0;

        let trend: "up" | "down" | "stable" = "stable";
        let trendPercentage = 0;

        if (olderAvg > 0 && recentAvg > 0) {
          trendPercentage = ((recentAvg - olderAvg) / olderAvg) * 100;
          if (trendPercentage > 5) trend = "up";
          else if (trendPercentage < -5) trend = "down";
        }

        analyticsData.push({
          costId: cost.id,
          costName: cost.name,
          categoryId: cost.category_id,
          currentAmount: cost.amount,
          averageAmount,
          monthlyData: monthlyData.reverse(), // Chronological order
          transactionCount,
          trend,
          trendPercentage: Math.abs(trendPercentage),
        });
      }

      setAnalytics(analyticsData);
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error("Erro ao carregar análise de gastos");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (costId: string) => {
    setExpandedCosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(costId)) {
        newSet.delete(costId);
      } else {
        newSet.add(costId);
      }
      return newSet;
    });
  };

  const handleApplyAverage = (costId: string, averageAmount: number) => {
    const roundedAmount = Math.round(averageAmount * 100) / 100;
    onUpdateCostAmount(costId, roundedAmount);
    toast.success(`Valor atualizado para R$ ${roundedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (variableCosts.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Análise de Gastos Variáveis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const hasAnyData = analytics.some(a => a.transactionCount > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Análise de Gastos Variáveis
            </CardTitle>
            <CardDescription>
              Média calculada dos últimos {monthsToAnalyze} meses de transações
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAnyData && (
          <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-sm">Nenhum dado histórico encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Para calcular a média, registre transações com descrições que contenham o nome dos seus custos variáveis 
                  (ex: "Conta de Energia", "Energia Elétrica", etc.)
                </p>
              </div>
            </div>
          </div>
        )}

        {analytics.map((item) => (
          <Collapsible
            key={item.costId}
            open={expandedCosts.has(item.costId)}
            onOpenChange={() => toggleExpanded(item.costId)}
          >
            <div className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="font-medium">{item.costName}</span>
                    {item.transactionCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {item.transactionCount} transações
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {item.averageAmount > 0 && (
                      <div className="flex items-center gap-2">
                        {item.trend === "up" && (
                          <TrendingUp className="h-4 w-4 text-danger" />
                        )}
                        {item.trend === "down" && (
                          <TrendingDown className="h-4 w-4 text-success" />
                        )}
                        <span className="text-sm font-semibold text-secondary">
                          Média: R$ {formatCurrency(item.averageAmount)}
                        </span>
                      </div>
                    )}
                    {expandedCosts.has(item.costId) ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-4 border-t bg-muted/20">
                  {item.transactionCount === 0 ? (
                    <p className="text-sm text-muted-foreground py-3">
                      {item.categoryId 
                        ? `Nenhuma transação encontrada na categoria vinculada.`
                        : `Nenhuma transação encontrada com "${item.costName}" na descrição. Vincule uma categoria para melhorar a precisão.`
                      }
                    </p>
                  ) : (
                    <>
                      {/* Comparison */}
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="p-3 bg-background rounded-lg border">
                          <p className="text-xs text-muted-foreground mb-1">Valor Atual (CFE)</p>
                          <p className="text-lg font-bold">R$ {formatCurrency(item.currentAmount)}</p>
                        </div>
                        <div className="p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                          <p className="text-xs text-muted-foreground mb-1">Média Histórica</p>
                          <p className="text-lg font-bold text-secondary">R$ {formatCurrency(item.averageAmount)}</p>
                        </div>
                      </div>

                      {/* Monthly breakdown */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Histórico Mensal</p>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {item.monthlyData.map((month, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded text-center text-sm ${
                                month.amount > 0 ? 'bg-secondary/10' : 'bg-muted/50'
                              }`}
                            >
                              <p className="text-xs text-muted-foreground uppercase">{month.monthLabel}</p>
                              <p className={`font-medium ${month.amount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {month.amount > 0 ? `R$ ${formatCurrency(month.amount)}` : '-'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Trend info */}
                      {item.trend !== "stable" && (
                        <div className={`p-3 rounded-lg flex items-center gap-2 ${
                          item.trend === "up" ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                        }`}>
                          {item.trend === "up" ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span className="text-sm">
                            Tendência de {item.trend === "up" ? "aumento" : "redução"} de {item.trendPercentage.toFixed(1)}%
                          </span>
                        </div>
                      )}

                      {/* Apply average button */}
                      {Math.abs(item.averageAmount - item.currentAmount) > 0.01 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleApplyAverage(item.costId, item.averageAmount)}
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Usar média (R$ {formatCurrency(item.averageAmount)}) como valor do CFE
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
