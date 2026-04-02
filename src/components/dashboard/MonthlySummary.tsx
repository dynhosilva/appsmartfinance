import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface MonthlySummaryProps {
  currentMonth: {
    income: number;
    expenses: number;
    balance: number;
  };
  previousMonth: {
    income: number;
    expenses: number;
    balance: number;
  };
  monthName: string;
}

const MonthlySummary = ({ currentMonth, previousMonth, monthName }: MonthlySummaryProps) => {
  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const incomeChange = calculateChange(currentMonth.income, previousMonth.income);
  const expensesChange = calculateChange(currentMonth.expenses, previousMonth.expenses);
  const balanceChange = calculateChange(currentMonth.balance, previousMonth.balance);

  const getChangeIndicator = (change: number, isExpense: boolean = false) => {
    const isPositive = isExpense ? change < 0 : change > 0;
    const isNegative = isExpense ? change > 0 : change < 0;
    
    if (Math.abs(change) < 0.01) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    
    return isPositive ? (
      <ArrowUpRight className={`h-4 w-4 ${isExpense ? 'text-success' : 'text-success'}`} />
    ) : (
      <ArrowDownRight className={`h-4 w-4 ${isExpense ? 'text-danger' : 'text-danger'}`} />
    );
  };

  const getChangeColor = (change: number, isExpense: boolean = false) => {
    if (Math.abs(change) < 0.01) return 'text-muted-foreground';
    const isPositive = isExpense ? change < 0 : change > 0;
    return isPositive ? 'text-success' : 'text-danger';
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Resumo de {monthName}
        </CardTitle>
        <CardDescription>
          Comparativo com o mês anterior
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Receitas */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/20">
          <div className="flex items-center gap-3">
            <div className="bg-success/10 p-2 rounded-lg">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receitas</p>
              <p className="text-xl font-bold text-success">{formatCurrency(currentMonth.income)}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1 ${getChangeColor(incomeChange)}`}>
            {getChangeIndicator(incomeChange)}
            <span className="text-sm font-medium">{Math.abs(incomeChange).toFixed(1)}%</span>
          </div>
        </div>

        {/* Despesas */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-danger/5 border border-danger/20">
          <div className="flex items-center gap-3">
            <div className="bg-danger/10 p-2 rounded-lg">
              <TrendingDown className="h-5 w-5 text-danger" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Despesas</p>
              <p className="text-xl font-bold text-danger">{formatCurrency(currentMonth.expenses)}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1 ${getChangeColor(expensesChange, true)}`}>
            {getChangeIndicator(expensesChange, true)}
            <span className="text-sm font-medium">{Math.abs(expensesChange).toFixed(1)}%</span>
          </div>
        </div>

        {/* Saldo */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo do Mês</p>
              <p className={`text-xl font-bold ${currentMonth.balance >= 0 ? 'text-primary' : 'text-danger'}`}>
                {formatCurrency(currentMonth.balance)}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1 ${getChangeColor(balanceChange)}`}>
            {getChangeIndicator(balanceChange)}
            <span className="text-sm font-medium">{Math.abs(balanceChange).toFixed(1)}%</span>
          </div>
        </div>

        {/* Taxa de economia */}
        <div className="pt-2 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Taxa de Economia</span>
            <span className={`text-lg font-bold ${currentMonth.income > 0 && currentMonth.balance > 0 ? 'text-success' : 'text-muted-foreground'}`}>
              {currentMonth.income > 0 
                ? `${((currentMonth.balance / currentMonth.income) * 100).toFixed(1)}%`
                : '0%'
              }
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {currentMonth.balance > 0 
              ? `Você economizou ${formatCurrency(currentMonth.balance)} este mês`
              : currentMonth.balance < 0 
                ? `Você gastou ${formatCurrency(Math.abs(currentMonth.balance))} a mais que ganhou`
                : 'Você gastou exatamente o que ganhou'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlySummary;
