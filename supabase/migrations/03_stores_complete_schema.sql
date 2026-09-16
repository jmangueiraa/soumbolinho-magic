-- ==============================================================================
-- CORREÇÃO COMPLETA: TABELA STORES NO SUPABASE (MULTI-TENANT & TODAS AS COLUNAS)
-- Execute este script no SQL Editor do Supabase (supabase.com)
-- ==============================================================================

-- 1. Garante que a tabela stores exista
CREATE TABLE IF NOT EXISTS public.stores (
    id TEXT PRIMARY KEY DEFAULT ('store_' || substr(md5(random()::text), 1, 12)),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Adiciona TODAS as colunas do formulário 'Cadastrar Nova Loja' e do SaaS
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS domain_status TEXT DEFAULT 'pending_dns';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_matriz BOOLEAN DEFAULT FALSE;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days');
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10,2) DEFAULT 50.00;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS clone_catalog BOOLEAN DEFAULT TRUE;

-- Dados do Cliente / Dono da Loja
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS admin_password TEXT DEFAULT 'admin';

-- Informações e Contatos da Loja (slogan, instagram, address, working_hours, whatsapp)
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT 'SeuWhatsApp';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp_display TEXT DEFAULT 'SeuWhatsAppWhatsApp';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT 'suamarcaaqui';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS slogan TEXT DEFAULT 'subtitulo da sua loja';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS address TEXT DEFAULT 'seuendereço';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS working_hours TEXT DEFAULT 'SEMPRE ABERTO';

-- Integrações e APIs (Mercado Pago, Telegram, WhatsApp API)
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS mp_access_token TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp_api_provider TEXT DEFAULT 'evolution';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp_api_url TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp_api_token TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp_notify_phone TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp_api_enabled BOOLEAN DEFAULT FALSE;

-- Aparência, Cores, Banners e Layout
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '/ajpstore-logo.png';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS only_logo BOOLEAN DEFAULT FALSE;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS onlyLogo BOOLEAN DEFAULT FALSE;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS layout_style TEXT DEFAULT 'classic';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS theme_layout TEXT DEFAULT 'classic';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#FF1493';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#00a8e8';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS color_palette TEXT DEFAULT 'pink_pastel';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS banner_desktop TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS banner_mobile TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS banners_config JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS buttons_config JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS benefit_cards JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS store_features JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS main_cta_text TEXT DEFAULT 'Toda loja com Download imediato!';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS main_cta_link TEXT DEFAULT '';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS theme_settings JSONB DEFAULT '{"primary_color": "#FF1493", "secondary_color": "#00a8e8"}'::jsonb;

-- Remover restrição de NOT NULL de campos que possam travar inserções
ALTER TABLE public.stores ALTER COLUMN admin_password DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN client_email DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN client_name DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN store_name DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN owner_email DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN owner_name DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN owner_phone DROP NOT NULL;

-- 3. Índices essenciais para velocidade de busca multi-tenant
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores (slug);
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain ON public.stores (LOWER(custom_domain));
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON public.stores (is_active);
CREATE INDEX IF NOT EXISTS idx_stores_subscription_status ON public.stores (subscription_status);
CREATE INDEX IF NOT EXISTS idx_stores_expires_at ON public.stores (expires_at);

-- 4. Permissões de RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public stores access" ON public.stores;
CREATE POLICY "Public stores access" ON public.stores FOR ALL USING (true) WITH CHECK (true);

-- 5. FORÇA A RECARGA IMEDIATA DO SCHEMA CACHE DO POSTGREST NO SUPABASE
NOTIFY pgrst, 'reload schema';
