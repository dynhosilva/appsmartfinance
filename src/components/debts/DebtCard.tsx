import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, DollarSign, Calendar, Percent } from "lucide-react";

interface Debt {
  id: string;
  name: string;
  creditor: string | null;
  total_amount: number;
  current_balance: number;
  interest_rate: number | null;
  minimum_payment: number | null;
  due_day: number | null;
  start_date: string | null;
  status: string;
  notes: string | null;
}

interface DebtCardProps {
  debt: Debt;
  onEdit: (debt: Debt) => void;
  onDelete: (id: string) => void;
  onPayment: (debt: Debt) => void;
}

export function DebtCard({ debt, onEdit, onDelete, onPayment }: DebtCardProps) {
  const paidAmount = debt.total_amount - debt.current_balance;
  const progressPercent = (paidAmount / debt.total_amount) * 100;
  const isPaid = debt.status === "paid";

  return (
    <Card className={`transition-all ${isPaid ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {debt.name}
              {isPaid && (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  Quitada
                </Badge>
              )}
            </CardTitle>
            {debt.creditor && (
              <p className="text-sm text-muted-foreground">{debt.creditor}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(debt)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(debt.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{progressPercent.toFixed(1)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Pago: R$ {paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span>Total: R$ {debt.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Current Balance */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">Saldo Devedor</p>
          <p className={`text-xl font-bold ${isPaid ? 'text-success' : 'text-destructive'}`}>
            R$ {debt.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {debt.interest_rate !== null && debt.interest_rate > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Percent className="h-4 w-4" />
              <span>{debt.interest_rate}% a.m.</span>
            </div>
          )}
          {debt.minimum_payment && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Mín: R$ {debt.minimum_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {debt.due_day && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Venc. dia {debt.due_day}</span>
            </div>
          )}
        </div>

        {/* Payment Button */}
        {!isPaid && (
          <Button 
            className="w-full gap-2" 
            variant="outline"
            onClick={() => onPayment(debt)}
          >
            <DollarSign className="h-4 w-4" />
            Registrar Pagamento
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
