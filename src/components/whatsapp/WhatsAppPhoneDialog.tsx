import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, MessageCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface WhatsAppPhoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentPhone?: string;
  notificationsEnabled?: boolean;
}

export function WhatsAppPhoneDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  currentPhone = "",
  notificationsEnabled = true
}: WhatsAppPhoneDialogProps) {
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(currentPhone);
  const [enableNotifications, setEnableNotifications] = useState(notificationsEnabled);

  useEffect(() => {
    if (open) {
      setPhoneNumber(currentPhone);
      setEnableNotifications(notificationsEnabled);
    }
  }, [open, currentPhone, notificationsEnabled]);

  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setPhoneNumber(digits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      toast.error("Digite um número válido com DDD");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      // Format with country code
      const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

      const { error } = await supabase
        .from("profiles")
        .update({
          phone_number: formattedPhone,
          whatsapp_notifications_enabled: enableNotifications,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("WhatsApp configurado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            Configurar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Informe seu número para receber lembretes e resumos financeiros
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Número do WhatsApp
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formatPhoneDisplay(phoneNumber)}
              onChange={handlePhoneChange}
              placeholder="(11) 99999-9999"
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground">
              Digite seu número com DDD (ex: 11999999999)
            </p>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="notifications" className="font-medium">
                Receber notificações
              </Label>
              <p className="text-xs text-muted-foreground">
                Lembretes de contas e resumos financeiros
              </p>
            </div>
            <Switch
              id="notifications"
              checked={enableNotifications}
              onCheckedChange={setEnableNotifications}
            />
          </div>

          <div className="bg-success/10 p-4 rounded-lg border border-success/20">
            <p className="text-sm text-foreground">
              <span className="font-semibold text-success">Como funciona:</span> Você receberá mensagens do SmartFinance 
              diretamente no seu WhatsApp com lembretes de contas a pagar e resumos 
              financeiros conforme suas configurações.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              "Salvar configurações"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
