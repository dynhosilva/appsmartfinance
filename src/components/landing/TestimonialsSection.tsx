import { Card } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Ana Paula",
    role: "Empreendedora",
    avatar: "👩‍💼",
    content: "O SmartFinance mudou completamente a forma como eu lido com minhas finanças. Agora consigo visualizar exatamente para onde vai meu dinheiro e planejar melhor meus gastos.",
    rating: 5
  },
  {
    name: "Carlos Eduardo",
    role: "Desenvolvedor Freelancer",
    avatar: "👨‍💻",
    content: "Depois que comecei a usar o SmartFinance, economizei mais de R$ 800 por mês apenas por ter consciência dos meus gastos desnecessários. A divisão inteligente de receitas é incrível!",
    rating: 5
  },
  {
    name: "Mariana Santos",
    role: "Designer",
    avatar: "👩‍🎨",
    content: "Os relatórios e gráficos do SmartFinance são incríveis! Consigo ter uma visão clara e objetiva das minhas finanças, o que me ajudou a atingir minhas metas de economia.",
    rating: 5
  },
  {
    name: "Roberto Silva",
    role: "Afiliado Digital",
    avatar: "📱",
    content: "Como afiliado com renda variável, o SmartFinance me ajuda a separar automaticamente o que é pessoal, reserva e reinvestimento. Fundamental pro meu controle!",
    rating: 5
  },
  {
    name: "Julia Costa",
    role: "Mãe e Autônoma",
    avatar: "👩‍👧",
    content: "Finalmente consegui montar minha reserva de emergência! O app mostra exatamente quanto preciso guardar baseado nos meus custos fixos. Super recomendo!",
    rating: 5
  },
  {
    name: "Pedro Henrique",
    role: "Consultor",
    avatar: "💼",
    content: "A gamificação me mantém motivado! Cada conquista desbloqueada me dá mais vontade de continuar no caminho da independência financeira.",
    rating: 5
  }
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-20 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-16 space-y-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-primary font-semibold uppercase tracking-wider text-sm">
            Depoimentos
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold">
            O que nossos usuários dizem
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Milhares de pessoas já estão organizando melhor suas finanças com o SmartFinance.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="p-6 h-full border-border/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </div>
              
              <div className="relative mb-4">
                <Quote className="absolute -top-2 -left-2 h-8 w-8 text-primary/10" />
                <p className="text-muted-foreground relative z-10 pl-4">
                  "{testimonial.content}"
                </p>
              </div>

                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div className="text-3xl">{testimonial.avatar}</div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
