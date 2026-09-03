import { supabase } from '../lib/supabase';
import { Category } from '../types';
import { CATEGORIES as INITIAL_CATEGORIES } from '../data/categories';

export function mapSupabaseCategory(item: any): Category {
  let subcats: string[] = [];
  if (Array.isArray(item.subcategories)) {
    subcats = item.subcategories;
  } else if (typeof item.subcategories === 'string') {
    try {
      subcats = JSON.parse(item.subcategories);
    } catch {
      subcats = item.subcategories.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }

  return {
    id: String(item.id),
    name: String(item.name || '').trim(),
    icon: item.icon || 'Gift',
    subcategories: subcats,
  };
}

/**
 * 1. Busca todas as categorias do Supabase
 */
export async function fetchAllCategories(): Promise<{ data: Category[]; error: string | null }> {
  try {
    console.log('[categoryService] 🌐 Consultando tabela "categories" no Supabase...');
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('[categoryService] Tabela categories não encontrada ou erro no Supabase:', error.message);
      return { data: INITIAL_CATEGORIES, error: null };
    }

    const mapped = (data || []).map(mapSupabaseCategory);
    console.log(`[categoryService] ✅ ${mapped.length} categorias carregadas do Supabase.`);
    return { data: mapped.length > 0 ? mapped : INITIAL_CATEGORIES, error: null };
  } catch (err: any) {
    console.error('[categoryService] ❌ Exceção ao buscar categorias:', err);
    return { data: INITIAL_CATEGORIES, error: null };
  }
}

/**
 * 2. Cria ou insere categoria no Supabase
 */
export async function createCategoryInSupabase(category: Category): Promise<{ category: Category | null; error: string | null }> {
  const payload = {
    id: category.id,
    name: category.name.trim(),
    icon: category.icon || 'Gift',
    subcategories: category.subcategories || [],
  };

  try {
    console.log('[categoryService] 💾 Salvando categoria no Supabase:', payload);
    const { data, error } = await supabase
      .from('categories')
      .upsert([payload], { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[categoryService] ❌ Erro ao salvar categoria no Supabase:', error);
      return { category, error: error.message };
    }

    return { category: mapSupabaseCategory(data), error: null };
  } catch (err: any) {
    console.error('[categoryService] ❌ Exceção ao salvar categoria:', err);
    return { category, error: err.message };
  }
}

/**
 * 3. Atualiza categoria no Supabase
 */
export async function updateCategoryInSupabase(
  id: string,
  updates: Partial<Category>
): Promise<{ success: boolean; error: string | null }> {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.icon !== undefined) payload.icon = updates.icon;
  if (updates.subcategories !== undefined) payload.subcategories = updates.subcategories;

  try {
    console.log(`[categoryService] 🔄 Atualizando categoria "${id}" no Supabase:`, payload);
    const { error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error('[categoryService] ❌ Erro ao atualizar categoria:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[categoryService] ❌ Exceção ao atualizar categoria:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Exclui categoria do Supabase
 */
export async function deleteCategoryFromSupabase(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log(`[categoryService] 🗑️ Excluindo categoria "${id}" do Supabase...`);
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[categoryService] ❌ Erro ao excluir categoria:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[categoryService] ❌ Exceção ao excluir categoria:', err);
    return { success: false, error: err.message };
  }
}
