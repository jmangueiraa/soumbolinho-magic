import { supabase } from '../lib/supabase';
import { BannerSlide } from '../types';

export function mapSupabaseBanner(item: any): BannerSlide {
  return {
    id: String(item.id),
    store_id: item.store_id || undefined,
    type: item.type === 'text' ? 'text' : 'image',
    imageUrl: item.image_url || item.imageUrl || '',
    altText: item.alt_text || item.altText || undefined,
    tag: item.tag || undefined,
    title: item.title || undefined,
    subtitle: item.subtitle || undefined,
    highlightText: item.highlight_text || item.highlightText || undefined,
    themeColor: item.theme_color || item.themeColor || 'pink',
    linkUrl: item.link_url || item.linkUrl || undefined,
    order: Number(item.order_index ?? item.order ?? item.display_order ?? 0),
    isActive: item.is_active !== false && item.isActive !== false,
  };
}

/**
 * 1. Busca todos os banners cadastrados no Supabase (filtrado por loja)
 * NUNCA recarrega imagens mock/demo se a tabela estiver vazia (0 registros).
 */
export async function fetchAllBanners(storeId?: string): Promise<{ data: BannerSlide[]; error: string | null }> {
  try {
    const targetStoreId = (storeId || '').trim();

    // REQUISITO RIGOROSO: Se o storeId não estiver disponível, vier vazio ou for '__resolving_tenant__',
    // retorna [] imediatamente, NUNCA buscando banners globais ou da matriz como fallback.
    if (!targetStoreId || targetStoreId === '__resolving_tenant__') {
      console.log('[bannerService] ⏸️ store_id não fornecido ou em resolução de tenant. Retornando lista vazia [].');
      return { data: [], error: null };
    }

    console.log(`[bannerService] 🌐 Buscando banners no Supabase (store_id: ${targetStoreId})...`);
    let query = supabase
      .from('banners')
      .select('*');

    const isBaseStore = 
      targetStoreId === 'suamarcaaqui' || 
      targetStoreId === 'store_default';

    if (isBaseStore) {
      query = query.or('store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null');
    } else if (targetStoreId === 'store_editaveisdocanva' || targetStoreId === 'matriz' || targetStoreId === 'editaveisdocanva') {
      query = query.or('store_id.eq.store_editaveisdocanva,store_id.eq.matriz,store_id.eq.editaveisdocanva');
    } else {
      query = query.eq('store_id', targetStoreId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[bannerService] Erro ao buscar banners no Supabase:', error.message);
      return { data: [], error: error.message };
    }

    const mapped = (data || [])
      .map(mapSupabaseBanner)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    console.log(`[bannerService] ✅ ${mapped.length} banner(s) carregado(s) do Supabase.`);
    return { data: mapped, error: null };
  } catch (err: any) {
    console.error('[bannerService] ❌ Exceção ao consultar banners:', err);
    return { data: [], error: err.message || 'Falha de conexão com o Supabase' };
  }
}

/**
 * 2. Cria ou insere um banner no Supabase vinculado à loja
 */
export async function createBannerInSupabase(
  bannerData: Omit<BannerSlide, 'id'>,
  storeId?: string
): Promise<{ banner: BannerSlide | null; error: string | null }> {
  const targetStoreId = (storeId || bannerData.store_id || '').trim();
  if (!targetStoreId || targetStoreId === '__resolving_tenant__') {
    console.warn('[bannerService] ❌ Tentativa de criar banner sem store_id válido.');
    return { banner: null, error: 'store_id obrigatório e válido para criar banner.' };
  }
  const newId = `banner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  const payload: any = {
    id: newId,
    store_id: targetStoreId,
    type: bannerData.type || 'image',
    image_url: bannerData.imageUrl || null,
    alt_text: bannerData.altText || null,
    tag: bannerData.tag || null,
    title: bannerData.title || null,
    subtitle: bannerData.subtitle || null,
    highlight_text: bannerData.highlightText || null,
    theme_color: bannerData.themeColor || 'pink',
    link_url: bannerData.linkUrl || null,
    order: Number(bannerData.order ?? 0),
    is_active: Boolean(bannerData.isActive ?? true),
  };

  try {
    console.log('[bannerService] 💾 Salvando banner no Supabase:', payload);
    const { data, error } = await supabase
      .from('banners')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[bannerService] ❌ Erro ao inserir banner no Supabase:', error);
      return { banner: null, error: error.message };
    }

    return { banner: mapSupabaseBanner(data), error: null };
  } catch (err: any) {
    console.error('[bannerService] ❌ Exceção ao criar banner:', err);
    return { banner: null, error: err.message };
  }
}

/**
 * 3. Atualiza um banner no Supabase
 */
export async function updateBannerInSupabase(
  id: string,
  updates: Partial<BannerSlide>
): Promise<{ success: boolean; error: string | null }> {
  const payload: any = {};
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
  if (updates.altText !== undefined) payload.alt_text = updates.altText;
  if (updates.tag !== undefined) payload.tag = updates.tag;
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.subtitle !== undefined) payload.subtitle = updates.subtitle;
  if (updates.highlightText !== undefined) payload.highlight_text = updates.highlightText;
  if (updates.themeColor !== undefined) payload.theme_color = updates.themeColor;
  if (updates.linkUrl !== undefined) payload.link_url = updates.linkUrl;
  if (updates.order !== undefined) payload.order = updates.order;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;

  try {
    console.log(`[bannerService] 🔄 Atualizando banner "${id}" no Supabase:`, payload);
    const { error } = await supabase
      .from('banners')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error('[bannerService] ❌ Erro ao atualizar banner no Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[bannerService] ❌ Exceção ao atualizar banner:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Exclui um banner do Supabase
 */
export async function deleteBannerFromSupabase(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log(`[bannerService] 🗑️ Excluindo banner "${id}" diretamente no Supabase...`);
    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[bannerService] ❌ Erro ao excluir banner:', error);
      return { success: false, error: error.message };
    }

    console.log(`[bannerService] ✅ Banner "${id}" excluído com sucesso do Supabase.`);
    return { success: true, error: null };
  } catch (err: any) {
    console.error('[bannerService] ❌ Exceção ao excluir banner:', err);
    return { success: false, error: err.message };
  }
}
