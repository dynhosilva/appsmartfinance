import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

// Cache para evitar chamadas excessivas
let cachedNews: { items: NewsItem[]; timestamp: number } | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

// Fontes RSS de notícias financeiras
const RSS_FEEDS = [
  {
    url: 'https://news.google.com/rss/search?q=finan%C3%A7as+economia+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    source: 'Google News'
  },
  {
    url: 'https://news.google.com/rss/search?q=mercado+financeiro+bolsa&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    source: 'Google News'
  }
];

function parseRSSItem(itemXml: string, source: string): NewsItem | null {
  try {
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/s);
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/s);
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/s);

    const title = titleMatch ? (titleMatch[1] || titleMatch[2]) : null;
    const link = linkMatch ? linkMatch[1] : null;
    const pubDate = pubDateMatch ? pubDateMatch[1] : new Date().toISOString();

    if (!title || !link) return null;

    // Limpar título de entidades HTML
    const cleanTitle = title
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/ - .*$/, '') // Remove fonte do final
      .trim();

    return {
      title: cleanTitle,
      link,
      pubDate,
      source
    };
  } catch (error) {
    console.error('Error parsing RSS item:', error);
    return null;
  }
}

function parseRSSFeed(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const itemXml of itemMatches.slice(0, 10)) {
    const item = parseRSSItem(itemXml, source);
    if (item) {
      items.push(item);
    }
  }

  return items;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = Date.now();

    // Verificar cache
    if (cachedNews && (now - cachedNews.timestamp) < CACHE_DURATION) {
      console.log('Returning cached news');
      return new Response(
        JSON.stringify({
          success: true,
          news: cachedNews.items,
          cached: true,
          lastUpdate: new Date(cachedNews.timestamp).toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log('Fetching fresh news from RSS feeds...');

    // Buscar notícias de todas as fontes
    const allNews: NewsItem[] = [];
    
    for (const feed of RSS_FEEDS) {
      try {
        const response = await fetch(feed.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
          }
        });
        
        if (response.ok) {
          const xml = await response.text();
          const items = parseRSSFeed(xml, feed.source);
          allNews.push(...items);
          console.log(`Fetched ${items.length} items from ${feed.source}`);
        }
      } catch (error) {
        console.error(`Error fetching from ${feed.source}:`, error);
      }
    }

    // Remover duplicatas por título similar
    const uniqueNews: NewsItem[] = [];
    const seenTitles = new Set<string>();
    
    for (const item of allNews) {
      const normalizedTitle = item.title.toLowerCase().substring(0, 50);
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        uniqueNews.push(item);
      }
    }

    // Ordenar por data e limitar
    const sortedNews = uniqueNews
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 15);

    // Atualizar cache
    cachedNews = {
      items: sortedNews,
      timestamp: now,
    };

    console.log(`Returning ${sortedNews.length} news items`);

    return new Response(
      JSON.stringify({
        success: true,
        news: sortedNews,
        cached: false,
        lastUpdate: new Date(now).toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error fetching news:', error);
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
