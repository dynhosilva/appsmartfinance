const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Transaction {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  category?: string;
}

interface ParsedData {
  fixedCosts: { name: string; amount: number }[];
  categories: { name: string; icon: string; color: string }[];
  incomes: { name: string; amount: number; date: string }[];
  expenses: { category: string; amount: number; date: string }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Imagem é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração de IA não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing transaction image with AI...');

    const prompt = `Analise esta imagem de extrato bancário ou captura de transações financeiras.
Extraia TODAS as transações visíveis, identificando:
- Data da transação (formato YYYY-MM-DD)
- Descrição/nome da transação
- Valor (número positivo)
- Tipo: "income" para entradas/créditos (PIX recebido, salário, depósito, etc) ou "expense" para saídas/débitos (compras, pagamentos, transferências enviadas, etc)
- Categoria sugerida baseada na descrição

Retorne APENAS um JSON válido no seguinte formato, sem markdown ou texto adicional:
{
  "transactions": [
    {
      "type": "income" ou "expense",
      "amount": 123.45,
      "description": "Descrição da transação",
      "date": "2024-01-15",
      "category": "Categoria sugerida"
    }
  ]
}

Se não encontrar transações, retorne: {"transactions": []}

Categorias válidas: Mercado, Transporte, Saúde, Alimentação, Moradia, Salário, Pix, Transferência, Pagamento, Outros`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageBase64 } }
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('AI API error:', errorData);
      throw new Error('Erro na API de IA');
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';
    
    console.log('AI response content:', content.substring(0, 500));

    // Parse AI response
    let transactions: Transaction[] = [];
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        transactions = parsed.transactions || [];
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Try line by line parsing as fallback
      transactions = [];
    }

    // Convert to ParsedData format
    const defaultCategories = [
      { name: "Mercado", icon: "🧺", color: "#22c55e" },
      { name: "Transporte", icon: "🚗", color: "#3b82f6" },
      { name: "Saúde", icon: "🔋", color: "#ec4899" },
      { name: "Alimentação", icon: "🍽️", color: "#14b8a6" },
      { name: "Moradia", icon: "🏠", color: "#8b5cf6" },
      { name: "Salário", icon: "💼", color: "#10b981" },
      { name: "Pix", icon: "💸", color: "#06b6d4" },
      { name: "Transferência", icon: "↔️", color: "#f97316" },
      { name: "Pagamento", icon: "💳", color: "#ef4444" },
      { name: "Outros", icon: "📦", color: "#6b7280" },
    ];

    const parsedData: ParsedData = {
      fixedCosts: [],
      categories: defaultCategories,
      incomes: [],
      expenses: [],
    };

    const today = new Date().toISOString().split('T')[0];

    for (const tx of transactions) {
      const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount).replace(/[^\d.,]/g, '').replace(',', '.'));
      
      if (isNaN(amount) || amount <= 0) continue;

      const date = tx.date && /^\d{4}-\d{2}-\d{2}$/.test(tx.date) ? tx.date : today;
      const category = tx.category || 'Outros';

      if (tx.type === 'income') {
        parsedData.incomes.push({
          name: tx.description || 'Receita',
          amount,
          date,
        });
      } else {
        parsedData.expenses.push({
          category,
          amount,
          date,
        });
      }
    }

    console.log(`Parsed ${parsedData.incomes.length} incomes and ${parsedData.expenses.length} expenses`);

    return new Response(
      JSON.stringify({ success: true, data: parsedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar imagem';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});