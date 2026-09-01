-- =========================================================
-- SCRIPT DE ATUALIZAÇÃO: ENTREGA DIGITAL E TABELA DE PEDIDOS
-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard)
-- =========================================================

-- 1. Garante a coluna delivery_url na tabela products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS delivery_url TEXT;

-- 2. Cria a tabela orders (caso ainda não exista)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    product_id TEXT,
    product_name TEXT,
    delivery_url TEXT,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    email_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;

-- 3. Habilita RLS na tabela orders e concede permissões
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir insercao publica de pedidos" ON public.orders;
CREATE POLICY "Permitir insercao publica de pedidos" 
ON public.orders FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura publica de pedidos" ON public.orders;
CREATE POLICY "Permitir leitura publica de pedidos" 
ON public.orders FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir atualizacao publica de pedidos" ON public.orders;
CREATE POLICY "Permitir atualizacao publica de pedidos" 
ON public.orders FOR UPDATE 
USING (true);
