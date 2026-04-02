import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, TrendingUp, CreditCard, DollarSign, Home, History } from "lucide-react";
import { toast } from "sonner";
import { CurrencyConverter } from "@/components/calculator/CurrencyConverter";

interface CalculationHistory {
  id: string;
  type: string;
  result: string;
  timestamp: Date;
}

export const FinancialCalculator = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<CalculationHistory[]>([]);

  // Basic Calculator
  const [basicInput, setBasicInput] = useState("");
  const [basicResult, setBasicResult] = useState("");
  const [basicFocused, setBasicFocused] = useState(false);

  // Compound Interest
  const [principal, setPrincipal] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [rate, setRate] = useState("");
  const [time, setTime] = useState("");
  const [compoundResult, setCompoundResult] = useState<{
    final: number;
    interest: number;
    totalContributions: number;
  } | null>(null);

  // Installments
  const [loanAmount, setLoanAmount] = useState("");
  const [installments, setInstallments] = useState("");
  const [monthlyRate, setMonthlyRate] = useState("");
  const [installmentResult, setInstallmentResult] = useState<{
    monthly: number;
    total: number;
    totalInterest: number;
  } | null>(null);

  // Financing

  // Financing
  const [propertyValue, setPropertyValue] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [financingRate, setFinancingRate] = useState("");
  const [financingYears, setFinancingYears] = useState("");
  const [financingResult, setFinancingResult] = useState<{
    financed: number;
    monthly: number;
    total: number;
    totalInterest: number;
  } | null>(null);

  const addToHistory = (type: string, result: string) => {
    const newHistory: CalculationHistory = {
      id: Date.now().toString(),
      type,
      result,
      timestamp: new Date(),
    };
    setHistory(prev => [newHistory, ...prev].slice(0, 10));
  };

  const calculateBasic = () => {
    try {
      // Sanitize input to prevent code injection
      const sanitized = basicInput.replace(/[^0-9+\-*/.()]/g, '');
      const result = Function(`'use strict'; return (${sanitized})`)();
      const resultStr = result.toFixed(2);
      setBasicResult(resultStr);
      addToHistory("Básica", `${basicInput} = ${resultStr}`);
    } catch (error) {
      toast.error("Expressão inválida");
    }
  };

  const calculateCompoundInterest = () => {
    try {
      const p = parseFloat(principal);
      const pmt = parseFloat(monthlyContribution) || 0;
      const annualRate = parseFloat(rate) / 100;
      const monthlyRate = annualRate / 12;
      const t = parseFloat(time);
      const months = t * 12;

      if (isNaN(p) || isNaN(annualRate) || isNaN(t)) {
        toast.error("Preencha todos os campos corretamente");
        return;
      }

      // FV = P*(1+i)^n + PMT*((1+i)^n - 1)/i
      let finalValue: number;
      if (monthlyRate === 0) {
        finalValue = p + pmt * months;
      } else {
        finalValue = p * Math.pow(1 + monthlyRate, months) + pmt * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
      }
      const totalContributions = p + pmt * months;
      const interest = finalValue - totalContributions;

      setCompoundResult({ final: finalValue, interest, totalContributions });
      addToHistory(
        "Juros Compostos",
        `R$ ${p.toFixed(2)} + R$ ${pmt.toFixed(2)}/mês → R$ ${finalValue.toFixed(2)} em ${t} anos`
      );
    } catch (error) {
      toast.error("Erro no cálculo");
    }
  };

  const calculateInstallment = () => {
    try {
      const pv = parseFloat(loanAmount);
      const n = parseFloat(installments);
      const i = parseFloat(monthlyRate) / 100;

      if (isNaN(pv) || isNaN(n) || isNaN(i)) {
        toast.error("Preencha todos os campos corretamente");
        return;
      }

      const monthly = (pv * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
      const total = monthly * n;
      const totalInterest = total - pv;

      setInstallmentResult({ monthly, total, totalInterest });
      addToHistory(
        "Parcelamento",
        `${n}x de R$ ${monthly.toFixed(2)} = R$ ${total.toFixed(2)}`
      );
    } catch (error) {
      toast.error("Erro no cálculo");
    }
  };

  const handleCurrencyConversion = (result: string) => {
    addToHistory("Conversão", result);
  };

  const calculateFinancing = () => {
    try {
      const value = parseFloat(propertyValue);
      const down = parseFloat(downPayment);
      const rate = parseFloat(financingRate) / 100 / 12;
      const months = parseFloat(financingYears) * 12;

      if (isNaN(value) || isNaN(down) || isNaN(rate) || isNaN(months)) {
        toast.error("Preencha todos os campos corretamente");
        return;
      }

      const financed = value - down;
      const monthly = (financed * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
      const total = monthly * months;
      const totalInterest = total - financed;

      setFinancingResult({ financed, monthly, total, totalInterest });
      addToHistory(
        "Financiamento",
        `R$ ${financed.toFixed(2)} em ${months} meses = R$ ${monthly.toFixed(2)}/mês`
      );
    } catch (error) {
      toast.error("Erro no cálculo");
    }
  };

  const handleBasicInput = (value: string) => {
    setBasicInput(prev => prev + value);
  };

  const clearBasic = () => {
    setBasicInput("");
    setBasicResult("");
  };

  return (
    <>
      {/* Floating Button - positioned on the left side on mobile to avoid overlapping card action menus */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-4 sm:left-auto sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-2xl bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 z-50"
        size="icon"
      >
        <Calculator className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>

      {/* Calculator Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg w-[95vw] h-[100dvh] sm:h-auto sm:max-h-[85vh] p-0 gap-0 rounded-none sm:rounded-lg">
          <DialogHeader className="px-4 pt-3 pb-1 sm:pt-4 sm:pb-2">
            <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Calculadora Financeira
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Ferramentas para cálculos financeiros
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="px-3 sm:px-4 pb-1 sm:pb-2">
              <TabsList className="grid w-full grid-cols-6 h-auto gap-0.5 sm:gap-1">
                <TabsTrigger value="basic" className="flex flex-col items-center gap-0 py-1 px-1 text-[8px] sm:text-xs">
                  <Calculator className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Básica</span>
                </TabsTrigger>
                <TabsTrigger value="compound" className="flex flex-col items-center gap-0 py-1 px-1 text-[8px] sm:text-xs">
                  <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Juros</span>
                </TabsTrigger>
                <TabsTrigger value="installment" className="flex flex-col items-center gap-0 py-1 px-1 text-[8px] sm:text-xs">
                  <CreditCard className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Parcelas</span>
                </TabsTrigger>
                <TabsTrigger value="conversion" className="flex flex-col items-center gap-0 py-1 px-1 text-[8px] sm:text-xs">
                  <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Conversão</span>
                </TabsTrigger>
                <TabsTrigger value="financing" className="flex flex-col items-center gap-0 py-1 px-1 text-[8px] sm:text-xs">
                  <Home className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Financ.</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex flex-col items-center gap-0 py-1 px-1 text-[8px] sm:text-xs">
                  <History className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Histórico</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-3 sm:pb-4">
              {/* Basic Calculator */}
              <TabsContent value="basic" className="mt-0 space-y-3">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <Input
                    value={basicInput}
                    onChange={(e) => setBasicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        calculateBasic();
                      }
                    }}
                    placeholder={basicFocused ? "" : "Digite..."}
                    onFocus={() => setBasicFocused(true)}
                    onBlur={() => setBasicFocused(false)}
                    className="text-xl h-12 text-right font-mono"
                  />
                  {basicResult && (
                    <p className="text-2xl font-bold text-primary text-right mt-2">
                      = {basicResult}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {['7', '8', '9', '/'].map(v => (
                    <Button key={v} onClick={() => handleBasicInput(v)} variant="outline" className="h-11 text-lg">{v}</Button>
                  ))}
                  {['4', '5', '6', '*'].map(v => (
                    <Button key={v} onClick={() => handleBasicInput(v)} variant="outline" className="h-11 text-lg">{v}</Button>
                  ))}
                  {['1', '2', '3', '-'].map(v => (
                    <Button key={v} onClick={() => handleBasicInput(v)} variant="outline" className="h-11 text-lg">{v}</Button>
                  ))}
                  {['0', '.', '=', '+'].map(v => (
                    <Button
                      key={v}
                      onClick={() => v === '=' ? calculateBasic() : handleBasicInput(v)}
                      variant={v === '=' ? 'default' : 'outline'}
                      className={`h-11 text-lg ${v === '=' ? 'bg-primary' : ''}`}
                    >
                      {v}
                    </Button>
                  ))}
                </div>
                <Button onClick={clearBasic} variant="outline" size="sm" className="w-full">Limpar</Button>
              </TabsContent>

              {/* Compound Interest */}
              <TabsContent value="compound" className="mt-0 space-y-3">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Capital Inicial (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={principal}
                      onChange={(e) => setPrincipal(e.target.value)}
                      placeholder="10000.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Aporte Mensal (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(e.target.value)}
                      placeholder="500.00"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Taxa Anual (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        placeholder="10.5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Período (anos)</Label>
                      <Input
                        type="number"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        placeholder="5"
                      />
                    </div>
                  </div>
                  <Button onClick={calculateCompoundInterest} className="w-full">
                    Calcular
                  </Button>
                  {compoundResult && (
                    <div className="p-3 bg-success/10 rounded-lg border border-success/20 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Montante Final</span>
                        <span className="text-xl font-bold text-success">R$ {compoundResult.final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Investido</span>
                        <span className="font-semibold">R$ {compoundResult.totalContributions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Juros Ganhos</span>
                        <span className="font-semibold text-success">R$ {compoundResult.interest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Installments */}
              <TabsContent value="installment" className="mt-0 space-y-3">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Valor do Empréstimo (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      placeholder="5000.00"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Nº Parcelas</Label>
                      <Input
                        type="number"
                        value={installments}
                        onChange={(e) => setInstallments(e.target.value)}
                        placeholder="12"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Juros Mensal (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={monthlyRate}
                        onChange={(e) => setMonthlyRate(e.target.value)}
                        placeholder="2.5"
                      />
                    </div>
                  </div>
                  <Button onClick={calculateInstallment} className="w-full">
                    Calcular
                  </Button>
                  {installmentResult && (
                    <div className="space-y-2">
                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-center">
                        <p className="text-sm text-muted-foreground">Valor da Parcela</p>
                        <p className="text-2xl font-bold text-primary">R$ {installmentResult.monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-muted rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-sm font-semibold">R$ {installmentResult.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-2 bg-muted rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Juros</p>
                          <p className="text-sm font-semibold text-destructive">R$ {installmentResult.totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Currency Conversion */}
              <TabsContent value="conversion" className="mt-0">
                <CurrencyConverter onConversion={handleCurrencyConversion} />
              </TabsContent>

              {/* Financing */}
              <TabsContent value="financing" className="mt-0 space-y-3">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Valor Imóvel (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={propertyValue}
                        onChange={(e) => setPropertyValue(e.target.value)}
                        placeholder="300000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Entrada (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={downPayment}
                        onChange={(e) => setDownPayment(e.target.value)}
                        placeholder="60000"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Juros Anual (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={financingRate}
                        onChange={(e) => setFinancingRate(e.target.value)}
                        placeholder="9.5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Prazo (anos)</Label>
                      <Input
                        type="number"
                        value={financingYears}
                        onChange={(e) => setFinancingYears(e.target.value)}
                        placeholder="30"
                      />
                    </div>
                  </div>
                  <Button onClick={calculateFinancing} className="w-full">
                    Calcular
                  </Button>
                  {financingResult && (
                    <div className="space-y-2">
                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-center">
                        <p className="text-sm text-muted-foreground">Parcela Mensal</p>
                        <p className="text-2xl font-bold text-primary">R$ {financingResult.monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="p-2 bg-muted rounded-lg text-center">
                          <p className="text-[10px] text-muted-foreground">Financiado</p>
                          <p className="text-xs font-semibold">R$ {(financingResult.financed / 1000).toFixed(0)}k</p>
                        </div>
                        <div className="p-2 bg-muted rounded-lg text-center">
                          <p className="text-[10px] text-muted-foreground">Total</p>
                          <p className="text-xs font-semibold">R$ {(financingResult.total / 1000).toFixed(0)}k</p>
                        </div>
                        <div className="p-2 bg-muted rounded-lg text-center">
                          <p className="text-[10px] text-muted-foreground">Juros</p>
                          <p className="text-xs font-semibold text-destructive">R$ {(financingResult.totalInterest / 1000).toFixed(0)}k</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* History */}
              <TabsContent value="history" className="mt-0">
                {history.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhum cálculo realizado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">{item.type}</p>
                          <p className="font-mono text-sm truncate">{item.result}</p>
                        </div>
                        <p className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                          {item.timestamp.toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};
