import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ProfileType = "personal" | "business";

type TransactionContext = {
  id: string;
  date: string;
  time: string | null;
  createdAt: string | null;
  profile: ProfileType;
  type: string;
  amount: number;
  description: string | null;
  bank: string | null;
  category: string | null;
  isEssential: boolean | null;
  incomeType: string | null;
  splitApplied: boolean;
  personalAmount: number | null;
  reserveAmount: number | null;
  businessAmount: number | null;
  tags: string[];
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const formatCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));

const formatDateTime = (transaction: TransactionContext) => {
  const date = transaction.date?.split("-").reverse().join("/") ?? "data indisponível";
  const time = transaction.time ? ` às ${transaction.time.slice(0, 5)}` : "";
  return `${date}${time}`;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sseTextResponse = (text: string) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
        ),
      );
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
};

const resolveRequestedProfile = (question: string): ProfileType | null => {
  const normalized = normalizeText(question);

  if (
    normalized.includes("conta pessoal") ||
    normalized.includes("perfil pessoal") ||
    normalized.includes("transacao pessoal") ||
    normalized.includes("lancamento pessoal") ||
    normalized.includes("pessoal")
  ) {
    return "personal";
  }

  if (
    normalized.includes("conta empresarial") ||
    normalized.includes("conta empresa") ||
    normalized.includes("perfil empresarial") ||
    normalized.includes("transacao empresarial") ||
    normalized.includes("empresa") ||
    normalized.includes("empresarial")
  ) {
    return "business";
  }

  return null;
};

const isLatestTransactionQuestion = (question: string) => {
  const normalized = normalizeText(question);
  return (
    normalized.includes("ultima transacao") ||
    normalized.includes("ultimo lancamento") ||
    normalized.includes("transacao mais recente") ||
    normalized.includes("lancamento mais recente")
  );
};

const buildLatestTransactionReply = (
  transaction: TransactionContext | null,
  requestedProfile: ProfileType | null,
) => {
  if (!transaction) {
    if (requestedProfile === "personal") {
      return "Não encontrei nenhuma transação registrada no perfil pessoal.";
    }

    if (requestedProfile === "business") {
      return "Não encontrei nenhuma transação registrada no perfil empresarial.";
    }

    return "Não encontrei nenhuma transação registrada.";
  }

  const profileLabel =
    transaction.profile === "personal" ? "perfil pessoal" : "perfil empresarial";
  const transactionType = transaction.type === "income" ? "receita" : "despesa";
  const essentialLabel =
    transaction.type === "expense" && transaction.isEssential !== null
      ? transaction.isEssential
        ? " • essencial"
        : " • não essencial"
      : "";

  return [
    `A última transação registrada no **${profileLabel}** foi:`,
    `- **${transaction.description || "Sem descrição"}**`,
    `- **Tipo:** ${transactionType}${essentialLabel}`,
    `- **Valor:** ${formatCurrency(transaction.amount)}`,
    `- **Data:** ${formatDateTime(transaction)}`,
    transaction.bank ? `- **Banco:** ${transaction.bank}` : null,
    transaction.category ? `- **Categoria:** ${transaction.category}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};

const summarizeProfile = (transactions: TransactionContext[], profile: ProfileType) => {
  const filtered = transactions.filter((transaction) => transaction.profile === profile);
  const income = filtered
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expense = filtered
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    total_transactions: filtered.length,
    total_income: income,
    total_expense: expense,
    balance: income - expense,
    latest_transaction: filtered[0] ?? null,
    oldest_transaction: filtered[filtered.length - 1] ?? null,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const messages = body?.messages as ChatMessage[] | undefined;

    if (
      !Array.isArray(messages) ||
      messages.some(
        (message) =>
          !message ||
          typeof message.content !== "string" ||
          !["system", "user", "assistant"].includes(message.role),
      )
    ) {
      return jsonResponse({ error: "messages array is required" }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl) return jsonResponse({ error: "SUPABASE_URL is not configured" }, 500);
    if (!supabaseAnonKey) {
      return jsonResponse({ error: "SUPABASE_ANON_KEY is not configured" }, 500);
    }
    if (!serviceRoleKey) {
      return jsonResponse({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" }, 500);
    }
    if (!lovableApiKey) {
      return jsonResponse({ error: "LOVABLE_API_KEY is not configured" }, 500);
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Invalid session" }, 401);
    }

    const [
      profileRes,
      planRes,
      banksRes,
      categoriesRes,
      transactionsRes,
      debtsRes,
      debtPaymentsRes,
      goalsRes,
      emergencyGoalRes,
      fixedCostsRes,
      splitRulesRes,
      remindersRes,
      smartAlertsRes,
      userBalanceRes,
    ] = await Promise.all([
      adminClient.from("profiles").select("full_name, email, phone_number").eq("id", user.id).maybeSingle(),
      adminClient.rpc("get_user_plan", { p_user_id: user.id }),
      adminClient
        .from("banks")
        .select("id, name, current_balance, initial_balance, account_type, is_active, profile_type, agency, account_number, color")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      adminClient
        .from("categories")
        .select("id, name, icon, color, profile_type, is_default")
        .or(`user_id.eq.${user.id},is_default.eq.true`)
        .order("name", { ascending: true }),
      adminClient
        .from("transactions")
        .select(
          "id, amount, type, date, description, profile_type, transaction_time, created_at, bank_id, category_id, is_essential, tags, income_type, split_applied, personal_amount, reserve_amount, business_amount",
        )
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("transaction_time", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1000),
      adminClient
        .from("debts")
        .select("id, name, creditor, total_amount, current_balance, interest_rate, minimum_payment, due_day, start_date, status, notes, profile_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      adminClient
        .from("debt_payments")
        .select("id, debt_id, amount, payment_date, notes, created_at")
        .eq("user_id", user.id)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200),
      adminClient
        .from("custom_goals")
        .select("id, name, target_amount, current_amount, is_completed, deadline, description, category, color, icon")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      adminClient
        .from("emergency_goals")
        .select("id, target_amount, current_amount, target_months, goal_type")
        .eq("user_id", user.id)
        .maybeSingle(),
      adminClient
        .from("fixed_costs")
        .select("id, name, amount, is_variable, category_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      adminClient
        .from("split_rules")
        .select("id, name, personal_percentage, reserve_percentage, business_percentage, is_active")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      adminClient
        .from("reminders")
        .select("id, title, reminder_type, is_active, next_send_at, day_of_month, day_of_week, time_of_day, days_before")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      adminClient
        .from("smart_alerts_config")
        .select("id, alert_type, frequency, threshold, is_active, last_triggered_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      adminClient
        .from("user_balance")
        .select("available_balance, updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const criticalErrors = [
      ["profiles", profileRes.error],
      ["banks", banksRes.error],
      ["transactions", transactionsRes.error],
      ["debts", debtsRes.error],
      ["custom_goals", goalsRes.error],
    ].filter(([, error]) => error);

    if (criticalErrors.length > 0) {
      console.error(
        "Critical ai-chat query errors:",
        criticalErrors.map(([name, error]) => ({ name, error })),
      );
      return jsonResponse({ error: "Erro ao carregar o contexto financeiro do usuário" }, 500);
    }

    const optionalErrors = [
      ["get_user_plan", planRes.error],
      ["categories", categoriesRes.error],
      ["debt_payments", debtPaymentsRes.error],
      ["emergency_goals", emergencyGoalRes.error],
      ["fixed_costs", fixedCostsRes.error],
      ["split_rules", splitRulesRes.error],
      ["reminders", remindersRes.error],
      ["smart_alerts_config", smartAlertsRes.error],
      ["user_balance", userBalanceRes.error],
    ].filter(([, error]) => error);

    if (optionalErrors.length > 0) {
      console.error(
        "Optional ai-chat query errors:",
        optionalErrors.map(([name, error]) => ({ name, error })),
      );
    }

    const profile = profileRes.data;
    const plan = planRes.data?.[0] ?? null;
    const banks = banksRes.data ?? [];
    const categories = categoriesRes.data ?? [];
    const debts = debtsRes.data ?? [];
    const debtPayments = debtPaymentsRes.data ?? [];
    const goals = goalsRes.data ?? [];
    const emergencyGoal = emergencyGoalRes.data ?? null;
    const fixedCosts = fixedCostsRes.data ?? [];
    const splitRules = splitRulesRes.data ?? [];
    const reminders = remindersRes.data ?? [];
    const smartAlerts = smartAlertsRes.data ?? [];
    const userBalance = userBalanceRes.data ?? null;

    const bankMap = new Map(banks.map((bank) => [bank.id, bank.name]));
    const categoryMap = new Map(categories.map((category) => [category.id, category.name]));

    const transactions: TransactionContext[] = (transactionsRes.data ?? []).map((transaction) => ({
      id: transaction.id,
      date: transaction.date,
      time: transaction.transaction_time,
      createdAt: transaction.created_at,
      profile: transaction.profile_type as ProfileType,
      type: transaction.type,
      amount: Number(transaction.amount),
      description: transaction.description,
      bank: transaction.bank_id ? bankMap.get(transaction.bank_id) ?? null : null,
      category: transaction.category_id ? categoryMap.get(transaction.category_id) ?? null : null,
      isEssential: transaction.is_essential,
      incomeType: transaction.income_type,
      splitApplied: Boolean(transaction.split_applied),
      personalAmount: transaction.personal_amount === null ? null : Number(transaction.personal_amount),
      reserveAmount: transaction.reserve_amount === null ? null : Number(transaction.reserve_amount),
      businessAmount: transaction.business_amount === null ? null : Number(transaction.business_amount),
      tags: Array.isArray(transaction.tags) ? transaction.tags : [],
    }));

    const latestPersonalTransaction =
      transactions.find((transaction) => transaction.profile === "personal") ?? null;
    const latestBusinessTransaction =
      transactions.find((transaction) => transaction.profile === "business") ?? null;
    const latestOverallTransaction = transactions[0] ?? null;

    const activeBanks = banks.filter((bank) => bank.is_active);
    const personalBanks = activeBanks.filter((bank) => bank.profile_type === "personal");
    const businessBanks = activeBanks.filter((bank) => bank.profile_type === "business");

    const contextPayload = {
      metadata: {
        generated_at: new Date().toISOString(),
        timezone: "America/Sao_Paulo",
        assistant_scope: "financial_app_full_context",
      },
      user: {
        id: user.id,
        full_name: profile?.full_name ?? "Usuário",
        email: profile?.email ?? null,
        phone_number: profile?.phone_number ?? null,
      },
      plan: plan
        ? {
            plan_type: plan.plan_type,
            plan_name: plan.plan_name,
            is_active: plan.is_active,
            whatsapp_enabled: plan.whatsapp_enabled,
            reports_enabled: plan.reports_enabled,
            split_enabled: plan.split_enabled,
            business_profile_enabled: plan.business_profile_enabled,
            advanced_dashboard_enabled: plan.advanced_dashboard_enabled,
            annual_projection_enabled: plan.annual_projection_enabled,
            monthly_planning_enabled: plan.monthly_planning_enabled,
            history_months: plan.history_months,
          }
        : null,
      summary: {
        transactions_total: transactions.length,
        banks_total: banks.length,
        debts_total: debts.length,
        goals_total: goals.length,
        reminders_total: reminders.length,
        smart_alerts_total: smartAlerts.length,
        personal: summarizeProfile(transactions, "personal"),
        business: summarizeProfile(transactions, "business"),
        consolidated_active_bank_balance: activeBanks.reduce(
          (sum, bank) => sum + Number(bank.current_balance),
          0,
        ),
        active_bank_balance_personal: personalBanks.reduce(
          (sum, bank) => sum + Number(bank.current_balance),
          0,
        ),
        active_bank_balance_business: businessBanks.reduce(
          (sum, bank) => sum + Number(bank.current_balance),
          0,
        ),
      },
      latest_records: {
        latest_transaction_overall: latestOverallTransaction,
        latest_transaction_personal: latestPersonalTransaction,
        latest_transaction_business: latestBusinessTransaction,
        latest_debt_payment:
          debtPayments[0]
            ? {
                ...debtPayments[0],
                amount: Number(debtPayments[0].amount),
              }
            : null,
      },
      balances: {
        available_balance: userBalance?.available_balance === null || userBalance?.available_balance === undefined
          ? null
          : Number(userBalance.available_balance),
        updated_at: userBalance?.updated_at ?? null,
      },
      banks: banks.map((bank) => ({
        id: bank.id,
        name: bank.name,
        profile_type: bank.profile_type,
        is_active: bank.is_active,
        account_type: bank.account_type,
        current_balance: Number(bank.current_balance),
        initial_balance: Number(bank.initial_balance),
        agency: bank.agency,
        account_number: bank.account_number,
        color: bank.color,
      })),
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        profile_type: category.profile_type,
        is_default: category.is_default,
        icon: category.icon,
        color: category.color,
      })),
      transactions,
      debts: debts.map((debt) => ({
        ...debt,
        total_amount: Number(debt.total_amount),
        current_balance: Number(debt.current_balance),
        interest_rate: debt.interest_rate === null ? null : Number(debt.interest_rate),
        minimum_payment:
          debt.minimum_payment === null ? null : Number(debt.minimum_payment),
      })),
      debt_payments: debtPayments.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
      })),
      goals: goals.map((goal) => ({
        ...goal,
        target_amount: Number(goal.target_amount),
        current_amount: Number(goal.current_amount),
      })),
      emergency_goal: emergencyGoal
        ? {
            ...emergencyGoal,
            target_amount:
              emergencyGoal.target_amount === null
                ? null
                : Number(emergencyGoal.target_amount),
            current_amount:
              emergencyGoal.current_amount === null
                ? null
                : Number(emergencyGoal.current_amount),
          }
        : null,
      fixed_costs: fixedCosts.map((cost) => ({
        ...cost,
        amount: Number(cost.amount),
        category_name: cost.category_id ? categoryMap.get(cost.category_id) ?? null : null,
      })),
      split_rules: splitRules.map((rule) => ({
        ...rule,
        personal_percentage: Number(rule.personal_percentage),
        reserve_percentage: Number(rule.reserve_percentage),
        business_percentage: Number(rule.business_percentage),
      })),
      reminders,
      smart_alerts: smartAlerts.map((alert) => ({
        ...alert,
        threshold: alert.threshold === null ? null : Number(alert.threshold),
      })),
    };

    console.log("ai-chat context loaded", {
      user_id: user.id,
      transactions: transactions.length,
      banks: banks.length,
      debts: debts.length,
      goals: goals.length,
      latest_personal_transaction_date: latestPersonalTransaction?.date ?? null,
      latest_business_transaction_date: latestBusinessTransaction?.date ?? null,
    });

    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user")?.content;

    if (lastUserMessage && isLatestTransactionQuestion(lastUserMessage)) {
      const requestedProfile = resolveRequestedProfile(lastUserMessage);
      const latestTransaction =
        requestedProfile === "personal"
          ? latestPersonalTransaction
          : requestedProfile === "business"
            ? latestBusinessTransaction
            : latestOverallTransaction;

      return sseTextResponse(buildLatestTransactionReply(latestTransaction, requestedProfile));
    }

    const systemPrompt = `Você é o Assistente Financeiro IA do Smart Finance. Responda sempre em português do Brasil.

Você tem acesso ao contexto completo e atualizado da ferramenta e aos dados REAIS do usuário em JSON.

REGRAS IMPORTANTES:
- Use exclusivamente os dados do contexto abaixo.
- Nunca diga que não possui histórico, fechamento ou transações se o JSON contiver dados nessas coleções.
- "Conta pessoal" = perfil \\"personal\\". "Conta empresarial" = perfil \\"business\\".
- Quando a pergunta for sobre última transação, consulte primeiro \\"latest_records\\".
- Para perguntas sobre transações, você pode consultar também a coleção completa \\"transactions\\".
- Quando responder sobre uma transação, informe data, hora, valor, tipo, descrição, banco e categoria quando disponíveis.
- Se não houver registros de algo, diga explicitamente que não há registros.
- Seja útil, direto e específico. Responda primeiro o que foi perguntado e depois complemente com contexto útil, se fizer sentido.
- Formate usando markdown com listas e destaque em **negrito** quando ajudar.

CONTEXTO JSON:
${JSON.stringify(contextPayload)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResponse(
          { error: "Muitas requisições. Tente novamente em alguns segundos." },
          429,
        );
      }

      if (response.status === 402) {
        return jsonResponse(
          {
            error:
              "Créditos de IA esgotados. Adicione créditos no workspace para continuar.",
          },
          402,
        );
      }

      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return jsonResponse({ error: "Erro ao conectar com IA" }, 500);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ai-chat error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      500,
    );
  }
});
