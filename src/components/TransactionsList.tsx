import { useState, useEffect, useMemo } from "react";
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth, isThisYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Trash2, TrendingUp, TrendingDown, Loader2, Save, User, Building2, Calendar, CheckSquare, Square, Landmark, Wallet, CreditCard, Banknote, ShieldCheck, ShieldOff } from "lucide-react";
import pixIcon from "@/assets/pix-icon.png";
import { toast } from "sonner";
import { z } from "zod";
import { FinancialProfile } from "@/components/dashboard/ProfileSwitcher";

interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  description: string | null;
  date: string;
  created_at: string | null;
  transaction_time: string | null;
  category_id: string | null;
  bank_id: string | null;
  profile_type: "personal" | "business";
  is_essential: boolean | null;
  categories?: {
    name: string;
    icon: string;
    color: string;
  } | null;
  banks?: {
    name: string;
    color: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Bank {
  id: string;
  name: string;
  color: string;
  current_balance: number;
  is_active: boolean;
}

export interface TransactionsListFilters {
  categories?: string[];
  transactionType?: "all" | "income" | "expense";
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: string;
  maxAmount?: string;
}

interface TransactionsListProps {
  profileType?: FinancialProfile;
  filters?: TransactionsListFilters;
  searchQuery?: string;
}

const transactionSchema = z.object({
  amount: z.number().positive("Valor deve ser maior que zero").max(999999999.99, "Valor muito alto"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  description: z.string().max(500, "Descrição muito longa (máx. 500 caracteres)").optional(),
  category_id: z.string().uuid("Categoria inválida").optional(),
  bank_id: z.string().uuid("Banco inválido").optional().nullable(),
});

const ITEMS_PER_PAGE = 20;

export const TransactionsList = ({ profileType = "personal", filters, searchQuery }: TransactionsListProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [editForm, setEditForm] = useState({
    amount: "",
    date: "",
    time: "",
    description: "",
    category_id: "",
    bank_id: "" as string,
    profile_type: "personal" as "personal" | "business",
    is_essential: null as boolean | null,
  });

  useEffect(() => {
    setCurrentPage(1);
    loadData(1);
  }, [profileType, filters, searchQuery]);

  useEffect(() => {
    loadData(currentPage);
  }, [currentPage]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const loadData = async (page: number = 1) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Build base query for count
      let countQuery = supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("profile_type", profileType);

      // Build base query for data
      let dataQuery = supabase
        .from("transactions")
        .select(`
          *,
          categories (
            name,
            icon,
            color
          ),
          banks (
            name,
            color
          )
        `)
        .eq("user_id", user.id)
        .eq("profile_type", profileType);

      // Apply filters if provided
      if (filters) {
        // Category filter
        if (filters.categories && filters.categories.length > 0) {
          countQuery = countQuery.in("category_id", filters.categories);
          dataQuery = dataQuery.in("category_id", filters.categories);
        }

        // Transaction type filter
        if (filters.transactionType && filters.transactionType !== "all") {
          countQuery = countQuery.eq("type", filters.transactionType);
          dataQuery = dataQuery.eq("type", filters.transactionType);
        }

        // Date filters
        if (filters.dateFrom) {
          const dateFromStr = format(filters.dateFrom, "yyyy-MM-dd");
          countQuery = countQuery.gte("date", dateFromStr);
          dataQuery = dataQuery.gte("date", dateFromStr);
        }
        if (filters.dateTo) {
          const dateToStr = format(filters.dateTo, "yyyy-MM-dd");
          countQuery = countQuery.lte("date", dateToStr);
          dataQuery = dataQuery.lte("date", dateToStr);
        }

        // Amount filters
        if (filters.minAmount) {
          const minAmt = parseFloat(filters.minAmount);
          if (!isNaN(minAmt)) {
            countQuery = countQuery.gte("amount", minAmt);
            dataQuery = dataQuery.gte("amount", minAmt);
          }
        }
        if (filters.maxAmount) {
          const maxAmt = parseFloat(filters.maxAmount);
          if (!isNaN(maxAmt)) {
            countQuery = countQuery.lte("amount", maxAmt);
            dataQuery = dataQuery.lte("amount", maxAmt);
          }
        }
      }

      // Apply search query filter
      if (searchQuery && searchQuery.trim()) {
        countQuery = countQuery.ilike("description", `%${searchQuery.trim()}%`);
        dataQuery = dataQuery.ilike("description", `%${searchQuery.trim()}%`);
      }

      // Get total count
      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Load transactions with pagination
      const { data: transactionsData } = await dataQuery
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      // Load categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      // Load banks
      const { data: banksData } = await supabase
        .from("banks")
        .select("id, name, color, current_balance, is_active")
        .eq("user_id", user.id)
        .order("name");

      if (transactionsData) setTransactions(transactionsData as Transaction[]);
      if (categoriesData) setCategories(categoriesData);
      if (banksData) setBanks(banksData as Bank[]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      amount: transaction.amount.toString(),
      date: transaction.date,
      time: transaction.transaction_time ? transaction.transaction_time.slice(0, 5) : "",
      description: transaction.description || "",
      category_id: transaction.category_id || "",
      bank_id: transaction.bank_id || "",
      profile_type: transaction.profile_type,
      is_essential: transaction.is_essential,
    });
    setIsDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    try {
      // Validar dados
      const validatedData = transactionSchema.parse({
        amount: parseFloat(editForm.amount),
        date: editForm.date,
        description: editForm.description || undefined,
        category_id: editForm.category_id || undefined,
        bank_id: editForm.bank_id || null,
      });

      if (isNaN(parseFloat(editForm.amount)) || parseFloat(editForm.amount) <= 0) {
        toast.error("Valor inválido");
        return;
      }

      setIsSaving(true);

      const oldBankId = editingTransaction.bank_id;
      const newBankId = editForm.bank_id || null;
      const oldAmount = editingTransaction.amount;
      const newAmount = validatedData.amount;
      const transactionType = editingTransaction.type;

      // Revert old bank balance if it had a bank
      if (oldBankId) {
        const oldBank = banks.find(b => b.id === oldBankId);
        if (oldBank) {
          const revertChange = transactionType === "income" ? -oldAmount : oldAmount;
          const revertedBalance = oldBank.current_balance + revertChange;
          await supabase
            .from("banks")
            .update({ current_balance: revertedBalance })
            .eq("id", oldBankId);
        }
      }

      // Apply new bank balance if new bank selected
      if (newBankId) {
        const newBank = banks.find(b => b.id === newBankId);
        if (newBank) {
          const balanceChange = transactionType === "income" ? newAmount : -newAmount;
          // If it's the same bank, we already reverted, so start from there
          const baseBalance = oldBankId === newBankId 
            ? (banks.find(b => b.id === newBankId)?.current_balance || 0) + (transactionType === "income" ? -oldAmount : oldAmount)
            : newBank.current_balance;
          const newBalance = baseBalance + balanceChange;
          await supabase
            .from("banks")
            .update({ current_balance: newBalance })
            .eq("id", newBankId);
        }
      }

      const { error } = await supabase
        .from("transactions")
        .update({
          amount: validatedData.amount,
          date: validatedData.date,
          transaction_time: editForm.time || null,
          description: validatedData.description || null,
          category_id: validatedData.category_id || null,
          bank_id: newBankId,
          profile_type: editForm.profile_type,
          is_essential: editForm.is_essential,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingTransaction.id);

      if (error) throw error;

      toast.success("Transação atualizada com sucesso!");
      setIsDialogOpen(false);
      loadData(currentPage);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao atualizar transação: " + error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;

    try {
      // Find the transaction to get bank info
      const transaction = transactions.find(t => t.id === id);
      
      // Revert bank balance if transaction had a bank
      if (transaction?.bank_id) {
        const bank = banks.find(b => b.id === transaction.bank_id);
        if (bank) {
          const revertChange = transaction.type === "income" ? -transaction.amount : transaction.amount;
          const newBalance = bank.current_balance + revertChange;
          await supabase
            .from("banks")
            .update({ current_balance: newBalance })
            .eq("id", transaction.bank_id);
        }
      }

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Transação excluída com sucesso!");
      loadData(currentPage);
    } catch (error: any) {
      toast.error("Erro ao excluir transação: " + error.message);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const handleBulkEssential = async (isEssential: boolean) => {
    if (selectedIds.size === 0) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .update({ is_essential: isEssential })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} transação(ões) marcada(s) como ${isEssential ? "essencial" : "não essencial"}!`);
      setSelectedIds(new Set());
      loadData(currentPage);
    } catch (error: any) {
      toast.error("Erro ao atualizar transações: " + error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      // Calculate bank balance adjustments
      const bankAdjustments: { [bankId: string]: number } = {};
      
      for (const id of selectedIds) {
        const transaction = transactions.find(t => t.id === id);
        if (transaction?.bank_id) {
          const adjustment = transaction.type === "income" ? -transaction.amount : transaction.amount;
          bankAdjustments[transaction.bank_id] = (bankAdjustments[transaction.bank_id] || 0) + adjustment;
        }
      }

      // Apply bank adjustments
      for (const [bankId, adjustment] of Object.entries(bankAdjustments)) {
        const bank = banks.find(b => b.id === bankId);
        if (bank) {
          const newBalance = bank.current_balance + adjustment;
          await supabase
            .from("banks")
            .update({ current_balance: newBalance })
            .eq("id", bankId);
        }
      }

      const { error } = await supabase
        .from("transactions")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} transação(ões) excluída(s) com sucesso!`);
      setSelectedIds(new Set());
      setIsDeleteDialogOpen(false);
      loadData(currentPage);
    } catch (error: any) {
      toast.error("Erro ao excluir transações: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const isPersonal = profileType === "personal";
  const allSelected = transactions.length > 0 && selectedIds.size === transactions.length;
  const someSelected = selectedIds.size > 0;

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: { label: string; transactions: Transaction[]; totals: { income: number; expense: number } } } = {};
    
    transactions.forEach((transaction) => {
      const date = parseISO(transaction.date);
      let groupKey: string;
      let groupLabel: string;

      if (isToday(date)) {
        groupKey = "today";
        groupLabel = "Hoje";
      } else if (isYesterday(date)) {
        groupKey = "yesterday";
        groupLabel = "Ontem";
      } else if (isThisWeek(date)) {
        groupKey = format(date, "yyyy-MM-dd");
        groupLabel = format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
      } else if (isThisMonth(date)) {
        groupKey = format(date, "yyyy-MM-dd");
        groupLabel = format(date, "dd 'de' MMMM", { locale: ptBR });
      } else if (isThisYear(date)) {
        groupKey = format(date, "yyyy-MM-dd");
        groupLabel = format(date, "dd 'de' MMMM", { locale: ptBR });
      } else {
        groupKey = format(date, "yyyy-MM-dd");
        groupLabel = format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { label: groupLabel, transactions: [], totals: { income: 0, expense: 0 } };
      }
      groups[groupKey].transactions.push(transaction);
      
      const amount = parseFloat(transaction.amount.toString());
      if (transaction.type === "income") {
        groups[groupKey].totals.income += amount;
      } else {
        groups[groupKey].totals.expense += amount;
      }
    });

    // Sort by date (most recent first)
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === "today") return -1;
      if (b[0] === "today") return 1;
      if (a[0] === "yesterday") return -1;
      if (b[0] === "yesterday") return 1;
      return b[0].localeCompare(a[0]);
    });
  }, [transactions]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground mt-2">Carregando transações...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className={`p-3 rounded-full ${isPersonal ? 'bg-primary/10' : 'bg-secondary/10'} w-fit mx-auto mb-4`}>
            {isPersonal ? (
              <User className="h-8 w-8 text-primary" />
            ) : (
              <Building2 className="h-8 w-8 text-secondary" />
            )}
          </div>
          <p className="text-muted-foreground">
            Nenhuma transação {isPersonal ? 'pessoal' : 'empresarial'} encontrada
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 p-3 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 shrink-0" />
            ) : (
              <Square className="h-4 w-4 shrink-0" />
            )}
            <span className="hidden xs:inline">{allSelected ? "Desmarcar Todas" : "Selecionar Todas"}</span>
            <span className="xs:hidden">{allSelected ? "Desmarcar" : "Selecionar"}</span>
          </Button>
          {someSelected && (
            <span className="text-xs sm:text-sm text-muted-foreground">
              {selectedIds.size} selecionada(s)
            </span>
          )}
        </div>
        {someSelected && (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkEssential(true)}
              className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none border-info/50 text-info hover:bg-info/10"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Essencial</span>
              <span className="sm:hidden">Essencial</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkEssential(false)}
              className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none border-warning/50 text-warning hover:bg-warning/10"
            >
              <ShieldOff className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Não Essencial</span>
              <span className="sm:hidden">Não Ess.</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Excluir</span>
              <span className="sm:hidden">Excluir</span>
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {groupedTransactions.map(([groupKey, group]) => (
          <div key={groupKey} className="space-y-3">
            {/* Date Header */}
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 xs:gap-0 border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <h3 className="font-semibold text-xs sm:text-sm capitalize truncate">{group.label}</h3>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-xs ml-6 xs:ml-0">
                {group.totals.income > 0 && (
                  <span className="text-success font-medium whitespace-nowrap">
                    +R$ {group.totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
                {group.totals.expense > 0 && (
                  <span className="text-danger font-medium whitespace-nowrap">
                    -R$ {group.totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            {/* Transactions for this date */}
            <div className="space-y-2">
              {group.transactions.map((transaction) => (
                <Card 
                  key={transaction.id} 
                  className={`hover:shadow-md transition-shadow ${
                    selectedIds.has(transaction.id) ? "ring-2 ring-primary bg-primary/5" : ""
                  }`}
                >
                  <CardContent className="p-3">
                    {/* Mobile Layout */}
                    <div className="flex items-start gap-2">
                      {/* Checkbox */}
                      <Checkbox
                        checked={selectedIds.has(transaction.id)}
                        onCheckedChange={() => handleToggleSelect(transaction.id)}
                        className="shrink-0 mt-0.5"
                      />
                      
                      {/* Icon */}
                      <div className={`p-2 rounded-full shrink-0 ${
                        transaction.type === "income" 
                          ? "bg-success/10 text-success" 
                          : "bg-danger/10 text-danger"
                      }`}>
                        {transaction.type === "income" ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>
                      
                      {/* Main Content Area */}
                      <div className="flex-1 min-w-0">
                        {/* Top Row: Category + Value */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {transaction.categories && (
                              <span className="text-sm shrink-0">
                                {transaction.categories.icon}
                              </span>
                            )}
                            <span className="font-medium text-sm truncate">
                              {transaction.categories?.name || "Sem categoria"}
                            </span>
                          </div>
                          <p className={`text-sm font-bold whitespace-nowrap shrink-0 ${
                            transaction.type === "income" ? "text-success" : "text-danger"
                          }`}>
                            {transaction.type === "income" ? "+" : "-"}R$ {parseFloat(transaction.amount.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        
                        {/* Bottom Row: Description/Bank/Time + Actions */}
                        <div className="flex items-center justify-between gap-1 sm:gap-2 mt-1">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 min-w-0 flex-1">
                            {transaction.description && (
                              <p className="text-[11px] sm:text-xs text-muted-foreground truncate max-w-[80px] sm:max-w-none">
                                {transaction.description}
                              </p>
                            )}
                            {transaction.banks && (
                              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground shrink-0">
                                <div 
                                  className="w-2 h-2 rounded-full shrink-0" 
                                  style={{ backgroundColor: transaction.banks.color }}
                                />
                                <span className="truncate max-w-[40px] sm:max-w-[50px]">{transaction.banks.name}</span>
                              </div>
                            )}
                            {!transaction.banks && transaction.bank_id === null && (
                              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground shrink-0">
                                <Wallet className="h-3 w-3 shrink-0" />
                                <span className="hidden xs:inline">Dinheiro</span>
                                <span className="xs:hidden">$</span>
                              </div>
                            )}
                            {(transaction.transaction_time || transaction.created_at) && (
                              <span className="text-[11px] sm:text-xs text-muted-foreground shrink-0">
                                🕐 {transaction.transaction_time 
                                  ? transaction.transaction_time.slice(0, 5)
                                  : format(parseISO(transaction.created_at!), "HH:mm")}
                              </span>
                            )}
                          </div>
                          <div className="flex shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(transaction)}
                              className="h-7 w-7"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(transaction.id)}
                              className="h-7 w-7 text-danger hover:text-danger"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col items-center gap-3 sm:gap-4">
          <div className="text-xs sm:text-sm text-muted-foreground text-center px-2">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount}
          </div>
          <Pagination>
            <PaginationContent className="gap-0.5 sm:gap-1">
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={`h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3 ${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 3) {
                  pageNum = i + 1;
                } else if (currentPage <= 2) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 1) {
                  pageNum = totalPages - 2 + i;
                } else {
                  pageNum = currentPage - 1 + i;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer h-8 w-8 sm:h-9 sm:w-9 text-xs sm:text-sm"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={`h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3 ${currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias e clique em salvar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Profile Type */}
            <div className="space-y-2">
              <Label>Perfil</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={editForm.profile_type === "personal" ? "default" : "outline"}
                  className={editForm.profile_type === "personal" ? "bg-primary hover:bg-primary/90" : ""}
                  onClick={() => setEditForm({ ...editForm, profile_type: "personal" })}
                >
                  <User className="mr-2 h-4 w-4" />
                  Pessoal
                </Button>
                <Button
                  type="button"
                  variant={editForm.profile_type === "business" ? "default" : "outline"}
                  className={editForm.profile_type === "business" ? "bg-secondary hover:bg-secondary/90" : ""}
                  onClick={() => setEditForm({ ...editForm, profile_type: "business" })}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Empresarial
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">Valor (R$)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                className="text-lg"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Data</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time">Hora</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={editForm.time}
                  onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Categoria</Label>
              <Select
                value={editForm.category_id}
                onValueChange={(value) => setEditForm({ ...editForm, category_id: value })}
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bank">Meio de Pagamento</Label>
              <Select
                value={editForm.bank_id || "pix"}
                onValueChange={(value) => setEditForm({ ...editForm, bank_id: ["pix", "cash", "card"].includes(value) ? "" : value })}
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
                  {banks.filter(b => b.is_active).map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: bank.color }}
                        />
                        {bank.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Essential / Non-Essential */}
            <div className="space-y-2">
              <Label>Essencialidade</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={editForm.is_essential === true ? "default" : "outline"}
                  className={editForm.is_essential === true ? "bg-info hover:bg-info/90" : ""}
                  onClick={() => setEditForm({ ...editForm, is_essential: true })}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Essencial
                </Button>
                <Button
                  type="button"
                  variant={editForm.is_essential === false ? "default" : "outline"}
                  className={editForm.is_essential === false ? "bg-warning hover:bg-warning/90" : ""}
                  onClick={() => setEditForm({ ...editForm, is_essential: false })}
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Não Essencial
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {editForm.description.length}/500 caracteres
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transações selecionadas?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir {selectedIds.size} transação(ões). 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir {selectedIds.size} transação(ões)
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
