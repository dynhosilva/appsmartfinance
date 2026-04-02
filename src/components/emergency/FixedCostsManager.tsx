import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Check, X, Receipt, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface FixedCost {
  id: string;
  name: string;
  amount: number;
  is_variable: boolean;
  category_id: string | null;
}

interface FixedCostsManagerProps {
  costs: FixedCost[];
  onUpdate: () => void;
  loading: boolean;
}

export function FixedCostsManager({ costs, onUpdate, loading }: FixedCostsManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCost, setNewCost] = useState({ name: "", amount: "", is_variable: false, category_id: "" });
  const [editCost, setEditCost] = useState({ name: "", amount: "", is_variable: false, category_id: "" });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("categories")
        .select("id, name, icon")
        .or(`user_id.eq.${user.id},is_default.eq.true`)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const handleAdd = async () => {
    if (!newCost.name.trim() || !newCost.amount) {
      toast.error("Preencha nome e valor");
      return;
    }

    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const { error } = await supabase
        .from("fixed_costs")
        .insert({
          user_id: user.id,
          name: newCost.name.trim(),
          amount: parseFloat(newCost.amount),
          is_variable: newCost.is_variable,
          category_id: newCost.category_id || null,
        });

      if (error) throw error;

      toast.success("Custo adicionado!");
      setNewCost({ name: "", amount: "", is_variable: false, category_id: "" });
      setIsAdding(false);
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao adicionar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editCost.name.trim() || !editCost.amount) {
      toast.error("Preencha nome e valor");
      return;
    }

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("fixed_costs")
        .update({
          name: editCost.name.trim(),
          amount: parseFloat(editCost.amount),
          is_variable: editCost.is_variable,
          category_id: editCost.category_id || null,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Custo atualizado!");
      setEditingId(null);
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("fixed_costs")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Custo removido!");
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  const startEdit = (cost: FixedCost) => {
    setEditingId(cost.id);
    setEditCost({
      name: cost.name,
      amount: cost.amount.toString(),
      is_variable: cost.is_variable,
      category_id: cost.category_id || "",
    });
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    const cat = categories.find(c => c.id === categoryId);
    return cat ? `${cat.icon || "📁"} ${cat.name}` : null;
  };

  const totalFixed = costs.filter(c => !c.is_variable).reduce((sum, c) => sum + c.amount, 0);
  const totalVariable = costs.filter(c => c.is_variable).reduce((sum, c) => sum + c.amount, 0);
  const totalAll = totalFixed + totalVariable;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Custos Fixos Essenciais (CFE)
        </CardTitle>
        <CardDescription>
          Despesas mensais obrigatórias que serão usadas para calcular sua reserva
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg">
          <div className="flex sm:flex-col items-center justify-between sm:justify-center sm:text-center gap-2">
            <p className="text-sm text-muted-foreground">Fixos</p>
            <p className="text-base sm:text-lg font-bold text-primary whitespace-nowrap">
              R$ {totalFixed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex sm:flex-col items-center justify-between sm:justify-center sm:text-center gap-2">
            <p className="text-sm text-muted-foreground">Variáveis</p>
            <p className="text-base sm:text-lg font-bold text-secondary whitespace-nowrap">
              R$ {totalVariable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex sm:flex-col items-center justify-between sm:justify-center sm:text-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
            <p className="text-sm text-muted-foreground font-medium">Total Mensal</p>
            <p className="text-base sm:text-lg font-bold whitespace-nowrap">
              R$ {totalAll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Costs List */}
        <div className="space-y-2">
          {costs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum custo cadastrado</p>
              <p className="text-sm">Adicione seus custos fixos mensais</p>
            </div>
          ) : (
            costs.map((cost) => (
              <div
                key={cost.id}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {editingId === cost.id ? (
                  <div className="flex flex-col gap-2">
                    {/* Row 1: Name input full width */}
                    <Input
                      value={editCost.name}
                      onChange={(e) => setEditCost({ ...editCost, name: e.target.value })}
                      placeholder="Nome do custo"
                      className="w-full"
                      autoFocus
                    />
                    {/* Row 2: Category selector (only for variable costs) */}
                    {editCost.is_variable && (
                      <Select
                        value={editCost.category_id}
                        onValueChange={(value) => setEditCost({ ...editCost, category_id: value === "none" ? "" : value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione uma categoria para análise" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">Sem categoria</span>
                          </SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <span>{cat.icon || "📁"} {cat.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {/* Row 3: Value + Switch + Actions */}
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={editCost.amount}
                        onChange={(e) => setEditCost({ ...editCost, amount: e.target.value })}
                        placeholder="Valor"
                        className="w-28 flex-shrink-0"
                      />
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <Switch
                          checked={editCost.is_variable}
                          onCheckedChange={(checked) => setEditCost({ ...editCost, is_variable: checked, category_id: checked ? editCost.category_id : "" })}
                        />
                        <span className="text-xs text-muted-foreground">Var</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(cost.id)}
                          disabled={isSaving}
                          className="h-8 w-8"
                        >
                          <Check className="h-4 w-4 text-success" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          disabled={isSaving}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${cost.is_variable ? 'bg-secondary' : 'bg-primary'}`}
                        />
                        <span className="font-medium">{cost.name}</span>
                        {cost.is_variable && (
                          <span className="text-xs bg-secondary/20 text-secondary-foreground px-2 py-0.5 rounded font-medium">
                            Variável
                          </span>
                        )}
                      </div>
                      {cost.is_variable && cost.category_id && (
                        <div className="flex items-center gap-1 ml-5 text-xs text-muted-foreground">
                          <Tag className="h-3 w-3" />
                          <span>{getCategoryName(cost.category_id)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        R$ {cost.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(cost)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(cost.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add New Cost */}
        {isAdding ? (
          <div className="flex flex-col gap-3 p-3 border-2 border-dashed border-primary/50 rounded-lg bg-primary/5">
            <div className="flex gap-2">
              <Input
                value={newCost.name}
                onChange={(e) => setNewCost({ ...newCost, name: e.target.value })}
                placeholder="Nome (ex: Aluguel)"
                className="flex-1 min-w-0"
                autoFocus
              />
              <Input
                type="number"
                step="0.01"
                value={newCost.amount}
                onChange={(e) => setNewCost({ ...newCost, amount: e.target.value })}
                placeholder="Valor"
                className="w-24 sm:w-28"
              />
            </div>
            {/* Category selector (only for variable costs) */}
            {newCost.is_variable && (
              <Select
                value={newCost.category_id}
                onValueChange={(value) => setNewCost({ ...newCost, category_id: value === "none" ? "" : value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma categoria para análise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">Sem categoria</span>
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span>{cat.icon || "📁"} {cat.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={newCost.is_variable}
                  onCheckedChange={(checked) => setNewCost({ ...newCost, is_variable: checked, category_id: checked ? newCost.category_id : "" })}
                />
                <span className="text-xs text-muted-foreground">Variável</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={isSaving}
                  className="h-8"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                onClick={() => {
                  setIsAdding(false);
                  setNewCost({ name: "", amount: "", is_variable: false, category_id: "" });
                  }}
                  disabled={isSaving}
                  className="h-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Custo Fixo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
