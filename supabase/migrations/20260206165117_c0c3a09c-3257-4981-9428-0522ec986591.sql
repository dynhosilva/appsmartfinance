-- =============================================
-- FASE 1: ESTRUTURA SAAS COM WOOVI
-- =============================================

-- Enum para status de assinatura
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'pending');

-- Enum para planos
CREATE TYPE public.plan_type AS ENUM ('free', 'pro', 'business');

-- Enum para período de cobrança
CREATE TYPE public.billing_period AS ENUM ('monthly', 'yearly');

-- =============================================
-- TABELA DE PLANOS
-- =============================================
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  plan_type public.plan_type NOT NULL UNIQUE,
  price_monthly INTEGER NOT NULL DEFAULT 0, -- em centavos
  price_yearly INTEGER NOT NULL DEFAULT 0, -- em centavos
  features JSONB DEFAULT '[]'::jsonb,
  max_reminders INTEGER DEFAULT 3, -- limite de lembretes ativos
  max_banks INTEGER DEFAULT 2, -- limite de contas bancárias
  max_goals INTEGER DEFAULT 1, -- limite de metas
  whatsapp_enabled BOOLEAN DEFAULT false,
  reports_enabled BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir planos padrão
INSERT INTO public.plans (name, description, plan_type, price_monthly, price_yearly, features, max_reminders, max_banks, max_goals, whatsapp_enabled, reports_enabled) VALUES
('Gratuito', 'Controle básico das suas finanças', 'free', 0, 0, '["Dashboard básico", "2 contas bancárias", "1 meta financeira", "3 lembretes"]'::jsonb, 3, 2, 1, false, false),
('Pro', 'Para quem quer organização completa', 'pro', 2990, 29900, '["Dashboard completo", "Contas ilimitadas", "Metas ilimitadas", "Lembretes via WhatsApp", "Relatórios avançados"]'::jsonb, -1, -1, -1, true, true),
('Business', 'Para microempreendedores e freelancers', 'business', 4990, 49900, '["Tudo do Pro", "Perfil PJ separado", "Exportação de relatórios", "Suporte prioritário"]'::jsonb, -1, -1, -1, true, true);

-- =============================================
-- TABELA DE ASSINATURAS
-- =============================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status public.subscription_status NOT NULL DEFAULT 'pending',
  billing_period public.billing_period NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  woovi_subscription_id TEXT, -- ID da assinatura na Woovi
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- =============================================
-- TABELA DE PAGAMENTOS WOOVI
-- =============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  woovi_charge_id TEXT NOT NULL, -- correlationID da Woovi
  woovi_transaction_id TEXT, -- transactionID após pagamento
  amount INTEGER NOT NULL, -- em centavos
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, expired, refunded
  payment_link TEXT, -- link de pagamento Pix
  qr_code TEXT, -- QR code em base64
  br_code TEXT, -- código Pix copia e cola
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ADICIONAR CAMPO DE TELEFONE NO PERFIL
-- =============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled BOOLEAN DEFAULT false;

-- =============================================
-- REMOVER TABELA DE CONFIG INDIVIDUAL DE WHATSAPP
-- (mantemos os dados por segurança, mas não usaremos mais)
-- =============================================
-- DROP TABLE IF EXISTS public.whatsapp_config; -- comentado por segurança

-- =============================================
-- RLS POLICIES
-- =============================================

-- Plans: todos podem ver planos ativos
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
ON public.plans FOR SELECT
USING (is_active = true);

-- Subscriptions: usuário vê apenas a própria
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- Payments: usuário vê apenas os próprios
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id);

-- =============================================
-- FUNÇÃO PARA VERIFICAR PLANO DO USUÁRIO
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id UUID)
RETURNS TABLE (
  plan_type public.plan_type,
  plan_name TEXT,
  is_active BOOLEAN,
  whatsapp_enabled BOOLEAN,
  reports_enabled BOOLEAN,
  max_reminders INTEGER,
  max_banks INTEGER,
  max_goals INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(pl.plan_type, 'free'::public.plan_type) as plan_type,
    COALESCE(pl.name, 'Gratuito') as plan_name,
    COALESCE(s.status = 'active', false) as is_active,
    COALESCE(pl.whatsapp_enabled, false) as whatsapp_enabled,
    COALESCE(pl.reports_enabled, false) as reports_enabled,
    COALESCE(pl.max_reminders, 3) as max_reminders,
    COALESCE(pl.max_banks, 2) as max_banks,
    COALESCE(pl.max_goals, 1) as max_goals
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.id AND s.status = 'active'
  LEFT JOIN public.plans pl ON pl.id = s.plan_id
  WHERE p.id = p_user_id;
END;
$$;

-- =============================================
-- FUNÇÃO PARA CHECAR SE USUÁRIO TEM FEATURE
-- =============================================
CREATE OR REPLACE FUNCTION public.user_has_feature(p_user_id UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result BOOLEAN := false;
BEGIN
  SELECT 
    CASE 
      WHEN p_feature = 'whatsapp' THEN COALESCE(pl.whatsapp_enabled, false)
      WHEN p_feature = 'reports' THEN COALESCE(pl.reports_enabled, false)
      ELSE false
    END INTO v_result
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.id AND s.status = 'active'
  LEFT JOIN public.plans pl ON pl.id = s.plan_id
  WHERE p.id = p_user_id;
  
  RETURN COALESCE(v_result, false);
END;
$$;

-- =============================================
-- TRIGGER PARA ATUALIZAR updated_at
-- =============================================
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- CRIAR ASSINATURA FREE PARA NOVOS USUÁRIOS
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  -- Create default split rule
  INSERT INTO public.split_rules (user_id, name, personal_percentage, reserve_percentage, business_percentage)
  VALUES (NEW.id, 'Regra Padrão', 45.00, 45.00, 10.00);
  
  -- Create emergency goal
  INSERT INTO public.emergency_goals (user_id, target_months, current_amount)
  VALUES (NEW.id, 6, 0);
  
  -- Create initial balance
  INSERT INTO public.user_balance (user_id, available_balance)
  VALUES (NEW.id, 0);
  
  -- Get free plan ID and create subscription
  SELECT id INTO v_free_plan_id FROM public.plans WHERE plan_type = 'free' LIMIT 1;
  IF v_free_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start)
    VALUES (NEW.id, v_free_plan_id, 'active', now());
  END IF;
  
  RETURN NEW;
END;
$$;