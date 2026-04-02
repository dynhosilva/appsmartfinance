-- Corrigir a função check_goal_completion com search_path seguro
CREATE OR REPLACE FUNCTION public.check_goal_completion()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;