import { Card } from "@/components/ui/card";
import { 
  Zap, 
  PieChart, 
  Target, 
  Shield, 
  TrendingUp, 
  Award,
  Smartphone,
  Calculator,
  Bell
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Registro Rápido",
    description: "Registre entradas e saídas em segundos com categorização inteligente."
  },
  {
    icon: <PieChart className="h-6 w-6" />,
    title: "Dashboard Intuitivo",
    description: "Visualize suas finanças em tempo real com gráficos que mostram para onde vai seu dinheiro."
  },
  {
    icon: <Target className="h-6 w-6" />,
    title: "Metas Financeiras",
    description: "Defina e acompanhe suas metas, mantendo-se motivado a alcançar seus objetivos."
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Reserva de Emergência",
    description: "Calcule e acompanhe sua reserva ideal baseada nos seus custos fixos mensais."
  },
  {
    icon: <Calculator className="h-6 w-6" />,
    title: "Calculadora Financeira",
    description: "Calcule juros compostos, parcelamentos, financiamentos e muito mais."
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: "Relatórios Detalhados",
    description: "Gere relatórios personalizados para analisar seus gastos e identificar oportunidades."
  },
  {
    icon: <Smartphone className="h-6 w-6" />,
    title: "Mobile First",
    description: "Acesse de qualquer dispositivo, otimizado para uso no celular."
  },
  {
    icon: <Award className="h-6 w-6" />,
    title: "Gamificação",
    description: "Conquiste marcos e desbloqueie conquistas na sua jornada financeira."
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Alertas Inteligentes",
    description: "Receba lembretes de contas a pagar e quando ultrapassar seus limites."
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};

const FeaturesSection = () => {
  return (
    <section id="features" className="bg-muted/30 py-20 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-16 space-y-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-primary font-semibold uppercase tracking-wider text-sm">
            Recursos
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold">
            Tudo o que você precisa para controlar suas finanças
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Conheça as principais funcionalidades que tornam o SmartFinance a melhor escolha para gerenciar suas finanças pessoais.
          </p>
        </motion.div>
        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="p-6 h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card">
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 w-14 h-14 rounded-xl flex items-center justify-center mb-4 text-primary">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
