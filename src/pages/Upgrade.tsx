import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Crown, 
  Check, 
  X, 
  Zap, 
  Sparkles,
  Loader2,
  CreditCard,
  Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserPlan } from "@/hooks/useUserPlan";

interface Plan {
  id: string;
  name: string;
  plan_type: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
}

export default function Upgrade() {
  const navigate = useNavigate();
  const { plan: currentPlan, loading: planLoading } = useUserPlan();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

      if (error) throw error;
      
      const parsedPlans = (data || []).map(p => ({
        ...p,
        features: Array.isArray(p.features) 
          ? (p.features as string[]) 
          : typeof p.features === "string" 
            ? JSON.parse(p.features) 
            : []
      }));
      
      setPlans(parsedPlans as Plan[]);
    } catch (error) {
      console.error("Error loading plans:", error);
      toast.error("Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.plan_type === "starter" || plan.plan_type === "free") {
      toast.info("Você já está no plano gratuito");
      return;
    }

    const normalizedCurrent = currentPlan.plan_type === "free" ? "starter" : currentPlan.plan_type === "business" ? "pro_plus" : currentPlan.plan_type;
    if (plan.plan_type === normalizedCurrent) {
      toast.info("Você já está neste plano");
      return;
    }

    try {
      setProcessingPlan(plan.id);
      
      const amount = billingPeriod === "yearly" ? plan.price_yearly : plan.price_monthly;
      
      const { data, error } = await supabase.functions.invoke("create-pix-charge", {
        body: { planId: plan.id, billingPeriod, amount },
      });

      if (error) throw error;

      if (data?.charge?.paymentLink) {
        window.open(data.charge.paymentLink, "_blank");
        toast.success("Redirecionando para pagamento...");
      } else if (data?.charge?.qrCode) {
        toast.success("Cobrança Pix gerada! Escaneie o QR Code para pagar.");
      }
    } catch (error: any) {
      console.error("Error creating charge:", error);
      toast.error("Erro ao processar: " + (error.message || "Tente novamente"));
    } finally {
      setProcessingPlan(null);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case "pro": return <Sparkles className="h-6 w-6" />;
      case "pro_plus": return <Crown className="h-6 w-6" />;
      default: return <Zap className="h-6 w-6" />;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case "pro": return "from-primary to-primary-glow";
      case "pro_plus": return "from-amber-500 to-orange-500";
      default: return "from-muted-foreground/60 to-muted-foreground/40";
    }
  };

  const isCurrentPlan = (planType: string) => {
    const normalized = currentPlan.plan_type === "free" ? "starter" : currentPlan.plan_type === "business" ? "pro_plus" : currentPlan.plan_type;
    return planType === normalized;
  };

  const annualSavings = (plan: Plan) => {
    if (plan.price_monthly === 0) return 0;
    const monthlyTotal = plan.price_monthly * 12;
    return monthlyTotal - plan.price_yearly;
  };

  if (loading || planLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Planos e Preços">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6 lg:space-y-8 pb-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Escolha o plano ideal para você
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-2">
            Desbloqueie todo o potencial do Smart Finance com recursos avançados.
          </p>

          {/* Current plan badge */}
          <Badge variant="outline" className="text-sm px-4 py-1">
            Plano atual: {currentPlan.plan_name}
          </Badge>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center pt-2">
            <Tabs value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as "monthly" | "yearly")}>
              <TabsList className="h-10">
                <TabsTrigger value="monthly" className="px-4 sm:px-6">Mensal</TabsTrigger>
                <TabsTrigger value="yearly" className="px-4 sm:px-6 relative">
                  Anual
                  <Badge variant="secondary" className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 text-[10px] sm:text-xs px-1.5 bg-success text-success-foreground">
                    Economize
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.plan_type);
            const isPro = plan.plan_type === "pro";
            const monthlyPrice = billingPeriod === "yearly" && plan.price_yearly > 0
              ? plan.price_yearly / 12 
              : plan.price_monthly;
            const savings = annualSavings(plan);
            
            return (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden transition-all ${
                  isPro ? "border-primary shadow-lg lg:scale-[1.02]" : "hover:shadow-md"
                } ${isCurrent ? "ring-2 ring-primary" : ""}`}
              >
                {isPro && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg">
                    Mais Popular
                  </div>
                )}
                
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br ${getPlanColor(plan.plan_type)} flex items-center justify-center text-white flex-shrink-0`}>
                      {getPlanIcon(plan.plan_type)}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-lg sm:text-xl">{plan.name}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm line-clamp-2">{plan.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4 sm:space-y-6">
                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-bold">
                        {plan.price_monthly === 0 ? "Grátis" : formatPrice(monthlyPrice)}
                      </span>
                      {plan.price_monthly > 0 && (
                        <span className="text-muted-foreground text-sm">/mês</span>
                      )}
                    </div>
                    {billingPeriod === "yearly" && savings > 0 && (
                      <p className="text-xs sm:text-sm text-success font-medium mt-1">
                        <Star className="h-3 w-3 inline mr-1" />
                        Economize {formatPrice(savings)}/ano
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 sm:space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm">
                        <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter className="pt-0">
                  <Button 
                    className="w-full h-10 sm:h-11 text-sm" 
                    variant={isCurrent ? "outline" : isPro ? "default" : "secondary"}
                    disabled={isCurrent || processingPlan === plan.id}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {processingPlan === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : isCurrent ? (
                      "Plano Atual"
                    ) : plan.price_monthly === 0 ? (
                      "Plano Gratuito"
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Assinar {plan.name}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Trust badge */}
        <Card className="bg-muted/30">
          <CardContent className="py-4 sm:py-6">
            <div className="text-center space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl">🛡️</span>
                <h3 className="font-semibold text-sm sm:text-base">Garantia de 7 dias</h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                Não ficou satisfeito? Devolvemos 100% do seu dinheiro nos primeiros 7 dias. Pagamento seguro via Pix.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
