-- Create shopping list items table
CREATE TABLE public.shopping_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'un',
  category TEXT,
  is_purchased BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
CREATE POLICY "Users can manage own shopping list items"
ON public.shopping_list_items
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_shopping_list_items_updated_at
BEFORE UPDATE ON public.shopping_list_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();