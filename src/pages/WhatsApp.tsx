import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Bot,
  MessageCircle, 
  Plus, 
  Settings, 
  Bell, 
  Trash2, 
  Edit2, 
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Smartphone,
  Crown,
  Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WhatsAppPhoneDialog } from "@/components/whatsapp/WhatsAppPhoneDialog";
import { ReminderFormDialog } from "@/components/whatsapp/ReminderFormDialog";
import { useUserPlan } from "@/hooks/useUserPlan";
import { UpgradePrompt } from "@/components/plans/UpgradePrompt";
import { LimitWarning } from "@/components/plans/LimitWarning";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  last_sent_at: string | null;
}

interface UserProfile {
  phone_number: string | null;
  whatsapp_notifications_enabled: boolean | null;
}

interface MessageLog {
  id: string;
  created_at: string;
  message_type: string;
  status: string | null;
  error_message: string | null;
  message_content: string;
  sent_at: string | null;
}

const REMINDER_TYPE_LABELS: Record<string, string> = {
  daily_summary: "Resumo Diário",
  weekly_summary: "Resumo Semanal",
  monthly_summary: "Resumo Mensal",
  bill: "Conta a Pagar",
  custom: "Personalizado",
  smart_alerts: "⚡ Alertas Inteligentes",
};

const DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function WhatsApp() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const { plan, usage, loading: planLoading, canUseWhatsApp, canAddReminder, refetch: refetchPlan } = useUserPlan();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileResult, remindersResult, logsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("phone_number, whatsapp_notifications_enabled")
          .eq("id", user.id)
          .single(),
        supabase
          .from("reminders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("whatsapp_messages_log")
          .select("id, created_at, message_type, status, error_message, message_content, sent_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20)
      ]);

      if (profileResult.data) {
        setProfile(profileResult.data);
      }
      if (remindersResult.data) {
        setReminders(remindersResult.data);
      }
      if (logsResult.data) {
        setMessageLogs(logsResult.data as MessageLog[]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const isConnected = profile?.phone_number && profile?.whatsapp_notifications_enabled;

  const handleToggleReminder = async (reminderId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("reminders")
        .update({ is_active: isActive })
        .eq("id", reminderId);

      if (error) throw error;

      setReminders(reminders.map(r => 
        r.id === reminderId ? { ...r, is_active: isActive } : r
      ));
      
      toast.success(isActive ? "Lembrete ativado" : "Lembrete desativado");
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  const handleDeleteReminder = async () => {
    if (!reminderToDelete) return;

    try {
      const { error } = await supabase
        .from("reminders")
        .delete()
        .eq("id", reminderToDelete);

      if (error) throw error;

      setReminders(reminders.filter(r => r.id !== reminderToDelete));
      toast.success("Lembrete excluído");
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setReminderToDelete(null);
    }
  };

  const handleSendTestMessage = async () => {
    if (!isConnected) {
      toast.error("Configure seu WhatsApp primeiro");
      return;
    }

    try {
      setSendingTest(true);
      
      const response = await supabase.functions.invoke("send-whatsapp", {
        body: {
          message: "🧪 *Teste SmartFinance*\n\nSua integração com WhatsApp está funcionando corretamente!\n\n_Este é um teste automático._",
          messageType: "test",
        },
      });

      if (response.error) throw response.error;

      toast.success("Mensagem de teste enviada!");
      loadData(true);
    } catch (error: any) {
      toast.error("Erro ao enviar: " + error.message);
    } finally {
      setSendingTest(false);
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    // Remove country code for display
    const localNumber = digits.startsWith("55") ? digits.slice(2) : digits;
    if (localNumber.length === 11) {
      return `(${localNumber.slice(0, 2)}) ${localNumber.slice(2, 7)}-${localNumber.slice(7)}`;
    }
    if (localNumber.length === 10) {
      return `(${localNumber.slice(0, 2)}) ${localNumber.slice(2, 6)}-${localNumber.slice(6)}`;
    }
    return phone;
  };

  const formatSchedule = (reminder: Reminder) => {
    const time = reminder.time_of_day?.slice(0, 5) || "09:00";
    
    if (reminder.reminder_type === "daily_summary") {
      return `Todos os dias às ${time}`;
    }
    if (reminder.reminder_type === "weekly_summary" && reminder.day_of_week !== null) {
      return `Toda ${DAYS_OF_WEEK[reminder.day_of_week]} às ${time}`;
    }
    if (reminder.reminder_type === "monthly_summary" && reminder.day_of_month) {
      return `Dia ${reminder.day_of_month} de cada mês às ${time}`;
    }
    if (reminder.reminder_type === "bill" && reminder.day_of_month) {
      const daysBeforeText = reminder.days_before > 0 
        ? ` (${reminder.days_before} dias antes)` 
        : "";
      return `Dia ${reminder.day_of_month}${daysBeforeText} às ${time}`;
    }
    // Smart alerts and custom: check for day_of_week, day_of_month, or treat as daily
    if (reminder.day_of_week !== null) {
      return `Toda ${DAYS_OF_WEEK[reminder.day_of_week]} às ${time}`;
    }
    if (reminder.day_of_month) {
      return `Dia ${reminder.day_of_month} de cada mês às ${time}`;
    }
    return `Todos os dias às ${time}`;
  };

  const handleOpenNewReminder = () => {
    if (!canAddReminder()) {
      toast.error(`Limite de ${plan.max_reminders} lembretes atingido. Faça upgrade para adicionar mais.`);
      navigate("/upgrade");
      return;
    }
    setSelectedReminder(null);
    setReminderDialogOpen(true);
  };

  // If WhatsApp is not enabled for this plan, show upgrade prompt (only after plan loaded)
  if (!planLoading && !canUseWhatsApp()) {
    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              Assistente Virtual
            </h1>
            <p className="text-muted-foreground">
              Receba lembretes e resumos financeiros no seu WhatsApp
            </p>
          </div>
          
          <UpgradePrompt 
            feature="Assistente Virtual WhatsApp"
            description="Receba resumos financeiros diários, semanais e mensais diretamente no seu WhatsApp. Configure lembretes para contas a pagar e nunca mais esqueça um vencimento."
            requiredPlan="pro"
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Limit Warning */}
        <LimitWarning 
          resource="lembretes" 
          current={usage.reminders_count} 
          max={plan.max_reminders} 
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              Assistente Virtual
            </h1>
            <p className="text-muted-foreground">
              Receba lembretes e resumos financeiros no seu WhatsApp
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPhoneDialogOpen(true)}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              {isConnected ? "Alterar número" : "Configurar"}
            </Button>
            <Button onClick={handleOpenNewReminder}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Lembrete
            </Button>
          </div>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Status da Conexão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <>
                    <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">Conectado</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPhoneDisplay(profile?.phone_number || "")}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Não conectado</p>
                      <p className="text-sm text-muted-foreground">
                        Configure seu número para receber mensagens
                      </p>
                    </div>
                  </>
                )}
              </div>
              {isConnected && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSendTestMessage}
                  disabled={sendingTest}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendingTest ? "Enviando..." : "Testar"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reminders List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Lembretes Configurados
            </CardTitle>
            <CardDescription>
              Seus lembretes automáticos por WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum lembrete configurado</p>
                <p className="text-sm">Crie seu primeiro lembrete para receber alertas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`p-4 border rounded-lg transition-opacity ${
                      !reminder.is_active ? "opacity-50" : ""
                    }`}
                  >
                    {/* Header row: title + actions */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium leading-tight">{reminder.title}</h4>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {REMINDER_TYPE_LABELS[reminder.reminder_type] || reminder.reminder_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Switch
                          checked={reminder.is_active}
                          onCheckedChange={(checked) => handleToggleReminder(reminder.id, checked)}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedReminder(reminder);
                            setReminderDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setReminderToDelete(reminder.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Info row: schedule + last sent */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{formatSchedule(reminder)}</span>
                      </span>
                      {reminder.last_sent_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            Último: {new Date(reminder.last_sent_at).toLocaleDateString("pt-BR")}{" "}
                            {new Date(reminder.last_sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de envios</CardTitle>
            <CardDescription>
              Últimas mensagens enviadas para seu WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            {messageLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum envio registrado ainda.</p>
            ) : (
              <div className="space-y-3">
                {messageLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <div className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {log.message_type}
                        </Badge>
                        <Badge variant={log.status === "sent" ? "default" : "outline"} className="text-xs">
                          {log.status || "unknown"}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 text-sm whitespace-pre-wrap break-words">
                      {log.message_content}
                    </div>
                    {log.error_message && (
                      <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                        Erro: {log.error_message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}

        {/* Info Card */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Como funciona?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Informe seu número de WhatsApp para receber mensagens</li>
                  <li>• Crie lembretes para contas a pagar e resumos financeiros</li>
                  <li>• Receba as mensagens automaticamente no horário configurado</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <WhatsAppPhoneDialog
        open={phoneDialogOpen}
        onOpenChange={setPhoneDialogOpen}
        onSuccess={() => loadData(true)}
        currentPhone={profile?.phone_number?.replace(/^55/, "") || ""}
        notificationsEnabled={profile?.whatsapp_notifications_enabled ?? true}
      />

      <ReminderFormDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        reminder={selectedReminder}
        onSuccess={() => loadData(true)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lembrete?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lembrete será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReminder} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
