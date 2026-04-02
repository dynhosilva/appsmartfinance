import { useState } from "react";
import { Building2, Edit, Trash2, MoreVertical, CreditCard, Wallet, PiggyBank, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bank } from "@/hooks/useBanks";
import { motion } from "framer-motion";

interface BankCardProps {
  bank: Bank;
  onEdit: (bank: Bank) => void;
  onDelete: (id: string) => void;
}

const accountTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  checking: { label: "Conta Corrente", icon: <Building2 className="h-4 w-4" /> },
  savings: { label: "Poupança", icon: <PiggyBank className="h-4 w-4" /> },
  investment: { label: "Investimento", icon: <TrendingUp className="h-4 w-4" /> },
  credit_card: { label: "Cartão de Crédito", icon: <CreditCard className="h-4 w-4" /> },
  wallet: { label: "Carteira Digital", icon: <Wallet className="h-4 w-4" /> },
};

export const BankCard = ({ bank, onEdit, onDelete }: BankCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const accountType = accountTypeLabels[bank.account_type] || accountTypeLabels.checking;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          className="overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4"
          style={{ borderLeftColor: bank.color }}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              {/* Logo and Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                  style={{ backgroundColor: `${bank.color}20` }}
                >
                  {bank.logo_url ? (
                    <img 
                      src={bank.logo_url} 
                      alt={bank.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: bank.color }} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">{bank.name}</h3>
                    {!bank.is_active && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inativo</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 text-muted-foreground text-xs sm:text-sm mt-0.5">
                    {accountType.icon}
                    <span className="truncate">{accountType.label}</span>
                  </div>
                  
                  {(bank.agency || bank.account_number) && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                      {bank.agency && `Ag: ${bank.agency}`}
                      {bank.agency && bank.account_number && " • "}
                      {bank.account_number && `Cc: ${bank.account_number}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Balance and Actions */}
              <div className="flex items-start gap-1 shrink-0">
                <div className="text-right">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Saldo</p>
                  <p className={`text-sm sm:text-lg font-bold ${bank.current_balance >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(bank.current_balance)}
                  </p>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 -mr-2">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(bank)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {bank.notes && (
              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border line-clamp-1">
                {bank.notes}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir banco</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{bank.name}"? Esta ação não pode ser desfeita.
              As transações vinculadas a este banco não serão excluídas, mas perderão a associação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(bank.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
