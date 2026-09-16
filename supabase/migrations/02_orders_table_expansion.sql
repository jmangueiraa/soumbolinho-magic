-- ==============================================================================
-- MIGRAÇÃO: TABELA DE PEDIDOS COMPLETA (orders) - MULTI-TENANT & MELHOR ENVIO
-- Execute este script no SQL Editor do seu Dashboard Supabase (supabase.com)
-- ==============================================================================

-- 1. Cria a tabela orders caso ainda não exista
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    customer_document TEXT,
    product_id TEXT,
    product_name TEXT,
    delivery_url TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    shipping_cost NUMERIC(10,2) DEFAULT 0.00,
    shipping_method TEXT,
    shipping_service_id TEXT,
    shipping_agency_id TEXT,
    delivery_address TEXT,
    shipping_address_data JSONB DEFAULT '{}'::jsonb,
    tracking_code TEXT,
    shipping_label_url TEXT,
    shipping_order_id TEXT,
    payment_id TEXT,
    payment_method TEXT DEFAULT 'mercadopago',
    status TEXT DEFAULT 'pending',
    notes TEXT,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Garante a existência de todas as colunas mesmo se a tabela já existia antes
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_document TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_method TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_service_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_agency_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_label_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'mercadopago';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Índices de performance para busca multi-tenant rápida
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders (store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_code ON public.orders (tracking_code);

-- 4. Habilita RLS (Row Level Security) com acesso irrestrito para anon/authenticated (conforme padrão do projeto)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public orders access" ON public.orders;
CREATE POLICY "Public orders access" ON public.orders FOR ALL USING (true) WITH CHECK (true);

-- 5. Publicação Realtime para atualização ao vivo
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
