-- Adicionar campo de valor-alvo em reais na tabela emergency_goals
ALTER TABLE public.emergency_goals 
ADD COLUMN IF NOT EXISTS target_amount NUMERIC,
ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'months' CHECK (goal_type IN ('months', 'amount', 'both'));

-- Comentários para documentar os campos
COMMENT ON COLUMN public.emergency_goals.target_amount IS 'Valor-alvo da reserva em reais (opcional)';
COMMENT ON COLUMN public.emergency_goals.goal_type IS 'Tipo de meta: months (baseado em meses), amount (baseado em valor), both (ambos)';

-- Atualizar registros existentes para usar o novo campo
UPDATE public.emergency_goals
SET goal_type = 'months'
WHERE goal_type IS NULL;