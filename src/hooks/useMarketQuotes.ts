import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  type: 'currency' | 'index' | 'commodity' | 'crypto';
}

interface UseMarketQuotesReturn {
  quotes: MarketQuote[];
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
  refetch: () => Promise<void>;
}

// Module-level cache for quotes
let quotesCache: { quotes: MarketQuote[]; lastUpdate: string | null; timestamp: number } | null = null;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export function useMarketQuotes(): UseMarketQuotesReturn {
  const [quotes, setQuotes] = useState<MarketQuote[]>(quotesCache?.quotes || []);
  const [loading, setLoading] = useState(!quotesCache);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(quotesCache?.lastUpdate || null);
  const fetchingRef = useRef(false);

  const fetchQuotes = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    
    // Check cache validity
    if (quotesCache && Date.now() - quotesCache.timestamp < CACHE_TTL) {
      setQuotes(quotesCache.quotes);
      setLastUpdate(quotesCache.lastUpdate);
      setLoading(false);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-market-quotes');

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar cotações');
      }

      const newQuotes = data.quotes || [];
      quotesCache = { quotes: newQuotes, lastUpdate: data.lastUpdate, timestamp: Date.now() };
      setQuotes(newQuotes);
      setLastUpdate(data.lastUpdate);
    } catch (err) {
      console.error('Error fetching market quotes:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchQuotes();

    // Update every 5 minutes
    const interval = setInterval(fetchQuotes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchQuotes]);

  return {
    quotes,
    loading,
    error,
    lastUpdate,
    refetch: fetchQuotes,
  };
}
