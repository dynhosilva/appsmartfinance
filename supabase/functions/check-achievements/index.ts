import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AchievementDef {
  type: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  check: (ctx: UserContext) => boolean;
}

interface UserContext {
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  totalIncome: number;
  totalExpenses: number;
  consecutivePositiveMonths: number;
  goalsCompleted: number;
  goalsCreated: number;
  reservePercentage: number;
  reserveCompleted: boolean;
  reserveStarted: boolean;
  bankCount: number;
  debtsPaid: number;
  totalDebtsActive: number;
  categoriesCreated: number;
  notesCreated: number;
  daysActive: number;
  monthsWithData: number;
}

const ACHIEVEMENTS: AchievementDef[] = [
  // Primeiros passos
  {
    type: "first_transaction",
    title: "Primeiro Passo",
    description: "Registre sua primeira transação",
    icon: "⭐",
    points: 10,
    check: (ctx) => ctx.transactionCount >= 1,
  },
  {
    type: "first_income",
    title: "Primeira Receita",
    description: "Registre sua primeira entrada de receita",
    icon: "💰",
    points: 15,
    check: (ctx) => ctx.incomeCount >= 1,
  },
  {
    type: "first_bank",
    title: "Conta Cadastrada",
    description: "Cadastre seu primeiro banco",
    icon: "🏦",
    points: 10,
    check: (ctx) => ctx.bankCount >= 1,
  },
  {
    type: "first_goal",
    title: "Sonhador",
    description: "Crie sua primeira meta financeira",
    icon: "🎯",
    points: 15,
    check: (ctx) => ctx.goalsCreated >= 1,
  },

  // Consistência
  {
    type: "10_transactions",
    title: "Consistente",
    description: "Registre 10 transações",
    icon: "📊",
    points: 25,
    check: (ctx) => ctx.transactionCount >= 10,
  },
  {
    type: "50_transactions",
    title: "Dedicado",
    description: "Registre 50 transações",
    icon: "📈",
    points: 50,
    check: (ctx) => ctx.transactionCount >= 50,
  },
  {
    type: "100_transactions",
    title: "Mestre dos Registros",
    description: "Registre 100 transações",
    icon: "🏅",
    points: 100,
    check: (ctx) => ctx.transactionCount >= 100,
  },
  {
    type: "3_months_active",
    title: "Hábito Financeiro",
    description: "Mantenha registros por 3 meses",
    icon: "📅",
    points: 50,
    check: (ctx) => ctx.monthsWithData >= 3,
  },
  {
    type: "6_months_active",
    title: "Veterano Financeiro",
    description: "Mantenha registros por 6 meses",
    icon: "🎖️",
    points: 100,
    check: (ctx) => ctx.monthsWithData >= 6,
  },

  // Meses positivos
  {
    type: "1_positive_month",
    title: "No Azul",
    description: "Tenha 1 mês com saldo positivo",
    icon: "✅",
    points: 20,
    check: (ctx) => ctx.consecutivePositiveMonths >= 1,
  },
  {
    type: "3_positive_months",
    title: "Sequência de Ouro",
    description: "3 meses consecutivos com saldo positivo",
    icon: "🔥",
    points: 75,
    check: (ctx) => ctx.consecutivePositiveMonths >= 3,
  },
  {
    type: "6_positive_months",
    title: "Estabilidade Financeira",
    description: "6 meses consecutivos no positivo",
    icon: "💎",
    points: 150,
    check: (ctx) => ctx.consecutivePositiveMonths >= 6,
  },

  // Reserva de emergência
  {
    type: "reserve_started",
    title: "Reserva Iniciada",
    description: "Comece sua reserva de emergência",
    icon: "🛡️",
    points: 20,
    check: (ctx) => ctx.reserveStarted,
  },
  {
    type: "reserve_25",
    title: "25% da Reserva",
    description: "Alcance 25% da sua reserva de emergência",
    icon: "🥉",
    points: 50,
    check: (ctx) => ctx.reservePercentage >= 25,
  },
  {
    type: "reserve_50",
    title: "Meio Caminho",
    description: "Alcance 50% da sua reserva de emergência",
    icon: "🥈",
    points: 100,
    check: (ctx) => ctx.reservePercentage >= 50,
  },
  {
    type: "reserve_75",
    title: "Quase Lá",
    description: "Alcance 75% da sua reserva de emergência",
    icon: "🥇",
    points: 150,
    check: (ctx) => ctx.reservePercentage >= 75,
  },
  {
    type: "reserve_completed",
    title: "Reserva Concluída",
    description: "Complete 100% da sua reserva de emergência",
    icon: "🏆",
    points: 300,
    check: (ctx) => ctx.reserveCompleted,
  },

  // Metas
  {
    type: "goal_achieved",
    title: "Meta Alcançada",
    description: "Complete sua primeira meta financeira",
    icon: "🎉",
    points: 75,
    check: (ctx) => ctx.goalsCompleted >= 1,
  },
  {
    type: "3_goals_achieved",
    title: "Realizador",
    description: "Complete 3 metas financeiras",
    icon: "🌟",
    points: 150,
    check: (ctx) => ctx.goalsCompleted >= 3,
  },
  {
    type: "5_goals_achieved",
    title: "Imparável",
    description: "Complete 5 metas financeiras",
    icon: "👑",
    points: 250,
    check: (ctx) => ctx.goalsCompleted >= 5,
  },

  // Dívidas
  {
    type: "debt_paid",
    title: "Livre de uma Dívida",
    description: "Quite uma dívida completamente",
    icon: "🔓",
    points: 50,
    check: (ctx) => ctx.debtsPaid >= 1,
  },
  {
    type: "debt_free",
    title: "Livre de Dívidas",
    description: "Quite todas as suas dívidas",
    icon: "🦅",
    points: 200,
    check: (ctx) => ctx.debtsPaid >= 1 && ctx.totalDebtsActive === 0,
  },

  // Organização
  {
    type: "multi_bank",
    title: "Diversificado",
    description: "Cadastre 3 ou mais contas bancárias",
    icon: "🏛️",
    points: 30,
    check: (ctx) => ctx.bankCount >= 3,
  },
  {
    type: "organized",
    title: "Organizado",
    description: "Crie categorias personalizadas",
    icon: "🗂️",
    points: 15,
    check: (ctx) => ctx.categoriesCreated >= 1,
  },
  {
    type: "note_taker",
    title: "Planejador",
    description: "Use o bloco de notas para seus planos",
    icon: "📝",
    points: 10,
    check: (ctx) => ctx.notesCreated >= 1,
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const userId = user.id;

    // Fetch all data in parallel
    const [
      transactionsRes,
      goalsRes,
      emergencyRes,
      banksRes,
      debtsRes,
      debtsAllRes,
      categoriesRes,
      notesRes,
      existingAchievementsRes,
    ] = await Promise.all([
      supabase.from("transactions").select("amount, type, date").eq("user_id", userId),
      supabase.from("custom_goals").select("is_completed").eq("user_id", userId),
      supabase.from("emergency_goals").select("current_amount, target_amount").eq("user_id", userId).maybeSingle(),
      supabase.from("banks").select("id").eq("user_id", userId).eq("is_active", true),
      supabase.from("debts").select("id").eq("user_id", userId).eq("status", "paid"),
      supabase.from("debts").select("id").eq("user_id", userId).eq("status", "active"),
      supabase.from("categories").select("id").eq("user_id", userId).eq("is_default", false),
      supabase.from("notes").select("id").eq("user_id", userId),
      supabase.from("achievements").select("achievement_type").eq("user_id", userId),
    ]);

    const transactions = transactionsRes.data || [];
    const goals = goalsRes.data || [];
    const emergency = emergencyRes.data;
    const existingTypes = new Set((existingAchievementsRes.data || []).map((a: any) => a.achievement_type));

    // Calculate consecutive positive months
    const monthlyBalance = new Map<string, number>();
    for (const t of transactions) {
      const month = t.date.slice(0, 7);
      const amount = Number(t.amount);
      const val = monthlyBalance.get(month) || 0;
      monthlyBalance.set(month, val + (t.type === "income" ? amount : -amount));
    }

    // Sort months descending to count consecutive positive from most recent
    const sortedMonths = Array.from(monthlyBalance.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    let consecutivePositive = 0;
    for (const [, balance] of sortedMonths) {
      if (balance > 0) consecutivePositive++;
      else break;
    }

    // Calculate months with data
    const monthsWithData = monthlyBalance.size;

    // Reserve calculations
    const reserveAmount = Number(emergency?.current_amount || 0);
    const reserveTarget = Number(emergency?.target_amount || 0);
    const reservePercentage = reserveTarget > 0 ? (reserveAmount / reserveTarget) * 100 : 0;

    // Days active
    const dates = transactions.map(t => t.date);
    const uniqueDates = new Set(dates);

    const ctx: UserContext = {
      transactionCount: transactions.length,
      incomeCount: transactions.filter(t => t.type === "income").length,
      expenseCount: transactions.filter(t => t.type === "expense").length,
      totalIncome: transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
      totalExpenses: transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
      consecutivePositiveMonths: consecutivePositive,
      goalsCompleted: goals.filter(g => g.is_completed).length,
      goalsCreated: goals.length,
      reservePercentage,
      reserveCompleted: reservePercentage >= 100,
      reserveStarted: reserveAmount > 0,
      bankCount: banksRes.data?.length || 0,
      debtsPaid: debtsRes.data?.length || 0,
      totalDebtsActive: debtsAllRes.data?.length || 0,
      categoriesCreated: categoriesRes.data?.length || 0,
      notesCreated: notesRes.data?.length || 0,
      daysActive: uniqueDates.size,
      monthsWithData,
    };

    // Check and unlock new achievements
    const newAchievements: string[] = [];
    for (const achievement of ACHIEVEMENTS) {
      if (existingTypes.has(achievement.type)) continue;
      if (achievement.check(ctx)) {
        const { error } = await supabase.from("achievements").insert({
          user_id: userId,
          achievement_type: achievement.type,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          points: achievement.points,
        });
        if (!error) {
          newAchievements.push(achievement.title);
        }
      }
    }

    // Get all achievements for response
    const { data: allAchievements } = await supabase
      .from("achievements")
      .select("*")
      .eq("user_id", userId)
      .order("unlocked_at", { ascending: true });

    const totalPoints = (allAchievements || []).reduce((s: number, a: any) => s + (a.points || 0), 0);

    // Build progress info for locked achievements
    const progress = ACHIEVEMENTS.map((def) => {
      const unlocked = existingTypes.has(def.type) || newAchievements.includes(def.title);
      return {
        type: def.type,
        title: def.title,
        description: def.description,
        icon: def.icon,
        points: def.points,
        unlocked,
        unlockedAt: unlocked
          ? (allAchievements || []).find((a: any) => a.achievement_type === def.type)?.unlocked_at || new Date().toISOString()
          : null,
      };
    });

    // Calculate level
    let level = "Iniciante";
    let levelIcon = "🌱";
    if (totalPoints >= 1000) { level = "Mestre Financeiro"; levelIcon = "👑"; }
    else if (totalPoints >= 500) { level = "Investidor"; levelIcon = "💎"; }
    else if (totalPoints >= 250) { level = "Estrategista"; levelIcon = "🧠"; }
    else if (totalPoints >= 100) { level = "Organizador"; levelIcon = "📊"; }
    else if (totalPoints >= 30) { level = "Aprendiz"; levelIcon = "📚"; }

    // Next level threshold
    const thresholds = [30, 100, 250, 500, 1000];
    const nextThreshold = thresholds.find(t => t > totalPoints) || 1000;
    const prevThreshold = thresholds.filter(t => t <= totalPoints).pop() || 0;
    const levelProgress = ((totalPoints - prevThreshold) / (nextThreshold - prevThreshold)) * 100;

    return new Response(
      JSON.stringify({
        achievements: progress,
        totalPoints,
        newAchievements,
        level,
        levelIcon,
        nextThreshold,
        levelProgress: Math.min(100, Math.max(0, levelProgress)),
        unlockedCount: progress.filter(p => p.unlocked).length,
        totalCount: progress.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
