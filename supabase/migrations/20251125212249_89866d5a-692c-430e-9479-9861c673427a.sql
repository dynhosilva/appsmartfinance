-- Atualizar a função handle_new_user para criar saldo inicial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
  
  RETURN NEW;
END;
$function$;