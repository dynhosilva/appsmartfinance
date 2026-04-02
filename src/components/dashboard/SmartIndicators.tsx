import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Activity, Brain, Minus, PiggyBank, CreditCard, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useUserPlan } from "@/hooks/useUserPlan";
import { UpgradePrompt } from "@/components/plans/UpgradePrompt";
import { Skeleton } from "@/components/ui/skeleton";

interface Indicator {
  id: string;
  title: string;
  value: number;
  status: "healthy" | "warning" | "critical" | "neutral";
  message: string;
  icon: React.ReactNode;
  requiredPlan: "pro" | "pro_plus";
}

interface SmartIndicatorsProps {
  userId: string;
  hideValues?: boolean;
}

export function SmartIndicators({ userId, hideValues = false }: SmartIndicatorsProps) {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const { canUseSplit, plan } = useUserPlan();

  const isPro = plan.plan_type === "pro" || plan.plan_type === "pro_plus" || plan.plan_type === "business";
  const isProPlus = plan.plan_type === "pro_plus" || plan.plan_type === "business";

  const formatCurrency = useCallback((value: number) => {
    if (hideValues) return "••••••";
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }, [hideValues]);

  const loadIndicators = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const results: Indicator[] = [];

      // ── INDICATOR 1: Financial Protection Level (Pro) ──
      if (isPro) {
        const [{ data: emergencyGoal }, { data: fixedCosts }] = await Promise.all([
          supabase.from("emergency_goals").select("current_amount, target_months").eq("user_id", userId).maybeSingle(),
          supabase.from("fixed_costs").select("amount").eq("user_id", userId),
        ]);

        const reserveAmount = Number(emergencyGoal?.current_amount ?? 0);
        const monthlyFixed = (fixedCosts ?? []).reduce((s, c) => s + Number(c.amount), 0);
        const sixMonthCost = monthlyFixed * 6;
        const protection = sixMonthCost > 0 ? Math.min((reserveAmount / sixMonthCost) * 100, 100) : 0;
        const missing = Math.max(sixMonthCost - reserveAmount, 0);

        let status: Indicator["status"] = "critical";
        let statusLabel = "Alerta crítico";
        if (protection >= 100) { status = "healthy"; statusLabel = "Proteção completa"; }
        else if (protection >= 80) { status = "healthy"; statusLabel = "Quase protegido"; }
        else if (protection >= 50) { status = "warning"; statusLabel = "Em construção"; }

        let message: string;
        if (monthlyFixed === 0) {
          message = "Cadastre seus custos fixos para calcular sua proteção.";
          status = "neutral";
        } else if (protection >= 100) {
          message = "Parabéns! Você tem 6 meses de segurança financeira.";
        } else {
          message = `Você está ${protection.toFixed(0)}% protegido. Faltam ${formatCurrency(missing)} para completar 6 meses de segurança.`;
        }

        results.push({
          id: "protection",
          title: "Nível de Proteção",
          value: Math.round(protection),
          status,
          message,
          icon: <Shield className="h-5 w-5" />,
          requiredPlan: "pro",
        });
      }

      // ── INDICATOR 2: Variable Income Dependency (Pro Plus) ──
      if (isProPlus) {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const dateStr = threeMonthsAgo.toISOString().split("T")[0];

        const { data: incomeTxns } = await supabase
          .from("transactions")
          .select("amount, income_type")
          .eq("user_id", userId)
          .eq("type", "income")
          .gte("date", dateStr);

        const allIncome = (incomeTxns ?? []);
        const totalIncome = allIncome.reduce((s, t) => s + Number(t.amount), 0);
        const variableIncome = allIncome.filter(t => t.income_type === "variable").reduce((s, t) => s + Number(t.amount), 0);
        const dependency = totalIncome > 0 ? (variableIncome / totalIncome) * 100 : 0;

        const hasClassified = allIncome.some(t => t.income_type);

        let status: Indicator["status"] = "healthy";
        let message: string;

        if (!hasClassified) {
          status = "neutral";
          message = "Classifique suas receitas como fixa ou variável nas transações para ativar este indicador.";
        } else if (dependency > 50) {
          status = "critical";
          message = `Sua dependência de renda variável está em ${dependency.toFixed(0)}%. Considere fortalecer sua base fixa.`;
        } else if (dependency > 30) {
          status = "warning";
          message = `Dependência moderada (${dependency.toFixed(0)}%). Bom equilíbrio, mas há espaço para melhorar.`;
        } else {
          message = `Dependência saudável (${dependency.toFixed(0)}%). Sua base de renda fixa está sólida.`;
        }

        results.push({
          id: "variable_income",
          title: "Dependência de Renda Variável",
          value: Math.round(dependency),
          status,
          message,
          icon: <Activity className="h-5 w-5" />,
          requiredPlan: "pro_plus",
        });
      }

      // ── INDICATOR 3: Fixed Cost Variation (Pro) ──
      if (isPro) {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];

        const [{ data: currentTxns }, { data: prevTxns }] = await Promise.all([
          supabase.from("transactions").select("amount").eq("user_id", userId).eq("type", "expense").gte("date", currentMonthStart).lte("date", currentMonthEnd),
          supabase.from("transactions").select("amount").eq("user_id", userId).eq("type", "expense").gte("date", prevMonthStart).lte("date", prevMonthEnd),
        ]);

        const currentTotal = (currentTxns ?? []).reduce((s, t) => s + Number(t.amount), 0);
        const prevTotal = (prevTxns ?? []).reduce((s, t) => s + Number(t.amount), 0);

        let variation = 0;
        if (prevTotal > 0) {
          variation = ((currentTotal - prevTotal) / prevTotal) * 100;
        }

        let status: Indicator["status"] = "neutral";
        let message: string;

        if (prevTotal === 0 && currentTotal === 0) {
          message = "Sem dados suficientes para comparar meses.";
        } else if (prevTotal === 0) {
          message = `Despesas deste mês: ${formatCurrency(currentTotal)}. Sem dados do mês anterior para comparação.`;
        } else if (variation > 10) {
          status = "critical";
          message = `Seus gastos aumentaram ${variation.toFixed(0)}% em relação ao mês anterior. Atenção!`;
        } else if (variation < -5) {
          status = "healthy";
          message = `Ótimo! Seus gastos reduziram ${Math.abs(variation).toFixed(0)}% em relação ao mês anterior.`;
        } else {
          status = variation >= 0 ? "warning" : "healthy";
          message = `Variação de ${variation >= 0 ? "+" : ""}${variation.toFixed(0)}% nos gastos. Estável.`;
        }

        results.push({
          id: "cost_variation",
          title: "Variação de Gastos",
          value: Math.round(Math.abs(variation)),
          status,
          message,
          icon: variation > 0 ? <TrendingUp className="h-5 w-5" /> : variation < 0 ? <TrendingDown className="h-5 w-5" /> : <Minus className="h-5 w-5" />,
          requiredPlan: "pro",
        });
      }

      // ── INDICATOR 4: Savings Rate (Pro) ──
      if (isPro) {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

        const [{ data: incTxns }, { data: expTxns }] = await Promise.all([
          supabase.from("transactions").select("amount").eq("user_id", userId).eq("type", "income").gte("date", currentMonthStart).lte("date", currentMonthEnd),
          supabase.from("transactions").select("amount").eq("user_id", userId).eq("type", "expense").gte("date", currentMonthStart).lte("date", currentMonthEnd),
        ]);

        const monthIncome = (incTxns ?? []).reduce((s, t) => s + Number(t.amount), 0);
        const monthExpense = (expTxns ?? []).reduce((s, t) => s + Number(t.amount), 0);
        const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0;

        let status: Indicator["status"] = "neutral";
        let message: string;

        if (monthIncome === 0) {
          message = "Registre receitas neste mês para calcular sua taxa de poupança.";
        } else if (savingsRate >= 30) {
          status = "healthy";
          message = `Excelente! Você está poupando ${savingsRate.toFixed(0)}% da sua renda. Acima dos 20% recomendados.`;
        } else if (savingsRate >= 10) {
          status = "warning";
          message = `Você está poupando ${savingsRate.toFixed(0)}% da renda. Tente chegar a 20% para uma saúde financeira ideal.`;
        } else if (savingsRate >= 0) {
          status = "critical";
          message = `Taxa de poupança de apenas ${savingsRate.toFixed(0)}%. Reavalie seus gastos para aumentar sua margem.`;
        } else {
          status = "critical";
          message = `Você está gastando ${Math.abs(savingsRate).toFixed(0)}% a mais do que ganha este mês. Cuidado!`;
        }

        results.push({
          id: "savings_rate",
          title: "Taxa de Poupança",
          value: Math.max(Math.round(savingsRate), 0),
          status,
          message,
          icon: <PiggyBank className="h-5 w-5" />,
          requiredPlan: "pro",
        });
      }

      // ── INDICATOR 5: Debt Commitment (Pro) ──
      if (isPro) {
        const [{ data: debtsData }, { data: incomeLast3 }] = await Promise.all([
          supabase.from("debts").select("minimum_payment").eq("user_id", userId).eq("status", "active"),
          (() => {
            const d = new Date(); d.setMonth(d.getMonth() - 3);
            return supabase.from("transactions").select("amount").eq("user_id", userId).eq("type", "income").gte("date", d.toISOString().split("T")[0]);
          })(),
        ]);

        const monthlyDebtPayment = (debtsData ?? []).reduce((s, d) => s + Number(d.minimum_payment ?? 0), 0);
        const avgMonthlyIncome = (incomeLast3 ?? []).reduce((s, t) => s + Number(t.amount), 0) / 3;
        const debtRatio = avgMonthlyIncome > 0 ? (monthlyDebtPayment / avgMonthlyIncome) * 100 : 0;

        let status: Indicator["status"] = "neutral";
        let message: string;

        if (monthlyDebtPayment === 0) {
          status = "healthy";
          message = "Você não possui dívidas ativas. Parabéns pela liberdade financeira!";
        } else if (avgMonthlyIncome === 0) {
          message = "Registre receitas para calcular o comprometimento com dívidas.";
        } else if (debtRatio > 30) {
          status = "critical";
          message = `${debtRatio.toFixed(0)}% da sua renda está comprometida com dívidas. O ideal é abaixo de 30%.`;
        } else if (debtRatio > 15) {
          status = "warning";
          message = `${debtRatio.toFixed(0)}% da renda comprometida. Nível moderado, mas fique atento.`;
        } else {
          status = "healthy";
          message = `Apenas ${debtRatio.toFixed(0)}% da renda comprometida com dívidas. Nível saudável!`;
        }

        results.push({
          id: "debt_commitment",
          title: "Comprometimento com Dívidas",
          value: Math.round(debtRatio),
          status,
          message,
          icon: <CreditCard className="h-5 w-5" />,
          requiredPlan: "pro",
        });
      }

      // ── INDICATOR 6: Wealth Growth (Pro Plus) ──
      if (isProPlus) {
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split("T")[0];
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split("T")[0];

        const [{ data: recent }, { data: older }] = await Promise.all([
          supabase.from("transactions").select("amount, type").eq("user_id", userId).gte("date", threeMonthsAgo),
          supabase.from("transactions").select("amount, type").eq("user_id", userId).gte("date", sixMonthsAgo).lt("date", threeMonthsAgo),
        ]);

        const netRecent = (recent ?? []).reduce((s, t) => s + (t.type === "income" ? Number(t.amount) : -Number(t.amount)), 0);
        const netOlder = (older ?? []).reduce((s, t) => s + (t.type === "income" ? Number(t.amount) : -Number(t.amount)), 0);

        let growth = 0;
        if (netOlder !== 0) {
          growth = ((netRecent - netOlder) / Math.abs(netOlder)) * 100;
        }

        let status: Indicator["status"] = "neutral";
        let message: string;

        if ((recent ?? []).length === 0 && (older ?? []).length === 0) {
          message = "Sem dados suficientes. Continue registrando transações para acompanhar seu crescimento.";
        } else if (netOlder === 0) {
          message = netRecent > 0
            ? `Saldo líquido positivo de ${formatCurrency(netRecent)} nos últimos 3 meses.`
            : `Saldo líquido negativo nos últimos 3 meses. Revise seus gastos.`;
          status = netRecent > 0 ? "healthy" : "critical";
        } else if (growth > 10) {
          status = "healthy";
          message = `Crescimento de ${growth.toFixed(0)}% no saldo líquido comparado ao trimestre anterior. Ótima evolução!`;
        } else if (growth >= 0) {
          status = "warning";
          message = `Crescimento de ${growth.toFixed(0)}%. Estável, mas há espaço para acelerar.`;
        } else {
          status = "critical";
          message = `Retração de ${Math.abs(growth).toFixed(0)}% no saldo líquido. Analise o que mudou nos últimos meses.`;
        }

        results.push({
          id: "wealth_growth",
          title: "Crescimento Patrimonial",
          value: Math.round(Math.abs(growth)),
          status,
          message,
          icon: <BarChart3 className="h-5 w-5" />,
          requiredPlan: "pro_plus",
        });
      }

      setIndicators(results);
    } catch (error) {
      console.error("Error loading smart indicators:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, isPro, isProPlus, formatCurrency]);

  useEffect(() => {
    loadIndicators();
  }, [loadIndicators]);

  // Not available for starter
  if (!isPro) {
    return (
      <UpgradePrompt
        feature="Indicadores Inteligentes"
        description="Receba insights personalizados sobre sua saúde financeira com análise automática dos seus dados."
        requiredPlan="pro"
        benefits={[
          "Nível de proteção financeira",
          "Variação de gastos mensais",
          "Dependência de renda variável (Pro Plus)",
          "Análise automática e personalizada",
        ]}
      />
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Indicadores Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    healthy: { color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", badge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300", label: "Saudável", icon: <CheckCircle className="h-4 w-4" /> },
    warning: { color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", badge: "bg-amber-500/20 text-amber-700 dark:text-amber-300", label: "Atenção", icon: <AlertTriangle className="h-4 w-4" /> },
    critical: { color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", badge: "bg-red-500/20 text-red-700 dark:text-red-300", label: "Alerta", icon: <AlertTriangle className="h-4 w-4" /> },
    neutral: { color: "bg-muted/50 text-muted-foreground border-border", badge: "bg-muted text-muted-foreground", label: "Info", icon: <Minus className="h-4 w-4" /> },
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Indicadores Inteligentes
        </CardTitle>
        <CardDescription>Análise automática da sua saúde financeira</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {indicators.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum indicador disponível. Cadastre transações e custos fixos para gerar insights.
          </p>
        ) : (
          indicators.map((indicator, i) => {
            const config = statusConfig[indicator.status];
            return (
              <motion.div
                key={indicator.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-lg border p-4 ${config.color}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">{indicator.icon}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{indicator.title}</h4>
                        <Badge className={`text-[10px] px-1.5 py-0 ${config.badge} border-0`}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                      </div>
                      <p className="text-xs mt-1 opacity-90 leading-relaxed">{indicator.message}</p>
                    </div>
                  </div>
                  {indicator.status !== "neutral" && (
                    <span className="text-2xl font-bold tabular-nums flex-shrink-0">
                      {hideValues ? "••" : `${indicator.value}%`}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })
        )}

        {isPro && !isProPlus && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Faça upgrade para <span className="font-semibold text-primary">Pro Plus</span> e desbloqueie o indicador de dependência de renda variável.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
