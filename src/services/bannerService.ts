import { supabase } from '../lib/supabase';
import { BannerSlide } from '../types';
import { INITIAL_BANNERS } from '../data/banners';

export function mapSupabaseBanner(item: any): BannerSlide {
  return {
    id: String(item.id),
    type: item.type === 'text' ? 'text' : 'image',
    imageUrl: item.image_url || item.imageUrl || '',
    altText: item.alt_text || item.altText || undefined,
    tag: item.tag || undefined,
    title: item.title || undefined,
    subtitle: item.subtitle || undefined,
    highlightText: item.highlight_text || item.highlightText || undefined,
    themeColor: item.theme_color || item.themeColor || 'pink',
    linkUrl: item.link_url || item.linkUrl || undefined,
    order: Number(item.order ?? item.display_order ?? 0),
    isActive: item.is_active !== false && item.isActive !== false,
  };
}

/**
 * 1. Busca todos os banners cadastrados no Supabase
 */
export async function fetchAllBanners(): Promise<{ data: BannerSlide[]; error: string | null }> {
  try {
    console.log('[bannerService] 🌐 Buscando banners da tabela "banners" no Supabase...');
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      console.warn('[bannerService] Aviso ao buscar banners:', error.message);
      // Tentar sem ordenação específica caso a coluna tenha outro nome
      const fallback = await supabase.from('banners').select('*');
      if (fallback.error) {
        console.warn('[bannerService] Tabela banners não encontrada ou vazia no Supabase.');
        return { data: INITIAL_BANNERS, error: null };
      }
      const mapped = (fallback.data || []).map(mapSupabaseBanner);
      return { data: mapped.length > 0 ? mapped : INITIAL_BANNERS, error: null };
    }

    const mapped = (data || []).map(mapSupabaseBanner);
    console.log(`[bannerService] ✅ ${mapped.length} banner(s) carregado(s) do Supabase.`);
    return { data: mapped.length > 0 ? mapped : INITIAL_BANNERS, error: null };
  } catch (err: any) {
    console.error('[bannerService] ❌ Exceção ao consultar banners:', err);
    return { data: INITIAL_BANNERS, error: null };
  }
}

/**
 * 2. Cria ou insere um banner no Supabase
 */
export async function createBannerInSupabase(
  bannerData: Omit<BannerSlide, 'id'>
): Promise<{ banner: BannerSlide | null; error: string | null }> {
  const newId = `banner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  const payload = {
    id: newId,
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
      // Retorna objeto local para não quebrar a interface
      return {
        banner: { ...bannerData, id: newId },
        error: error.message
      };
    }

    return { banner: mapSupabaseBanner(data), error: null };
  } catch (err: any) {
    console.error('[bannerService] ❌ Exceção ao criar banner:', err);
    return {
      banner: { ...bannerData, id: newId },
      error: err.message
    };
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
    console.log(`[bannerService] 🗑️ Excluindo banner "${id}" do Supabase...`);
    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[bannerService] ❌ Erro ao excluir banner:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[bannerService] ❌ Exceção ao excluir banner:', err);
    return { success: false, error: err.message };
  }
}
