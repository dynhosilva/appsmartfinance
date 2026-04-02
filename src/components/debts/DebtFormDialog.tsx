import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FinancialProfile } from "@/components/dashboard/ProfileSwitcher";

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

interface DebtFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt | null;
  profileType: FinancialProfile;
  onSuccess: () => void;
}

export function DebtFormDialog({ open, onOpenChange, debt, profileType, onSuccess }: DebtFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    creditor: "",
    total_amount: "",
    current_balance: "",
    interest_rate: "",
    minimum_payment: "",
    due_day: "",
    start_date: "",
    notes: "",
  });

  useEffect(() => {
    if (debt) {
      setFormData({
        name: debt.name,
        creditor: debt.creditor || "",
        total_amount: debt.total_amount.toString(),
        current_balance: debt.current_balance.toString(),
        interest_rate: debt.interest_rate?.toString() || "",
        minimum_payment: debt.minimum_payment?.toString() || "",
        due_day: debt.due_day?.toString() || "",
        start_date: debt.start_date || "",
        notes: debt.notes || "",
      });
    } else {
      setFormData({
        name: "",
        creditor: "",
        total_amount: "",
        current_balance: "",
        interest_rate: "",
        minimum_payment: "",
        due_day: "",
        start_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
    }
  }, [debt, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.total_amount) {
      toast.error("Preencha nome e valor total");
      return;
    }

    const totalAmount = parseFloat(formData.total_amount);
    let currentBalance = formData.current_balance ? parseFloat(formData.current_balance) : totalAmount;

    if (currentBalance > totalAmount) {
      toast.error("Saldo devedor não pode ser maior que o valor total");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const debtData = {
        name: formData.name.trim(),
        creditor: formData.creditor.trim() || null,
        total_amount: totalAmount,
        current_balance: currentBalance,
        interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null,
        minimum_payment: formData.minimum_payment ? parseFloat(formData.minimum_payment) : null,
        due_day: formData.due_day ? parseInt(formData.due_day) : null,
        start_date: formData.start_date || null,
        notes: formData.notes.trim() || null,
        status: currentBalance <= 0 ? "paid" : "active",
        profile_type: profileType,
        user_id: user.id,
      };

      if (debt) {
        const { error } = await supabase
          .from("debts")
          .update(debtData)
          .eq("id", debt.id);

        if (error) throw error;
        toast.success("Dívida atualizada!");
      } else {
        const { error } = await supabase
          .from("debts")
          .insert(debtData);

        if (error) throw error;
        toast.success("Dívida cadastrada!");
      }

      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{debt ? "Editar Dívida" : "Nova Dívida"}</DialogTitle>
          <DialogDescription>
            {debt ? "Atualize as informações da dívida" : "Cadastre uma nova dívida para acompanhar"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Dívida *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Cartão de Crédito, Empréstimo..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="creditor">Credor</Label>
            <Input
              id="creditor"
              value={formData.creditor}
              onChange={(e) => setFormData({ ...formData, creditor: e.target.value })}
              placeholder="Ex: Banco XYZ, Financeira..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_amount">Valor Total *</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_balance">Saldo Devedor</Label>
              <Input
                id="current_balance"
                type="number"
                step="0.01"
                min="0"
                value={formData.current_balance}
                onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                placeholder="Igual ao total"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interest_rate">Juros (% a.m.)</Label>
              <Input
                id="interest_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.interest_rate}
                onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum_payment">Pagamento Mínimo</Label>
              <Input
                id="minimum_payment"
                type="number"
                step="0.01"
                min="0"
                value={formData.minimum_payment}
                onChange={(e) => setFormData({ ...formData, minimum_payment: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_day">Dia do Vencimento</Label>
              <Input
                id="due_day"
                type="number"
                min="1"
                max="31"
                value={formData.due_day}
                onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                placeholder="1-31"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Data de Início</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Anotações adicionais..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : debt ? (
                "Atualizar"
              ) : (
                "Cadastrar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
