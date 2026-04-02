
-- Table for smart indicator logs
CREATE TABLE public.smart_indicators_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  indicator_type TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'neutral',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.smart_indicators_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own indicator logs"
  ON public.smart_indicators_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_smart_indicators_user_type ON public.smart_indicators_logs (user_id, indicator_type, generated_at DESC);

-- Add income_type to transactions for fixed/variable income distinction
ALTER TABLE public.transactions ADD COLUMN income_type TEXT NULL;
