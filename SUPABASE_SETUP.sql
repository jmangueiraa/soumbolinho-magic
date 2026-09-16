-- ==============================================================================
-- SCRIPT DEFINITIVO DE CORREÇÃO SUPABASE (Soumbolinho / Editáveis do Canva)
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/mbwxubnwaeywstnmlrqg/sql
-- ==============================================================================

-- 1. BUCKETS DE STORAGE (IMAGENS DE PRODUTOS, BANNERS E ASSETS)
-- Cria os buckets públicos para upload de fotos e mídias
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('products', 'products', true),
    ('site-assets', 'site-assets', true),
    ('banners', 'banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de acesso total para o Storage
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Storage Select" ON storage.objects;
    DROP POLICY IF EXISTS "Public Storage Insert" ON storage.objects;
    DROP POLICY IF EXISTS "Public Storage Update" ON storage.objects;
    DROP POLICY IF EXISTS "Public Storage Delete" ON storage.objects;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Public Storage Select" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "Public Storage Insert" ON storage.objects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Storage Update" ON storage.objects FOR UPDATE USING (true);
CREATE POLICY "Public Storage Delete" ON storage.objects FOR DELETE USING (true);


-- 2. TABELA DE LOJAS (stores)
CREATE TABLE IF NOT EXISTS public.stores (
    id TEXT PRIMARY KEY DEFAULT ('store_' || substr(md5(random()::text), 1, 12)),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    custom_domain TEXT UNIQUE,
    domain_status TEXT DEFAULT 'pending_dns',
    theme_settings JSONB DEFAULT '{"primary_color": "#ff3399", "secondary_color": "#00a8e8"}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    subscription_status TEXT DEFAULT 'active',
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '365 days'),
    monthly_fee NUMERIC(10,2) DEFAULT 50.00,
    owner_name TEXT,
    owner_email TEXT,
    owner_phone TEXT,
    store_name TEXT,
    client_name TEXT,
    client_email TEXT,
    admin_password TEXT,
    clone_catalog BOOLEAN DEFAULT TRUE,
    whatsapp_number TEXT DEFAULT 'SeuWhatsApp',
    whatsapp_display TEXT DEFAULT 'SeuWhatsAppWhatsApp',
    instagram TEXT DEFAULT 'suamarcaaqui',
    slogan TEXT DEFAULT 'subtitulo da sua loja',
    address TEXT DEFAULT 'seuendereço',
    working_hours TEXT DEFAULT 'SEMPRE ABERTO',
    mp_access_token TEXT,
    telegram_bot_token TEXT,
    telegram_chat_id TEXT,
    is_matriz BOOLEAN DEFAULT FALSE,
    layout_style TEXT DEFAULT 'classic',
    primary_color TEXT DEFAULT '#FF1493',
    color_palette TEXT DEFAULT 'pink_pastel',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS layout_style TEXT DEFAULT 'classic';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#FF1493';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS color_palette TEXT DEFAULT 'pink_pastel';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS store_features JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS main_cta_text TEXT DEFAULT 'Toda loja com Download imediato!';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS main_cta_link TEXT DEFAULT '';

-- Remove restrições NOT NULL que possam ter vindo de esquemas anteriores
ALTER TABLE public.stores ALTER COLUMN admin_password DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN client_email DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN client_name DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN store_name DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN owner_email DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN owner_name DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN owner_phone DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN custom_domain DROP NOT NULL;

-- Inserir / Atualizar loja base
INSERT INTO public.stores (
    id, name, slug, custom_domain, domain_status, is_active,
    subscription_status, expires_at, monthly_fee, owner_name, owner_email,
    admin_password, store_name, client_name, client_email
)
VALUES (
    'store_default',
    'Editáveis do Canva',
    'editaveis-do-canva',
    'editaveisdocanva.com.br',
    'active',
    true,
    'active',
    '2099-12-31 23:59:59+00',
    0.00,
    'Super Admin',
    'admin@editaveisdocanva.com.br',
    'admin123',
    'Editáveis do Canva',
    'Super Admin',
    'admin@editaveisdocanva.com.br'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    custom_domain = COALESCE(public.stores.custom_domain, EXCLUDED.custom_domain),
    slug = COALESCE(public.stores.slug, EXCLUDED.slug),
    subscription_status = 'active',
    expires_at = '2099-12-31 23:59:59+00';


-- 3. TABELA DE CATEGORIAS (categories)
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY DEFAULT ('cat_' || substr(md5(random()::text), 1, 10)),
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'Gift',
    subcategories JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Gift';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS subcategories JSONB DEFAULT '[]'::jsonb;


-- 4. TABELA DE PRODUTOS (products)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    unit_suffix TEXT DEFAULT '/Un',
    image_url TEXT,
    image TEXT,
    photo_url TEXT,
    video_url TEXT,
    media_type TEXT,
    is_digital BOOLEAN DEFAULT FALSE,
    delivery_url TEXT,
    description TEXT,
    in_stock BOOLEAN DEFAULT TRUE,
    is_customizable BOOLEAN DEFAULT TRUE,
    customization_placeholder TEXT,
    badge TEXT,
    tags TEXT[],
    upsell_product_id TEXT,
    upsell_price NUMERIC(10,2),
    upsell_discount_percent NUMERIC(5,2),
    detailed_description TEXT,
    benefits JSONB,
    testimonials JSONB,
    faq JSONB,
    guarantee_days INTEGER DEFAULT 7,
    gallery_images JSONB,
    bonuses JSONB,
    checkout_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir colunas essenciais caso a tabela já existisse incompleta
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit_suffix TEXT DEFAULT '/Un';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_digital BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_customizable BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS customization_placeholder TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS upsell_product_id TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS upsell_price NUMERIC(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS upsell_discount_percent NUMERIC(5,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS detailed_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS benefits JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS testimonials JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS faq JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS guarantee_days INTEGER DEFAULT 7;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gallery_images JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bonuses JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS checkout_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(8,3);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS height_cm NUMERIC(8,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS width_cm NUMERIC(8,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS length_cm NUMERIC(8,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS custom_shipping_price NUMERIC(10,2);


-- 5. TABELA DE BANNERS (banners)
CREATE TABLE IF NOT EXISTS public.banners (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
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
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 6. TABELA DE CONFIGURAÇÕES DA LOJA (store_config)
CREATE TABLE IF NOT EXISTS public.store_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
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
    telegram_bot_token TEXT,
    telegram_chat_id TEXT,
    benefit_cards JSONB,
    theme_layout TEXT DEFAULT 'classic',
    color_palette TEXT DEFAULT 'pink_pastel',
    primary_color TEXT DEFAULT '#FF1493',
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 7. TABELA DE CONFIGURAÇÕES DE SITE & LAYOUT (site_settings)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    theme_layout TEXT DEFAULT 'classic',
    color_palette TEXT DEFAULT 'pink_pastel',
    primary_color TEXT DEFAULT '#FF1493',
    logo_url TEXT,
    benefit_cards JSONB,
    whatsapp TEXT,
    display_whatsapp TEXT,
    instagram TEXT,
    slogan TEXT,
    address TEXT,
    business_hours TEXT,
    whatsapp_default_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 8. TABELA DE PEDIDOS (orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT ('ord_' || substr(md5(random()::text), 1, 10)),
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    items JSONB,
    total NUMERIC(10,2) DEFAULT 0.00,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'novo',
    payment_id TEXT,
    shipping_cost NUMERIC(10,2) DEFAULT 0.00,
    shipping_method TEXT,
    delivery_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_method TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- 8.1 TABELA DE VISITAS & ANALYTICS EM TEMPO REAL (store_visits)
CREATE TABLE IF NOT EXISTS public.store_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    path TEXT DEFAULT '/',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 9. TABELA DE USUÁRIOS DE LOJAS (store_users) E ADMINS
CREATE TABLE IF NOT EXISTS public.store_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID,
    email TEXT NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (store_id, email)
);

CREATE TABLE IF NOT EXISTS public.master_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.master_admins (email)
VALUES ('admin@editaveisdocanva.com.br')
ON CONFLICT (email) DO NOTHING;


-- 9.1 TABELA DE CUPONS DE DESCONTO E PROMOÇÕES (coupons)
CREATE TABLE IF NOT EXISTS public.coupons (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    min_order_value NUMERIC(10,2) DEFAULT 0.00,
    max_uses INTEGER,
    uses_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 10. SEGURANÇA E POLÍTICAS RLS (Row Level Security)
-- Habilita RLS e libera acesso público completo para a aplicação
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public stores access" ON public.stores;
CREATE POLICY "Public stores access" ON public.stores FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public products access" ON public.products;
CREATE POLICY "Public products access" ON public.products FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public categories access" ON public.categories;
CREATE POLICY "Public categories access" ON public.categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public banners access" ON public.banners;
CREATE POLICY "Public banners access" ON public.banners FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public store_config access" ON public.store_config;
CREATE POLICY "Public store_config access" ON public.store_config FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public site_settings access" ON public.site_settings;
CREATE POLICY "Public site_settings access" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public orders access" ON public.orders;
CREATE POLICY "Public orders access" ON public.orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.store_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public store_visits access" ON public.store_visits;
CREATE POLICY "Public store_visits access" ON public.store_visits FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.store_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public store_users access" ON public.store_users;
CREATE POLICY "Public store_users access" ON public.store_users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.master_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public master_admins access" ON public.master_admins;
CREATE POLICY "Public master_admins access" ON public.master_admins FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public coupons access" ON public.coupons;
CREATE POLICY "Public coupons access" ON public.coupons FOR ALL USING (true) WITH CHECK (true);


-- 11. HABILITAR SUPABASE REALTIME
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.stores; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.products; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.categories; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.banners; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.store_config; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.store_visits; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;


-- 12. RECARREGAR O SCHEMA CACHE DA API IMEDIATAMENTE
NOTIFY pgrst, 'reload schema';
