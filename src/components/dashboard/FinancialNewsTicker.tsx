import { memo, useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";

// Memoized quote item component
const QuoteItem = memo(function QuoteItem({ quote }: { quote: { symbol: string; name: string; price: number; changePercent: number; type: string } }) {
  const formatPrice = (price: number, type: string) => {
    if (type === 'currency') return price.toFixed(2);
    return price.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0 bg-card border border-border/50 rounded-md px-2 py-1">
      <div className="flex flex-col leading-tight">
        <span className="text-[9px] text-muted-foreground font-medium">
          {quote.name}
        </span>
        <span className="text-xs font-semibold">
          {quote.type === 'currency' ? 'R$ ' : quote.type === 'crypto' ? '$ ' : ''}
          {formatPrice(quote.price, quote.type)}
        </span>
      </div>
      <div
        className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium ${
          quote.changePercent > 0
            ? 'bg-success/10 text-success'
            : quote.changePercent < 0
            ? 'bg-destructive/10 text-destructive'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {quote.changePercent > 0 ? (
          <TrendingUp className="h-2.5 w-2.5" />
        ) : quote.changePercent < 0 ? (
          <TrendingDown className="h-2.5 w-2.5" />
        ) : null}
        <span>
          {quote.changePercent > 0 ? '+' : ''}
          {quote.changePercent.toFixed(2)}%
        </span>
      </div>
    </div>
  );
});

export const FinancialNewsTicker = memo(function FinancialNewsTicker() {
  const { quotes, error } = useMarketQuotes();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScrollPosition = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    checkScrollPosition();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScrollPosition, { passive: true });
      return () => ref.removeEventListener('scroll', checkScrollPosition);
    }
  }, [quotes.length, checkScrollPosition]);

  // Auto-scroll every 3 seconds
  useEffect(() => {
    if (quotes.length === 0) return;
    const interval = setInterval(() => {
      const ref = scrollRef.current;
      if (!ref) return;
      const { scrollLeft, scrollWidth, clientWidth } = ref;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll <= 0) return;

      // If near the end, scroll back to start; otherwise scroll by one card width (~120px)
      const nextScroll = scrollLeft >= maxScroll - 10 ? 0 : scrollLeft + 120;
      ref.scrollTo({ left: nextScroll, behavior: 'smooth' });
    }, 3000);
    return () => clearInterval(interval);
  }, [quotes.length]);

  const quotesList = useMemo(() =>
    quotes.map((quote) => (
      <QuoteItem key={quote.symbol} quote={quote} />
    )), [quotes]);

  if (error || quotes.length === 0) return null;

  return (
    <div className="relative">
      {showLeftArrow && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pointer-events-none">
          <div className="w-8 h-full bg-gradient-to-r from-background to-transparent" />
          <ChevronLeft className="h-4 w-4 text-muted-foreground/40 -ml-5" />
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto py-0.5 px-0.5 scrollbar-hide"
      >
        {quotesList}
      </div>

      {showRightArrow && (
        <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pointer-events-none">
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 -mr-5" />
          <div className="w-8 h-full bg-gradient-to-l from-background to-transparent" />
        </div>
      )}
    </div>
  );
});
