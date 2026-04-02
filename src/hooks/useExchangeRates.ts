import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "BRL", name: "Real Brasileiro", symbol: "R$", flag: "🇧🇷" },
  { code: "USD", name: "Dólar Americano", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "Libra Esterlina", symbol: "£", flag: "🇬🇧" },
  { code: "JPY", name: "Iene Japonês", symbol: "¥", flag: "🇯🇵" },
  { code: "CNY", name: "Yuan Chinês", symbol: "¥", flag: "🇨🇳" },
  { code: "ARS", name: "Peso Argentino", symbol: "$", flag: "🇦🇷" },
  { code: "CAD", name: "Dólar Canadense", symbol: "$", flag: "🇨🇦" },
  { code: "AUD", name: "Dólar Australiano", symbol: "$", flag: "🇦🇺" },
  { code: "CHF", name: "Franco Suíço", symbol: "Fr", flag: "🇨🇭" },
  { code: "MXN", name: "Peso Mexicano", symbol: "$", flag: "🇲🇽" },
  { code: "CLP", name: "Peso Chileno", symbol: "$", flag: "🇨🇱" },
  { code: "PEN", name: "Sol Peruano", symbol: "S/", flag: "🇵🇪" },
  { code: "COP", name: "Peso Colombiano", symbol: "$", flag: "🇨🇴" },
  { code: "UYU", name: "Peso Uruguaio", symbol: "$", flag: "🇺🇾" },
];

interface ExchangeRates {
  [key: string]: number;
}

interface UseExchangeRatesReturn {
  rates: ExchangeRates | null;
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
  refetch: () => Promise<void>;
  convert: (amount: number, from: string, to: string) => number | null;
}

export function useExchangeRates(): UseExchangeRatesReturn {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-exchange-rates', {
        body: null,
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar cotações');
      }

      setRates(data.rates);
      setLastUpdate(data.lastUpdate);
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const convert = useCallback((amount: number, from: string, to: string): number | null => {
    if (!rates) return null;

    // Se a moeda de origem é USD, usamos diretamente a taxa de destino
    if (from === 'USD') {
      return amount * (rates[to] || 1);
    }

    // Se a moeda de destino é USD, dividimos pela taxa de origem
    if (to === 'USD') {
      return amount / (rates[from] || 1);
    }

    // Para outras conversões, convertemos via USD
    const amountInUsd = amount / (rates[from] || 1);
    return amountInUsd * (rates[to] || 1);
  }, [rates]);

  return {
    rates,
    loading,
    error,
    lastUpdate,
    refetch: fetchRates,
    convert,
  };
}
