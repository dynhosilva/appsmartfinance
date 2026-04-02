-- Tabela para armazenar configuração do WhatsApp do usuário
CREATE TABLE public.whatsapp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  instance_name TEXT,
  api_key TEXT,
  api_url TEXT,
  is_connected BOOLEAN DEFAULT false,
  connected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela para lembretes personalizados
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  reminder_type TEXT NOT NULL DEFAULT 'custom', -- 'bill', 'goal', 'weekly_summary', 'monthly_summary', 'custom'
  reference_id UUID, -- ID da dívida, meta, etc (opcional)
  day_of_month INTEGER, -- Para lembretes mensais (1-31)
  day_of_week INTEGER, -- Para lembretes semanais (0-6, domingo=0)
  time_of_day TIME DEFAULT '09:00:00',
  days_before INTEGER DEFAULT 0, -- Dias de antecedência para alertas
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de log de mensagens enviadas
CREATE TABLE public.whatsapp_messages_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL,
  message_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_config
CREATE POLICY "Users can view their own whatsapp config"
ON public.whatsapp_config FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own whatsapp config"
ON public.whatsapp_config FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own whatsapp config"
ON public.whatsapp_config FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own whatsapp config"
ON public.whatsapp_config FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for reminders
CREATE POLICY "Users can view their own reminders"
ON public.reminders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders"
ON public.reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
ON public.reminders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
ON public.reminders FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for whatsapp_messages_log
CREATE POLICY "Users can view their own message logs"
ON public.whatsapp_messages_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own message logs"
ON public.whatsapp_messages_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_config_updated_at
BEFORE UPDATE ON public.whatsapp_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
BEFORE UPDATE ON public.reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();