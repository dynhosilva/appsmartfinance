
-- Table to store smart alert configurations per user
CREATE TABLE public.smart_alerts_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  threshold NUMERIC DEFAULT 20,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one config per alert type per user
CREATE UNIQUE INDEX idx_smart_alerts_user_type ON public.smart_alerts_config(user_id, alert_type);

-- Enable RLS
ALTER TABLE public.smart_alerts_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own smart alerts config"
ON public.smart_alerts_config FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_smart_alerts_config_updated_at
BEFORE UPDATE ON public.smart_alerts_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
