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
    store_id: item.store_id || undefined,
    name: String(item.name || '').trim(),
    icon: item.icon || 'Gift',
    subcategories: subcats,
  };
}

const MATRIZ_CATEGORY_NAMES = new Set([
  'kits personalizados',
  'apliques & adesivos',
  'sacolinhas',
  'itens para centro de mesa',
  'formas & porta bis duplo',
  'livrinho de colorir & tags de agradecimento',
  'lembrancinhas',
  'decoração de mesa e parede'
]);

/**
 * 1. Busca todas as categorias do Supabase (filtrado estritamente por loja)
 * Garante que lojas clientes nunca herdem categorias ou subcategorias da loja matriz.
 * Se storeId não estiver disponível, vier vazio ou for '__resolving_tenant__', retorna [] imediatamente.
 */
export async function fetchAllCategories(storeId?: string): Promise<{ data: Category[]; error: string | null }> {
  try {
    const targetStoreId = (storeId || '').trim();

    // REQUISITO RIGOROSO: Se o storeId não estiver disponível, vier vazio ou for '__resolving_tenant__',
    // retorna [] imediatamente, NUNCA buscando categorias globais ou da matriz como fallback.
    if (!targetStoreId || targetStoreId === '__resolving_tenant__') {
      console.log('[categoryService] ⏸️ store_id não fornecido ou em resolução de tenant. Retornando lista vazia [].');
      return { data: [], error: null };
    }

    const isBaseStore = 
      targetStoreId === 'suamarcaaqui' || 
      targetStoreId === 'store_default';

    console.log(`[categoryService] 🌐 Consultando tabela "categories" no Supabase (store_id: ${targetStoreId} | isBase: ${isBaseStore})...`);
    
    let query = supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (isBaseStore) {
      query = query.or('store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null');
    } else if (targetStoreId === 'store_editaveisdocanva' || targetStoreId === 'matriz' || targetStoreId === 'editaveisdocanva') {
      query = query.or('store_id.eq.store_editaveisdocanva,store_id.eq.matriz');
    } else {
      // LOJAS CLIENTES: Filtro 100% estrito na própria loja, NUNCA incluindo store_id.is.null
      query = query.eq('store_id', targetStoreId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[categoryService] Erro ao buscar categorias no Supabase:', error.message);
      return { data: [], error: error.message };
    }

    let mapped = (data || []).map(mapSupabaseCategory);

    // Se for loja cliente (não-matriz), inspeciona e sanitiza os dados
    if (!isBaseStore && targetStoreId) {
      // 1. Caso a loja não possua categorias cadastradas ainda (recém-criada ou clonagem pendente),
      // inicializa automaticamente com o padrão sequencial exigido
      if (mapped.length === 0) {
        console.log(`[categoryService] 🆕 Loja cliente "${targetStoreId}" sem categorias. Inicializando categorias sequenciais padrão...`);
        const defaultCategories: Category[] = [
          { id: `cat_${targetStoreId}_1`, store_id: targetStoreId, name: 'Categoria 1', icon: 'Gift', subcategories: ['Subcategoria 1', 'Subcategoria 2'] },
          { id: `cat_${targetStoreId}_2`, store_id: targetStoreId, name: 'Categoria 2', icon: 'Layers', subcategories: ['Subcategoria 1'] },
          { id: `cat_${targetStoreId}_3`, store_id: targetStoreId, name: 'Categoria 3', icon: 'Sparkles', subcategories: ['Subcategoria 1', 'Subcategoria 2', 'Subcategoria 3'] },
        ];

        // Grava no Supabase em background para persistência definitiva
        supabase.from('categories').insert(defaultCategories.map(c => ({
          id: c.id,
          store_id: targetStoreId,
          name: c.name,
          icon: c.icon,
          subcategories: c.subcategories,
          created_at: new Date().toISOString()
        }))).then(({ error: insertErr }) => {
          if (insertErr) console.warn('[categoryService] Aviso ao auto-inserir categorias padrão:', insertErr.message);
        });

        return { data: defaultCategories, error: null };
      }

      // 2. Se a loja já tiver categorias, mas alguma delas tiver vindo com o nome da matriz
      // (ex: lojas geradas anteriormente ou clonadas pelo trigger do banco antigo),
      // sanitiza IMEDIATAMENTE os nomes para "Categoria 1", "Categoria 2" / "Subcategoria 1", etc.
      const hasMatrizCategory = mapped.some(c => MATRIZ_CATEGORY_NAMES.has(c.name.trim().toLowerCase()));
      if (hasMatrizCategory) {
        console.log(`[categoryService] 🧹 Detectados nomes da matriz na loja "${targetStoreId}". Sanitizando para padrão sequencial...`);
        const sanitizedList: Category[] = [];
        const catMap: Record<string, string> = {};
        const subMap: Record<string, string> = {};

        mapped.forEach((c, idx) => {
          const newName = `Categoria ${idx + 1}`;
          catMap[c.name] = newName;

          const newSubcats = (c.subcategories || []).map((sub, sIdx) => {
            const newSubName = `Subcategoria ${sIdx + 1}`;
            subMap[`${c.name}:::${sub.toLowerCase()}`] = newSubName;
            subMap[sub.toLowerCase()] = newSubName;
            return newSubName;
          });

          const sanitizedCat: Category = {
            ...c,
            name: newName,
            subcategories: newSubcats
          };
          sanitizedList.push(sanitizedCat);

          // Atualiza a categoria no Supabase
          supabase.from('categories').update({
            name: newName,
            subcategories: newSubcats
          }).eq('id', c.id).then();
        });

        // Atualiza os produtos da loja no Supabase em background
        supabase.from('products').select('id, category, subcategory').eq('store_id', targetStoreId).then(({ data: prods }) => {
          if (prods && prods.length > 0) {
            prods.forEach(p => {
              const newCat = catMap[p.category] || p.category;
              let newSub = p.subcategory;
              if (p.subcategory) {
                newSub = subMap[`${p.category}:::${p.subcategory.toLowerCase()}`] || subMap[p.subcategory.toLowerCase()] || 'Subcategoria 1';
              }
              if (newCat !== p.category || newSub !== p.subcategory) {
                supabase.from('products').update({ category: newCat, subcategory: newSub }).eq('id', p.id).then();
              }
            });
          }
        });

        mapped = sanitizedList;
      }
    }

    console.log(`[categoryService] ✅ ${mapped.length} categorias carregadas diretamente do Supabase para store "${targetStoreId}".`);
    return { data: mapped, error: null };
  } catch (err: any) {
    console.error('[categoryService] ❌ Exceção ao buscar categorias:', err);
    return { data: [], error: err.message };
  }
}

/**
 * 2. Cria ou insere categoria no Supabase vinculada à loja
 */
export async function createCategoryInSupabase(
  category: Category,
  storeId?: string
): Promise<{ category: Category | null; error: string | null }> {
  const targetStoreId = (storeId || category.store_id || '').trim();
  if (!targetStoreId || targetStoreId === '__resolving_tenant__') {
    console.warn('[categoryService] ❌ Tentativa de criar categoria sem store_id válido.');
    return { category: null, error: 'store_id obrigatório e válido para criar categoria.' };
  }
  const payload = {
    id: category.id,
    store_id: targetStoreId,
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
      return { category: null, error: error.message };
    }

    return { category: mapSupabaseCategory(data), error: null };
  } catch (err: any) {
    console.error('[categoryService] ❌ Exceção ao salvar categoria:', err);
    return { category: null, error: err.message };
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

    console.log(`[categoryService] ✅ Categoria "${id}" excluída com sucesso do Supabase.`);
    return { success: true, error: null };
  } catch (err: any) {
    console.error('[categoryService] ❌ Exceção ao excluir categoria:', err);
    return { success: false, error: err.message };
  }
}
