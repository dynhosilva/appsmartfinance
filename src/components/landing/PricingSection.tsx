import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Crown, Zap, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Starter",
    icon: <Zap className="h-5 w-5" />,
    priceMonthly: "R$ 0",
    priceYearly: "R$ 0",
    period: "para sempre",
    savingsYearly: null,
    popular: false,
    features: [
      "Contas bancárias ilimitadas",
      "Registro de receitas e despesas",
      "Saldo Disponível automático",
      "1 meta financeira ativa",
      "Histórico de 3 meses"
    ],
    cta: "Começar Grátis"
  },
  {
    name: "Pro",
    icon: <Sparkles className="h-5 w-5" />,
    priceMonthly: "R$ 24,90",
    priceYearly: "R$ 20,75",
    period: "/mês",
    savingsYearly: "Economize R$ 49,80/ano",
    popular: true,
    features: [
      "Tudo do Starter",
      "Metas ilimitadas",
      "Histórico ilimitado",
      "Relatórios inteligentes",
      "Projeção de fluxo de caixa",
      "Divisão automática por %",
      "Exportação PDF/Excel",
      "Suporte prioritário"
    ],
    cta: "Assinar Pro"
  },
  {
    name: "Pro Plus",
    icon: <Crown className="h-5 w-5" />,
    priceMonthly: "R$ 39,90",
    priceYearly: "R$ 33,25",
    period: "/mês",
    savingsYearly: "Economize R$ 79,80/ano",
    popular: false,
    features: [
      "Tudo do Pro",
      "Controle separado PF e PJ",
      "Caixa empresarial",
      "Relatório de rentabilidade",
      "Projeção anual",
      "Dashboard avançado consolidado"
    ],
    cta: "Assinar Pro Plus"
  }
];

const PricingSection = () => {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");

  return (
    <section id="pricing" className="bg-muted/30 py-20 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-12 space-y-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-primary font-semibold uppercase tracking-wider text-sm">Planos</span>
          <h2 className="text-3xl sm:text-4xl font-bold">Escolha seu plano</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comece gratuitamente e evolua quando precisar de mais recursos.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                billing === "monthly"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all relative ${
                billing === "yearly"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual
              <Badge className="absolute -top-2.5 -right-3 text-[10px] px-1.5 bg-success text-success-foreground border-0">
                -17%
              </Badge>
            </button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto items-stretch">
          {plans.map((plan, index) => {
            const price = billing === "yearly" ? plan.priceYearly : plan.priceMonthly;
            const isFree = plan.priceMonthly === "R$ 0";

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className={plan.popular ? "md:-mt-4 md:mb-4" : ""}
              >
                <Card 
                  className={`relative p-6 flex flex-col h-full ${
                    plan.popular 
                      ? "border-2 border-primary shadow-lg shadow-primary/10" 
                      : "border-border/50"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                        Mais Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-2 rounded-lg ${plan.popular ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {plan.icon}
                      </div>
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{isFree ? "Grátis" : price}</span>
                      {!isFree && <span className="text-muted-foreground">/mês</span>}
                    </div>
                    {!isFree && billing === "yearly" && plan.savingsYearly && (
                      <p className="text-sm text-success font-medium mt-1.5 flex items-center gap-1">
                        <Star className="h-3.5 w-3.5" />
                        {plan.savingsYearly}
                      </p>
                    )}
                    {!isFree && billing === "monthly" && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ou {plan.priceYearly}/mês no plano anual
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    onClick={() => navigate("/auth")}
                    className={`w-full h-12 ${
                      plan.popular 
                        ? "bg-gradient-to-r from-primary to-primary-glow hover:opacity-90" 
                        : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div 
          className="mt-16 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">🛡️</span>
              <h4 className="font-bold text-lg">Garantia incondicional de 7 dias</h4>
            </div>
            <p className="text-muted-foreground">
              Se não estiver satisfeito por qualquer motivo, devolvemos 100% do seu dinheiro.
            </p>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
