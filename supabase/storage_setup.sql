-- ==============================================================================
-- INICIALIZAÇÃO DO SUPABASE STORAGE: BUCKET 'products' & POLÍTICAS PÚBLICAS
-- Execute este script no SQL Editor do seu painel Supabase (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Criação do Bucket público 'products' (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  52428800, -- Limite de 50MB por arquivo
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'];

-- 2. Habilitar RLS na tabela de objetos do Storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas anteriores com o mesmo nome para evitar conflitos
DROP POLICY IF EXISTS "Public Select Products" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Products" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Products" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Products" ON storage.objects;

-- 4. Política de Leitura Pública (SELECT) para anon e authenticated
CREATE POLICY "Public Select Products"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'products');

-- 5. Política de Envio/Upload Público (INSERT) para anon e authenticated
CREATE POLICY "Public Insert Products"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'products');

-- 6. Política de Atualização Pública (UPDATE) para anon e authenticated
CREATE POLICY "Public Update Products"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- 7. Política de Exclusão Pública (DELETE) para anon e authenticated
CREATE POLICY "Public Delete Products"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'products');
