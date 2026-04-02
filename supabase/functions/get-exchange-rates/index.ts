import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache para evitar chamadas excessivas à API
let cachedRates: { rates: Record<string, number>; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const baseCurrency = url.searchParams.get('base') || 'USD';

    // Verificar se temos cache válido
    const now = Date.now();
    if (cachedRates && (now - cachedRates.timestamp) < CACHE_DURATION) {
      console.log('Returning cached rates');
      return new Response(
        JSON.stringify({
          success: true,
          base: baseCurrency,
          rates: cachedRates.rates,
          cached: true,
          lastUpdate: new Date(cachedRates.timestamp).toISOString(),
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Buscar taxas de câmbio da API gratuita
    // Usando a API do ExchangeRate-API que não requer chave
    const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.status}`);
    }

    const data = await response.json();

    if (data.result !== 'success') {
      throw new Error('API returned error');
    }

    // Filtrar apenas as principais moedas
    const mainCurrencies = ['USD', 'EUR', 'GBP', 'BRL', 'JPY', 'CNY', 'ARS', 'CAD', 'AUD', 'CHF', 'MXN', 'CLP', 'PEN', 'COP', 'UYU'];
    const filteredRates: Record<string, number> = {};
    
    for (const currency of mainCurrencies) {
      if (data.rates[currency]) {
        filteredRates[currency] = data.rates[currency];
      }
    }

    // Atualizar cache
    cachedRates = {
      rates: filteredRates,
      timestamp: now,
    };

    return new Response(
      JSON.stringify({
        success: true,
        base: baseCurrency,
        rates: filteredRates,
        cached: false,
        lastUpdate: new Date(now).toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
