import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bank } from "@/hooks/useBanks";
import { motion } from "framer-motion";

interface BanksSummaryCardProps {
  banks: Bank[];
  loading?: boolean;
}

export const BanksSummaryCard = ({ banks, loading }: BanksSummaryCardProps) => {
  const navigate = useNavigate();
  
  const activeBanks = banks.filter((b) => b.is_active);
  const totalBalance = activeBanks.reduce(
    (sum, bank) => sum + bank.current_balance,
    0
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Meus Bancos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (banks.length === 0) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Meus Bancos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p className="text-muted-foreground text-sm mb-3">
            Cadastre seus bancos para ter uma visão unificada
          </p>
          <Button size="sm" onClick={() => navigate("/banks")}>
            <Plus className="h-4 w-4 mr-1" />
            Cadastrar Banco
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card 
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => navigate("/banks")}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Meus Bancos
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Saldo Total</p>
            <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatCurrency(totalBalance)}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {activeBanks.slice(0, 4).map((bank) => (
              <div
                key={bank.id}
                className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/50"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: `${bank.color}20` }}
                >
                  {bank.logo_url ? (
                    <img
                      src={bank.logo_url}
                      alt={bank.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2
                      className="h-3 w-3"
                      style={{ color: bank.color }}
                    />
                  )}
                </div>
                <span className="text-xs font-medium truncate max-w-[80px]">
                  {bank.name}
                </span>
              </div>
            ))}
            {activeBanks.length > 4 && (
              <div className="px-2 py-1 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                +{activeBanks.length - 4}
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground">
            {activeBanks.length} conta{activeBanks.length !== 1 ? "s" : ""} ativa{activeBanks.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};
