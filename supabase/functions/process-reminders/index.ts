import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Reminder {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  reminder_type: string;
  reference_id: string | null;
  day_of_month: number | null;
  day_of_week: number | null;
  time_of_day: string | null;
  days_before: number | null;
  is_active: boolean;
  last_sent_at?: string | null;
}

interface Debt {
  id: string;
  name: string;
  creditor: string | null;
  current_balance: number;
  due_day: number | null;
  minimum_payment: number | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getFirstName(fullName: string | null): string {
  if (!fullName) return "";
  return fullName.split(" ")[0];
}

function getFinancialHealthEmoji(savingsRate: number): string {
  if (savingsRate >= 30) return "🟢";
  if (savingsRate >= 15) return "🟡";
  if (savingsRate >= 0) return "🟠";
  return "🔴";
}

function getMotivationalMessage(savingsRate: number, hasDebts: boolean): string {
  if (savingsRate >= 30) {
    return "Excelente! Você está no caminho certo para a independência financeira! 🚀";
  }
  if (savingsRate >= 15) {
    return "Muito bem! Continue assim e suas metas serão alcançadas! 💪";
  }
  if (savingsRate >= 0) {
    if (hasDebts) {
      return "Foque em quitar suas dívidas para acelerar seu progresso. 📈";
    }
    return "Tente aumentar sua margem de economia este mês. 💡";
  }
  return "Atenção: seus gastos estão superando suas receitas. Revise seu orçamento. ⚠️";
}

async function generateDebtReminder(
  supabase: any,
  userId: string,
  reminder: Reminder
): Promise<string | null> {
  if (!reminder.reference_id) {
    return `💳 *Lembrete: ${reminder.title}*\n\n` +
      `${reminder.message ? `${reminder.message}\n\n` : ""}` +
      `${reminder.day_of_month ? `Vence dia ${reminder.day_of_month}` : ""}\n\n` +
      `_Smart Finance - Seu assistente financeiro_`;
  }

  const { data: debt } = await supabase
    .from("debts")
    .select("*")
    .eq("id", reminder.reference_id)
    .single();

  if (!debt || debt.status === "paid") return null;

  return `💳 *Lembrete: ${debt.name}*\n\n` +
    `${debt.creditor ? `Credor: ${debt.creditor}\n` : ""}` +
    `Saldo devedor: ${formatCurrency(debt.current_balance)}\n` +
    `${debt.minimum_payment ? `Pagamento mínimo: ${formatCurrency(debt.minimum_payment)}\n` : ""}` +
    `${debt.due_day ? `Vence dia ${debt.due_day}` : ""}\n\n` +
    `_Smart Finance - Seu assistente financeiro_`;
}

// Helper to get date in Brazil timezone (UTC-3)
function getBrazilDate(date: Date = new Date()): string {
  // Convert to Brazil time (UTC-3)
  const brazilOffset = -3 * 60; // minutes
  const utcOffset = date.getTimezoneOffset(); // minutes
  const brazilTime = new Date(date.getTime() + (utcOffset + brazilOffset) * 60 * 1000);
  return brazilTime.toISOString().split("T")[0];
}

async function generateDailySummary(
  supabase: any,
  userId: string
): Promise<string> {
  const now = new Date();
  const today = getBrazilDate(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = getBrazilDate(yesterday);

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  const userName = getFirstName(profile?.full_name);
  const greeting = getGreeting();

  // Today's transactions - PERSONAL
  const { data: personalTodayTxns } = await supabase
    .from("transactions")
    .select("amount, type, description, categories(name)")
    .eq("user_id", userId)
    .eq("profile_type", "personal")
    .eq("date", today);

  // Today's transactions - BUSINESS
  const { data: businessTodayTxns } = await supabase
    .from("transactions")
    .select("amount, type, description, categories(name)")
    .eq("user_id", userId)
    .eq("profile_type", "business")
    .eq("date", today);

  // Calculate personal totals
  let personalIncome = 0, personalExpenses = 0;
  const personalTxnsList: string[] = [];
  (personalTodayTxns || []).forEach((t: any) => {
    const amount = parseFloat(t.amount);
    if (t.type === "income") {
      personalIncome += amount;
      personalTxnsList.push(`  ➕ ${t.description || t.categories?.name || "Receita"}: ${formatCurrency(amount)}`);
    } else {
      personalExpenses += amount;
      personalTxnsList.push(`  ➖ ${t.description || t.categories?.name || "Despesa"}: ${formatCurrency(amount)}`);
    }
  });

  // Calculate business totals
  let businessIncome = 0, businessExpenses = 0;
  const businessTxnsList: string[] = [];
  (businessTodayTxns || []).forEach((t: any) => {
    const amount = parseFloat(t.amount);
    if (t.type === "income") {
      businessIncome += amount;
      businessTxnsList.push(`  ➕ ${t.description || t.categories?.name || "Receita"}: ${formatCurrency(amount)}`);
    } else {
      businessExpenses += amount;
      businessTxnsList.push(`  ➖ ${t.description || t.categories?.name || "Despesa"}: ${formatCurrency(amount)}`);
    }
  });

  // Bank balances - PERSONAL
  const { data: personalBanks } = await supabase
    .from("banks")
    .select("name, current_balance")
    .eq("user_id", userId)
    .eq("profile_type", "personal")
    .eq("is_active", true);

  // Bank balances - BUSINESS
  const { data: businessBanks } = await supabase
    .from("banks")
    .select("name, current_balance")
    .eq("user_id", userId)
    .eq("profile_type", "business")
    .eq("is_active", true);

  const personalBankBalance = (personalBanks || []).reduce((acc: number, b: any) => acc + parseFloat(b.current_balance), 0);
  const businessBankBalance = (businessBanks || []).reduce((acc: number, b: any) => acc + parseFloat(b.current_balance), 0);
  const totalBankBalance = personalBankBalance + businessBankBalance;

  // Active debts - PERSONAL
  const { data: personalDebts } = await supabase
    .from("debts")
    .select("name, current_balance")
    .eq("user_id", userId)
    .eq("profile_type", "personal")
    .eq("status", "active");

  // Active debts - BUSINESS
  const { data: businessDebts } = await supabase
    .from("debts")
    .select("name, current_balance")
    .eq("user_id", userId)
    .eq("profile_type", "business")
    .eq("status", "active");

  const personalDebtTotal = (personalDebts || []).reduce((acc: number, d: any) => acc + parseFloat(d.current_balance), 0);
  const businessDebtTotal = (businessDebts || []).reduce((acc: number, d: any) => acc + parseFloat(d.current_balance), 0);
  const totalDebts = personalDebtTotal + businessDebtTotal;

  // Goals progress
  const { data: goals } = await supabase
    .from("custom_goals")
    .select("name, current_amount, target_amount")
    .eq("user_id", userId)
    .eq("is_completed", false)
    .limit(3);

  // Emergency reserve
  const { data: emergencyGoal } = await supabase
    .from("emergency_goals")
    .select("current_amount, target_amount, target_months")
    .eq("user_id", userId)
    .single();

  const totalTodayIncome = personalIncome + businessIncome;
  const totalTodayExpenses = personalExpenses + businessExpenses;
  const todayBalance = totalTodayIncome - totalTodayExpenses;
  const netWorth = totalBankBalance - totalDebts;
  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const hasTxnsToday = personalTxnsList.length > 0 || businessTxnsList.length > 0;

  let message = `${greeting}${userName ? `, ${userName}` : ""}! 👋\n\n`;
  message += `📆 *RELATÓRIO DIÁRIO*\n`;
  message += `_${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}_\n\n`;

  // Personal section
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `👤 *PESSOAL*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  if (personalTxnsList.length > 0) {
    message += `📊 *Movimentações de hoje:*\n`;
    personalTxnsList.slice(0, 5).forEach(txn => { message += `${txn}\n`; });
    if (personalTxnsList.length > 5) message += `  _... e mais ${personalTxnsList.length - 5} transações_\n`;
  }
  message += `📈 Receitas: ${formatCurrency(personalIncome)}\n`;
  message += `📉 Despesas: ${formatCurrency(personalExpenses)}\n`;
  message += `💰 Resultado: ${formatCurrency(personalIncome - personalExpenses)} ${personalIncome >= personalExpenses ? "✅" : "⚠️"}\n`;
  message += `💳 Saldo em contas: ${formatCurrency(personalBankBalance)}\n`;
  if (personalDebtTotal > 0) {
    message += `📋 Dívidas: ${formatCurrency(personalDebtTotal)}\n`;
  }

  // Business section
  message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🏢 *EMPRESARIAL*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  if (businessTxnsList.length > 0) {
    message += `📊 *Movimentações de hoje:*\n`;
    businessTxnsList.slice(0, 5).forEach(txn => { message += `${txn}\n`; });
    if (businessTxnsList.length > 5) message += `  _... e mais ${businessTxnsList.length - 5} transações_\n`;
  }
  message += `📈 Receitas: ${formatCurrency(businessIncome)}\n`;
  message += `📉 Despesas: ${formatCurrency(businessExpenses)}\n`;
  message += `💰 Resultado: ${formatCurrency(businessIncome - businessExpenses)} ${businessIncome >= businessExpenses ? "✅" : "⚠️"}\n`;
  message += `💳 Saldo em contas: ${formatCurrency(businessBankBalance)}\n`;
  if (businessDebtTotal > 0) {
    message += `📋 Dívidas: ${formatCurrency(businessDebtTotal)}\n`;
  }

  // Consolidated
  message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💎 *CONSOLIDADO*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📈 Total receitas: ${formatCurrency(totalTodayIncome)}\n`;
  message += `📉 Total despesas: ${formatCurrency(totalTodayExpenses)}\n`;
  message += `💰 Resultado do dia: ${formatCurrency(todayBalance)} ${todayBalance >= 0 ? "✅" : "⚠️"}\n`;
  message += `🏦 Patrimônio total: ${formatCurrency(totalBankBalance)}\n`;
  if (totalDebts > 0) {
    message += `📋 Dívidas totais: ${formatCurrency(totalDebts)}\n`;
    message += `💎 Patrimônio líquido: ${formatCurrency(netWorth)}\n`;
  }

  // Emergency reserve
  if (emergencyGoal && emergencyGoal.target_amount) {
    const progress = Math.min(100, (emergencyGoal.current_amount / emergencyGoal.target_amount) * 100);
    message += `\n🛡️ Reserva de emergência: ${progress.toFixed(0)}%\n`;
  }

  // Goals
  if (goals && goals.length > 0) {
    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🎯 *METAS EM PROGRESSO*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    goals.forEach((g: any) => {
      const progress = Math.min(100, (g.current_amount / g.target_amount) * 100);
      message += `• ${g.name}: ${progress.toFixed(0)}%\n`;
    });
  }

  if (!hasTxnsToday) {
    message += `\n📝 _Nenhuma movimentação registrada hoje_\n`;
  }

  message += `\n_Tenha um ótimo dia!_ 🌟\n`;
  message += `_Smart Finance - Seu assistente financeiro_`;

  return message;
}

async function generateWeeklySummary(
  supabase: any,
  userId: string
): Promise<string> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  
  const todayStr = getBrazilDate(now);
  const weekStartStr = getBrazilDate(weekStart);

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  const userName = getFirstName(profile?.full_name);
  const greeting = getGreeting();

  // This week's transactions - PERSONAL
  const { data: personalTxns } = await supabase
    .from("transactions")
    .select("amount, type, date, description, categories(name)")
    .eq("user_id", userId)
    .eq("profile_type", "personal")
    .gte("date", weekStartStr)
    .lte("date", todayStr)
    .order("date", { ascending: false });

  // This week's transactions - BUSINESS
  const { data: businessTxns } = await supabase
    .from("transactions")
    .select("amount, type, date, description, categories(name)")
    .eq("user_id", userId)
    .eq("profile_type", "business")
    .gte("date", weekStartStr)
    .lte("date", todayStr)
    .order("date", { ascending: false });

  // Calculate personal totals
  let personalIncome = 0, personalExpenses = 0;
  const personalTopExpenses: { desc: string; amount: number }[] = [];
  (personalTxns || []).forEach((t: any) => {
    const amount = parseFloat(t.amount);
    if (t.type === "income") {
      personalIncome += amount;
    } else {
      personalExpenses += amount;
      personalTopExpenses.push({ desc: t.description || t.categories?.name || "Despesa", amount });
    }
  });
  personalTopExpenses.sort((a, b) => b.amount - a.amount);

  // Calculate business totals
  let businessIncome = 0, businessExpenses = 0;
  const businessTopExpenses: { desc: string; amount: number }[] = [];
  (businessTxns || []).forEach((t: any) => {
    const amount = parseFloat(t.amount);
    if (t.type === "income") {
      businessIncome += amount;
    } else {
      businessExpenses += amount;
      businessTopExpenses.push({ desc: t.description || t.categories?.name || "Despesa", amount });
    }
  });
  businessTopExpenses.sort((a, b) => b.amount - a.amount);

  // Banks - PERSONAL
  const { data: personalBanks } = await supabase
    .from("banks")
    .select("name, current_balance")
    .eq("user_id", userId)
    .eq("profile_type", "personal")
    .eq("is_active", true);

  // Banks - BUSINESS
  const { data: businessBanks } = await supabase
    .from("banks")
    .select("name, current_balance")
    .eq("user_id", userId)
    .eq("profile_type", "business")
    .eq("is_active", true);

  const personalBankBalance = (personalBanks || []).reduce((acc: number, b: any) => acc + parseFloat(b.current_balance), 0);
  const businessBankBalance = (businessBanks || []).reduce((acc: number, b: any) => acc + parseFloat(b.current_balance), 0);
  const totalBankBalance = personalBankBalance + businessBankBalance;

  // Debts - PERSONAL
  const { data: personalDebts } = await supabase
    .from("debts")
    .select("name, current_balance, due_day")
    .eq("user_id", userId)
    .eq("profile_type", "personal")
    .eq("status", "active");

  // Debts - BUSINESS
  const { data: businessDebts } = await supabase
    .from("debts")
    .select("name, current_balance, due_day")
    .eq("user_id", userId)
    .eq("profile_type", "business")
    .eq("status", "active");

  const personalDebtTotal = (personalDebts || []).reduce((acc: number, d: any) => acc + parseFloat(d.current_balance), 0);
  const businessDebtTotal = (businessDebts || []).reduce((acc: number, d: any) => acc + parseFloat(d.current_balance), 0);
  const totalDebts = personalDebtTotal + businessDebtTotal;

  // Upcoming debts
  const allDebts = [...(personalDebts || []), ...(businessDebts || [])];
  const today = new Date().getDate();
  const upcomingDebts = allDebts.filter((d: any) => d.due_day && d.due_day >= today && d.due_day <= today + 7);

  // Goals
  const { data: goals } = await supabase
    .from("custom_goals")
    .select("name, current_amount, target_amount")
    .eq("user_id", userId)
    .eq("is_completed", false);

  // Emergency reserve
  const { data: emergencyGoal } = await supabase
    .from("emergency_goals")
    .select("current_amount, target_amount, target_months")
    .eq("user_id", userId)
    .single();

  const totalIncome = personalIncome + businessIncome;
  const totalExpenses = personalExpenses + businessExpenses;
  const totalBalance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const healthEmoji = getFinancialHealthEmoji(savingsRate);
  const netWorth = totalBankBalance - totalDebts;

  let message = `${greeting}${userName ? `, ${userName}` : ""}! 👋\n\n`;
  message += `📊 *RELATÓRIO SEMANAL*\n`;
  message += `_${weekStart.toLocaleDateString("pt-BR")} a ${now.toLocaleDateString("pt-BR")}_\n\n`;

  // Personal section
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `👤 *PESSOAL*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📈 Receitas: ${formatCurrency(personalIncome)}\n`;
  message += `📉 Despesas: ${formatCurrency(personalExpenses)}\n`;
  message += `💰 Resultado: ${formatCurrency(personalIncome - personalExpenses)} ${personalIncome >= personalExpenses ? "✅" : "⚠️"}\n`;
  message += `💳 Saldo atual: ${formatCurrency(personalBankBalance)}\n`;
  if (personalDebtTotal > 0) {
    message += `📋 Dívidas: ${formatCurrency(personalDebtTotal)}\n`;
  }
  if (personalTopExpenses.length > 0) {
    message += `\n💸 *Maiores gastos:*\n`;
    personalTopExpenses.slice(0, 3).forEach(e => {
      message += `  • ${e.desc}: ${formatCurrency(e.amount)}\n`;
    });
  }

  // Business section
  message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🏢 *EMPRESARIAL*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📈 Receitas: ${formatCurrency(businessIncome)}\n`;
  message += `📉 Despesas: ${formatCurrency(businessExpenses)}\n`;
  message += `💰 Resultado: ${formatCurrency(businessIncome - businessExpenses)} ${businessIncome >= businessExpenses ? "✅" : "⚠️"}\n`;
  message += `💳 Saldo atual: ${formatCurrency(businessBankBalance)}\n`;
  if (businessDebtTotal > 0) {
    message += `📋 Dívidas: ${formatCurrency(businessDebtTotal)}\n`;
  }
  if (businessTopExpenses.length > 0) {
    message += `\n💸 *Maiores gastos:*\n`;
    businessTopExpenses.slice(0, 3).forEach(e => {
      message += `  • ${e.desc}: ${formatCurrency(e.amount)}\n`;
    });
  }

  // Consolidated
  message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💎 *CONSOLIDADO*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📈 Total receitas: ${formatCurrency(totalIncome)}\n`;
  message += `📉 Total despesas: ${formatCurrency(totalExpenses)}\n`;
  message += `💰 Resultado semanal: ${formatCurrency(totalBalance)} ${totalBalance >= 0 ? "✅" : "⚠️"}\n`;
  message += `${healthEmoji} Taxa de economia: ${savingsRate.toFixed(1)}%\n`;
  message += `🏦 Patrimônio total: ${formatCurrency(totalBankBalance)}\n`;
  if (totalDebts > 0) {
    message += `📋 Dívidas totais: ${formatCurrency(totalDebts)}\n`;
    message += `💎 Patrimônio líquido: ${formatCurrency(netWorth)}\n`;
  }

  // Upcoming debts
  if (upcomingDebts.length > 0) {
    message += `\n⚠️ *VENCIMENTOS PRÓXIMOS:*\n`;
    upcomingDebts.slice(0, 3).forEach((d: any) => {
      message += `• ${d.name} (dia ${d.due_day}): ${formatCurrency(d.current_balance)}\n`;
    });
  }

  // Emergency reserve
  if (emergencyGoal && emergencyGoal.target_amount) {
    const progress = Math.min(100, (emergencyGoal.current_amount / emergencyGoal.target_amount) * 100);
    message += `\n🛡️ Reserva de emergência: ${progress.toFixed(0)}%\n`;
  }

  // Goals
  if (goals && goals.length > 0) {
    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🎯 *SUAS METAS*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    goals.slice(0, 3).forEach((g: any) => {
      const progress = Math.min(100, (g.current_amount / g.target_amount) * 100);
      const remaining = g.target_amount - g.current_amount;
      message += `• ${g.name}: ${progress.toFixed(0)}% (faltam ${formatCurrency(remaining)})\n`;
    });
  }

  message += `\n💡 *DICA DA SEMANA:*\n`;
  message += getMotivationalMessage(savingsRate, totalDebts > 0);
  message += `\n\n_Smart Finance - Seu assistente financeiro_`;

  return message;
}

async function generateMonthlySummary(
  supabase: any,
  userId: string
): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const todayStr = getBrazilDate(now);
  const monthStartStr = getBrazilDate(monthStart);
  const prevMonthStartStr = getBrazilDate(prevMonthStart);
  const prevMonthEndStr = getBrazilDate(prevMonthEnd);

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  const userName = getFirstName(profile?.full_name);
  const greeting = getGreeting();

  // This month's transactions - PERSONAL
  const { data: personalTxns } = await supabase
    .from("transactions")
    .select("amount, type, description, categories(name)")
    .eq("user_id", userId)
    .eq("profile_type", "personal")
    .gte("date", monthStartStr)
    .lte("date", todayStr);

  // This month's transactions - BUSINESS
  const { data: businessTxns } = await supabase
    .from("transactions")
    .select("amount, type, description, categories(name)")
    .eq("user_id", userId)
    .eq("profile_type", "business")
    .gte("date", monthStartStr)
    .lte("date", todayStr);

  // Previous month for comparison
  const { data: prevPersonalTxns } = await supabase
    .from("transactions")
    .select("amount, type")
    .eq("user_id", userId)
    .eq("profile_type", "personal")
    .gte("date", prevMonthStartStr)
    .lte("date", prevMonthEndStr);

  const { data: prevBusinessTxns } = await supabase
    .from("transactions")
    .select("amount, type")
    .eq("user_id", userId)
    .eq("profile_type", "business")
    .gte("date", prevMonthStartStr)
    .lte("date", prevMonthEndStr);

  // Calculate personal totals
  let personalIncome = 0, personalExpenses = 0;
  const personalCategoryExpenses: Record<string, number> = {};
  (personalTxns || []).forEach((t: any) => {
    const amount = parseFloat(t.amount);
    if (t.type === "income") {
      personalIncome += amount;
    } else {
      personalExpenses += amount;
      const cat = t.categories?.name || "Outros";
      personalCategoryExpenses[cat] = (personalCategoryExpenses[cat] || 0) + amount;
    }
  });

  // Calculate business totals
  let businessIncome = 0, businessExpenses = 0;
  const businessCategoryExpenses: Record<string, number> = {};
  (businessTxns || []).forEach((t: any) => {
    const amount = parseFloat(t.amount);
    if (t.type === "income") {
      businessIncome += amount;
    } else {
      businessExpenses += amount;
      const cat = t.categories?.name || "Outros";
      businessCategoryExpenses[cat] = (businessCategoryExpenses[cat] || 0) + amount;
    }
  });

  // Previous month totals
  let prevPersonalIncome = 0, prevPersonalExpenses = 0;
  (prevPersonalTxns || []).forEach((t: any) => {
    if (t.type === "income") prevPersonalIncome += parseFloat(t.amount);
    else prevPersonalExpenses += parseFloat(t.amount);
  });

  let prevBusinessIncome = 0, prevBusinessExpenses = 0;
  (prevBusinessTxns || []).forEach((t: any) => {
    if (t.type === "income") prevBusinessIncome += parseFloat(t.amount);
    else prevBusinessExpenses += parseFloat(t.amount);
  });

  // Banks - PERSONAL
  const { data: personalBanks } = await supabase
    .from("banks")
    .select("name, current_balance")
    .eq("user_id", userId)
    .eq("profile_type", "personal")
    .eq("is_active", true);

  // Banks - BUSINESS
  const { data: businessBanks } = await supabase
    .from("banks")
    .select("name, current_balance")
    .eq("user_id", userId)
    .eq("profile_type", "business")
    .eq("is_active", true);

  const personalBankBalance = (personalBanks || []).reduce((acc: number, b: any) => acc + parseFloat(b.current_balance), 0);
  const businessBankBalance = (businessBanks || []).reduce((acc: number, b: any) => acc + parseFloat(b.current_balance), 0);
  const totalBankBalance = personalBankBalance + businessBankBalance;

  // Debts - PERSONAL
  const { data: personalDebts } = await supabase
    .from("debts")
    .select("name, current_balance, total_amount")
    .eq("user_id", userId)
    .eq("profile_type", "personal")
    .eq("status", "active");

  // Debts - BUSINESS
  const { data: businessDebts } = await supabase
    .from("debts")
    .select("name, current_balance, total_amount")
    .eq("user_id", userId)
    .eq("profile_type", "business")
    .eq("status", "active");

  const personalDebtTotal = (personalDebts || []).reduce((acc: number, d: any) => acc + parseFloat(d.current_balance), 0);
  const businessDebtTotal = (businessDebts || []).reduce((acc: number, d: any) => acc + parseFloat(d.current_balance), 0);
  const totalDebts = personalDebtTotal + businessDebtTotal;

  // Goals
  const { data: goals } = await supabase
    .from("custom_goals")
    .select("name, current_amount, target_amount, deadline")
    .eq("user_id", userId)
    .eq("is_completed", false);

  // Emergency reserve
  const { data: emergencyGoal } = await supabase
    .from("emergency_goals")
    .select("current_amount, target_amount, target_months")
    .eq("user_id", userId)
    .single();

  const totalIncome = personalIncome + businessIncome;
  const totalExpenses = personalExpenses + businessExpenses;
  const totalBalance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const healthEmoji = getFinancialHealthEmoji(savingsRate);
  const netWorth = totalBankBalance - totalDebts;
  const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  // Sort categories by expense
  const personalTopCategories = Object.entries(personalCategoryExpenses).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const businessTopCategories = Object.entries(businessCategoryExpenses).sort((a, b) => b[1] - a[1]).slice(0, 5);

  let message = `${greeting}${userName ? `, ${userName}` : ""}! 👋\n\n`;
  message += `📅 *RELATÓRIO MENSAL*\n`;
  message += `_${monthName.charAt(0).toUpperCase() + monthName.slice(1)}_\n\n`;

  // Personal section
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `👤 *PESSOAL*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📈 Receitas: ${formatCurrency(personalIncome)}\n`;
  message += `📉 Despesas: ${formatCurrency(personalExpenses)}\n`;
  message += `💰 Resultado: ${formatCurrency(personalIncome - personalExpenses)} ${personalIncome >= personalExpenses ? "✅" : "⚠️"}\n`;
  
  // Comparison with previous month - personal
  if (prevPersonalExpenses > 0) {
    const expDiff = ((personalExpenses - prevPersonalExpenses) / prevPersonalExpenses * 100);
    message += `📊 Vs. mês anterior: ${expDiff > 0 ? "+" : ""}${expDiff.toFixed(0)}% gastos\n`;
  }

  if (personalTopCategories.length > 0) {
    message += `\n💸 *Maiores categorias:*\n`;
    personalTopCategories.forEach(([cat, val]) => {
      const pct = personalExpenses > 0 ? ((val / personalExpenses) * 100).toFixed(0) : "0";
      message += `  • ${cat}: ${formatCurrency(val)} (${pct}%)\n`;
    });
  }

  message += `\n💳 Saldo em contas: ${formatCurrency(personalBankBalance)}\n`;
  if (personalDebtTotal > 0) {
    message += `📋 Dívidas: ${formatCurrency(personalDebtTotal)}\n`;
  }

  // Business section
  message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🏢 *EMPRESARIAL*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📈 Receitas: ${formatCurrency(businessIncome)}\n`;
  message += `📉 Despesas: ${formatCurrency(businessExpenses)}\n`;
  message += `💰 Resultado: ${formatCurrency(businessIncome - businessExpenses)} ${businessIncome >= businessExpenses ? "✅" : "⚠️"}\n`;
  
  // Comparison with previous month - business
  if (prevBusinessExpenses > 0) {
    const expDiff = ((businessExpenses - prevBusinessExpenses) / prevBusinessExpenses * 100);
    message += `📊 Vs. mês anterior: ${expDiff > 0 ? "+" : ""}${expDiff.toFixed(0)}% gastos\n`;
  }

  if (businessTopCategories.length > 0) {
    message += `\n💸 *Maiores categorias:*\n`;
    businessTopCategories.forEach(([cat, val]) => {
      const pct = businessExpenses > 0 ? ((val / businessExpenses) * 100).toFixed(0) : "0";
      message += `  • ${cat}: ${formatCurrency(val)} (${pct}%)\n`;
    });
  }

  message += `\n💳 Saldo em contas: ${formatCurrency(businessBankBalance)}\n`;
  if (businessDebtTotal > 0) {
    message += `📋 Dívidas: ${formatCurrency(businessDebtTotal)}\n`;
  }

  // Consolidated
  message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💎 *CONSOLIDADO*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📈 Total receitas: ${formatCurrency(totalIncome)}\n`;
  message += `📉 Total despesas: ${formatCurrency(totalExpenses)}\n`;
  message += `💰 Resultado mensal: ${formatCurrency(totalBalance)} ${totalBalance >= 0 ? "✅" : "⚠️"}\n`;
  message += `${healthEmoji} Taxa de economia: ${savingsRate.toFixed(1)}%\n`;
  message += `🏦 Patrimônio total: ${formatCurrency(totalBankBalance)}\n`;
  if (totalDebts > 0) {
    message += `📋 Dívidas totais: ${formatCurrency(totalDebts)}\n`;
    message += `💎 Patrimônio líquido: ${formatCurrency(netWorth)}\n`;
  }

  // Emergency reserve
  if (emergencyGoal && emergencyGoal.target_amount) {
    const progress = Math.min(100, (emergencyGoal.current_amount / emergencyGoal.target_amount) * 100);
    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🛡️ *RESERVA DE EMERGÊNCIA*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📊 Progresso: ${progress.toFixed(0)}%\n`;
    message += `💰 Atual: ${formatCurrency(emergencyGoal.current_amount)}\n`;
    message += `🎯 Meta (${emergencyGoal.target_months} meses): ${formatCurrency(emergencyGoal.target_amount)}\n`;
  }

  // Goals
  if (goals && goals.length > 0) {
    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🎯 *SUAS METAS*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    goals.forEach((g: any) => {
      const progress = Math.min(100, (g.current_amount / g.target_amount) * 100);
      const remaining = g.target_amount - g.current_amount;
      message += `• ${g.name}: ${progress.toFixed(0)}%\n`;
      message += `  Faltam: ${formatCurrency(remaining)}\n`;
    });
  }

  message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💡 *ANÁLISE FINANCEIRA*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += getMotivationalMessage(savingsRate, totalDebts > 0);

  message += `\n\n🌟 _Continue acompanhando suas finanças!_\n`;
  message += `_Smart Finance - Seu assistente financeiro_`;

  return message;
}

const SAO_PAULO_TZ = "America/Sao_Paulo";

function getSaoPauloNowParts(date = new Date()): {
  ymd: string;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
} {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  const ymd = `${map.year}-${map.month}-${map.day}`;

  return {
    ymd,
    day: Number(map.day),
    weekday: weekdayMap[map.weekday] ?? 0,
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function parseTimeOfDayToMinutes(timeOfDay: string | null): number | null {
  if (!timeOfDay) return null;
  const [hh, mm] = timeOfDay.split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function isTimeReached(reminder: Reminder): boolean {
  const target = parseTimeOfDayToMinutes(reminder.time_of_day);
  if (target === null) return true;
  const now = getSaoPauloNowParts();
  const nowMinutes = now.hour * 60 + now.minute;
  return nowMinutes >= target;
}

function wasSentToday(reminder: Reminder): boolean {
  const last = reminder.last_sent_at;
  if (!last) return false;

  const normalized = last.includes(" ") ? last.replace(" ", "T") : last;
  const lastDate = new Date(normalized);

  if (Number.isNaN(lastDate.getTime())) {
    console.log(`[RMD] Could not parse last_sent_at: ${last}`);
    return false;
  }

  const nowParts = getSaoPauloNowParts();
  const lastParts = getSaoPauloNowParts(lastDate);
  return nowParts.ymd === lastParts.ymd;
}

function shouldSendReminder(reminder: Reminder): boolean {
  const now = getSaoPauloNowParts();
  const currentDay = now.day;
  const currentDayOfWeek = now.weekday;

  console.log(
    `Checking reminder: ${reminder.title}, type: ${reminder.reminder_type}, day_of_month: ${reminder.day_of_month}, days_before: ${reminder.days_before}, currentDay: ${currentDay}`
  );

  // Daily summary - always send
  if (reminder.reminder_type === "daily_summary") {
    return true;
  }

  if (reminder.reminder_type === "bill" && reminder.day_of_month) {
    const targetDay = reminder.day_of_month - (reminder.days_before || 0);
    const adjustedDay = targetDay <= 0 ? 30 + targetDay : targetDay;
    console.log(`Bill reminder: targetDay=${targetDay}, adjustedDay=${adjustedDay}, currentDay=${currentDay}`);
    return currentDay === adjustedDay;
  }

  if (reminder.reminder_type === "weekly_summary" && reminder.day_of_week !== null) {
    return currentDayOfWeek === reminder.day_of_week;
  }

  if (reminder.reminder_type === "monthly_summary" && reminder.day_of_month !== null) {
    return currentDay === reminder.day_of_month;
  }

  // Smart alerts (unified) - check schedule based on day_of_week / day_of_month
  if (reminder.reminder_type === "smart_alerts" || reminder.reminder_type.startsWith("smart_")) {
    // If has day_of_week => weekly
    if (reminder.day_of_week !== null) return currentDayOfWeek === reminder.day_of_week;
    // If has day_of_month => monthly
    if (reminder.day_of_month !== null) return currentDay === reminder.day_of_month;
    // No day constraints => daily
    return true;
  }

  if (reminder.reminder_type === "custom") {
    if (reminder.day_of_month !== null) return currentDay === reminder.day_of_month;
    if (reminder.day_of_week !== null) return currentDayOfWeek === reminder.day_of_week;
    // Custom without specific day = daily reminder
    return true;
  }

  return false;
}

// ====== SMART ALERT PROCESSORS ======

async function smartCheckSpending(supabase: any, userId: string): Promise<string | null> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const currentMonth = today.slice(0, 7);
  const currentDay = parseInt(today.slice(8, 10));
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: transactions } = await supabase
    .from("transactions").select("amount, date, type")
    .eq("user_id", userId).eq("type", "expense")
    .gte("date", threeMonthsAgo.toISOString().slice(0, 10));

  if (!transactions || transactions.length < 5) return null;

  const currentMonthExp = transactions.filter((t: any) => t.date.startsWith(currentMonth))
    .reduce((s: number, t: any) => s + Number(t.amount), 0);
  const prev = transactions.filter((t: any) => !t.date.startsWith(currentMonth));
  if (prev.length === 0) return null;

  const monthsMap = new Map<string, number>();
  for (const t of prev) { const m = t.date.slice(0, 7); monthsMap.set(m, (monthsMap.get(m) || 0) + Number(t.amount)); }
  const avg = Array.from(monthsMap.values()).reduce((a, b) => a + b, 0) / monthsMap.size;
  const proportional = (avg / 30) * currentDay;
  const pct = proportional > 0 ? ((currentMonthExp - proportional) / proportional) * 100 : 0;

  if (pct > 20) {
    return `🚨 *Alerta: Gastos acima da média!*\n\nVocê já gastou ${formatCurrency(currentMonthExp)} este mês (dia ${currentDay}).\nA média proporcional seria ${formatCurrency(proportional)}.\n\n📊 Isso representa *${pct.toFixed(0)}% acima* da sua média!\n\n💡 _Revise seus gastos recentes._`;
  }
  return null;
}

async function smartCheckGoals(supabase: any, userId: string): Promise<string | null> {
  const { data: goals } = await supabase.from("custom_goals").select("*")
    .eq("user_id", userId).eq("is_completed", false).not("deadline", "is", null);
  if (!goals || goals.length === 0) return null;

  const today = new Date();
  const alerts: string[] = [];
  for (const g of goals) {
    const deadline = new Date(g.deadline);
    const created = new Date(g.created_at);
    const totalDays = (deadline.getTime() - created.getTime()) / 86400000;
    const elapsed = (today.getTime() - created.getTime()) / 86400000;
    const expected = totalDays > 0 ? (elapsed / totalDays) * 100 : 0;
    const actual = g.target_amount > 0 ? (Number(g.current_amount) / Number(g.target_amount)) * 100 : 0;
    const remaining = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);

    if (remaining < 0) {
      alerts.push(`• *${g.icon || "🎯"} ${g.name}*: Prazo vencido há ${Math.abs(remaining)} dias! Progresso: ${actual.toFixed(0)}%`);
    } else if (expected - actual > 15) {
      alerts.push(`• *${g.icon || "🎯"} ${g.name}*: ${actual.toFixed(0)}% (deveria ~${expected.toFixed(0)}%). Faltam ${formatCurrency(Number(g.target_amount) - Number(g.current_amount))} em ${remaining} dias.`);
    }
  }
  if (alerts.length === 0) return null;
  return `⏰ *Alerta: Metas atrasadas*\n\n${alerts.join("\n\n")}\n\n💪 _Pequenos aportes regulares fazem a diferença._`;
}

async function smartCheckRecurring(supabase: any, userId: string): Promise<string | null> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const currentMonth = today.slice(0, 7);
  const prevDate = new Date(); prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonth = prevDate.toISOString().slice(0, 7);

  const { data: transactions } = await supabase.from("transactions")
    .select("amount, date, category_id, categories(name)").eq("user_id", userId).eq("type", "expense")
    .or(`date.gte.${prevMonth}-01,date.lte.${currentMonth}-31`);
  if (!transactions || transactions.length < 3) return null;

  const catMap = new Map<string, { current: number; previous: number; name: string }>();
  for (const t of transactions) {
    const name = t.categories?.name || "Sem categoria";
    const month = t.date.slice(0, 7);
    if (!catMap.has(name)) catMap.set(name, { current: 0, previous: 0, name });
    const e = catMap.get(name)!;
    if (month === currentMonth) e.current += Number(t.amount);
    else if (month === prevMonth) e.previous += Number(t.amount);
  }

  const increases: string[] = [];
  for (const [, d] of catMap) {
    if (d.previous > 50) {
      const pct = ((d.current - d.previous) / d.previous) * 100;
      if (pct > 30) increases.push(`• *${d.name}*: ${formatCurrency(d.previous)} → ${formatCurrency(d.current)} (+${pct.toFixed(0)}%)`);
    }
  }
  if (increases.length === 0) return null;
  return `📈 *Despesas recorrentes em alta*\n\n${increases.join("\n")}\n\n🔍 _Verifique se esses aumentos precisam de atenção._`;
}

async function smartCheckLowBalance(supabase: any, userId: string): Promise<string | null> {
  const { data: banks } = await supabase.from("banks").select("name, current_balance")
    .eq("user_id", userId).eq("is_active", true);
  if (!banks || banks.length === 0) return null;

  const total = banks.reduce((s: number, b: any) => s + Number(b.current_balance), 0);
  // Get monthly average expenses
  const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const { data: expenses } = await supabase.from("transactions").select("amount")
    .eq("user_id", userId).eq("type", "expense").gte("date", threeMonthsAgo.toISOString().slice(0, 10));
  
  const totalExp = (expenses || []).reduce((s: number, t: any) => s + Number(t.amount), 0);
  const monthlyAvg = totalExp / 3;

  if (total < monthlyAvg * 0.5 && monthlyAvg > 0) {
    const lowBanks = banks.filter((b: any) => Number(b.current_balance) < 100)
      .map((b: any) => `• ${b.name}: ${formatCurrency(Number(b.current_balance))}`);
    return `💰 *Alerta: Saldo baixo!*\n\nSeu saldo total é ${formatCurrency(total)}, menos da metade da sua média mensal de gastos (${formatCurrency(monthlyAvg)}).\n\n${lowBanks.length > 0 ? `Contas com saldo baixo:\n${lowBanks.join("\n")}\n\n` : ""}⚠️ _Considere reduzir gastos até a próxima receita._`;
  }
  return null;
}

async function smartCheckNoActivity(supabase: any, userId: string): Promise<string | null> {
  const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const { data: recent, count } = await supabase.from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId).gte("date", threeDaysAgo.toISOString().slice(0, 10));

  if (count === 0) {
    return `📝 *Lembrete: Sem movimentações recentes*\n\nVocê não registrou nenhuma transação nos últimos 3 dias.\n\nManter seus registros em dia ajuda a ter uma visão precisa das suas finanças!\n\n💡 _Abra o app e registre seus gastos recentes._`;
  }
  return null;
}

async function smartCheckSavingsTip(supabase: any, userId: string): Promise<string | null> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const currentMonth = today.slice(0, 7);
  
  const { data: txns } = await supabase.from("transactions")
    .select("amount, type, category_id, categories(name)")
    .eq("user_id", userId).gte("date", `${currentMonth}-01`);
  if (!txns || txns.length < 3) return null;

  const income = txns.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const expense = txns.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

  // Find top spending category
  const catMap = new Map<string, number>();
  for (const t of txns.filter((t: any) => t.type === "expense")) {
    const name = t.categories?.name || "Outros";
    catMap.set(name, (catMap.get(name) || 0) + Number(t.amount));
  }
  const sorted = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
  const topCat = sorted[0];

  let tip = `💡 *Dica de economia*\n\n`;
  if (savingsRate < 10) {
    tip += `Sua taxa de poupança este mês está em *${savingsRate.toFixed(0)}%*. O ideal é acima de 20%.\n\n`;
  } else if (savingsRate < 20) {
    tip += `Sua taxa de poupança está em *${savingsRate.toFixed(0)}%*. Quase lá! A meta ideal é 20%.\n\n`;
  } else {
    tip += `Parabéns! Sua taxa de poupança está em *${savingsRate.toFixed(0)}%* 🎉\n\n`;
  }

  if (topCat) {
    const pctOfExpense = expense > 0 ? (topCat[1] / expense * 100) : 0;
    tip += `📊 Sua maior categoria de gasto é *${topCat[0]}* (${formatCurrency(topCat[1])} = ${pctOfExpense.toFixed(0)}% dos gastos).\n\n`;
  }

  tip += `_Smart Finance - Seu assistente financeiro_`;
  return tip;
}

async function smartCheckDebtAlert(supabase: any, userId: string): Promise<string | null> {
  const { data: debts } = await supabase.from("debts").select("name, current_balance, due_day, creditor")
    .eq("user_id", userId).eq("status", "active");
  if (!debts || debts.length === 0) return null;

  const today = new Date();
  const currentDay = parseInt(today.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(8, 10));
  
  const upcoming: string[] = [];
  for (const d of debts) {
    if (!d.due_day) continue;
    let daysUntil = d.due_day - currentDay;
    if (daysUntil < 0) daysUntil += 30; // next month
    if (daysUntil <= 5 && daysUntil >= 0) {
      upcoming.push(`• *${d.name}*${d.creditor ? ` (${d.creditor})` : ""}: ${formatCurrency(Number(d.current_balance))} - vence ${daysUntil === 0 ? "HOJE" : `em ${daysUntil} dia${daysUntil > 1 ? "s" : ""}`}`);
    }
  }

  if (upcoming.length === 0) return null;
  return `🔔 *Dívidas próximas do vencimento*\n\n${upcoming.join("\n")}\n\n💳 _Pague em dia para evitar juros!_`;
}

const SMART_PROCESSORS: Record<string, (supabase: any, userId: string) => Promise<string | null>> = {
  smart_spending: smartCheckSpending,
  smart_goals: smartCheckGoals,
  smart_recurring: smartCheckRecurring,
  smart_low_balance: smartCheckLowBalance,
  smart_no_activity: smartCheckNoActivity,
  smart_savings_tip: smartCheckSavingsTip,
  smart_debt_alert: smartCheckDebtAlert,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing reminders...");

    const { data: reminders, error: remindersError } = await supabase
      .from("reminders")
      .select("*")
      .eq("is_active", true);

    if (remindersError) {
      throw new Error(`Error fetching reminders: ${remindersError.message}`);
    }

    console.log(`Found ${reminders?.length || 0} active reminders`);

    const results: { success: number; failed: number; skipped: number } = {
      success: 0,
      failed: 0,
      skipped: 0,
    };

    for (const reminder of reminders || []) {
      if (!shouldSendReminder(reminder)) {
        results.skipped++;
        continue;
      }

      if (!isTimeReached(reminder)) {
        results.skipped++;
        continue;
      }

      if (wasSentToday(reminder)) {
        results.skipped++;
        continue;
      }

      // Check if user has WhatsApp enabled via profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number, whatsapp_notifications_enabled")
        .eq("id", reminder.user_id)
        .single();

      if (!profile?.phone_number || !profile?.whatsapp_notifications_enabled) {
        console.log(`Skipping reminder ${reminder.id}: User has no phone or notifications disabled`);
        results.skipped++;
        continue;
      }

      // Generate message based on type
      let message: string | null = null;

      switch (reminder.reminder_type) {
        case "daily_summary":
          message = await generateDailySummary(supabase, reminder.user_id);
          break;
        case "bill":
          message = await generateDebtReminder(supabase, reminder.user_id, reminder);
          break;
        case "weekly_summary":
          message = await generateWeeklySummary(supabase, reminder.user_id);
          break;
        case "monthly_summary":
          message = await generateMonthlySummary(supabase, reminder.user_id);
          break;
        case "custom":
          message = `📌 *${reminder.title}*\n\n${reminder.message || ""}\n\n_Smart Finance_`;
          break;
        case "smart_alerts": {
          // Run ALL smart processors and combine results
          const alertMessages: string[] = [];
          for (const [, processor] of Object.entries(SMART_PROCESSORS)) {
            try {
              const result = await processor(supabase, reminder.user_id);
              if (result) alertMessages.push(result);
            } catch (e) {
              console.error("Smart alert processor error:", e);
            }
          }
          if (alertMessages.length > 0) {
            message = `⚡ *ALERTAS INTELIGENTES*\n\n${alertMessages.join("\n\n━━━━━━━━━━━━━━━━━━━━\n\n")}\n\n_Smart Finance - Seu assistente financeiro_`;
          }
          break;
        }
        default:
          // Legacy individual smart alert types
          if (SMART_PROCESSORS[reminder.reminder_type]) {
            message = await SMART_PROCESSORS[reminder.reminder_type](supabase, reminder.user_id);
          }
          break;
      }

      if (!message) {
        results.skipped++;
        continue;
      }

      // Send via centralized send-whatsapp function with targetUserId
      console.log(`Sending reminder ${reminder.id} to user ${reminder.user_id}`);
      
      const { error: sendError } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          message,
          messageType: reminder.reminder_type,
          reminderId: reminder.id,
          targetUserId: reminder.user_id,
        },
      });

      if (sendError) {
        console.error(`Error sending reminder ${reminder.id}:`, sendError);
        results.failed++;
        continue;
      }

      // Update last_sent_at
      await supabase
        .from("reminders")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("id", reminder.id);

      console.log(`Reminder ${reminder.id} sent successfully`);
      results.success++;
    }

    console.log("Processing complete:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing reminders:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
