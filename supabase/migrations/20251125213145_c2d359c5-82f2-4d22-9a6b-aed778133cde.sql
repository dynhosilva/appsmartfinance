-- Criar tabela de metas personalizadas
CREATE TABLE IF NOT EXISTS public.custom_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  category TEXT,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT '🎯',
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT positive_target CHECK (target_amount > 0),
  CONSTRAINT positive_current CHECK (current_amount >= 0)
);

-- Habilitar RLS
ALTER TABLE public.custom_goals ENABLE ROW LEVEL SECURITY;

-- Política para usuários gerenciarem suas próprias metas
CREATE POLICY "Users can manage own goals"
ON public.custom_goals
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_custom_goals_updated_at
BEFORE UPDATE ON public.custom_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índice para melhor performance
CREATE INDEX idx_custom_goals_user_id ON public.custom_goals(user_id);
CREATE INDEX idx_custom_goals_deadline ON public.custom_goals(deadline);

-- Função para marcar meta como completa automaticamente
CREATE OR REPLACE FUNCTION check_goal_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_amount >= NEW.target_amount AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
    NEW.is_completed = true;
    NEW.completed_at = now();
  ELSIF NEW.current_amount < NEW.target_amount AND OLD.is_completed = true THEN
    NEW.is_completed = false;
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_complete_goal
BEFORE UPDATE OF current_amount ON public.custom_goals
FOR EACH ROW
EXECUTE FUNCTION check_goal_completion();