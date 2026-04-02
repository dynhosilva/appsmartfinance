import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Target, BarChart3, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AlertConfig {
  id?: string;
  alert_type: string;
  is_active: boolean;
  frequency: string;
  threshold: number;
  last_triggered_at: string | null;
}

const ALERT_TYPES = [
  {
    type: "spending_above_avg",
    title: "Gastos acima da média",
    description: "Alerta quando seus gastos do mês atual estão acima da média dos últimos 3 meses",
    icon: <TrendingUp className="h-5 w-5 text-destructive" />,
    defaultThreshold: 20,
  },
  {
    type: "goal_delayed",
    title: "Meta atrasada",
    description: "Alerta quando uma meta financeira está com progresso abaixo do esperado",
    icon: <Target className="h-5 w-5 text-destructive" />,
    defaultThreshold: 15,
  },
  {
    type: "recurring_expense_increase",
    title: "Despesa recorrente aumentou",
    description: "Alerta quando uma categoria de gastos aumenta significativamente em relação ao mês anterior",
    icon: <BarChart3 className="h-5 w-5 text-primary" />,
    defaultThreshold: 30,
  },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
];

interface SmartAlertsConfigProps {
  isConnected: boolean;
}

export function SmartAlertsConfig({ isConnected }: SmartAlertsConfigProps) {
  const [configs, setConfigs] = useState<Map<string, AlertConfig>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("smart_alerts_config")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      const map = new Map<string, AlertConfig>();
      if (data) {
        for (const config of data) {
          map.set(config.alert_type, config as AlertConfig);
        }
      }
      setConfigs(map);
    } catch (error: any) {
      console.error("Error loading smart alerts config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAlert = async (alertType: string, isActive: boolean) => {
    setSaving(alertType);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const existing = configs.get(alertType);
      const alertDef = ALERT_TYPES.find((a) => a.type === alertType);

      if (existing?.id) {
        const { error } = await supabase
          .from("smart_alerts_config")
          .update({ is_active: isActive })
          .eq("id", existing.id);
        if (error) throw error;

        setConfigs((prev) => {
          const next = new Map(prev);
          next.set(alertType, { ...existing, is_active: isActive });
          return next;
        });
      } else {
        const newConfig = {
          user_id: user.id,
          alert_type: alertType,
          is_active: isActive,
          frequency: "weekly",
          threshold: alertDef?.defaultThreshold || 20,
        };

        const { data, error } = await supabase
          .from("smart_alerts_config")
          .insert(newConfig)
          .select()
          .single();

        if (error) throw error;

        setConfigs((prev) => {
          const next = new Map(prev);
          next.set(alertType, data as AlertConfig);
          return next;
        });
      }

      toast.success(isActive ? "Alerta ativado" : "Alerta desativado");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(null);
    }
  };

  const handleChangeFrequency = async (alertType: string, frequency: string) => {
    setSaving(alertType);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const existing = configs.get(alertType);
      const alertDef = ALERT_TYPES.find((a) => a.type === alertType);

      if (existing?.id) {
        const { error } = await supabase
          .from("smart_alerts_config")
          .update({ frequency })
          .eq("id", existing.id);
        if (error) throw error;

        setConfigs((prev) => {
          const next = new Map(prev);
          next.set(alertType, { ...existing, frequency });
          return next;
        });
      } else {
        const newConfig = {
          user_id: user.id,
          alert_type: alertType,
          is_active: true,
          frequency,
          threshold: alertDef?.defaultThreshold || 20,
        };

        const { data, error } = await supabase
          .from("smart_alerts_config")
          .insert(newConfig)
          .select()
          .single();

        if (error) throw error;

        setConfigs((prev) => {
          const next = new Map(prev);
          next.set(alertType, data as AlertConfig);
          return next;
        });
      }

      toast.success("Frequência atualizada");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Alertas Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Alertas Inteligentes
        </CardTitle>
        <CardDescription>
          Receba alertas automáticos via WhatsApp baseados nos seus dados financeiros reais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected && (
          <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
            ⚠️ Configure seu WhatsApp primeiro para receber os alertas.
          </div>
        )}

        {ALERT_TYPES.map((alert) => {
          const config = configs.get(alert.type);
          const isActive = config?.is_active ?? false;
          const frequency = config?.frequency ?? "weekly";
          const isSaving = saving === alert.type;

          return (
            <div
              key={alert.type}
              className={`p-4 border rounded-lg transition-opacity ${
                !isActive ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 flex-1 min-w-0">
                  <div className="mt-0.5 flex-shrink-0">{alert.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium leading-tight">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alert.description}
                    </p>

                    {isActive && (
                      <div className="flex items-center gap-2 mt-3">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <Select
                          value={frequency}
                          onValueChange={(val) =>
                            handleChangeFrequency(alert.type, val)
                          }
                          disabled={isSaving}
                        >
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {config?.last_triggered_at && (
                          <Badge variant="outline" className="text-xs">
                            Último:{" "}
                            {new Date(config.last_triggered_at).toLocaleDateString("pt-BR")}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={(checked) =>
                    handleToggleAlert(alert.type, checked)
                  }
                  disabled={isSaving || !isConnected}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
