-- Add category_id column to fixed_costs table for linking variable costs to transaction categories
ALTER TABLE public.fixed_costs 
ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_fixed_costs_category_id ON public.fixed_costs(category_id);