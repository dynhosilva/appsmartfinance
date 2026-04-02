import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, TrendingUp, Edit2, Save, X, Loader2, Calendar, DollarSign, Minus, Lightbulb, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { FixedCostsManager } from "@/components/emergency/FixedCostsManager";
import { VariableCostAnalytics } from "@/components/emergency/VariableCostAnalytics";

interface EmergencyGoal {
  id: string;
  target_months: number;
  target_amount: number | null;
  current_amount: number;
  goal_type: "months" | "amount" | "both";
}

interface FixedCost {
  id: string;
  name: string;
  amount: number;
  is_variable: boolean;
  category_id: string | null;
}

const emergencyGoalSchema = z.object({
  goal_type: z.enum(["months", "amount", "both"]),
  target_months: z.number().min(1, "Mínimo 1 mês").max(24, "Máximo 24 meses"),
  target_amount: z.number().positive("Valor deve ser positivo").max(999999999.99, "Valor muito alto").optional(),
});

const EmergencyReserve = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [costsLoading, setCostsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [emergencyGoal, setEmergencyGoal] = useState<EmergencyGoal | null>(null);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [customAmount, setCustomAmount] = useState("");
  const [editableCurrentAmount, setEditableCurrentAmount] = useState("");
  const [formData, setFormData] = useState({
    goal_type: "months" as "months" | "amount" | "both",
    target_months: 6,
    target_amount: "",
  });

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load emergency goal
      const { data: goalData, error: goalError } = await supabase
        .from("emergency_goals")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (goalError) throw goalError;

      if (goalData) {
        setEmergencyGoal(goalData as EmergencyGoal);
        setFormData({
          goal_type: (goalData.goal_type as "months" | "amount" | "both") || "months",
          target_months: goalData.target_months || 6,
          target_amount: goalData.target_amount?.toString() || "",
        });
      }

      await loadFixedCosts(user.id);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadFixedCosts = async (userId: string) => {
    try {
      setCostsLoading(true);
      const { data, error } = await supabase
        .from("fixed_costs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setFixedCosts(data || []);
    } catch (error) {
      console.error("Error loading fixed costs:", error);
    } finally {
      setCostsLoading(false);
    }
  };

  const handleRefreshCosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await loadFixedCosts(user.id);
    }
  };

  const monthlyFixedCosts = fixedCosts.reduce((sum, cost) => sum + cost.amount, 0);

  const handleSave = async () => {
    try {
      const validatedData = emergencyGoalSchema.parse({
        goal_type: formData.goal_type,
        target_months: formData.target_months,
        target_amount: formData.target_amount ? parseFloat(formData.target_amount) : undefined,
      });

      setIsSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const updateData: any = {
        goal_type: validatedData.goal_type,
        target_months: validatedData.target_months,
        target_amount: validatedData.target_amount || null,
      };

      const { error } = await supabase
        .from("emergency_goals")
        .update(updateData)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Meta atualizada com sucesso!");
      setIsEditing(false);
      loadData();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao salvar: " + error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAmount = async (amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      if (!emergencyGoal) return;

      const newAmount = Math.max(0, emergencyGoal.current_amount + amount);

      const { error } = await supabase
        .from("emergency_goals")
        .update({ current_amount: newAmount })
        .eq("user_id", user.id);

      if (error) throw error;

      const action = amount > 0 ? "adicionado à" : "removido da";
      toast.success(`R$ ${Math.abs(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${action} reserva!`);
      setCustomAmount("");
      loadData();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  const handleSaveCurrentAmount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const newAmount = parseFloat(editableCurrentAmount.replace(",", "."));
      if (isNaN(newAmount) || newAmount < 0) {
        toast.error("Valor inválido");
        return;
      }

      const { error } = await supabase
        .from("emergency_goals")
        .update({ current_amount: newAmount })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Valor atualizado com sucesso!");
      setIsEditingAmount(false);
      loadData();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  const startEditingAmount = () => {
    setEditableCurrentAmount((emergencyGoal?.current_amount || 0).toFixed(2).replace(".", ","));
    setIsEditingAmount(true);
  };

  const cancelEditingAmount = () => {
    setIsEditingAmount(false);
    setEditableCurrentAmount("");
  };

  const handleCustomAmount = (isAdd: boolean) => {
    const value = parseFloat(customAmount);
    if (!isNaN(value) && value > 0) {
      handleUpdateAmount(isAdd ? value : -value);
    }
  };

  const handleUpdateCostAmount = async (costId: string, newAmount: number) => {
    try {
      const { error } = await supabase
        .from("fixed_costs")
        .update({ amount: newAmount })
        .eq("id", costId);

      if (error) throw error;

      // Refresh the costs list
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await loadFixedCosts(user.id);
      }
    } catch (error: any) {
      toast.error("Erro ao atualizar custo: " + error.message);
    }
  };

  const calculateTargetAmount = () => {
    if (!emergencyGoal) return 0;
    
    switch (emergencyGoal.goal_type) {
      case "months":
        return monthlyFixedCosts * emergencyGoal.target_months;
      case "amount":
        return emergencyGoal.target_amount || 0;
      case "both":
        const monthsAmount = monthlyFixedCosts * emergencyGoal.target_months;
        const targetAmount = emergencyGoal.target_amount || 0;
        return Math.max(monthsAmount, targetAmount);
      default:
        return 0;
    }
  };

  const calculateProgress = () => {
    if (!emergencyGoal) return 0;
    const target = calculateTargetAmount();
    if (target === 0) return 0;
    return Math.min((emergencyGoal.current_amount / target) * 100, 100);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Carregando reserva...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const targetAmount = calculateTargetAmount();
  const progress = calculateProgress();
  const remaining = targetAmount - (emergencyGoal?.current_amount || 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">Reserva de Emergência</h1>
              <p className="text-sm text-muted-foreground">Sua segurança financeira</p>
            </div>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-2 w-full sm:w-auto">
              <Edit2 className="h-4 w-4" />
              Editar Meta
            </Button>
          )}
        </div>

        {/* Main Progress Card */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-2xl">
              {progress >= 100 
                ? "🎉 Parabéns! Meta alcançada!"
                : "Continue guardando para sua independência"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Circle and Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Visual Progress */}
              <div className="flex flex-col items-center justify-center p-4 sm:p-8 bg-muted/30 rounded-2xl">
                <div className="relative w-36 h-36 sm:w-48 sm:h-48 mb-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-muted"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      strokeDasharray={`${2 * Math.PI * 88}`}
                      strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                      strokeLinecap="round"
                      className="text-primary transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl sm:text-5xl font-bold text-primary">{progress.toFixed(0)}%</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">Completo</span>
                  </div>
                </div>
                <Progress value={progress} className="h-3 w-full" />
              </div>

              {/* Stats */}
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-xs sm:text-sm text-muted-foreground">Valor Atual na Reserva</Label>
                  {isEditingAmount ? (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-primary">R$</span>
                        <Input
                          type="text"
                          value={editableCurrentAmount}
                          onChange={(e) => setEditableCurrentAmount(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveCurrentAmount();
                            if (e.key === "Escape") cancelEditingAmount();
                          }}
                          className="pl-12 text-2xl sm:text-3xl font-bold h-14 text-primary"
                          autoFocus
                        />
                      </div>
                      <Button size="icon" onClick={handleSaveCurrentAmount} className="h-14 w-14">
                        <Save className="h-5 w-5" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={cancelEditingAmount} className="h-14 w-14">
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  ) : (
                    <button 
                      onClick={startEditingAmount}
                      className="group flex items-center gap-2 text-left hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                    >
                      <p className="text-2xl sm:text-4xl font-bold text-primary break-all">
                        R$ {(emergencyGoal?.current_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <Edit2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-xs sm:text-sm text-muted-foreground">Valor Meta</Label>
                  <p className="text-xl sm:text-3xl font-bold break-all">
                    R$ {targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {targetAmount === 0 && monthlyFixedCosts === 0 && (
                    <p className="text-sm text-warning">⚠️ Cadastre seus custos fixos abaixo</p>
                  )}
                </div>
                {remaining > 0 && (
                  <div className="space-y-1 sm:space-y-2">
                    <Label className="text-xs sm:text-sm text-muted-foreground">Faltam</Label>
                    <p className="text-lg sm:text-2xl font-bold text-secondary break-all">
                      R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Add/Remove Amount */}
            <div className="p-4 sm:p-6 bg-primary/5 rounded-xl border border-primary/20">
              <Label className="text-sm sm:text-base font-semibold mb-3 block">Atualizar Reserva</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Digite o valor"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCustomAmount(true);
                    }
                  }}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCustomAmount(true)}
                    className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
                    disabled={!customAmount || parseFloat(customAmount) <= 0}
                  >
                    <TrendingUp className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Adicionar</span>
                  </Button>
                  <Button
                    onClick={() => handleCustomAmount(false)}
                    variant="outline"
                    className="flex-1 sm:flex-none text-destructive hover:text-destructive"
                    disabled={!customAmount || parseFloat(customAmount) <= 0}
                  >
                    <Minus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Retirar</span>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[100, 200, 500, 1000].map((value) => (
                  <Button
                    key={value}
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateAmount(value)}
                    className="text-xs sm:text-sm"
                  >
                    +R${value}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goal Configuration */}
        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>Configurar Meta de Reserva</CardTitle>
              <CardDescription>
                Defina como você quer calcular sua reserva de emergência
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={formData.goal_type} onValueChange={(value: any) => setFormData({ ...formData, goal_type: value })}>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="months" id="months" />
                    <div className="flex-1">
                      <Label htmlFor="months" className="cursor-pointer font-semibold flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Baseado em Meses de Custos Fixos
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Meta calculada: R$ {(monthlyFixedCosts * formData.target_months).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="amount" id="amount" />
                    <div className="flex-1">
                      <Label htmlFor="amount" className="cursor-pointer font-semibold flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Valor Fixo em Reais
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Defina um valor específico como meta
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="both" id="both" />
                    <div className="flex-1">
                      <Label htmlFor="both" className="cursor-pointer font-semibold flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Ambos (o maior valor)
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Usa o maior valor entre meses e valor fixo
                      </p>
                    </div>
                  </div>
                </div>
              </RadioGroup>

              {(formData.goal_type === "months" || formData.goal_type === "both") && (
                <div className="space-y-2">
                  <Label htmlFor="target_months">Quantidade de Meses</Label>
                  <Input
                    id="target_months"
                    type="number"
                    min="1"
                    max="24"
                    value={formData.target_months}
                    onChange={(e) => setFormData({ ...formData, target_months: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Custos fixos mensais: R$ {monthlyFixedCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    {monthlyFixedCosts === 0 && " (Configure seus custos fixos abaixo)"}
                  </p>
                </div>
              )}

              {(formData.goal_type === "amount" || formData.goal_type === "both") && (
                <div className="space-y-2">
                  <Label htmlFor="target_amount">Valor-Alvo (R$)</Label>
                  <Input
                    id="target_amount"
                    type="number"
                    step="0.01"
                    placeholder="10000.00"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configuração
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    loadData();
                  }}
                  disabled={isSaving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Configuração Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span className="font-semibold">Tipo de Meta:</span>
                  <span>
                    {emergencyGoal?.goal_type === "months" && "Baseado em Meses"}
                    {emergencyGoal?.goal_type === "amount" && "Valor Fixo"}
                    {emergencyGoal?.goal_type === "both" && "Ambos"}
                  </span>
                </div>
                {(emergencyGoal?.goal_type === "months" || emergencyGoal?.goal_type === "both") && (
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="font-semibold">Meses de Cobertura:</span>
                    <span>{emergencyGoal?.target_months} meses</span>
                  </div>
                )}
                {(emergencyGoal?.goal_type === "amount" || emergencyGoal?.goal_type === "both") && emergencyGoal?.target_amount && (
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="font-semibold">Valor-Alvo:</span>
                    <span>R$ {emergencyGoal.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span className="font-semibold">Custos Fixos Mensais:</span>
                  <span>R$ {monthlyFixedCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations Card */}
        {monthlyFixedCosts > 0 && (
          <Card className="border-secondary/30 bg-gradient-to-br from-secondary/5 via-background to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-secondary" />
                Recomendações de Reserva
              </CardTitle>
              <CardDescription>
                Valores ideais baseados nos seus custos fixos de R$ {monthlyFixedCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {/* 6 Months Recommendation */}
                <div className={`p-4 rounded-xl border-2 transition-all ${
                  (emergencyGoal?.current_amount || 0) >= monthlyFixedCosts * 6
                    ? 'border-primary bg-primary/5'
                    : 'border-muted bg-muted/30'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Mínimo Recomendado</span>
                    {(emergencyGoal?.current_amount || 0) >= monthlyFixedCosts * 6 && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    R$ {(monthlyFixedCosts * 6).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    6 meses de custos fixos
                  </p>
                  <Progress 
                    value={Math.min(((emergencyGoal?.current_amount || 0) / (monthlyFixedCosts * 6)) * 100, 100)} 
                    className="h-2 mt-3" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(emergencyGoal?.current_amount || 0) >= monthlyFixedCosts * 6 
                      ? '✅ Meta atingida!' 
                      : `Faltam R$ ${Math.max(0, monthlyFixedCosts * 6 - (emergencyGoal?.current_amount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    }
                  </p>
                </div>

                {/* 12 Months Recommendation */}
                <div className={`p-4 rounded-xl border-2 transition-all ${
                  (emergencyGoal?.current_amount || 0) >= monthlyFixedCosts * 12
                    ? 'border-secondary bg-secondary/5'
                    : 'border-muted bg-muted/30'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Ideal para Segurança Total</span>
                    {(emergencyGoal?.current_amount || 0) >= monthlyFixedCosts * 12 && (
                      <CheckCircle2 className="h-5 w-5 text-secondary" />
                    )}
                  </div>
                  <p className="text-2xl font-bold text-secondary">
                    R$ {(monthlyFixedCosts * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    12 meses de custos fixos
                  </p>
                  <Progress 
                    value={Math.min(((emergencyGoal?.current_amount || 0) / (monthlyFixedCosts * 12)) * 100, 100)} 
                    className="h-2 mt-3" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(emergencyGoal?.current_amount || 0) >= monthlyFixedCosts * 12 
                      ? '🏆 Segurança total!' 
                      : `Faltam R$ ${Math.max(0, monthlyFixedCosts * 12 - (emergencyGoal?.current_amount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    }
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                <p className="flex items-start gap-2 text-foreground">
                  <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>
                    <span className="font-semibold text-primary">Dica:</span> Especialistas recomendam ter entre 6 e 12 meses de custos essenciais guardados. 
                    Comece com 6 meses e evolua para 12 para maior tranquilidade.
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fixed Costs Manager */}
        <FixedCostsManager 
          costs={fixedCosts} 
          onUpdate={handleRefreshCosts}
          loading={costsLoading}
        />

        {/* Variable Cost Analytics */}
        <VariableCostAnalytics 
          variableCosts={fixedCosts.filter(c => c.is_variable)}
          onUpdateCostAmount={handleUpdateCostAmount}
        />
      </div>
    </AppLayout>
  );
};

export default EmergencyReserve;
