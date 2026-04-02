import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  type: 'currency' | 'index' | 'commodity' | 'crypto';
}

// Cache
let cachedQuotes: { quotes: MarketQuote[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = Date.now();

    // Verificar cache
    if (cachedQuotes && (now - cachedQuotes.timestamp) < CACHE_DURATION) {
      console.log('Returning cached market quotes');
      return new Response(
        JSON.stringify({
          success: true,
          quotes: cachedQuotes.quotes,
          cached: true,
          lastUpdate: new Date(cachedQuotes.timestamp).toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log('Fetching fresh market quotes...');

    // Buscar cotações de moedas (USD para BRL)
    const currencyResponse = await fetch('https://open.er-api.com/v6/latest/USD');
    let currencyRates: Record<string, number> = {};
    
    if (currencyResponse.ok) {
      const currencyData = await currencyResponse.json();
      if (currencyData.result === 'success') {
        currencyRates = currencyData.rates;
      }
    }

    // Montar cotações
    const quotes: MarketQuote[] = [];

    // Moedas principais (em relação ao BRL)
    const brlRate = currencyRates['BRL'] || 5.20;
    const eurRate = currencyRates['EUR'] || 0.92;
    const gbpRate = currencyRates['GBP'] || 0.79;
    const jpyRate = currencyRates['JPY'] || 149.50;
    const arsRate = currencyRates['ARS'] || 350;

    // Calcular variações simuladas baseadas em horário (para demo)
    const getSimulatedChange = (seed: number) => {
      const hour = new Date().getHours();
      const minute = new Date().getMinutes();
      const variation = Math.sin((hour * 60 + minute + seed) * 0.1) * 2;
      return variation;
    };

    // Dólar
    quotes.push({
      symbol: 'USD/BRL',
      name: 'Dólar',
      price: brlRate,
      change: getSimulatedChange(1) * 0.05,
      changePercent: getSimulatedChange(1),
      type: 'currency'
    });

    // Euro
    quotes.push({
      symbol: 'EUR/BRL',
      name: 'Euro',
      price: brlRate / eurRate,
      change: getSimulatedChange(2) * 0.06,
      changePercent: getSimulatedChange(2),
      type: 'currency'
    });

    // Libra
    quotes.push({
      symbol: 'GBP/BRL',
      name: 'Libra',
      price: brlRate / gbpRate,
      change: getSimulatedChange(3) * 0.07,
      changePercent: getSimulatedChange(3),
      type: 'currency'
    });

    // Peso Argentino
    quotes.push({
      symbol: 'BRL/ARS',
      name: 'Peso Arg.',
      price: arsRate / brlRate,
      change: getSimulatedChange(4) * 0.1,
      changePercent: getSimulatedChange(4),
      type: 'currency'
    });

    // Índices (valores simulados baseados em médias históricas)
    quotes.push({
      symbol: 'IBOV',
      name: 'Ibovespa',
      price: 128500 + getSimulatedChange(5) * 500,
      change: getSimulatedChange(5) * 500,
      changePercent: getSimulatedChange(5) * 0.4,
      type: 'index'
    });

    quotes.push({
      symbol: 'S&P500',
      name: 'S&P 500',
      price: 5420 + getSimulatedChange(6) * 20,
      change: getSimulatedChange(6) * 20,
      changePercent: getSimulatedChange(6) * 0.35,
      type: 'index'
    });

    quotes.push({
      symbol: 'NASDAQ',
      name: 'Nasdaq',
      price: 17200 + getSimulatedChange(7) * 50,
      change: getSimulatedChange(7) * 50,
      changePercent: getSimulatedChange(7) * 0.45,
      type: 'index'
    });

    // Commodities
    quotes.push({
      symbol: 'GOLD',
      name: 'Ouro',
      price: 2340 + getSimulatedChange(8) * 10,
      change: getSimulatedChange(8) * 10,
      changePercent: getSimulatedChange(8) * 0.3,
      type: 'commodity'
    });

    quotes.push({
      symbol: 'BRENT',
      name: 'Petróleo',
      price: 82.5 + getSimulatedChange(9) * 0.5,
      change: getSimulatedChange(9) * 0.5,
      changePercent: getSimulatedChange(9) * 0.6,
      type: 'commodity'
    });

    // Crypto
    quotes.push({
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 67500 + getSimulatedChange(10) * 500,
      change: getSimulatedChange(10) * 500,
      changePercent: getSimulatedChange(10) * 0.8,
      type: 'crypto'
    });

    quotes.push({
      symbol: 'ETH',
      name: 'Ethereum',
      price: 3450 + getSimulatedChange(11) * 30,
      change: getSimulatedChange(11) * 30,
      changePercent: getSimulatedChange(11) * 0.9,
      type: 'crypto'
    });

    // Atualizar cache
    cachedQuotes = {
      quotes,
      timestamp: now,
    };

    console.log(`Returning ${quotes.length} market quotes`);

    return new Response(
      JSON.stringify({
        success: true,
        quotes,
        cached: false,
        lastUpdate: new Date(now).toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error fetching market quotes:', error);
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
