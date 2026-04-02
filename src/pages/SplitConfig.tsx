import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Percent, Wallet, Shield, Building2, AlertCircle, CheckCircle2,
  Plus, Trash2, Copy, Save, BookMarked, Star, StarOff,
  Briefcase, PiggyBank, Heart, Home, Car, GraduationCap, Plane, ShoppingBag, X,
} from "lucide-react";
import { toast } from "sonner";
import { useSplitRules, SplitRule } from "@/hooks/useSplitRules";
import { useUserPlan } from "@/hooks/useUserPlan";
import { UpgradePrompt } from "@/components/plans/UpgradePrompt";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SplitCategory {
  id: string;
  name: string;
  percentage: number;
  icon: string;
}

const AVAILABLE_ICONS = [
  { key: "wallet", icon: Wallet, label: "Carteira", color: "text-emerald-500" },
  { key: "shield", icon: Shield, label: "Escudo", color: "text-blue-500" },
  { key: "building", icon: Building2, label: "Empresa", color: "text-purple-500" },
  { key: "briefcase", icon: Briefcase, label: "Trabalho", color: "text-amber-500" },
  { key: "piggybank", icon: PiggyBank, label: "Poupança", color: "text-pink-500" },
  { key: "heart", icon: Heart, label: "Saúde", color: "text-red-500" },
  { key: "home", icon: Home, label: "Casa", color: "text-cyan-500" },
  { key: "car", icon: Car, label: "Veículo", color: "text-orange-500" },
  { key: "graduation", icon: GraduationCap, label: "Educação", color: "text-indigo-500" },
  { key: "plane", icon: Plane, label: "Viagem", color: "text-teal-500" },
  { key: "shopping", icon: ShoppingBag, label: "Compras", color: "text-rose-500" },
  { key: "percent", icon: Percent, label: "Geral", color: "text-sky-500" },
];

const getIconData = (key: string) => AVAILABLE_ICONS.find(i => i.key === key) || AVAILABLE_ICONS[0];

const DEFAULT_CATEGORIES: SplitCategory[] = [
  { id: "1", name: "Pessoal", percentage: 45, icon: "wallet" },
  { id: "2", name: "Reserva", percentage: 45, icon: "shield" },
  { id: "3", name: "Empresa", percentage: 10, icon: "building" },
];

const SplitConfig = () => {
  const { rules, loading: rulesLoading, saveRule, updateRule, deleteRule } = useSplitRules();
  const { canUseSplit } = useUserPlan();

  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [categories, setCategories] = useState<SplitCategory[]>(DEFAULT_CATEGORIES);
  const [calculated, setCalculated] = useState(false);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [savingRule, setSavingRule] = useState(false);

  const total = categories.reduce((sum, c) => sum + c.percentage, 0);
  const isValid = total === 100;

  const parsedAmount = useMemo(() => {
    const val = amount.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(val);
    return isNaN(num) || num <= 0 ? 0 : num;
  }, [amount]);

  const results = useMemo(() => {
    if (parsedAmount <= 0 || !isValid) return null;
    let remaining = parsedAmount;
    return categories.map((cat, i) => {
      const isLast = i === categories.length - 1;
      const val = isLast
        ? Math.round(remaining * 100) / 100
        : Math.floor(parsedAmount * cat.percentage / 100 * 100) / 100;
      if (!isLast) remaining -= val;
      return { ...cat, value: val };
    });
  }, [parsedAmount, categories, isValid]);

  const updatePercentage = (id: string, value: number) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, percentage: Math.max(0, Math.min(100, value)) } : c));
    setCalculated(false);
  };

  const updateCategoryName = (id: string, name: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  };

  const updateCategoryIcon = (id: string, icon: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, icon } : c));
  };

  const addCategory = () => {
    setCategories(prev => [...prev, { id: String(Date.now()), name: "Nova", percentage: 0, icon: "percent" }]);
    setCalculated(false);
  };

  const removeCategory = (id: string) => {
    if (categories.length <= 2) { toast.error("Mínimo de 2 categorias"); return; }
    setCategories(prev => prev.filter(c => c.id !== id));
    setCalculated(false);
  };

  const handleCalculate = () => {
    if (parsedAmount <= 0) { toast.error("Insira um valor válido"); return; }
    if (!isValid) { toast.error("A soma dos percentuais deve ser 100%"); return; }
    setCalculated(true);
  };

  const handleCopyResults = () => {
    if (!results) return;
    const text = [
      `💰 Divisão de R$ ${parsedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      source ? `📌 Fonte: ${source}` : "",
      "",
      ...results.map(r => `• ${r.name} (${r.percentage}%): R$ ${r.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`),
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Resultado copiado!");
  };

  const loadSavedRule = (rule: SplitRule) => {
    setCategories([
      { id: "1", name: "Pessoal", percentage: Number(rule.personal_percentage), icon: "wallet" },
      { id: "2", name: "Reserva", percentage: Number(rule.reserve_percentage), icon: "shield" },
      { id: "3", name: "Empresa", percentage: Number(rule.business_percentage), icon: "building" },
    ]);
    setCalculated(false);
    toast.success(`Regra "${rule.name}" carregada`);
  };

  const handleSaveRule = async () => {
    if (!ruleName.trim()) { toast.error("Insira um nome para a regra"); return; }
    if (!isValid) { toast.error("A soma deve ser 100%"); return; }
    setSavingRule(true);
    try {
      const personal = categories[0]?.percentage || 0;
      const reserve = categories[1]?.percentage || 0;
      const business = categories[2]?.percentage || 0;
      await saveRule({ name: ruleName.trim(), personal_percentage: personal, reserve_percentage: reserve, business_percentage: business, is_active: false });
      toast.success("Regra salva!");
      setSaveDialogOpen(false);
      setRuleName("");
    } catch {
      toast.error("Erro ao salvar regra");
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try { await deleteRule(id); toast.success("Regra excluída"); } catch { toast.error("Erro ao excluir"); }
  };

  const handleToggleFavorite = async (rule: SplitRule) => {
    try {
      await updateRule(rule.id, { is_active: !rule.is_active });
      toast.success(rule.is_active ? "Removida dos favoritos" : "Marcada como favorita");
    } catch { toast.error("Erro ao atualizar"); }
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  if (!canUseSplit()) {
    return (
      <AppLayout title="Divisão Automática">
        <div className="max-w-2xl mx-auto p-4">
          <UpgradePrompt feature="Divisão Automática" description="Calcule divisões de receita por percentual e salve regras personalizadas." requiredPlan="pro" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Divisão Automática">
      <div className="max-w-2xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Percent className="h-6 w-6 text-primary" />
            Calculadora de Divisão
          </h1>
          <p className="text-muted-foreground mt-1">
            Insira o valor, a fonte e defina os percentuais para calcular a divisão.
          </p>
        </div>

        {/* Saved Rules */}
        {rules.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookMarked className="h-5 w-5 text-primary" />
                Regras Salvas
              </CardTitle>
              <CardDescription>Clique para carregar uma regra nos campos abaixo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {rules.map(rule => {
                const isFav = rule.is_active;
                return (
                  <div key={rule.id} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <button onClick={() => handleToggleFavorite(rule)} className="shrink-0">
                      {isFav ? <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <button onClick={() => loadSavedRule(rule)} className="flex-1 text-left">
                      <p className="font-medium text-sm">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(rule.personal_percentage)}% Pessoal · {Number(rule.reserve_percentage)}% Reserva · {Number(rule.business_percentage)}% Empresa
                      </p>
                    </button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDeleteRule(rule.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Input Card */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Dados da Receita</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor recebido (R$)</Label>
              <Input id="amount" type="text" inputMode="decimal" placeholder="0,00" value={amount}
                onChange={(e) => {
                  const val = e.target.value.replace(".", ",");
                  if (/^-?\d*,?\d{0,2}$/.test(val) || val === "") { setAmount(val); setCalculated(false); }
                }} className="text-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Fonte / Origem (opcional)</Label>
              <Input id="source" placeholder='Ex: "CLT", "Freelance", "Ganho pessoal"' value={source} onChange={(e) => setSource(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Percentages Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Regra de Divisão</CardTitle>
              <Button variant="outline" size="sm" onClick={() => { setRuleName(""); setSaveDialogOpen(true); }} disabled={!isValid}>
                <Save className="h-4 w-4 mr-1" /> Salvar Regra
              </Button>
            </div>
            <CardDescription>Defina os percentuais. A soma deve ser 100%.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {categories.map((cat) => {
              const iconData = getIconData(cat.icon);
              const IconComp = iconData.icon;
              return (
                <div key={cat.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors" title="Trocar ícone">
                          <IconComp className={`h-4 w-4 ${iconData.color}`} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" align="start">
                        <p className="text-xs text-muted-foreground mb-2 px-1">Escolha um ícone</p>
                        <div className="grid grid-cols-4 gap-1">
                          {AVAILABLE_ICONS.map(ai => {
                            const AiIcon = ai.icon;
                            return (
                              <button key={ai.key} onClick={() => updateCategoryIcon(cat.id, ai.key)}
                                className={`p-2 rounded-md hover:bg-muted transition-colors ${cat.icon === ai.key ? "bg-primary/10 ring-1 ring-primary" : ""}`}
                                title={ai.label}>
                                <AiIcon className={`h-4 w-4 ${ai.color}`} />
                              </button>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Input value={cat.name} onChange={(e) => updateCategoryName(cat.id, e.target.value)}
                      className="h-7 text-sm font-medium flex-1 border-transparent hover:border-input focus:border-input bg-transparent px-1" />
                    <Input type="number" min={0} max={100} value={cat.percentage}
                      onChange={(e) => updatePercentage(cat.id, parseInt(e.target.value) || 0)}
                      className="w-20 h-8 text-right text-sm" />
                    <span className="text-muted-foreground text-sm">%</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeCategory(cat.id)} disabled={categories.length <= 2}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Slider value={[cat.percentage]} onValueChange={([v]) => updatePercentage(cat.id, v)} max={100} step={1} />
                </div>
              );
            })}

            <Button variant="outline" size="sm" className="w-full" onClick={addCategory}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Categoria
            </Button>

            <div className={`flex items-center justify-between p-3 rounded-lg border ${isValid ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
              <span className="font-medium flex items-center gap-2">
                {isValid ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                Total
              </span>
              <Badge variant={isValid ? "default" : "destructive"}>{total}%</Badge>
            </div>

            <Button className="w-full" onClick={handleCalculate} disabled={!isValid || parsedAmount <= 0}>
              Calcular Divisão
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {calculated && results && (
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Resultado da Divisão</CardTitle>
                <Button variant="outline" size="sm" onClick={handleCopyResults}>
                  <Copy className="h-4 w-4 mr-1" /> Copiar
                </Button>
              </div>
              {source && <CardDescription>Fonte: {source}</CardDescription>}
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-center">
                <p className="text-sm text-muted-foreground">Valor total</p>
                <p className="text-2xl font-bold">R$ {fmt(parsedAmount)}</p>
              </div>
              <div className="space-y-3">
                {results.map((r) => {
                  const iconData = getIconData(r.icon);
                  const IconComp = iconData.icon;
                  return (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <div className="flex items-center gap-2">
                        <IconComp className={`h-5 w-5 ${iconData.color}`} />
                        <div>
                          <p className="font-medium text-sm">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.percentage}%</p>
                        </div>
                      </div>
                      <p className="font-bold">R$ {fmt(r.value)}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Save Rule Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Regra de Divisão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da regra</Label>
              <Input placeholder='Ex: "Divisão CLT", "Freelance 50/30/20"' value={ruleName} onChange={(e) => setRuleName(e.target.value)} />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              {categories.map(c => {
                const iconData = getIconData(c.icon);
                const IconComp = iconData.icon;
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <IconComp className={`h-4 w-4 ${iconData.color}`} />
                    <span>{c.name}: {c.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveRule} disabled={savingRule || !ruleName.trim()}>
              {savingRule ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default SplitConfig;
