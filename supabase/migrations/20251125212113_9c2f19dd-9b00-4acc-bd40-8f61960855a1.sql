-- Criar tabela para armazenar o saldo disponível do usuário
CREATE TABLE IF NOT EXISTS public.user_balance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_balance ENABLE ROW LEVEL SECURITY;

-- Política para usuários visualizarem e gerenciarem seu próprio saldo
CREATE POLICY "Users can manage own balance"
ON public.user_balance
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_user_balance_updated_at
BEFORE UPDATE ON public.user_balance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir saldo inicial para usuários existentes
INSERT INTO public.user_balance (user_id, available_balance)
SELECT id, 0
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_balance)
ON CONFLICT (user_id) DO NOTHING;