import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, CreditCard, TrendingDown, AlertTriangle, CheckCircle2, User, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FinancialProfile } from "@/components/dashboard/ProfileSwitcher";
import { DebtFormDialog } from "@/components/debts/DebtFormDialog";
import { DebtCard } from "@/components/debts/DebtCard";
import { DebtPaymentDialog } from "@/components/debts/DebtPaymentDialog";

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
  profile_type: "personal" | "business";
  notes: string | null;
}

const Debts = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [currentProfile, setCurrentProfile] = useState<FinancialProfile>("personal");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    loadDebts();
  }, [currentProfile]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadDebts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("debts")
        .select("*")
        .eq("user_id", user.id)
        .eq("profile_type", currentProfile)
        .order("status", { ascending: true })
        .order("current_balance", { ascending: false });

      if (error) throw error;
      setDebts(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dívidas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("debts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Dívida removida!");
      loadDebts();
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  const handlePayment = (debt: Debt) => {
    setPaymentDebt(debt);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingDebt(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    loadDebts();
  };

  const handlePaymentSuccess = () => {
    setPaymentDebt(null);
    loadDebts();
  };

  const activeDebts = debts.filter(d => d.status === "active");
  const paidDebts = debts.filter(d => d.status === "paid");
  
  const totalDebt = activeDebts.reduce((sum, d) => sum + d.current_balance, 0);
  const totalPaid = debts.reduce((sum, d) => sum + (d.total_amount - d.current_balance), 0);
  const averageProgress = activeDebts.length > 0 
    ? activeDebts.reduce((sum, d) => sum + ((d.total_amount - d.current_balance) / d.total_amount * 100), 0) / activeDebts.length 
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              Gerenciar Dívidas
            </h1>
            <p className="text-muted-foreground">
              Controle suas dívidas e acompanhe os pagamentos
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Dívida
          </Button>
        </div>

        {/* Profile Switcher */}
        <div className="flex items-center gap-2">
          <Button
            variant={currentProfile === "personal" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentProfile("personal")}
            className="gap-2"
          >
            <User className="h-4 w-4" />
            Pessoal
          </Button>
          <Button
            variant={currentProfile === "business" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentProfile("business")}
            className="gap-2"
          >
            <Building2 className="h-4 w-4" />
            Empresarial
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Dívida Total Ativa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">
                R$ {totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-muted-foreground">
                {activeDebts.length} dívida{activeDebts.length !== 1 ? 's' : ''} ativa{activeDebts.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-success" />
                Total Pago
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">
                R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-muted-foreground">
                {paidDebts.length} dívida{paidDebts.length !== 1 ? 's' : ''} quitada{paidDebts.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Progresso Médio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                {averageProgress.toFixed(1)}%
              </p>
              <Progress value={averageProgress} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Debts List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : debts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma dívida cadastrada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Comece adicionando suas dívidas para acompanhar os pagamentos
              </p>
              <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Dívida
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeDebts.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Dívidas Ativas ({activeDebts.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeDebts.map((debt) => (
                    <DebtCard
                      key={debt.id}
                      debt={debt}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onPayment={handlePayment}
                    />
                  ))}
                </div>
              </div>
            )}

            {paidDebts.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Dívidas Quitadas ({paidDebts.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paidDebts.map((debt) => (
                    <DebtCard
                      key={debt.id}
                      debt={debt}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onPayment={handlePayment}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <DebtFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        debt={editingDebt}
        profileType={currentProfile}
        onSuccess={handleFormSuccess}
      />

      <DebtPaymentDialog
        debt={paymentDebt}
        onClose={() => setPaymentDebt(null)}
        onSuccess={handlePaymentSuccess}
      />
    </AppLayout>
  );
};

export default Debts;
