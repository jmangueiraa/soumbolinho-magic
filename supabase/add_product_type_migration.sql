-- ==============================================================================
-- MIGRAÇÃO SUPABASE: Adiciona coluna product_type na tabela products
-- Execute este script no SQL Editor do seu Dashboard Supabase (supabase.com)
-- ==============================================================================

-- 1. Adiciona a coluna product_type permitindo 'digital' ou 'fisico'
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'fisico' 
CHECK (product_type IN ('digital', 'fisico'));

-- 2. Atualiza os produtos existentes com base na coluna is_digital
UPDATE public.products 
SET product_type = CASE 
  WHEN is_digital = TRUE THEN 'digital' 
  ELSE 'fisico' 
END 
WHERE product_type IS NULL;

-- 3. Cria índice para buscas rápidas por tipo de produto e loja
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products (product_type);
CREATE INDEX IF NOT EXISTS idx_products_store_type ON public.products (store_id, product_type);
