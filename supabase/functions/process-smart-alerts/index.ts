import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getBrazilDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

interface AlertConfig {
  id: string;
  user_id: string;
  alert_type: string;
  is_active: boolean;
  frequency: string;
  threshold: number;
  last_triggered_at: string | null;
}

function shouldSendAlert(config: AlertConfig): boolean {
  if (!config.is_active) return false;
  if (!config.last_triggered_at) return true;

  const last = new Date(config.last_triggered_at);
  const now = new Date();
  const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);

  switch (config.frequency) {
    case "daily":
      return diffHours >= 20;
    case "weekly":
      return diffHours >= 160;
    case "biweekly":
      return diffHours >= 312;
    case "monthly":
      return diffHours >= 672;
    default:
      return diffHours >= 160;
  }
}

async function checkSpendingAboveAverage(
  supabase: any,
  userId: string,
  threshold: number
): Promise<string | null> {
  const today = getBrazilDate();
  const currentMonth = today.slice(0, 7);
  const currentDay = parseInt(today.slice(8, 10));

  // Get last 3 months of expenses
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const startDate = threeMonthsAgo.toISOString().slice(0, 10);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, date, type")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("date", startDate);

  if (!transactions || transactions.length < 5) return null;

  // Separate current month vs previous months
  const currentMonthExpenses = transactions
    .filter((t: any) => t.date.startsWith(currentMonth))
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const previousMonths = transactions.filter(
    (t: any) => !t.date.startsWith(currentMonth)
  );

  if (previousMonths.length === 0) return null;

  // Calculate daily average from previous months
  const monthsMap = new Map<string, number>();
  for (const t of previousMonths) {
    const m = t.date.slice(0, 7);
    monthsMap.set(m, (monthsMap.get(m) || 0) + Number(t.amount));
  }

  const monthlyTotals = Array.from(monthsMap.values());
  const avgMonthlyExpense =
    monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length;

  // Proportional: compare current spending proportional to days elapsed
  const proportionalAvg = (avgMonthlyExpense / 30) * currentDay;
  const percentAbove =
    proportionalAvg > 0
      ? ((currentMonthExpenses - proportionalAvg) / proportionalAvg) * 100
      : 0;

  if (percentAbove > threshold) {
    return (
      `🚨 *Alerta: Gastos acima da média!*\n\n` +
      `Você já gastou ${formatCurrency(currentMonthExpenses)} este mês (dia ${currentDay}).\n` +
      `A média proporcional dos últimos meses para este período seria ${formatCurrency(proportionalAvg)}.\n\n` +
      `📊 Isso representa *${percentAbove.toFixed(0)}% acima* da sua média!\n\n` +
      `💡 _Revise seus gastos recentes para identificar onde pode economizar._`
    );
  }

  return null;
}

async function checkDelayedGoals(
  supabase: any,
  userId: string,
  _threshold: number
): Promise<string | null> {
  const { data: goals } = await supabase
    .from("custom_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("is_completed", false)
    .not("deadline", "is", null);

  if (!goals || goals.length === 0) return null;

  const today = new Date();
  const alerts: string[] = [];

  for (const goal of goals) {
    const deadline = new Date(goal.deadline);
    const created = new Date(goal.created_at);
    const totalDays = (deadline.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    const expectedProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
    const actualProgress =
      goal.target_amount > 0
        ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100
        : 0;

    const daysRemaining = Math.ceil(
      (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining < 0) {
      // Already past deadline
      alerts.push(
        `• *${goal.icon || "🎯"} ${goal.name}*: Prazo vencido há ${Math.abs(daysRemaining)} dias! ` +
        `Progresso: ${actualProgress.toFixed(0)}%`
      );
    } else if (expectedProgress - actualProgress > 15 && daysRemaining > 0) {
      // Behind schedule by more than 15%
      const remaining = Number(goal.target_amount) - Number(goal.current_amount);
      alerts.push(
        `• *${goal.icon || "🎯"} ${goal.name}*: ${actualProgress.toFixed(0)}% concluída ` +
        `(deveria estar em ~${expectedProgress.toFixed(0)}%). ` +
        `Faltam ${formatCurrency(remaining)} em ${daysRemaining} dias.`
      );
    }
  }

  if (alerts.length === 0) return null;

  return (
    `⏰ *Alerta: Metas atrasadas*\n\n` +
    alerts.join("\n\n") +
    `\n\n💪 _Não desista! Pequenos aportes regulares fazem a diferença._`
  );
}

async function checkRecurringExpenseIncrease(
  supabase: any,
  userId: string,
  threshold: number
): Promise<string | null> {
  const today = getBrazilDate();
  const currentMonth = today.slice(0, 7);

  // Previous month
  const prevDate = new Date();
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonth = prevDate.toISOString().slice(0, 7);

  // Get expenses with categories for both months
  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, date, category_id, categories(name)")
    .eq("user_id", userId)
    .eq("type", "expense")
    .or(`date.gte.${prevMonth}-01,date.lte.${currentMonth}-31`);

  if (!transactions || transactions.length < 3) return null;

  // Group by category and month
  const categoryMonthMap = new Map<
    string,
    { current: number; previous: number; name: string }
  >();

  for (const t of transactions) {
    const catName = t.categories?.name || "Sem categoria";
    const month = t.date.slice(0, 7);
    const key = catName;

    if (!categoryMonthMap.has(key)) {
      categoryMonthMap.set(key, { current: 0, previous: 0, name: catName });
    }

    const entry = categoryMonthMap.get(key)!;
    if (month === currentMonth) {
      entry.current += Number(t.amount);
    } else if (month === prevMonth) {
      entry.previous += Number(t.amount);
    }
  }

  const increases: string[] = [];

  for (const [, data] of categoryMonthMap) {
    if (data.previous > 50) {
      // Only meaningful categories
      const pctChange =
        ((data.current - data.previous) / data.previous) * 100;
      if (pctChange > threshold) {
        increases.push(
          `• *${data.name}*: ${formatCurrency(data.previous)} → ${formatCurrency(data.current)} ` +
          `(+${pctChange.toFixed(0)}%)`
        );
      }
    }
  }

  if (increases.length === 0) return null;

  return (
    `📈 *Alerta: Despesas recorrentes em alta*\n\n` +
    `Categorias que aumentaram acima de ${threshold}% em relação ao mês anterior:\n\n` +
    increases.join("\n") +
    `\n\n🔍 _Verifique se esses aumentos são temporários ou precisam de atenção._`
  );
}

const ALERT_PROCESSORS: Record<
  string,
  (supabase: any, userId: string, threshold: number) => Promise<string | null>
> = {
  spending_above_avg: checkSpendingAboveAverage,
  goal_delayed: checkDelayedGoals,
  recurring_expense_increase: checkRecurringExpenseIncrease,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("Processing smart alerts...");

    // Get all active alert configs
    const { data: configs, error: configError } = await supabase
      .from("smart_alerts_config")
      .select("*")
      .eq("is_active", true);

    if (configError) throw configError;
    if (!configs || configs.length === 0) {
      console.log("No active smart alerts found");
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${configs.length} active smart alert configs`);

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    // Group configs by user
    const userConfigs = new Map<string, AlertConfig[]>();
    for (const config of configs) {
      if (!shouldSendAlert(config)) {
        skipped++;
        continue;
      }
      const list = userConfigs.get(config.user_id) || [];
      list.push(config);
      userConfigs.set(config.user_id, list);
    }

    for (const [userId, alertConfigs] of userConfigs) {
      // Check if user has WhatsApp enabled
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number, whatsapp_notifications_enabled")
        .eq("id", userId)
        .single();

      if (!profile?.phone_number || !profile?.whatsapp_notifications_enabled) {
        console.log(`User ${userId}: WhatsApp not configured, skipping`);
        skipped += alertConfigs.length;
        continue;
      }

      for (const config of alertConfigs) {
        try {
          const processor = ALERT_PROCESSORS[config.alert_type];
          if (!processor) {
            console.log(`Unknown alert type: ${config.alert_type}`);
            skipped++;
            continue;
          }

          const message = await processor(supabase, userId, config.threshold || 20);

          if (!message) {
            console.log(
              `Alert ${config.alert_type} for user ${userId}: no alert needed`
            );
            // Update last_triggered_at so we don't check too frequently
            await supabase
              .from("smart_alerts_config")
              .update({ last_triggered_at: new Date().toISOString() })
              .eq("id", config.id);
            skipped++;
            continue;
          }

          console.log(
            `Sending ${config.alert_type} alert to user ${userId}`
          );

          // Send via WhatsApp
          const { error: sendError } = await supabase.functions.invoke(
            "send-whatsapp",
            {
              body: {
                message,
                messageType: `smart_alert_${config.alert_type}`,
                targetUserId: userId,
              },
            }
          );

          if (sendError) {
            console.error(`Failed to send alert: ${sendError.message}`);
            failed++;
          } else {
            sent++;
            // Update last triggered
            await supabase
              .from("smart_alerts_config")
              .update({ last_triggered_at: new Date().toISOString() })
              .eq("id", config.id);
          }
        } catch (err) {
          console.error(`Error processing alert ${config.alert_type}:`, err);
          failed++;
        }
      }
    }

    const result = { success: true, sent, skipped, failed };
    console.log("Smart alerts processing complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Smart alerts error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
