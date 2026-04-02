-- Create banks table with comprehensive information
CREATE TABLE public.banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  account_type TEXT DEFAULT 'checking', -- checking, savings, investment, credit_card, wallet
  agency TEXT,
  account_number TEXT,
  color TEXT DEFAULT '#3b82f6',
  notes TEXT,
  opening_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage own banks"
ON public.banks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_banks_updated_at
  BEFORE UPDATE ON public.banks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add bank_id column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX idx_transactions_bank_id ON public.transactions(bank_id);
CREATE INDEX idx_banks_user_id ON public.banks(user_id);

-- Create storage bucket for bank logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bank-logos', 'bank-logos', true);

-- Create storage policy for bank logos - public read
CREATE POLICY "Bank logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'bank-logos');

-- Create storage policy for bank logos - authenticated users can upload their own
CREATE POLICY "Users can upload their own bank logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'bank-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policy for bank logos - authenticated users can update their own
CREATE POLICY "Users can update their own bank logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'bank-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policy for bank logos - authenticated users can delete their own
CREATE POLICY "Users can delete their own bank logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'bank-logos' AND auth.uid()::text = (storage.foldername(name))[1]);