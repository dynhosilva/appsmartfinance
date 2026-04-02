import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Lock, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  variant?: "inline" | "card" | "modal";
  requiredPlan?: "pro" | "pro_plus";
  benefits?: string[];
  open?: boolean;
  onClose?: () => void;
}

const planLabels: Record<string, string> = {
  pro: "Pro",
  pro_plus: "Pro Plus",
};

export function UpgradePrompt({ 
  feature, 
  description, 
  variant = "card",
  requiredPlan = "pro",
  benefits,
  open,
  onClose,
}: UpgradePromptProps) {
  const navigate = useNavigate();
  const planName = planLabels[requiredPlan] || "Pro";

  const defaultBenefits = requiredPlan === "pro_plus"
    ? ["Controle separado PF e PJ", "Caixa empresarial", "Projeção anual", "Dashboard avançado consolidado"]
    : ["Metas ilimitadas", "Relatórios inteligentes", "Exportação PDF/Excel", "Projeção de fluxo de caixa"];

  const finalBenefits = benefits || defaultBenefits;

  if (variant === "modal") {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {feature}
                </DialogTitle>
                <DialogDescription>
                  Disponível no plano {planName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {description || `Este recurso está disponível no plano ${planName}. Faça upgrade para desbloquear todas as funcionalidades.`}
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">O que você desbloqueia:</p>
              <ul className="space-y-1.5">
                {finalBenefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <Button 
              className="w-full" 
              onClick={() => { onClose?.(); navigate("/upgrade"); }}
            >
              <Crown className="h-4 w-4 mr-2" />
              Fazer Upgrade para {planName}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span>{feature} disponível no plano {planName}</span>
        <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => navigate("/upgrade")}>
          Fazer upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {feature}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {description || `Este recurso está disponível no plano ${planName}. Faça upgrade para desbloquear.`}
            </p>
            <div className="mt-3 space-y-1">
              {finalBenefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                  {b}
                </div>
              ))}
            </div>
            <Button 
              className="mt-4" 
              onClick={() => navigate("/upgrade")}
            >
              <Crown className="h-4 w-4 mr-2" />
              Fazer Upgrade para {planName}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
