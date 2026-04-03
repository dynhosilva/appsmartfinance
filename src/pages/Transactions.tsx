import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TrendingUp, TrendingDown, Loader2, User, Building2, Landmark, Wallet, Banknote, CreditCard, ShieldCheck, ShieldOff } from "lucide-react";
import pixIcon from "@/assets/pix-icon.png";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { FinancialProfile } from "@/components/dashboard/ProfileSwitcher";
import { useBanks, Bank } from "@/hooks/useBanks";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const Transactions = () => {
  const [searchParams] = useSearchParams();
  const initialProfile = (searchParams.get("profile") as FinancialProfile) || "personal";
  
  const [currentProfile, setCurrentProfile] = useState<FinancialProfile>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const { banks, allBanks, loadBanks, loadAllBanks } = useBanks(currentProfile);
  const [formData, setFormData] = useState({
    amount: "",
    type: "expense" as "income" | "expense",
    categoryId: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    profileType: initialProfile as "personal" | "business",
    bankId: "" as string,
    isEssential: null as boolean | null,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    setFormData(prev => ({ ...prev, profileType: currentProfile }));
  }, [currentProfile]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    
    if (data) {
      setCategories(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, categoryId: data[0].id }));
      }
      setDataReady(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(formData.amount.replace(/\./g, '').replace(',', '.'));
    if (!formData.amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Por favor, insira um valor válido");
      return;
    }

    const selectedCategory = categories.find(c => c.id === formData.categoryId);
    const isNaoSeiCategory = selectedCategory?.name?.toLowerCase().trim() === "não sei";
    
    if (formData.type === "expense" && formData.isEssential === null && !isNaoSeiCategory) {
      toast.error("Por favor, marque se a transação é essencial ou não essencial");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const amount = parsedAmount;
      // Set bank_id to null for non-bank payment methods (pix, cash, card)
      const isNonBankPayment = !formData.bankId || formData.bankId === "pix" || formData.bankId === "cash" || formData.bankId === "card";
      const selectedBankId = isNonBankPayment ? null : formData.bankId;

      // Insert the transaction
      const { error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          amount,
          type: formData.type,
          category_id: formData.categoryId || null,
          description: formData.description || null,
          date: formData.date,
          transaction_time: formData.time || null,
          profile_type: formData.profileType,
          bank_id: selectedBankId,
          is_essential: formData.isEssential,
        });

      if (error) throw error;

      // Update bank balance only if a real bank was selected (not pix, cash, or card)
      if (selectedBankId) {
        const selectedBank = allBanks.find(b => b.id === selectedBankId);
        if (selectedBank) {
          const balanceChange = formData.type === "income" ? amount : -amount;
          const newBalance = selectedBank.current_balance + balanceChange;
          
          await supabase
            .from("banks")
            .update({ current_balance: newBalance })
            .eq("id", selectedBankId);
        }
      }

      const profileLabel = formData.profileType === "personal" ? "pessoal" : "empresarial";
      toast.success(`Transação ${profileLabel} registrada com sucesso!`);
      
      // Reload all banks to get updated balances
      await Promise.all([loadBanks(), loadAllBanks()]);
      
      // Reset form to allow adding more transactions
      setFormData({
        amount: "",
        type: "expense",
        categoryId: categories[0]?.id || "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
        profileType: currentProfile,
        bankId: "",
        isEssential: null,
      });
    } catch (error: any) {
      toast.error("Erro ao registrar transação: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isPersonal = currentProfile === "personal";

  return (
    <AppLayout 
      showProfileSwitcher 
      currentProfile={currentProfile} 
      onProfileChange={setCurrentProfile}
      title="Nova Transação"
    >
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isPersonal ? 'bg-primary/10' : 'bg-secondary/10'}`}>
                {isPersonal ? (
                  <User className="h-5 w-5 text-primary" />
                ) : (
                  <Building2 className="h-5 w-5 text-secondary" />
                )}
              </div>
              <div>
                <CardTitle>Registrar Transação {isPersonal ? 'Pessoal' : 'Empresarial'}</CardTitle>
                <CardDescription>
                  Registre suas {isPersonal ? 'entradas e saídas pessoais' : 'movimentações empresariais'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Type Selection */}
              <div className="space-y-2">
                <Label>Perfil *</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={formData.profileType === "personal" ? "default" : "outline"}
                    className={formData.profileType === "personal" ? "bg-primary hover:bg-primary/90" : ""}
                    onClick={() => {
                      setFormData({ ...formData, profileType: "personal" });
                      setCurrentProfile("personal");
                    }}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Pessoal
                  </Button>
                  <Button
                    type="button"
                    variant={formData.profileType === "business" ? "default" : "outline"}
                    className={formData.profileType === "business" ? "bg-secondary hover:bg-secondary/90" : ""}
                    onClick={() => {
                      setFormData({ ...formData, profileType: "business" });
                      setCurrentProfile("business");
                    }}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    Empresarial
                  </Button>
                </div>
              </div>

              {/* Type Selection */}
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={formData.type === "income" ? "default" : "outline"}
                    className={formData.type === "income" ? "bg-success hover:bg-success/90" : ""}
                    onClick={() => setFormData({ ...formData, type: "income", isEssential: null })}
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Receita
                  </Button>
                  <Button
                    type="button"
                    variant={formData.type === "expense" ? "default" : "outline"}
                    className={formData.type === "expense" ? "bg-danger hover:bg-danger/90" : ""}
                    onClick={() => setFormData({ ...formData, type: "expense" })}
                  >
                    <TrendingDown className="mr-2 h-4 w-4" />
                    Despesa
                  </Button>
                </div>
              </div>

              {/* Essential / Non-Essential - only for expenses */}
              {formData.type === "expense" && (
              <div className="space-y-2">
                <Label>Essencialidade *</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={formData.isEssential === true ? "default" : "outline"}
                    className={formData.isEssential === true ? "bg-info hover:bg-info/90" : ""}
                    onClick={() => setFormData({ ...formData, isEssential: true })}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Essencial
                  </Button>
                  <Button
                    type="button"
                    variant={formData.isEssential === false ? "default" : "outline"}
                    className={formData.isEssential === false ? "bg-warning hover:bg-warning/90" : ""}
                    onClick={() => setFormData({ ...formData, isEssential: false })}
                  >
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Não Essencial
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.isEssential === null
                    ? "Selecione se esta transação é essencial ou não essencial"
                    : formData.isEssential 
                      ? "Gastos necessários como moradia, alimentação, transporte" 
                      : "Gastos opcionais como lazer, assinaturas dispensáveis"}
                </p>
              </div>
              )}

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => {
                    const val = e.target.value.replace('.', ',');
                    if (/^-?\d*,?\d{0,2}$/.test(val) || val === "" || val === "-") {
                      setFormData({ ...formData, amount: val });
                    }
                  }}
                  required
                  className="text-lg"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Hora</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                {dataReady ? (
                <Select
                  value={formData.categoryId || undefined}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                ) : (
                  <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                    Carregando...
                  </div>
                )}
              </div>

              {/* Bank/Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="bank">Meio de Pagamento (opcional)</Label>
              <Select
                  value={formData.bankId || "pix"}
                  onValueChange={(value) => setFormData({ ...formData, bankId: value === "pix" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o meio de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">
                      <div className="flex items-center gap-2">
                        <img src={pixIcon} alt="Pix" className="h-4 w-4" />
                        Pix
                      </div>
                    </SelectItem>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Dinheiro
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Cartão
                      </div>
                    </SelectItem>
                    {allBanks.filter(b => b.is_active).map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: bank.color }}
                          />
                          {bank.name}
                          <span className="text-muted-foreground text-xs ml-2">
                            R$ {bank.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se selecionar um banco, o saldo será atualizado automaticamente
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Detalhes sobre a transação..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit" 
                className={`w-full h-12 ${isPersonal ? 'bg-gradient-to-r from-primary to-primary-glow' : 'bg-gradient-to-r from-secondary to-info'} hover:opacity-90`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Registrar Transação {isPersonal ? 'Pessoal' : 'Empresarial'}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Transactions;
