-- ==============================================================================
-- SCHEMA SUPABASE COMPLETO & REALTIME (Soumbolinho)
-- Execute este script no SQL Editor do seu Dashboard Supabase (supabase.com)
-- ==============================================================================

-- 1. TABELA DE CONFIGURAÇÕES DA LOJA (store_config)
CREATE TABLE IF NOT EXISTS public.store_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_name TEXT NOT NULL DEFAULT 'Soumbolinho',
    slogan TEXT DEFAULT 'Sua loja de moldes, papelaria e arquivos digitais',
    whatsapp_number TEXT DEFAULT '5521974975884',
    whatsapp_display TEXT DEFAULT '(21) 97497-5884',
    instagram TEXT DEFAULT '@soumbolinho',
    address TEXT DEFAULT 'Atendimento Online',
    city TEXT DEFAULT 'Brasil',
    working_hours TEXT DEFAULT 'Todos os dias: 08h às 22h',
    min_order_value NUMERIC(10,2) DEFAULT 0.00,
    mp_access_token TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir registro inicial padrão caso não exista
INSERT INTO public.store_config (id, store_name, slogan, whatsapp_number, whatsapp_display)
VALUES ('default', 'Soumbolinho', 'Sua loja de moldes, papelaria e arquivos digitais', '5521974975884', '(21) 97497-5884')
ON CONFLICT (id) DO NOTHING;

-- 2. TABELA DE CATEGORIAS (categories)
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'Gift',
    subcategories JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE BANNERS (banners)
CREATE TABLE IF NOT EXISTS public.banners (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'image',
    image_url TEXT,
    alt_text TEXT DEFAULT 'Banner Soumbolinho',
    tag TEXT,
    title TEXT,
    subtitle TEXT,
    highlight_text TEXT,
    theme_color TEXT DEFAULT 'pink',
    link_url TEXT,
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE PRODUTOS (products)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    unit_suffix TEXT DEFAULT '/Un',
    image_url TEXT,
    image TEXT,
    delivery_url TEXT,
    description TEXT,
    in_stock BOOLEAN DEFAULT TRUE,
    is_customizable BOOLEAN DEFAULT TRUE,
    customization_placeholder TEXT,
    badge TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 5. HABILITAR ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO PÚBLICO / ADMIN
-- ==============================================================================

-- A) store_config
ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read store_config" ON public.store_config;
CREATE POLICY "Public read store_config" ON public.store_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public update store_config" ON public.store_config;
CREATE POLICY "Public update store_config" ON public.store_config FOR ALL USING (true) WITH CHECK (true);

-- B) categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public write categories" ON public.categories;
CREATE POLICY "Public write categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- C) banners
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read banners" ON public.banners;
CREATE POLICY "Public read banners" ON public.banners FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public write banners" ON public.banners;
CREATE POLICY "Public write banners" ON public.banners FOR ALL USING (true) WITH CHECK (true);

-- D) products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read products" ON public.products;
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public write products" ON public.products;
CREATE POLICY "Public write products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 6. HABILITAR SUPABASE REALTIME PARA TODAS AS TABELAS
-- ==============================================================================
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.store_config;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.banners;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- ==============================================================================
-- 7. BUCKETS PÚBLICOS NO SUPABASE STORAGE
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage (leitura pública e upload permitido)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('products', 'site-assets', 'banners'));

DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('products', 'site-assets', 'banners'));

DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id IN ('products', 'site-assets', 'banners'));

DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id IN ('products', 'site-assets', 'banners'));
