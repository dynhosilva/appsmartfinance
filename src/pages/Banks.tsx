import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Building2, User, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/AppLayout";
import { BankCard } from "@/components/banks/BankCard";
import { BankFormDialog } from "@/components/banks/BankFormDialog";
import { BanksOverview } from "@/components/banks/BanksOverview";
import { useBanks, Bank, BankFormData } from "@/hooks/useBanks";
import { useUserPlan } from "@/hooks/useUserPlan";
import { Skeleton } from "@/components/ui/skeleton";
import { FinancialProfile } from "@/components/dashboard/ProfileSwitcher";
import { LimitWarning } from "@/components/plans/LimitWarning";
import { toast } from "sonner";

const Banks = () => {
  const navigate = useNavigate();
  const [currentProfile, setCurrentProfile] = useState<FinancialProfile>("personal");
  const { banks, loading, createBank, updateBank, deleteBank, uploadLogo } = useBanks(currentProfile);
  const { plan, usage, canAddBank, canUseBusinessProfile, refetch: refetchPlan } = useUserPlan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredBanks = banks.filter(
    (bank) =>
      bank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bank.notes && bank.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleEdit = (bank: Bank) => {
    setEditingBank(bank);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteBank(id);
  };

  const handleSubmit = async (data: BankFormData, logoFile?: File) => {
    setSubmitting(true);
    try {
      if (editingBank) {
        const success = await updateBank(editingBank.id, data);
        if (success && logoFile) {
          await uploadLogo(logoFile, editingBank.id);
        }
      } else {
        const newBank = await createBank(data);
        if (newBank && logoFile) {
          await uploadLogo(logoFile, newBank.id);
        }
        // Refetch plan usage after creating a bank
        refetchPlan();
      }
      setDialogOpen(false);
      setEditingBank(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDialog = () => {
    if (!canAddBank()) {
      toast.error(`Limite de ${plan.max_banks} bancos atingido. Faça upgrade para adicionar mais.`);
      navigate("/upgrade");
      return;
    }
    setEditingBank(null);
    setDialogOpen(true);
  };

  const handleProfileChange = (profile: FinancialProfile) => {
    if (profile === "business" && !canUseBusinessProfile()) {
      toast.error("Perfil empresarial disponível apenas no plano Business");
      navigate("/upgrade");
      return;
    }
    setCurrentProfile(profile);
  };

  const isPersonal = currentProfile === "personal";

  return (
    <AppLayout 
      showProfileSwitcher 
      currentProfile={currentProfile} 
      onProfileChange={handleProfileChange}
      title="Meus Bancos"
    >
      <div className="space-y-6">
        {/* Limit Warning */}
        <LimitWarning 
          resource="bancos" 
          current={usage.banks_count} 
          max={plan.max_banks} 
        />
        {/* Header with profile indicator */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isPersonal ? 'bg-primary/10' : 'bg-secondary/10'}`}>
              {isPersonal ? (
                <User className="h-6 w-6 text-primary" />
              ) : (
                <Building2 className="h-6 w-6 text-secondary" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Bancos {isPersonal ? 'Pessoais' : 'Empresariais'}
              </h1>
              <p className="text-muted-foreground">
                Gerencie suas contas {isPersonal ? 'pessoais' : 'empresariais'}
              </p>
            </div>
          </div>
          <Button onClick={handleOpenDialog} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Novo Banco
          </Button>
        </div>

        {/* Overview Cards */}
        {!loading && banks.length > 0 && <BanksOverview banks={banks} />}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar bancos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Banks List */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : filteredBanks.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? "Nenhum banco encontrado" : `Nenhum banco ${isPersonal ? 'pessoal' : 'empresarial'} cadastrado`}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Tente buscar com outros termos"
                : `Comece cadastrando seu primeiro banco ${isPersonal ? 'pessoal' : 'empresarial'}`}
            </p>
            {!searchQuery && (
              <Button onClick={handleOpenDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Banco
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredBanks.map((bank) => (
              <BankCard
                key={bank.id}
                bank={bank}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <BankFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bank={editingBank}
        onSubmit={handleSubmit}
        loading={submitting}
        defaultProfileType={currentProfile}
      />
    </AppLayout>
  );
};

export default Banks;
