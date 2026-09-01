-- ==============================================================================
-- SCHEMA E POLÍTICAS DE ACESSO (RLS) PARA A TABELA 'products' NO SUPABASE
-- ==============================================================================

-- 1. Criação da tabela 'products' (caso ainda não exista)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  unit_suffix TEXT DEFAULT '/Un',
  image_url TEXT,
  image TEXT,
  description TEXT,
  in_stock BOOLEAN DEFAULT true,
  badge TEXT,
  is_customizable BOOLEAN DEFAULT true,
  customization_placeholder TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilita Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas para evitar conflitos de nomes duplicados
DROP POLICY IF EXISTS "Permitir leitura publica de produtos" ON products;
DROP POLICY IF EXISTS "Permitir insercao de produtos" ON products;
DROP POLICY IF EXISTS "Permitir atualizacao de produtos" ON products;
DROP POLICY IF EXISTS "Permitir exclusao de produtos" ON products;

-- 4. Política de Leitura Pública (SELECT)
CREATE POLICY "Permitir leitura publica de produtos" 
ON products FOR SELECT 
USING (true);

-- 5. Política de Inserção Pública (INSERT)
CREATE POLICY "Permitir insercao de produtos" 
ON products FOR INSERT 
WITH CHECK (true);

-- 6. Política de Atualização Pública (UPDATE)
CREATE POLICY "Permitir atualizacao de produtos" 
ON products FOR UPDATE 
USING (true);

-- 7. Política de Exclusão Pública (DELETE)
CREATE POLICY "Permitir exclusao de produtos" 
ON products FOR DELETE 
USING (true);

-- 8. Habilitar Realtime para a tabela 'products'
ALTER PUBLICATION supabase_realtime ADD TABLE products;
