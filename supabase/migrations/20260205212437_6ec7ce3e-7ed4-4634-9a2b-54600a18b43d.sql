-- Add order_index column for manual ordering
ALTER TABLE public.shopping_list_items 
ADD COLUMN order_index INTEGER DEFAULT 0;