import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user's financial context
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const [transactionsRes, banksRes, debtsRes, goalsRes, profileRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("amount, type, date, description, profile_type, categories(name)")
        .eq("user_id", user.id)
        .gte("date", startOfMonth)
        .lte("date", endOfMonth)
        .order("date", { ascending: false })
        .limit(100),
      supabase
        .from("banks")
        .select("name, current_balance, account_type, is_active, profile_type")
        .eq("user_id", user.id),
      supabase
        .from("debts")
        .select("name, total_amount, current_balance, status, profile_type")
        .eq("user_id", user.id),
      supabase
        .from("custom_goals")
        .select("name, target_amount, current_amount, is_completed, deadline")
        .eq("user_id", user.id),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single(),
    ]);

    const transactions = transactionsRes.data || [];
    const banks = banksRes.data || [];
    const debts = debtsRes.data || [];
    const goals = goalsRes.data || [];
    const userName = profileRes.data?.full_name || "Usuário";

    // Build financial summary for context
    const personalTx = transactions.filter((t: any) => t.profile_type === "personal");
    const businessTx = transactions.filter((t: any) => t.profile_type === "business");

    const sumByType = (txs: any[], type: string) =>
      txs.filter((t: any) => t.type === type).reduce((s: number, t: any) => s + Number(t.amount), 0);

    const personalBanks = banks.filter((b: any) => b.profile_type === "personal" && b.is_active);
    const businessBanks = banks.filter((b: any) => b.profile_type === "business" && b.is_active);

    const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    const financialContext = `
## Contexto Financeiro de ${userName} — ${monthName}

### Perfil Pessoal
- Receitas do mês: R$ ${sumByType(personalTx, "income").toFixed(2)}
- Despesas do mês: R$ ${sumByType(personalTx, "expense").toFixed(2)}
- Saldo em contas: R$ ${personalBanks.reduce((s: number, b: any) => s + Number(b.current_balance), 0).toFixed(2)}
- Contas bancárias: ${personalBanks.map((b: any) => `${b.name} (R$ ${Number(b.current_balance).toFixed(2)})`).join(", ") || "Nenhuma"}

### Perfil Empresarial
- Receitas do mês: R$ ${sumByType(businessTx, "income").toFixed(2)}
- Despesas do mês: R$ ${sumByType(businessTx, "expense").toFixed(2)}
- Saldo em contas: R$ ${businessBanks.reduce((s: number, b: any) => s + Number(b.current_balance), 0).toFixed(2)}
- Contas bancárias: ${businessBanks.map((b: any) => `${b.name} (R$ ${Number(b.current_balance).toFixed(2)})`).join(", ") || "Nenhuma"}

### Dívidas
${debts.length > 0 ? debts.map((d: any) => `- ${d.name}: R$ ${Number(d.current_balance).toFixed(2)} de R$ ${Number(d.total_amount).toFixed(2)} (${d.status}) [${d.profile_type}]`).join("\n") : "Nenhuma dívida registrada."}

### Metas
${goals.length > 0 ? goals.map((g: any) => `- ${g.name}: R$ ${Number(g.current_amount).toFixed(2)} de R$ ${Number(g.target_amount).toFixed(2)} ${g.is_completed ? "✅" : `(${((Number(g.current_amount) / Number(g.target_amount)) * 100).toFixed(0)}%)`}`).join("\n") : "Nenhuma meta registrada."}

### Transações recentes (mês atual)
${transactions.slice(0, 20).map((t: any) => `- ${t.date} | ${t.type === "income" ? "📈" : "📉"} R$ ${Number(t.amount).toFixed(2)} | ${t.description || "Sem descrição"} | ${(t as any).categories?.name || "Sem categoria"} [${t.profile_type}]`).join("\n") || "Sem transações no mês."}
`.trim();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é o Assistente Financeiro IA do Smart Finance. Responda sempre em português do Brasil.

Você tem acesso aos dados financeiros reais do usuário (abaixo). Use-os para responder perguntas com precisão.
Formate suas respostas com markdown: use **negrito**, listas, tabelas e emojis quando apropriado.
Seja direto, amigável e profissional. Se o usuário pedir dados de um mês que você não tem, diga que só tem dados do mês atual.
Nunca invente dados — use apenas o que está no contexto.

${financialContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no seu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Erro ao conectar com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
