-- ==============================================================================
-- SCHEMA SUPABASE COMPLETO & REALTIME (Soumbolinho / Editáveis do Canva - SaaS Multi-tenant)
-- Execute este script no SQL Editor do seu Dashboard Supabase (supabase.com)
-- ==============================================================================

-- 1. TABELA DE LOJAS / ORGANIZAÇÕES (stores)
CREATE TABLE IF NOT EXISTS public.stores (
    id TEXT PRIMARY KEY DEFAULT ('store_' || substr(md5(random()::text), 1, 12)),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    custom_domain TEXT UNIQUE,
    domain_status TEXT DEFAULT 'pending_dns' CHECK (domain_status IN ('pending_dns', 'active', 'unconfigured', 'ativo', 'pendente')),
    theme_settings JSONB DEFAULT '{"primary_color": "#ff3399", "secondary_color": "#00a8e8"}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('active', 'suspended', 'trial')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    monthly_fee NUMERIC(10,2) DEFAULT 50.00,
    owner_name TEXT,
    owner_email TEXT,
    owner_phone TEXT,
    -- Colunas de compatibilidade direta com payloads externos / Lovable
    store_name TEXT,
    client_name TEXT,
    client_email TEXT,
    admin_password TEXT,
    clone_catalog BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir colunas caso a tabela já tenha sido criada anteriormente
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_subscription_status_check;
ALTER TABLE public.stores ADD CONSTRAINT stores_subscription_status_check 
    CHECK (subscription_status IN ('active', 'suspended', 'trial'));
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10,2) DEFAULT 50.00;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS admin_password TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS clone_catalog BOOLEAN DEFAULT TRUE;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT 'SeuWhatsApp';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp_display TEXT DEFAULT 'SeuWhatsAppWhatsApp';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT 'suamarcaaqui';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS slogan TEXT DEFAULT 'subtitulo da sua loja';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS address TEXT DEFAULT 'seuendereço';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS working_hours TEXT DEFAULT 'SEMPRE ABERTO';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS mp_access_token TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_matriz BOOLEAN DEFAULT FALSE;

-- Garantir que colunas não causem erro de NOT NULL caso a tabela já existisse
ALTER TABLE public.stores ALTER COLUMN admin_password DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN client_email DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN client_name DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN store_name DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN owner_email DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN owner_name DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN owner_phone DROP NOT NULL;

-- Atualizar CHECK constraint para aceitar tanto 'active' quanto 'ativo', 'pending_dns', 'pendente'
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_domain_status_check;
ALTER TABLE public.stores ADD CONSTRAINT stores_domain_status_check 
    CHECK (domain_status IN ('pending_dns', 'active', 'unconfigured', 'ativo', 'pendente'));

CREATE INDEX IF NOT EXISTS idx_stores_custom_domain ON public.stores (LOWER(custom_domain));
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores (slug);
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON public.stores (is_active);
CREATE INDEX IF NOT EXISTS idx_stores_subscription_status ON public.stores (subscription_status);
CREATE INDEX IF NOT EXISTS idx_stores_expires_at ON public.stores (expires_at);

-- Inserir loja base padrão
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
    '123456',
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

-- ==============================================================================
-- 0. CONFIGURAÇÃO DE STORAGE (BUCKETS PÚBLICOS DE IMAGENS E MÍDIAS)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('products', 'products', true),
    ('site-assets', 'site-assets', true),
    ('banners', 'banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;

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

-- 2. TABELA DE USUÁRIOS VINCULADOS ÀS LOJAS (store_users)
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

CREATE INDEX IF NOT EXISTS idx_store_users_store_id ON public.store_users (store_id);
CREATE INDEX IF NOT EXISTS idx_store_users_email ON public.store_users (LOWER(email));

-- 3. TABELA DE SUPER ADMINISTRADORES MASTER (master_admins)
CREATE TABLE IF NOT EXISTS public.master_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.master_admins (email)
VALUES ('admin@editaveisdocanva.com.br')
ON CONFLICT (email) DO NOTHING;

-- 4. TABELA DE CONFIGURAÇÕES DA LOJA (store_config)
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS mp_access_token TEXT;
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT;
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS benefit_cards JSONB;
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS theme_layout TEXT DEFAULT 'classic';
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS color_palette TEXT DEFAULT 'pink_pastel';
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#FF1493';
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS logo_url TEXT;
UPDATE public.store_config SET store_id = 'store_default' WHERE store_id IS NULL;

-- 4.1 TABELA DE CONFIGURAÇÕES DE SITE & LAYOUT (site_settings)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    theme_layout TEXT DEFAULT 'classic',
    color_palette TEXT DEFAULT 'pink_pastel',
    primary_color TEXT DEFAULT '#FF1493',
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS theme_layout TEXT DEFAULT 'classic';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS color_palette TEXT DEFAULT 'pink_pastel';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#FF1493';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS benefit_cards JSONB;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS display_whatsapp TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS slogan TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS business_hours TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS whatsapp_default_message TEXT;
ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS site_settings_store_id_key;
ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_store_id_key UNIQUE (store_id);
CREATE INDEX IF NOT EXISTS idx_site_settings_store_id ON public.site_settings (store_id);

-- 5. TABELA DE CATEGORIAS (categories)
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY DEFAULT ('cat_' || substr(md5(random()::text), 1, 10)),
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'Gift',
    subcategories JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.categories ALTER COLUMN id SET DEFAULT ('cat_' || substr(md5(random()::text), 1, 10));
UPDATE public.categories SET store_id = 'store_default' WHERE store_id IS NULL;

-- 6. TABELA DE BANNERS (banners)
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

ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
UPDATE public.banners SET store_id = 'store_default' WHERE store_id IS NULL;

-- 7. TABELA DE PRODUTOS (products)
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
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_digital BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS upsell_product_id TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS upsell_price NUMERIC(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS upsell_discount_percent NUMERIC(5,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bonuses JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bonus JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS detailed_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS benefits JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS testimonials JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS faq JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS guarantee_days INTEGER DEFAULT 7;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gallery_images JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS checkout_url TEXT;
UPDATE public.products SET store_id = 'store_default' WHERE store_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products (store_id);

-- 8. TABELA DE PEDIDOS (orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    product_id TEXT,
    product_name TEXT,
    delivery_url TEXT,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    payment_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
UPDATE public.orders SET store_id = 'store_default' WHERE store_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders (store_id);

-- 9. FUNÇÃO ATÔMICA DE CLONAGEM (clone_store_template)
CREATE OR REPLACE FUNCTION public.clone_store_template(
    source_store_id TEXT,
    target_store_id TEXT,
    target_store_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cat_record RECORD;
    new_cat_id TEXT;
    prod_record RECORD;
    new_prod_id TEXT;
    banner_record RECORD;
    config_record RECORD;
    store_record RECORD;
    mapped_cat_name TEXT;
    mapped_subcat_name TEXT;
    new_cat_name TEXT;
    new_subcategories JSONB;
    subcat_elem TEXT;
    subcat_idx INT;
    cloned_cats_count INT := 0;
    cloned_prods_count INT := 0;
    cloned_banners_count INT := 0;
BEGIN
    -- Clona Categorias Sequencialmente ('Categoria 1', 'Categoria 2', ...)
    -- e Subcategorias Sequencialmente ('Subcategoria 1', 'Subcategoria 2', ...)
    CREATE TEMP TABLE IF NOT EXISTS temp_cat_mapping (
        old_name TEXT,
        new_name TEXT
    ) ON COMMIT DROP;
    DELETE FROM temp_cat_mapping;

    CREATE TEMP TABLE IF NOT EXISTS temp_subcat_mapping (
        old_cat_name TEXT,
        old_subcat_name TEXT,
        new_subcat_name TEXT
    ) ON COMMIT DROP;
    DELETE FROM temp_subcat_mapping;

    FOR cat_record IN SELECT * FROM public.categories WHERE store_id = source_store_id ORDER BY id ASC LOOP
        new_cat_id := 'cat_' || substr(md5(random()::text), 1, 10);
        cloned_cats_count := cloned_cats_count + 1;
        new_cat_name := 'Categoria ' || cloned_cats_count;

        INSERT INTO temp_cat_mapping (old_name, new_name)
        VALUES (cat_record.name, new_cat_name);

        -- Gera novo array JSONB de subcategorias padronizadas: ["Subcategoria 1", "Subcategoria 2", ...]
        new_subcategories := '[]'::jsonb;
        subcat_idx := 0;

        IF cat_record.subcategories IS NOT NULL AND jsonb_typeof(cat_record.subcategories) = 'array' THEN
            FOR subcat_elem IN SELECT * FROM jsonb_array_elements_text(cat_record.subcategories) LOOP
                subcat_idx := subcat_idx + 1;
                new_subcategories := new_subcategories || to_jsonb('Subcategoria ' || subcat_idx);

                INSERT INTO temp_subcat_mapping (old_cat_name, old_subcat_name, new_subcat_name)
                VALUES (cat_record.name, subcat_elem, 'Subcategoria ' || subcat_idx);
            END LOOP;
        END IF;

        INSERT INTO public.categories (id, store_id, name, icon, subcategories, created_at)
        VALUES (new_cat_id, target_store_id, new_cat_name, cat_record.icon, new_subcategories, NOW());
    END LOOP;

    -- Clona Produtos (atualizando categoria para 'Categoria X' e subcategoria para 'Subcategoria Y')
    FOR prod_record IN SELECT * FROM public.products WHERE store_id = source_store_id LOOP
        new_prod_id := 'prod_' || substr(md5(random()::text), 1, 12);

        SELECT new_name INTO mapped_cat_name FROM temp_cat_mapping WHERE old_name = prod_record.category LIMIT 1;
        IF mapped_cat_name IS NULL THEN
            mapped_cat_name := 'Categoria 1';
        END IF;

        mapped_subcat_name := NULL;
        IF prod_record.subcategory IS NOT NULL AND prod_record.subcategory <> '' THEN
            SELECT new_subcat_name INTO mapped_subcat_name 
            FROM temp_subcat_mapping 
            WHERE old_cat_name = prod_record.category AND old_subcat_name = prod_record.subcategory 
            LIMIT 1;

            IF mapped_subcat_name IS NULL THEN
                SELECT new_subcat_name INTO mapped_subcat_name 
                FROM temp_subcat_mapping 
                WHERE old_subcat_name = prod_record.subcategory 
                LIMIT 1;
            END IF;

            IF mapped_subcat_name IS NULL THEN
                mapped_subcat_name := 'Subcategoria 1';
            END IF;
        END IF;

        INSERT INTO public.products (
            id, store_id, name, slug, category, subcategory, price, unit_suffix,
            image_url, image, photo_url, video_url, media_type, delivery_url,
            description, in_stock, is_customizable, customization_placeholder,
            badge, tags, upsell_product_id, upsell_price, upsell_discount_percent,
            is_active, created_at
        )
        VALUES (
            new_prod_id, target_store_id, prod_record.name, 
            prod_record.slug || '-' || substr(md5(random()::text), 1, 4),
            mapped_cat_name, mapped_subcat_name, prod_record.price, prod_record.unit_suffix,
            prod_record.image_url, prod_record.image, prod_record.photo_url, prod_record.video_url, prod_record.media_type, prod_record.delivery_url,
            prod_record.description, prod_record.in_stock, prod_record.is_customizable, prod_record.customization_placeholder,
            prod_record.badge, prod_record.tags, NULL, prod_record.upsell_price, prod_record.upsell_discount_percent,
            COALESCE(prod_record.is_active, true), NOW()
        );
        cloned_prods_count := cloned_prods_count + 1;
    END LOOP;

    -- Clona Banners
    FOR banner_record IN SELECT * FROM public.banners WHERE store_id = source_store_id LOOP
        INSERT INTO public.banners (
            id, store_id, type, image_url, alt_text, tag, title, subtitle,
            highlight_text, theme_color, link_url, "order", order_index, is_active, created_at
        )
        VALUES (
            'ban_' || substr(md5(random()::text), 1, 10),
            target_store_id, banner_record.type, banner_record.image_url, banner_record.alt_text, banner_record.tag, banner_record.title, banner_record.subtitle,
            banner_record.highlight_text, banner_record.theme_color, banner_record.link_url, banner_record."order", banner_record.order_index, banner_record.is_active, NOW()
        );
        cloned_banners_count := cloned_banners_count + 1;
    END LOOP;

    -- Configurações da Loja: Busca dados próprios da nova loja cadastrada em public.stores
    SELECT * INTO store_record FROM public.stores WHERE id = target_store_id LIMIT 1;
    INSERT INTO public.store_config (
        id, store_id, store_name, slogan, whatsapp_number, whatsapp_display,
        instagram, address, city, working_hours, min_order_value, updated_at
    )
    VALUES (
        'cfg_' || target_store_id,
        target_store_id,
        COALESCE(target_store_name, store_record.name, store_record.store_name, 'suamarcaaqui'),
        COALESCE(store_record.slogan, 'subtitulo da sua loja'),
        COALESCE(store_record.whatsapp_number, 'SeuWhatsApp'),
        COALESCE(store_record.whatsapp_display, 'SeuWhatsAppWhatsApp'),
        COALESCE(store_record.instagram, 'suamarcaaqui'),
        COALESCE(store_record.address, 'seuendereço'),
        'Brasil',
        COALESCE(store_record.working_hours, 'SEMPRE ABERTO'),
        0.00,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        store_name = EXCLUDED.store_name,
        slogan = EXCLUDED.slogan,
        whatsapp_number = EXCLUDED.whatsapp_number,
        whatsapp_display = EXCLUDED.whatsapp_display,
        instagram = EXCLUDED.instagram,
        address = EXCLUDED.address,
        working_hours = EXCLUDED.working_hours,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'target_store_id', target_store_id,
        'cloned_categories', cloned_cats_count,
        'cloned_products', cloned_prods_count,
        'cloned_banners', cloned_banners_count
    );
END;
$$;

-- 10. FUNÇÃO DE RENOVAÇÃO DE ASSINATURA (+30 DIAS)
CREATE OR REPLACE FUNCTION public.renew_store_subscription(
    p_store_id TEXT,
    p_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_exp TIMESTAMP WITH TIME ZONE;
    new_exp TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT expires_at INTO current_exp FROM public.stores WHERE id = p_store_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Loja não encontrada');
    END IF;

    -- Se ainda não venceu, soma aos dias restantes; se já venceu ou nulo, conta a partir de agora
    IF current_exp IS NOT NULL AND current_exp > NOW() THEN
        new_exp := current_exp + (p_days || ' days')::INTERVAL;
    ELSE
        new_exp := NOW() + (p_days || ' days')::INTERVAL;
    END IF;

    UPDATE public.stores
    SET 
        expires_at = new_exp,
        subscription_status = 'active',
        is_active = true,
        updated_at = NOW()
    WHERE id = p_store_id;

    RETURN jsonb_build_object(
        'success', true,
        'store_id', p_store_id,
        'previous_expires_at', current_exp,
        'new_expires_at', new_exp,
        'subscription_status', 'active'
    );
END;
$$;

-- 10.1. FUNÇÃO DE EXTENSÃO DE TESTE GRATUITO (TRIAL)
CREATE OR REPLACE FUNCTION public.extend_store_trial(
    p_store_id TEXT,
    p_days INT DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_exp TIMESTAMP WITH TIME ZONE;
    new_exp TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT expires_at INTO current_exp FROM public.stores WHERE id = p_store_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Loja não encontrada');
    END IF;

    -- Se ainda não venceu, soma aos dias restantes; se já venceu ou nulo, conta a partir de agora
    IF current_exp IS NOT NULL AND current_exp > NOW() THEN
        new_exp := current_exp + (p_days || ' days')::INTERVAL;
    ELSE
        new_exp := NOW() + (p_days || ' days')::INTERVAL;
    END IF;

    UPDATE public.stores
    SET 
        expires_at = new_exp,
        subscription_status = 'trial',
        is_active = true,
        updated_at = NOW()
    WHERE id = p_store_id;

    RETURN jsonb_build_object(
        'success', true,
        'store_id', p_store_id,
        'previous_expires_at', current_exp,
        'new_expires_at', new_exp,
        'subscription_status', 'trial'
    );
END;
$$;

-- 10.5. TRIGGERS DE COMPATIBILIDADE E AUTO-SYNC PARA INSERTS DIRETOS / LOVABLE
CREATE OR REPLACE FUNCTION public.handle_store_before_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Sincronizar nome da loja (name <-> store_name)
    IF NEW.name IS NULL AND NEW.store_name IS NOT NULL THEN
        NEW.name := NEW.store_name;
    ELSIF NEW.store_name IS NULL AND NEW.name IS NOT NULL THEN
        NEW.store_name := NEW.name;
    END IF;

    -- Gerar slug automaticamente caso não informado
    IF NEW.slug IS NULL OR TRIM(NEW.slug) = '' THEN
        NEW.slug := LOWER(REGEXP_REPLACE(COALESCE(NEW.store_name, NEW.name, 'loja-' || substr(md5(random()::text), 1, 6)), '[^a-z0-9]+', '', 'g'));
    END IF;

    -- Sincronizar dados do cliente (owner_name <-> client_name)
    IF NEW.owner_name IS NULL AND NEW.client_name IS NOT NULL THEN
        NEW.owner_name := NEW.client_name;
    ELSIF NEW.client_name IS NULL AND NEW.owner_name IS NOT NULL THEN
        NEW.client_name := NEW.owner_name;
    END IF;

    -- Sincronizar e-mail do cliente (owner_email <-> client_email)
    IF NEW.owner_email IS NULL AND NEW.client_email IS NOT NULL THEN
        NEW.owner_email := LOWER(TRIM(NEW.client_email));
    ELSIF NEW.client_email IS NULL AND NEW.owner_email IS NOT NULL THEN
        NEW.client_email := LOWER(TRIM(NEW.owner_email));
    END IF;

    -- Garantir domínio padrão caso vazio
    IF NEW.custom_domain IS NULL OR TRIM(NEW.custom_domain) = '' THEN
        NEW.custom_domain := NEW.slug || '.editaveisdocanva.com.br';
    END IF;

    -- Garantir expiração e mensalidade padrão (7 dias gratuitos em Trial para novas lojas)
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at := NOW() + INTERVAL '7 days';
    END IF;
    IF NEW.monthly_fee IS NULL THEN
        NEW.monthly_fee := 50.00;
    END IF;
    IF NEW.subscription_status IS NULL THEN
        NEW.subscription_status := 'trial';
    END IF;
    IF NEW.domain_status IS NULL THEN
        NEW.domain_status := 'ativo';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_store_before_insert ON public.stores;
CREATE TRIGGER trg_handle_store_before_insert
BEFORE INSERT OR UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.handle_store_before_insert();

-- Trigger para auto-cadastrar usuário e clonar catálogo caso inserido diretamente via Supabase / Lovable
CREATE OR REPLACE FUNCTION public.handle_store_after_insert_clone()
RETURNS TRIGGER AS $$
BEGIN
    -- Se tiver admin_password e client_email/owner_email, cria o usuário na tabela store_users automaticamente
    IF NEW.id != 'store_default' AND COALESCE(NEW.owner_email, NEW.client_email) IS NOT NULL THEN
        INSERT INTO public.store_users (store_id, email, password_hash, role)
        VALUES (
            NEW.id,
            LOWER(TRIM(COALESCE(NEW.owner_email, NEW.client_email))),
            COALESCE(NEW.admin_password, 'admin'),
            'owner'
        )
        ON CONFLICT (store_id, email) DO NOTHING;
    END IF;

    -- Se clone_catalog for true (ou não informado), dispara clone_store_template
    IF NEW.id != 'store_default' AND (NEW.clone_catalog IS TRUE OR NEW.clone_catalog IS NULL) THEN
        BEGIN
            PERFORM public.clone_store_template('store_default', NEW.id, NEW.name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Aviso ao clonar catálogo para %: %', NEW.id, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_store_after_insert_clone ON public.stores;
CREATE TRIGGER trg_handle_store_after_insert_clone
AFTER INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.handle_store_after_insert_clone();

-- 11. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active stores" ON public.stores;
CREATE POLICY "Public read active stores" ON public.stores FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public write stores" ON public.stores;
CREATE POLICY "Public write stores" ON public.stores FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.store_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access store_users" ON public.store_users;
CREATE POLICY "Public access store_users" ON public.store_users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.master_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access master_admins" ON public.master_admins;
CREATE POLICY "Public access master_admins" ON public.master_admins FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read products" ON public.products;
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public write products" ON public.products;
CREATE POLICY "Public write products" ON public.products FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public write categories" ON public.categories;
CREATE POLICY "Public write categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read banners" ON public.banners;
CREATE POLICY "Public read banners" ON public.banners FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public write banners" ON public.banners;
CREATE POLICY "Public write banners" ON public.banners FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read store_config" ON public.store_config;
CREATE POLICY "Public read store_config" ON public.store_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public write store_config" ON public.store_config;
CREATE POLICY "Public write store_config" ON public.store_config FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read orders" ON public.orders;
CREATE POLICY "Public read orders" ON public.orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public write orders" ON public.orders;
CREATE POLICY "Public write orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;
CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public write site_settings" ON public.site_settings;
CREATE POLICY "Public write site_settings" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);

-- 11. SUPABASE REALTIME
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.store_users;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
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
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- =========================================================================
-- 12. MIGRAÇÕES DE BANCO (EXECUTE NO SQL EDITOR DO SUPABASE SE NECESSÁRIO)
-- =========================================================================
-- Migração 12.1: Trial de 7 dias
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_subscription_status_check;
ALTER TABLE public.stores ADD CONSTRAINT stores_subscription_status_check CHECK (subscription_status IN ('active', 'suspended', 'trial'));
ALTER TABLE public.stores ALTER COLUMN subscription_status SET DEFAULT 'trial';
ALTER TABLE public.stores ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '7 days');

-- Migração 12.2: Campos de layout, textos e benefit_cards em site_settings
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS benefit_cards JSONB;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS display_whatsapp TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS slogan TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS business_hours TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS whatsapp_default_message TEXT;
ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS site_settings_store_id_key;
ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_store_id_key UNIQUE (store_id);

