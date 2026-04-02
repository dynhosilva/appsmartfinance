import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <Card className="max-w-4xl mx-auto bg-gradient-to-br from-primary to-primary-glow p-8 sm:p-12 text-center text-primary-foreground border-0 shadow-2xl shadow-primary/20">
            <div className="space-y-6">
              <motion.div 
                className="inline-flex items-center gap-2 bg-primary-foreground/20 px-4 py-2 rounded-full text-sm font-medium"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <Sparkles className="h-4 w-4" />
                Comece gratuitamente
              </motion.div>
              <motion.h2 
                className="text-3xl sm:text-4xl lg:text-5xl font-bold"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                Comece sua jornada de independência financeira hoje
              </motion.h2>
              <motion.p 
                className="text-lg sm:text-xl text-primary-foreground/90 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                Junte-se a milhares de pessoas que já estão no controle de suas finanças. 
                Não precisa de cartão de crédito para começar.
              </motion.p>
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <Button 
                  size="lg" 
                  onClick={() => navigate("/auth")}
                  className="bg-background text-primary hover:bg-background/90 text-lg h-14 px-8 shadow-lg"
                >
                  Criar Conta Gratuita
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                  className="border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/10 text-lg h-14 px-8"
                >
                  Ver Todos os Planos
                </Button>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
