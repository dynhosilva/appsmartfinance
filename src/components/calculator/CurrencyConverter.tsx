import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, ArrowRightLeft, Loader2 } from "lucide-react";
import { useExchangeRates, CURRENCIES } from "@/hooks/useExchangeRates";

interface CurrencyConverterProps {
  onConversion?: (result: string) => void;
}

export function CurrencyConverter({ onConversion }: CurrencyConverterProps) {
  const { rates, loading, error, lastUpdate, refetch, convert } = useExchangeRates();
  const [amount, setAmount] = useState("");
  const [fromCurrency, setFromCurrency] = useState("BRL");
  const [toCurrency, setToCurrency] = useState("USD");
  const [result, setResult] = useState<number | null>(null);

  const handleConvert = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    const converted = convert(numAmount, fromCurrency, toCurrency);
    setResult(converted);

    if (converted && onConversion) {
      const fromInfo = CURRENCIES.find(c => c.code === fromCurrency);
      const toInfo = CURRENCIES.find(c => c.code === toCurrency);
      onConversion(
        `${fromInfo?.symbol || ''} ${numAmount.toFixed(2)} → ${toInfo?.symbol || ''} ${converted.toFixed(2)}`
      );
    }
  };

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResult(null);
  };

  // Recalculate when currencies change
  useEffect(() => {
    if (amount && result !== null) {
      handleConvert();
    }
  }, [fromCurrency, toCurrency]);

  const getExchangeRateDisplay = () => {
    if (!rates) return null;
    const rate = convert(1, fromCurrency, toCurrency);
    if (rate === null) return null;
    
    const fromInfo = CURRENCIES.find(c => c.code === fromCurrency);
    const toInfo = CURRENCIES.find(c => c.code === toCurrency);
    
    return `1 ${fromInfo?.code} = ${rate.toFixed(4)} ${toInfo?.code}`;
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return null;
    const date = new Date(lastUpdate);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const fromInfo = CURRENCIES.find(c => c.code === fromCurrency);
  const toInfo = CURRENCIES.find(c => c.code === toCurrency);

  if (error) {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20 text-center">
          <p className="text-sm text-destructive">Erro ao carregar cotações</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
        <Button onClick={refetch} variant="outline" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {loading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Atualizando...
            </>
          ) : (
            <>
              <span className="w-2 h-2 bg-success rounded-full" />
              Cotações em tempo real
            </>
          )}
        </span>
        <button 
          onClick={refetch} 
          disabled={loading}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          {formatLastUpdate()}
        </button>
      </div>

      {/* Amount input */}
      <div className="space-y-1.5">
        <Label className="text-sm">Valor</Label>
        <Input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setResult(null);
          }}
          placeholder="1000.00"
        />
      </div>

      {/* Currency selectors */}
      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-1.5">
          <Label className="text-sm">De</Label>
          <Select value={fromCurrency} onValueChange={setFromCurrency}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span>{fromInfo?.flag}</span>
                  <span>{fromCurrency}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  <span className="flex items-center gap-2">
                    <span>{currency.flag}</span>
                    <span className="font-medium">{currency.code}</span>
                    <span className="text-muted-foreground text-xs hidden sm:inline">{currency.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="mt-6 h-9 w-9 shrink-0"
          onClick={handleSwapCurrencies}
        >
          <ArrowRightLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 space-y-1.5">
          <Label className="text-sm">Para</Label>
          <Select value={toCurrency} onValueChange={setToCurrency}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span>{toInfo?.flag}</span>
                  <span>{toCurrency}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  <span className="flex items-center gap-2">
                    <span>{currency.flag}</span>
                    <span className="font-medium">{currency.code}</span>
                    <span className="text-muted-foreground text-xs hidden sm:inline">{currency.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Exchange rate display */}
      {rates && (
        <p className="text-xs text-center text-muted-foreground">
          {getExchangeRateDisplay()}
        </p>
      )}

      <Button onClick={handleConvert} className="w-full" disabled={loading || !rates || !amount}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Converter
      </Button>

      {/* Result */}
      {result !== null && (
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-center">
          <p className="text-xs text-muted-foreground">
            {fromInfo?.symbol} {parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} =
          </p>
          <p className="text-2xl font-bold text-primary">
            {toInfo?.symbol} {result.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {toInfo?.flag} {toInfo?.name}
          </p>
        </div>
      )}
    </div>
  );
}
