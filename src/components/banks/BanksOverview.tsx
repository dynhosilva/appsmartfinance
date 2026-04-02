import { Building2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bank } from "@/hooks/useBanks";
import { motion } from "framer-motion";

interface BanksOverviewProps {
  banks: Bank[];
}

export const BanksOverview = ({ banks }: BanksOverviewProps) => {
  const activeBanks = banks.filter((b) => b.is_active);
  
  const totalBalance = activeBanks.reduce(
    (sum, bank) => sum + bank.current_balance,
    0
  );
  
  const positiveBalance = activeBanks
    .filter((b) => b.current_balance > 0)
    .reduce((sum, b) => sum + b.current_balance, 0);
    
  const negativeBalance = activeBanks
    .filter((b) => b.current_balance < 0)
    .reduce((sum, b) => sum + b.current_balance, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const stats = [
    {
      title: "Saldo Total",
      value: formatCurrency(totalBalance),
      icon: Wallet,
      color: totalBalance >= 0 ? "text-success" : "text-danger",
      bgColor: totalBalance >= 0 ? "bg-success/10" : "bg-danger/10",
    },
    {
      title: "Contas Ativas",
      value: activeBanks.length.toString(),
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Saldo Positivo",
      value: formatCurrency(positiveBalance),
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Saldo Negativo",
      value: formatCurrency(negativeBalance),
      icon: TrendingDown,
      color: "text-danger",
      bgColor: "bg-danger/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="h-full">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {stat.title}
                </span>
              </div>
              <p className={`text-lg sm:text-xl font-bold ${stat.color} truncate`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
