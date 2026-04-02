import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

interface UseFinancialNewsReturn {
  news: NewsItem[];
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
  refetch: () => Promise<void>;
}

// Module-level cache for news
let newsCache: { news: NewsItem[]; lastUpdate: string | null; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useFinancialNews(): UseFinancialNewsReturn {
  const [news, setNews] = useState<NewsItem[]>(newsCache?.news || []);
  const [loading, setLoading] = useState(!newsCache);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(newsCache?.lastUpdate || null);
  const fetchingRef = useRef(false);

  const fetchNews = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    
    // Check cache validity
    if (newsCache && Date.now() - newsCache.timestamp < CACHE_TTL) {
      setNews(newsCache.news);
      setLastUpdate(newsCache.lastUpdate);
      setLoading(false);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-financial-news');

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar notícias');
      }

      const newNews = data.news || [];
      newsCache = { news: newNews, lastUpdate: data.lastUpdate, timestamp: Date.now() };
      setNews(newNews);
      setLastUpdate(data.lastUpdate);
    } catch (err) {
      console.error('Error fetching news:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchNews();

    // Update every 10 minutes
    const interval = setInterval(fetchNews, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  return {
    news,
    loading,
    error,
    lastUpdate,
    refetch: fetchNews,
  };
}
