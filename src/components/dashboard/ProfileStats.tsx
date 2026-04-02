import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Briefcase, User } from "lucide-react";
import { FinancialProfile } from "./ProfileSwitcher";

interface ProfileStatsProps {
  profile: FinancialProfile;
  income: number;
  expenses: number;
  balance: number;
}

const ProfileStats = ({ profile, income, expenses, balance }: ProfileStatsProps) => {
  const isPersonal = profile === "personal";
  const profileLabel = isPersonal ? "Pessoal" : "Empresarial";
  const ProfileIcon = isPersonal ? User : Briefcase;
  
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      <Card className="border-l-4 border-l-success bg-gradient-to-br from-success/5 to-success/10">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            Receitas {profileLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-success">
            R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-danger bg-gradient-to-br from-danger/5 to-danger/10">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-danger" />
            Despesas {profileLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-danger">
            R$ {expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </CardContent>
      </Card>

      <Card className={`border-l-4 ${balance >= 0 ? 'border-l-info' : 'border-l-danger'} bg-gradient-to-br ${balance >= 0 ? 'from-info/5 to-info/10' : 'from-danger/5 to-danger/10'}`}>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <DollarSign className={`h-4 w-4 ${balance >= 0 ? 'text-info' : 'text-danger'}`} />
            Saldo {profileLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-info' : 'text-danger'}`}>
            R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileStats;
