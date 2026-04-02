import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Bell, Zap, TrendingUp, Target, BarChart3, Wallet, Activity, PiggyBank, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Reminder {
  id: string;
  title: string;
  message: string | null;
  reminder_type: string;
  reference_id: string | null;
  day_of_month: number | null;
  day_of_week: number | null;
  time_of_day: string;
  days_before: number;
  is_active: boolean;
}

interface ReminderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: Reminder | null;
  onSuccess: () => void;
}

const REMINDER_TYPES = [
  { value: "daily_summary", label: "Resumo Diário", description: "Resumo financeiro completo do dia" },
  { value: "weekly_summary", label: "Resumo Semanal", description: "Visão geral da semana" },
  { value: "monthly_summary", label: "Resumo Mensal", description: "Relatório completo do mês" },
  { value: "bill", label: "Conta a Pagar", description: "Lembrete de vencimento" },
  { value: "custom", label: "Lembrete Personalizado", description: "Mensagem customizada" },
  { value: "smart_alerts", label: "⚡ Alertas Inteligentes", description: "Receba todos os alertas baseados nos seus dados reais" },
];

const SMART_ALERT_DETAILS = [
  { label: "Gastos acima da média", icon: TrendingUp },
  { label: "Meta atrasada", icon: Target },
  { label: "Despesa recorrente aumentou", icon: BarChart3 },
  { label: "Saldo baixo", icon: Wallet },
  { label: "Sem movimentação", icon: Activity },
  { label: "Dica de economia", icon: PiggyBank },
  { label: "Dívida próxima do vencimento", icon: CreditCard },
];

const SCHEDULE_OPTIONS = [
  { value: "daily", label: "Todos os dias" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
];

const DAYS_OF_WEEK = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
];

export function ReminderFormDialog({ open, onOpenChange, reminder, onSuccess }: ReminderFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [debts, setDebts] = useState<Array<{ id: string; name: string; due_day: number | null }>>([]);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    reminder_type: "custom",
    reference_id: "",
    day_of_month: "",
    day_of_week: "",
    time_of_day: "09:00",
    days_before: "0",
    schedule: "daily",
  });

  const isSmartAlert = formData.reminder_type === "smart_alerts";

  useEffect(() => {
    if (open) {
      loadDebts();
      if (reminder) {
        // Determine schedule from existing reminder
        let schedule = "daily";
        if (reminder.day_of_week !== null) schedule = "weekly";
        else if (reminder.day_of_month !== null && !["bill", "monthly_summary"].includes(reminder.reminder_type)) schedule = "monthly";
        else if (reminder.reminder_type === "monthly_summary") schedule = "monthly";
        else if (reminder.reminder_type === "weekly_summary") schedule = "weekly";

        setFormData({
          title: reminder.title,
          message: reminder.message || "",
          reminder_type: reminder.reminder_type,
          reference_id: reminder.reference_id || "",
          day_of_month: reminder.day_of_month?.toString() || "",
          day_of_week: reminder.day_of_week?.toString() || "",
          time_of_day: reminder.time_of_day || "09:00",
          days_before: reminder.days_before.toString(),
          schedule,
        });
      } else {
        setFormData({
          title: "",
          message: "",
          reminder_type: "custom",
          reference_id: "",
          day_of_month: "",
          day_of_week: "",
          time_of_day: "09:00",
          days_before: "0",
          schedule: "daily",
        });
      }
    }
  }, [reminder, open]);

  const loadDebts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("debts")
      .select("id, name, due_day")
      .eq("user_id", user.id)
      .eq("status", "active");

    setDebts(data || []);
  };

  const handleTypeChange = (value: string) => {
    const isSmart = value === "smart_alerts";

    setFormData(prev => ({
      ...prev,
      reminder_type: value,
      title: isSmart ? "Alertas Inteligentes" : (value === prev.reminder_type ? prev.title : ""),
      message: isSmart ? "" : prev.message,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const title = isSmartAlert
      ? "Alertas Inteligentes"
      : formData.title.trim();

    if (!title) {
      toast.error("Preencha o título do lembrete");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      // For smart alerts, derive day_of_month/day_of_week from schedule
      let dayOfMonth: number | null = null;
      let dayOfWeek: number | null = null;

      if (isSmartAlert) {
        if (formData.schedule === "weekly") {
          dayOfWeek = formData.day_of_week !== "" ? parseInt(formData.day_of_week) : 1; // default Monday
        } else if (formData.schedule === "monthly") {
          dayOfMonth = formData.day_of_month ? parseInt(formData.day_of_month) : 1;
        }
        // daily = no day constraints
      } else {
        dayOfMonth = formData.day_of_month ? parseInt(formData.day_of_month) : null;
        dayOfWeek = formData.day_of_week !== "" ? parseInt(formData.day_of_week) : null;
      }

      const reminderData = {
        user_id: user.id,
        title,
        message: formData.message.trim() || null,
        reminder_type: formData.reminder_type,
        reference_id: formData.reference_id || null,
        day_of_month: dayOfMonth,
        day_of_week: dayOfWeek,
        time_of_day: formData.time_of_day || "09:00:00",
        days_before: parseInt(formData.days_before) || 0,
        is_active: true,
      };

      const normalizeTime = (t: string | null | undefined) => (t ? t.slice(0, 5) : null);

      if (reminder) {
        const scheduleChanged =
          reminder.reminder_type !== reminderData.reminder_type ||
          (reminder.reference_id || null) !== reminderData.reference_id ||
          (reminder.day_of_month ?? null) !== reminderData.day_of_month ||
          (reminder.day_of_week ?? null) !== reminderData.day_of_week ||
          normalizeTime(reminder.time_of_day) !== normalizeTime(reminderData.time_of_day) ||
          (reminder.days_before ?? 0) !== reminderData.days_before;

        const updateData: any = { ...reminderData };
        if (scheduleChanged) updateData.last_sent_at = null;

        const { error } = await supabase
          .from("reminders")
          .update(updateData)
          .eq("id", reminder.id);
        if (error) throw error;
        toast.success("Lembrete atualizado!");
      } else {
        const { error } = await supabase
          .from("reminders")
          .insert(reminderData);
        if (error) throw error;
        toast.success(isSmartAlert ? "Alerta inteligente criado!" : "Lembrete criado!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDebtSelect = (debtId: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (debt) {
      setFormData(prev => ({
        ...prev,
        reference_id: debtId,
        title: `Pagar ${debt.name}`,
        day_of_month: debt.due_day?.toString() || "",
      }));
    }
  };

  const selectedTypeInfo = REMINDER_TYPES.find(t => t.value === formData.reminder_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSmartAlert ? <Zap className="h-5 w-5 text-primary" /> : <Bell className="h-5 w-5" />}
            {reminder ? "Editar" : "Novo"} {isSmartAlert ? "Alerta Inteligente" : "Lembrete"}
          </DialogTitle>
          <DialogDescription>
            {isSmartAlert
              ? "Configure um alerta baseado nos seus dados financeiros reais"
              : "Configure um lembrete para receber no WhatsApp"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={formData.reminder_type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description for smart alerts */}
          {isSmartAlert && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <p className="text-sm font-medium">Você receberá alertas automáticos sobre:</p>
              <ul className="space-y-1">
                {SMART_ALERT_DETAILS.map((alert) => (
                  <li key={alert.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <alert.icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    {alert.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bill: debt selector */}
          {formData.reminder_type === "bill" && debts.length > 0 && (
            <div className="space-y-2">
              <Label>Selecionar Dívida</Label>
              <Select value={formData.reference_id} onValueChange={handleDebtSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma dívida" />
                </SelectTrigger>
                <SelectContent>
                  {debts.map((debt) => (
                    <SelectItem key={debt.id} value={debt.id}>
                      {debt.name} {debt.due_day ? `(dia ${debt.due_day})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title - only for non-smart types */}
          {!isSmartAlert && (
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Pagar aluguel"
                required
              />
            </div>
          )}

          {/* Message for custom */}
          {formData.reminder_type === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Mensagem personalizada..."
                rows={3}
              />
            </div>
          )}

          {/* Schedule section */}
          {isSmartAlert ? (
            /* Smart alert schedule: simple daily/weekly/monthly picker */
            <div className="space-y-3">
              <Label>Frequência de verificação</Label>
              <Select
                value={formData.schedule}
                onValueChange={(value) => setFormData({ ...formData, schedule: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {formData.schedule === "weekly" && (
                <div className="space-y-2">
                  <Label>Dia da semana</Label>
                  <Select
                    value={formData.day_of_week || "1"}
                    onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.schedule === "monthly" && (
                <div className="space-y-2">
                  <Label htmlFor="smart_day">Dia do mês</Label>
                  <Input
                    id="smart_day"
                    type="number"
                    min="1"
                    max="28"
                    value={formData.day_of_month || "1"}
                    onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
                  />
                </div>
              )}
            </div>
          ) : formData.reminder_type === "daily_summary" ? (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Você receberá um resumo financeiro completo todos os dias no horário configurado abaixo.
              </p>
            </div>
          ) : formData.reminder_type === "weekly_summary" ? (
            <div className="space-y-2">
              <Label>Dia da Semana</Label>
              <Select
                value={formData.day_of_week}
                onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o dia" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : formData.reminder_type === "monthly_summary" ? (
            <div className="space-y-2">
              <Label htmlFor="day_of_month">Dia do Mês</Label>
              <Input
                id="day_of_month"
                type="number"
                min="1"
                max="28"
                value={formData.day_of_month}
                onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
                placeholder="1-28"
              />
            </div>
          ) : formData.reminder_type === "bill" ? (
            <div className="space-y-2">
              <Label htmlFor="day_of_month">Dia do Mês</Label>
              <Input
                id="day_of_month"
                type="number"
                min="1"
                max="31"
                value={formData.day_of_month}
                onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
                placeholder="1-31"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="day_of_month">Dia do Mês (opcional)</Label>
              <Input
                id="day_of_month"
                type="number"
                min="1"
                max="31"
                value={formData.day_of_month}
                onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
                placeholder="1-31"
              />
            </div>
          )}

          {formData.reminder_type === "bill" && (
            <div className="space-y-2">
              <Label htmlFor="days_before">Dias de Antecedência</Label>
              <Input
                id="days_before"
                type="number"
                min="0"
                max="30"
                value={formData.days_before}
                onChange={(e) => setFormData({ ...formData, days_before: e.target.value })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Quantos dias antes do vencimento você quer ser lembrado
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="time">Horário</Label>
            <Input
              id="time"
              type="time"
              value={formData.time_of_day}
              onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : reminder ? (
                "Atualizar"
              ) : (
                "Criar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
