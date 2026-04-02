import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard, Target, PieChart, Wallet, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    icon: <Wallet className="h-8 w-8" />,
    title: "Registre seu Saldo",
    description: "Comece informando quanto você tem disponível agora. É o ponto de partida para seu controle financeiro.",
    features: [
      "Saldo disponível em destaque",
      "Atualização a qualquer momento",
      "Visão clara do que você tem"
    ]
  },
  {
    number: "02",
    icon: <LayoutDashboard className="h-8 w-8" />,
    title: "Dashboard Completo",
    description: "Visualize seus gastos e receitas em um único lugar, com gráficos intuitivos que mostram a distribuição das suas despesas.",
    features: [
      "Gráficos de fluxo de caixa",
      "Distribuição por categoria",
      "Resumo mensal completo"
    ]
  },
  {
    number: "03",
    icon: <Target className="h-8 w-8" />,
    title: "Defina suas Metas",
    description: "Estabeleça metas de reserva de emergência e objetivos personalizados. Acompanhe seu progresso em tempo real.",
    features: [
      "Reserva de emergência inteligente",
      "Metas customizadas",
      "Progresso visual motivador"
    ]
  },
  {
    number: "04",
    icon: <PieChart className="h-8 w-8" />,
    title: "Divisão Inteligente",
    description: "Aplique regras automáticas para dividir suas receitas entre pessoal, reserva e empresa.",
    features: [
      "Regras personalizáveis",
      "Divisão automática",
      "Separação clara de destinos"
    ]
  },
  {
    number: "05",
    icon: <TrendingUp className="h-8 w-8" />,
    title: "Mapa da Independência",
    description: "Acompanhe sua evolução no caminho para a independência financeira com marcos e conquistas.",
    features: [
      "Gamificação motivadora",
      "Conquistas desbloqueáveis",
      "Evolução visual clara"
    ]
  }
];

const HowItWorksSection = () => {
  const navigate = useNavigate();

  return (
    <section id="how-it-works" className="py-20 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-16 space-y-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-primary font-semibold uppercase tracking-wider text-sm">
            Como Funciona
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold">
            Simples de usar, poderoso nos resultados
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Conheça o funcionamento da plataforma e veja como é simples gerenciar suas finanças.
          </p>
        </motion.div>

        <div className="space-y-8 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex-shrink-0">
                    <div className="text-5xl font-bold text-primary/20">{step.number}</div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-primary to-primary-glow p-3 rounded-xl text-primary-foreground">
                        {step.icon}
                      </div>
                      <h3 className="text-2xl font-bold">{step.title}</h3>
                    </div>
                    <p className="text-muted-foreground text-lg">{step.description}</p>
                    <ul className="space-y-2">
                      {step.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-lg text-muted-foreground mb-6">
            Esqueça as planilhas e aplicativos complicados!
          </p>
          <Button 
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-lg h-14 px-8"
          >
            Começar agora
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
