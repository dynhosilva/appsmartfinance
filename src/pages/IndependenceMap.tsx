import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Loader2, Lock, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import heroImage from "@/assets/hero-financial-journey.jpg";

interface Achievement {
  type: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

interface AchievementData {
  achievements: Achievement[];
  totalPoints: number;
  newAchievements: string[];
  level: string;
  levelIcon: string;
  nextThreshold: number;
  levelProgress: number;
  unlockedCount: number;
  totalCount: number;
}

// Group achievements by category for display
const CATEGORIES: Record<string, { label: string; emoji: string }> = {
  first: { label: "Primeiros Passos", emoji: "🚀" },
  consistency: { label: "Consistência", emoji: "📊" },
  positive: { label: "Meses Positivos", emoji: "📈" },
  reserve: { label: "Reserva de Emergência", emoji: "🛡️" },
  goals: { label: "Metas", emoji: "🎯" },
  debts: { label: "Dívidas", emoji: "💳" },
  organization: { label: "Organização", emoji: "🗂️" },
};

function getCategory(type: string): string {
  if (["first_transaction", "first_income", "first_bank", "first_goal"].includes(type)) return "first";
  if (["10_transactions", "50_transactions", "100_transactions", "3_months_active", "6_months_active"].includes(type)) return "consistency";
  if (["1_positive_month", "3_positive_months", "6_positive_months"].includes(type)) return "positive";
  if (type.startsWith("reserve")) return "reserve";
  if (type.includes("goal")) return "goals";
  if (type.includes("debt")) return "debts";
  return "organization";
}

const IndependenceMap = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AchievementData | null>(null);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: result, error } = await supabase.functions.invoke("check-achievements");
      if (error) throw error;

      setData(result);

      // Show toast for new achievements
      if (result.newAchievements && result.newAchievements.length > 0) {
        for (const title of result.newAchievements) {
          toast.success(`🎉 Nova conquista: ${title}!`, { duration: 5000 });
        }
      }
    } catch (error) {
      console.error("Error loading achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
    <AppLayout title="Jornada Financeira">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Carregando suas conquistas...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!data) return null;

  // Group achievements by category
  const grouped = new Map<string, Achievement[]>();
  for (const a of data.achievements) {
    const cat = getCategory(a.type);
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(a);
  }

  return (
    <AppLayout title="Jornada Financeira">
      <div className="space-y-6">
        {/* Hero Section */}
        <Card className="overflow-hidden">
          <div className="relative h-32 sm:h-48 md:h-56">
            <img 
              src={heroImage} 
              alt="Jornada de Independência Financeira" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end">
              <div className="p-4 sm:p-6 text-white w-full">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl sm:text-3xl font-bold mb-1">Sua Jornada Financeira</h2>
                    <p className="text-sm sm:text-lg opacity-90">
                      {data.levelIcon} Nível: {data.level}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-4xl font-bold">{data.totalPoints}</div>
                    <div className="text-xs sm:text-sm opacity-80">pontos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Level Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{data.levelIcon}</span>
                <span className="font-semibold">{data.level}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {data.totalPoints} / {data.nextThreshold} pts
              </span>
            </div>
            <Progress value={data.levelProgress} className="h-3" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{data.unlockedCount} de {data.totalCount} conquistas</span>
              <span>{Math.round(data.levelProgress)}% para o próximo nível</span>
            </div>
          </CardContent>
        </Card>

        {/* Achievement Categories */}
        <AnimatePresence>
          {Array.from(grouped.entries()).map(([catKey, achievements], catIndex) => {
            const cat = CATEGORIES[catKey] || { label: catKey, emoji: "📌" };
            const unlockedInCat = achievements.filter(a => a.unlocked).length;

            return (
              <motion.div
                key={catKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIndex * 0.1 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <span>{cat.emoji}</span>
                        {cat.label}
                      </CardTitle>
                      <Badge variant={unlockedInCat === achievements.length ? "default" : "secondary"}>
                        {unlockedInCat}/{achievements.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid gap-3">
                      {achievements.map((achievement) => (
                        <div
                          key={achievement.type}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            achievement.unlocked
                              ? "bg-success/5 border-success/30"
                              : "bg-muted/30 border-border/50 opacity-60"
                          }`}
                        >
                          <div className={`text-2xl flex-shrink-0 ${!achievement.unlocked ? "grayscale" : ""}`}>
                            {achievement.unlocked ? achievement.icon : "🔒"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm sm:text-base truncate">
                                {achievement.title}
                              </span>
                              {achievement.unlocked && (
                                <Sparkles className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {achievement.description}
                            </p>
                            {achievement.unlocked && achievement.unlockedAt && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Desbloqueado em {new Date(achievement.unlockedAt).toLocaleDateString("pt-BR")}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`text-sm sm:text-lg font-bold ${
                              achievement.unlocked ? "text-primary" : "text-muted-foreground"
                            }`}>
                              {achievement.points}
                            </div>
                            <div className="text-xs text-muted-foreground">pts</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default IndependenceMap;
