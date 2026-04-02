import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight, User, Briefcase } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

interface ConsolidatedCardProps {
  personalIncome: number;
  personalExpenses: number;
  businessIncome: number;
  businessExpenses: number;
  hideValues?: boolean;
}

const ConsolidatedCard = ({
  personalIncome,
  personalExpenses,
  businessIncome,
  businessExpenses,
  hideValues = false,
}: ConsolidatedCardProps) => {
  const totalIncome = personalIncome + businessIncome;
  const totalExpenses = personalExpenses + businessExpenses;
  const totalBalance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((totalBalance / totalIncome) * 100) : 0;

  const personalBalance = personalIncome - personalExpenses;
  const businessBalance = businessIncome - businessExpenses;

  const formatCurrency = (value: number) => {
    if (hideValues) return "••••••";
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatCompact = (value: number) => {
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toFixed(0);
  };

  const getSavingsColor = () => {
    if (savingsRate >= 30) return "text-emerald-500";
    if (savingsRate >= 10) return "text-yellow-500";
    return "text-destructive";
  };

  const getSavingsMessage = () => {
    if (savingsRate >= 30) return "Excelente! Você está poupando bem.";
    if (savingsRate >= 10) return "Bom, mas tente aumentar sua poupança.";
    if (savingsRate >= 0) return "Atenção: margem de poupança baixa.";
    return "Alerta: gastos superaram receitas!";
  };

  const chartData = [
    { name: "Receitas", Pessoal: personalIncome, Empresarial: businessIncome, color: '#22c55e', colorLight: '#86efac' },
    { name: "Despesas", Pessoal: personalExpenses, Empresarial: businessExpenses, color: '#ef4444', colorLight: '#fca5a5' },
    { name: "Saldo", Pessoal: personalBalance, Empresarial: businessBalance, color: '#34d399', colorLight: '#a7f3d0' },
  ];

  return (
    <Card className="border-accent/30 bg-gradient-to-br from-accent/5 via-background to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="bg-accent/10 p-2 rounded-full">
            <Wallet className="h-5 w-5 text-accent-foreground" />
          </div>
          Visão Consolidada
        </CardTitle>
        <CardDescription>
          Pessoal + Empresarial no mês atual
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Summary Row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-emerald-500/10 rounded-lg p-2 sm:p-3 text-center space-y-0.5 sm:space-y-1">
            <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 mx-auto" />
            <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Receitas</p>
            <p className="text-[11px] sm:text-sm font-bold text-emerald-500 break-all leading-tight">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-destructive/10 rounded-lg p-2 sm:p-3 text-center space-y-0.5 sm:space-y-1">
            <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive mx-auto" />
            <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Despesas</p>
            <p className="text-[11px] sm:text-sm font-bold text-destructive break-all leading-tight">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className={`${totalBalance >= 0 ? 'bg-primary/10' : 'bg-destructive/10'} rounded-lg p-2 sm:p-3 text-center space-y-0.5 sm:space-y-1`}>
            {totalBalance >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mx-auto" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive mx-auto" />
            )}
            <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Saldo</p>
            <p className={`text-[11px] sm:text-sm font-bold break-all leading-tight ${totalBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(totalBalance)}
            </p>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Taxa de Poupança</span>
            </div>
            <span className={`text-sm font-bold ${hideValues ? '' : getSavingsColor()}`}>
              {hideValues ? "••••" : `${savingsRate.toFixed(1)}%`}
            </span>
          </div>
          {!hideValues && (
            <p className="text-xs text-muted-foreground">{getSavingsMessage()}</p>
          )}
        </div>

        {/* Profile Breakdown */}
        {!hideValues && (totalIncome > 0 || totalExpenses > 0) && (
          <>
            <div className="border-t border-border" />

            {/* Profile cards side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-muted/30 rounded-lg p-2.5 sm:p-3 space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-sky-400" />
                  <span className="text-xs font-semibold text-sky-400">Pessoal</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receitas</span>
                    <span className="text-emerald-500 font-medium">{formatCurrency(personalIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Despesas</span>
                    <span className="text-destructive font-medium">{formatCurrency(personalExpenses)}</span>
                  </div>
                  <div className="border-t border-border pt-1 flex justify-between">
                    <span className="font-medium">Saldo</span>
                    <span className={`font-bold ${personalBalance >= 0 ? 'text-sky-400' : 'text-destructive'}`}>
                      {formatCurrency(personalBalance)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-2.5 sm:p-3 space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-400">Empresarial</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receitas</span>
                    <span className="text-emerald-500 font-medium">{formatCurrency(businessIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Despesas</span>
                    <span className="text-destructive font-medium">{formatCurrency(businessExpenses)}</span>
                  </div>
                  <div className="border-t border-border pt-1 flex justify-between">
                    <span className="font-medium">Saldo</span>
                    <span className={`font-bold ${businessBalance >= 0 ? 'text-indigo-400' : 'text-destructive'}`}>
                      {formatCurrency(businessBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <p className="text-xs font-medium text-muted-foreground">Comparativo visual</p>
            <div className="bg-muted/20 rounded-lg p-2">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -5, bottom: 0 }}
                  maxBarSize={18}
                  barGap={4}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/50" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                    tickFormatter={(v) => formatCompact(v)}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const labelColors: Record<string, string> = {
                        'Receitas': '#22c55e',
                        'Despesas': '#ef4444',
                        'Saldo': '#34d399',
                      };
                      return (
                        <div style={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                          padding: '8px 12px',
                        }}>
                          <p style={{ color: labelColors[label] || 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '4px' }}>
                            {label}
                          </p>
                          {payload.map((entry, i) => {
                            const nameColor = entry.name === 'Pessoal' ? '#38bdf8' : '#818cf8';
                            return (
                              <p key={i} style={{ margin: '2px 0' }}>
                                <span style={{ color: nameColor, fontWeight: 500 }}>{entry.name}</span>
                                <span style={{ color: 'hsl(var(--foreground))' }}>
                                  {`: R$ ${Number(entry.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                </span>
                              </p>
                            );
                          })}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="Pessoal" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.colorLight} />
                    ))}
                  </Bar>
                  <Bar dataKey="Empresarial" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-1 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full opacity-60" style={{ backgroundColor: '#22c55e' }} />
                  <span className="text-sky-400 font-medium">Pessoal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                  <span className="text-indigo-400 font-medium">Empresarial</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ConsolidatedCard;
