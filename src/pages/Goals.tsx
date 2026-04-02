import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Target, TrendingUp, Calendar, CheckCircle2, Loader2, Crown } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { useUserPlan } from "@/hooks/useUserPlan";
import { LimitWarning } from "@/components/plans/LimitWarning";

interface Goal {
  id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  category: string | null;
  color: string;
  icon: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

const goalSchema = z.object({
  name: z.string().min(3, "Nome muito curto").max(100, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional(),
  target_amount: z.number().positive("Valor deve ser maior que zero").max(999999999.99, "Valor muito alto"),
  current_amount: z.number().min(0, "Valor não pode ser negativo").max(999999999.99, "Valor muito alto"),
  deadline: z.string().optional(),
  category: z.string().max(50).optional(),
});

const goalCategories = [
  { value: "Emergência", label: "🚨 Emergência", color: "#ef4444" },
  { value: "Viagem", label: "✈️ Viagem", color: "#3b82f6" },
  { value: "Educação", label: "📚 Educação", color: "#8b5cf6" },
  { value: "Casa", label: "🏠 Casa", color: "#f59e0b" },
  { value: "Veículo", label: "🚗 Veículo", color: "#10b981" },
  { value: "Investimento", label: "💰 Investimento", color: "#06b6d4" },
  { value: "Saúde", label: "🏥 Saúde", color: "#ec4899" },
  { value: "Outro", label: "🎯 Outro", color: "#6366f1" },
];

const Goals = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { plan, usage, canAddGoal, refetch: refetchPlan } = useUserPlan();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    target_amount: 0,
    current_amount: 0,
    deadline: "",
    category: "Outro",
  });

  useEffect(() => {
    checkAuth();
    loadGoals();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("custom_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setGoals(data);
    } catch (error) {
      console.error("Error loading goals:", error);
      toast.error("Erro ao carregar metas");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    if (!canAddGoal()) {
      toast.error(`Limite de ${plan.max_goals} metas atingido. Faça upgrade para adicionar mais.`);
      navigate("/upgrade");
      return;
    }
    setEditingGoal(null);
    setFormData({
      name: "",
      description: "",
      target_amount: 0,
      current_amount: 0,
      deadline: "",
      category: "Outro",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      description: goal.description || "",
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      deadline: goal.deadline || "",
      category: goal.category || "Outro",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const validatedData = goalSchema.parse({
        name: formData.name,
        description: formData.description || undefined,
        target_amount: formData.target_amount,
        current_amount: formData.current_amount,
        deadline: formData.deadline || undefined,
        category: formData.category,
      });

      setIsSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const categoryData = goalCategories.find(c => c.value === formData.category);
      const goalData: any = {
        name: validatedData.name,
        target_amount: validatedData.target_amount,
        current_amount: validatedData.current_amount,
        user_id: user.id,
        color: categoryData?.color || "#6366f1",
        icon: categoryData?.label.split(" ")[0] || "🎯",
      };

      if (validatedData.description) goalData.description = validatedData.description;
      if (validatedData.deadline) goalData.deadline = validatedData.deadline;
      if (validatedData.category) goalData.category = validatedData.category;

      let error;
      if (editingGoal) {
        ({ error } = await supabase
          .from("custom_goals")
          .update(goalData)
          .eq("id", editingGoal.id));
      } else {
        ({ error } = await supabase
          .from("custom_goals")
          .insert(goalData));
      }

      if (error) throw error;

      toast.success(editingGoal ? "Meta atualizada!" : "Meta criada!");
      setIsDialogOpen(false);
      loadGoals();
      // Refetch plan usage after creating a goal
      if (!editingGoal) {
        refetchPlan();
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao salvar meta: " + error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta meta?")) return;

    try {
      const { error } = await supabase
        .from("custom_goals")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Meta excluída!");
      loadGoals();
    } catch (error: any) {
      toast.error("Erro ao excluir meta: " + error.message);
    }
  };

  const handleUpdateProgress = async (goal: Goal, newAmount: number) => {
    try {
      const { error } = await supabase
        .from("custom_goals")
        .update({ current_amount: newAmount })
        .eq("id", goal.id);

      if (error) throw error;
      
      if (newAmount >= goal.target_amount && !goal.is_completed) {
        toast.success("🎉 Parabéns! Meta concluída!");
      }
      
      loadGoals();
    } catch (error: any) {
      toast.error("Erro ao atualizar progresso: " + error.message);
    }
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Carregando metas...</p>
        </div>
      </div>
    );
  }

  const activeGoals = goals.filter(g => !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);

  return (
    <AppLayout title="Minhas Metas">
      <div className="space-y-6">
        {/* Limit Warning */}
        <LimitWarning 
          resource="metas" 
          current={usage.goals_count} 
          max={plan.max_goals} 
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Minhas Metas
            </h1>
            <p className="text-muted-foreground">
              Defina e acompanhe seus objetivos financeiros
            </p>
          </div>
          <Button onClick={openCreateDialog} className="bg-gradient-to-r from-primary to-primary-glow shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Nova Meta
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardDescription>Metas Ativas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{activeGoals.length}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CardDescription>Concluídas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-success">{completedGoals.length}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-info">
            <CardHeader className="pb-2">
              <CardDescription>Total Economizado</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-info">
                R$ {goals.reduce((sum, g) => sum + g.current_amount, 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Metas em Andamento</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {activeGoals.map((goal) => {
                const progress = calculateProgress(goal.current_amount, goal.target_amount);
                const daysRemaining = getDaysRemaining(goal.deadline);
                
                return (
                  <Card key={goal.id} className="hover:shadow-lg transition-all" style={{ borderLeftColor: goal.color, borderLeftWidth: 4 }}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{goal.icon}</div>
                          <div>
                            <CardTitle className="text-xl">{goal.name}</CardTitle>
                            {goal.description && (
                              <CardDescription className="mt-1">{goal.description}</CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(goal)} className="h-8 w-8">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(goal.id)} className="h-8 w-8 text-danger">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold">Progresso</span>
                          <span className="font-bold" style={{ color: goal.color }}>
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={progress} className="h-3" style={{ backgroundColor: `${goal.color}20` }} />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>R$ {goal.current_amount.toFixed(2)}</span>
                          <span>R$ {goal.target_amount.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Deadline */}
                      {daysRemaining !== null && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4" />
                          <span className={daysRemaining < 30 ? "text-danger font-semibold" : "text-muted-foreground"}>
                            {daysRemaining > 0 ? `${daysRemaining} dias restantes` : "Prazo expirado"}
                          </span>
                        </div>
                      )}

                      {/* Quick Update */}
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Adicionar valor"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const input = e.currentTarget;
                              const addValue = parseFloat(input.value);
                              if (!isNaN(addValue) && addValue > 0) {
                                handleUpdateProgress(goal, goal.current_amount + addValue);
                                input.value = "";
                              }
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          size="icon"
                          style={{ backgroundColor: goal.color }}
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            const addValue = parseFloat(input.value);
                            if (!isNaN(addValue) && addValue > 0) {
                              handleUpdateProgress(goal, goal.current_amount + addValue);
                              input.value = "";
                            }
                          }}
                        >
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-success" />
              Metas Concluídas
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {completedGoals.map((goal) => (
                <Card key={goal.id} className="bg-success/5 border-success/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{goal.icon}</div>
                        <div>
                          <CardTitle className="text-xl flex items-center gap-2">
                            {goal.name}
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          </CardTitle>
                          <CardDescription className="text-success">
                            Concluída em {new Date(goal.completed_at!).toLocaleDateString("pt-BR")}
                          </CardDescription>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(goal.id)} className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">
                      R$ {goal.current_amount.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {goals.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Target className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma meta criada ainda</h3>
              <p className="text-muted-foreground mb-6">
                Crie sua primeira meta e comece a alcançar seus objetivos financeiros!
              </p>
              <Button onClick={openCreateDialog} className="bg-gradient-to-r from-primary to-primary-glow">
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Meta
              </Button>
            </CardContent>
          </Card>
        )}
      

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Editar Meta" : "Nova Meta"}</DialogTitle>
            <DialogDescription>
              {editingGoal ? "Atualize as informações da sua meta" : "Crie uma nova meta financeira personalizada"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Meta *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Viagem para Europa"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {goalCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_amount">Valor Meta (R$) *</Label>
                <CurrencyInput
                  id="target_amount"
                  value={formData.target_amount}
                  onChange={(value) => setFormData({ ...formData, target_amount: value })}
                  placeholder="100.000,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_amount">Valor Atual (R$)</Label>
                <CurrencyInput
                  id="current_amount"
                  value={formData.current_amount}
                  onChange={(value) => setFormData({ ...formData, current_amount: value })}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Prazo (opcional)</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva sua meta..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{formData.description.length}/500</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-primary">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  {editingGoal ? "Atualizar" : "Criar Meta"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AppLayout>
  );
};

export default Goals;
