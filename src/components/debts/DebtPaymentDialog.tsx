import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Debt {
  id: string;
  name: string;
  current_balance: number;
  minimum_payment: number | null;
}

interface DebtPaymentDialogProps {
  debt: Debt | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DebtPaymentDialog({ debt, onClose, onSuccess }: DebtPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!debt || !amount) {
      toast.error("Informe o valor do pagamento");
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }

    if (paymentAmount > debt.current_balance) {
      toast.error("Valor maior que o saldo devedor");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      // Register payment
      const { error: paymentError } = await supabase
        .from("debt_payments")
        .insert({
          debt_id: debt.id,
          user_id: user.id,
          amount: paymentAmount,
          payment_date: paymentDate,
          notes: notes.trim() || null,
        });

      if (paymentError) throw paymentError;

      // Update debt balance
      const newBalance = debt.current_balance - paymentAmount;
      const { error: debtError } = await supabase
        .from("debts")
        .update({
          current_balance: newBalance,
          status: newBalance <= 0 ? "paid" : "active",
        })
        .eq("id", debt.id);

      if (debtError) throw debtError;

      if (newBalance <= 0) {
        toast.success("🎉 Parabéns! Dívida quitada!");
      } else {
        toast.success("Pagamento registrado!");
      }

      setAmount("");
      setNotes("");
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao registrar pagamento: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const setQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  if (!debt) return null;

  return (
    <Dialog open={!!debt} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Registrar Pagamento
          </DialogTitle>
          <DialogDescription>
            {debt.name} - Saldo: R$ {debt.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment_amount">Valor do Pagamento *</Label>
            <Input
              id="payment_amount"
              type="number"
              step="0.01"
              min="0.01"
              max={debt.current_balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              required
              autoFocus
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex flex-wrap gap-2">
            {debt.minimum_payment && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickAmount(debt.minimum_payment!)}
              >
                Mínimo: R$ {debt.minimum_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickAmount(debt.current_balance)}
            >
              Quitar: R$ {debt.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">Data do Pagamento</Label>
            <Input
              id="payment_date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_notes">Observações</Label>
            <Textarea
              id="payment_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Parcela 5 de 12..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                "Confirmar Pagamento"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
