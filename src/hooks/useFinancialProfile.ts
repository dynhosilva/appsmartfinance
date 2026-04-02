import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FinancialProfile } from "@/components/dashboard/ProfileSwitcher";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  date: string;
  profile_type: "personal" | "business";
  categories: {
    name: string;
    color: string;
  } | null;
}

interface ProfileData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  categoryExpenses: { name: string; value: number; color: string }[];
  monthlyData: { month: string; income: number; expenses: number; balance: number }[];
  balanceEvolution: { date: string; balance: number }[];
  currentMonthStats: { income: number; expenses: number; balance: number };
  previousMonthStats: { income: number; expenses: number; balance: number };
}

export function useFinancialProfile(userId: string | null) {
  const [currentProfile, setCurrentProfile] = useState<FinancialProfile>("personal");
  const [loading, setLoading] = useState(true);
  
  // Separate data for each profile
  const [personalData, setPersonalData] = useState<ProfileData | null>(null);
  const [businessData, setBusinessData] = useState<ProfileData | null>(null);
  
  // Total amounts for distribution card
  const [totals, setTotals] = useState({
    personalIncome: 0,
    personalExpenses: 0,
    businessIncome: 0,
    businessExpenses: 0,
  });

  const loadTransactions = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Load personal transactions
      const { data: personalTxns } = await supabase
        .from("transactions")
        .select(`
          id, amount, type, date, profile_type,
          categories (
            name,
            color
          )
        `)
        .eq("user_id", userId)
        .eq("profile_type", "personal")
        .order("date", { ascending: true });

      // Load business transactions
      const { data: businessTxns } = await supabase
        .from("transactions")
        .select(`
          id, amount, type, date, profile_type,
          categories (
            name,
            color
          )
        `)
        .eq("user_id", userId)
        .eq("profile_type", "business")
        .order("date", { ascending: true });

      const personal = (personalTxns as Transaction[]) || [];
      const business = (businessTxns as Transaction[]) || [];

      // Process each profile independently
      const personalProfileData = calculateProfileData(personal);
      const businessProfileData = calculateProfileData(business);

      setPersonalData(personalProfileData);
      setBusinessData(businessProfileData);

      // Calculate totals for distribution (current month only)
      setTotals({
        personalIncome: personalProfileData.currentMonthStats.income,
        personalExpenses: personalProfileData.currentMonthStats.expenses,
        businessIncome: businessProfileData.currentMonthStats.income,
        businessExpenses: businessProfileData.currentMonthStats.expenses,
      });
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const calculateProfileData = (txns: Transaction[]): ProfileData => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    // Calculate totals - simple sum based on type
    let totalIncome = 0;
    let totalExpenses = 0;

    txns.forEach(t => {
      const amount = parseFloat(t.amount.toString());
      if (t.type === "income") {
        totalIncome += amount;
      } else {
        totalExpenses += amount;
      }
    });

    // Category expenses (current month only)
    const expensesByCategory = new Map<string, { value: number; color: string }>();
    txns.filter(t => t.type === "expense" && parseISO(t.date) >= currentMonthStart && parseISO(t.date) <= currentMonthEnd).forEach(t => {
      const amount = parseFloat(t.amount.toString());
      const categoryName = t.categories?.name || "Sem Categoria";
      const categoryColor = t.categories?.color || "#6b7280";

      if (expensesByCategory.has(categoryName)) {
        expensesByCategory.get(categoryName)!.value += amount;
      } else {
        expensesByCategory.set(categoryName, { value: amount, color: categoryColor });
      }
    });

    const categoryExpenses = Array.from(expensesByCategory.entries()).map(([name, data]) => ({
      name,
      value: data.value,
      color: data.color,
    }));

    // Monthly data for last 6 months
    const monthlyDataMap = new Map<string, { income: number; expenses: number }>();
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthKey = format(monthDate, 'yyyy-MM');
      monthlyDataMap.set(monthKey, { income: 0, expenses: 0 });
    }

    txns.forEach(t => {
      const transactionDate = parseISO(t.date);
      const monthKey = format(transactionDate, 'yyyy-MM');

      if (monthlyDataMap.has(monthKey)) {
        const current = monthlyDataMap.get(monthKey)!;
        const amount = parseFloat(t.amount.toString());

        if (t.type === 'income') {
          current.income += amount;
        } else {
          current.expenses += amount;
        }
      }
    });

    const monthlyData: { month: string; income: number; expenses: number; balance: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM', { locale: ptBR }).charAt(0).toUpperCase() + format(monthDate, 'MMM', { locale: ptBR }).slice(1);
      const data = monthlyDataMap.get(monthKey)!;

      monthlyData.push({
        month: monthLabel,
        income: data.income,
        expenses: data.expenses,
        balance: data.income - data.expenses,
      });
    }

    // Balance evolution
    let runningBalance = 0;
    const balanceData: { date: string; balance: number }[] = [];

    txns.forEach(t => {
      const amount = parseFloat(t.amount.toString());
      if (t.type === 'income') {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }

      const dateLabel = format(parseISO(t.date), 'dd/MM');
      const existingIndex = balanceData.findIndex(b => b.date === dateLabel);
      if (existingIndex >= 0) {
        balanceData[existingIndex].balance = runningBalance;
      } else {
        balanceData.push({ date: dateLabel, balance: runningBalance });
      }
    });

    const balanceEvolution = balanceData.slice(-15);

    // Current month stats
    const currentMonthTxns = txns.filter(t => {
      const date = parseISO(t.date);
      return date >= currentMonthStart && date <= currentMonthEnd;
    });

    const previousMonthTxns = txns.filter(t => {
      const date = parseISO(t.date);
      return date >= previousMonthStart && date <= previousMonthEnd;
    });

    const calculateMonthStats = (monthTxns: Transaction[]) => {
      let income = 0;
      let expenses = 0;

      monthTxns.forEach(t => {
        const amount = parseFloat(t.amount.toString());
        if (t.type === 'income') {
          income += amount;
        } else {
          expenses += amount;
        }
      });

      return { income, expenses, balance: income - expenses };
    };

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      categoryExpenses,
      monthlyData,
      balanceEvolution,
      currentMonthStats: calculateMonthStats(currentMonthTxns),
      previousMonthStats: calculateMonthStats(previousMonthTxns),
    };
  };

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const currentData = currentProfile === "personal" ? personalData : businessData;

  return {
    currentProfile,
    setCurrentProfile,
    loading,
    currentData,
    totals,
    refreshData: loadTransactions,
  };
}
