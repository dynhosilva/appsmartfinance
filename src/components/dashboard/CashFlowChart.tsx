import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3 } from "lucide-react";

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

interface CashFlowChartProps {
  data: MonthlyData[];
}

const CashFlowChart = ({ data }: CashFlowChartProps) => {
  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Fluxo de Caixa Mensal
        </CardTitle>
        <CardDescription>
          Evolução de receitas e despesas nos últimos meses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Nenhuma transação registrada ainda
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'income' ? 'Receitas' : name === 'expenses' ? 'Despesas' : 'Saldo'
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend 
                formatter={(value) => value === 'income' ? 'Receitas' : value === 'expenses' ? 'Despesas' : 'Saldo'}
              />
              <Bar 
                dataKey="income" 
                fill="hsl(var(--success))" 
                radius={[4, 4, 0, 0]}
                name="income"
              />
              <Bar 
                dataKey="expenses" 
                fill="hsl(var(--danger))" 
                radius={[4, 4, 0, 0]}
                name="expenses"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default CashFlowChart;
