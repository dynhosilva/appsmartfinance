import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { User, Building2, TrendingUp, TrendingDown, Percent } from "lucide-react";
import { motion } from "framer-motion";
import { FinancialProfile } from "./ProfileSwitcher";

interface ProfileSummaryCardProps {
  profile: FinancialProfile;
  personalIncome: number;
  personalExpenses: number;
  businessIncome: number;
  businessExpenses: number;
}

const ProfileSummaryCard = ({
  profile,
  personalIncome,
  personalExpenses,
  businessIncome,
  businessExpenses,
}: ProfileSummaryCardProps) => {
  const totalIncome = personalIncome + businessIncome;
  const totalExpenses = personalExpenses + businessExpenses;
  
  const personalIncomePercent = totalIncome > 0 ? (personalIncome / totalIncome) * 100 : 50;
  const businessIncomePercent = totalIncome > 0 ? (businessIncome / totalIncome) * 100 : 50;
  
  const personalExpensePercent = totalExpenses > 0 ? (personalExpenses / totalExpenses) * 100 : 50;
  const businessExpensePercent = totalExpenses > 0 ? (businessExpenses / totalExpenses) * 100 : 50;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5 text-primary" />
          Distribuição Financeira
        </CardTitle>
        <CardDescription>
          Comparativo entre perfis pessoal e empresarial
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Income Distribution */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-success">
              <TrendingUp className="h-4 w-4" />
              Distribuição de Receitas
            </span>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${personalIncomePercent}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-r from-primary to-primary-glow flex items-center justify-center"
            >
              {personalIncomePercent > 15 && (
                <span className="text-[10px] text-primary-foreground font-medium">
                  {personalIncomePercent.toFixed(0)}%
                </span>
              )}
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${businessIncomePercent}%` }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-gradient-to-r from-secondary to-info flex items-center justify-center"
            >
              {businessIncomePercent > 15 && (
                <span className="text-[10px] text-secondary-foreground font-medium">
                  {businessIncomePercent.toFixed(0)}%
                </span>
              )}
            </motion.div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Pessoal: R$ {personalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Empresa: R$ {businessIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Expense Distribution */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-danger">
              <TrendingDown className="h-4 w-4" />
              Distribuição de Despesas
            </span>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${personalExpensePercent}%` }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-gradient-to-r from-primary/70 to-primary flex items-center justify-center"
            >
              {personalExpensePercent > 15 && (
                <span className="text-[10px] text-primary-foreground font-medium">
                  {personalExpensePercent.toFixed(0)}%
                </span>
              )}
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${businessExpensePercent}%` }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-gradient-to-r from-secondary/70 to-info flex items-center justify-center"
            >
              {businessExpensePercent > 15 && (
                <span className="text-[10px] text-secondary-foreground font-medium">
                  {businessExpensePercent.toFixed(0)}%
                </span>
              )}
            </motion.div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Pessoal: R$ {personalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Empresa: R$ {businessExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-primary-glow" />
            <span className="text-xs text-muted-foreground">Pessoal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-secondary to-info" />
            <span className="text-xs text-muted-foreground">Empresarial</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileSummaryCard;
