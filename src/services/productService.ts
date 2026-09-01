import { supabase } from '../lib/supabase';
import { Product } from '../types';

/**
 * Mapeia um registro bruto do Supabase para o modelo Product da aplicação
 */
export function mapSupabaseProduct(item: any): Product {
  const rawImg = (
    item.image || 
    item.image_url || 
    item.imageUrl || 
    item.photo_url || 
    (Array.isArray(item.images) && item.images[0]) || 
    (Array.isArray(item.galleryImages) && item.galleryImages[0]) || 
    ''
  ).trim();

  return {
    id: String(item.id),
    name: String(item.name || '').trim(),
    category: String(item.category || '').trim(),
    subcategory: item.subcategory || item.sub_category || undefined,
    price: Number(item.price) || 0,
    unitSuffix: item.unitSuffix || item.unit_suffix || '/Un',
    originalPrice: item.originalPrice ? Number(item.originalPrice) : undefined,
    imageUrl: rawImg,
    image: rawImg,
    image_url: rawImg,
    photo_url: rawImg,
    description: item.description || undefined,
    inStock: item.inStock !== false && item.in_stock !== false && item.active !== false,
    isCustomizable: item.isCustomizable ?? item.is_customizable ?? true,
    customizationPlaceholder: item.customizationPlaceholder || item.customization_placeholder || undefined,
    badge: item.badge || undefined,
    tags: item.tags || undefined,
  };
}

/**
 * Busca TODOS os produtos cadastrados no Supabase por qualquer usuário
 * sem filtros de usuário (sem eq('user_id') ou eq('created_by'))
 */
export async function fetchAllProducts(): Promise<{ data: Product[]; error: string | null }> {
  try {
    console.log('[productService] 🌐 Buscando TODOS os produtos do Supabase (select * order by created_at desc)...');

    // Consulta global sem restrição de usuário
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // Tentar sem o order caso a coluna created_at não exista ainda
      console.warn('[productService] Tentando busca geral sem ordenação:', error.message);
      const fallbackQuery = await supabase.from('products').select('*');
      
      if (fallbackQuery.error) {
        console.error('[productService] ❌ Erro ao buscar produtos:', fallbackQuery.error);
        return { data: [], error: fallbackQuery.error.message };
      }

      const mapped = (fallbackQuery.data || []).map(mapSupabaseProduct);
      return { data: mapped, error: null };
    }

    const mapped = (data || []).map(mapSupabaseProduct);
    console.log(`[productService] ✅ ${mapped.length} produtos carregados do Supabase.`);
    return { data: mapped, error: null };
  } catch (err: any) {
    console.error('[productService] ❌ Exceção ao consultar Supabase:', err);
    return { data: [], error: err.message || 'Falha na conexão com o Supabase' };
  }
}
