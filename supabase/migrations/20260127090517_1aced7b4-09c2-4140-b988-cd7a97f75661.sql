-- Create trigger for handling new user signup
-- This trigger will automatically create profile, split_rules, emergency_goals, and user_balance for new users

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();