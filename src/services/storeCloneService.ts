import { supabase } from '../lib/supabase';
import { fetchAllCategories } from './categoryService';
import { fetchAllProducts, createProductInSupabase } from './productService';
import { fetchAllBanners, createBannerInSupabase } from './bannerService';
import { saveStoreConfigInSupabase } from './storeConfigService';
import { StoreConfig } from '../types';

export interface CloneResult {
  success: boolean;
  error?: string;
  clonedCategories?: number;
  clonedProducts?: number;
  clonedBanners?: number;
}

/**
 * Normaliza subcategorias de qualquer formato (array, string JSON, vírgula) em string[]
 */
export function normalizeSubcategoryArray(subcategories: any): string[] {
  if (Array.isArray(subcategories)) {
    return subcategories.map((s: any) => String(s || '').trim()).filter(Boolean);
  }
  if (typeof subcategories === 'string') {
    try {
      const parsed = JSON.parse(subcategories);
      if (Array.isArray(parsed)) {
        return parsed.map((s: any) => String(s || '').trim()).filter(Boolean);
      }
    } catch {
      return subcategories.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * Clona com fidelidade máxima todos os produtos, categorias reais, banners e configurações
 * da loja matriz ativa (sourceStoreId) para a nova loja recém-criada (targetStoreId).
 */
export async function cloneStoreTemplate(
  sourceStoreId: string = 'suamarcaaqui',
  targetStoreId: string,
  targetStoreName?: string,
  initialConfig?: Partial<StoreConfig>
): Promise<CloneResult> {
  console.log(`[storeCloneService] 🧬 Iniciando clonagem fiel da loja matriz "${sourceStoreId}" para "${targetStoreId}"...`);

  try {
    // 1. Busca configurações visuais da matriz (cores, layout, benefícios)
    let matrizThemeSettings: any = null;
    try {
      const isBase = sourceStoreId === 'suamarcaaqui' || sourceStoreId === 'store_default';
      const storeFilter = isBase
        ? 'slug.eq.suamarcaaqui,id.eq.suamarcaaqui,id.eq.store_default'
        : `id.eq.${sourceStoreId},slug.eq.${sourceStoreId}`;

      const { data: matrizStore } = await supabase
        .from('stores')
        .select('*')
        .or(storeFilter)
        .limit(1)
        .maybeSingle();

      if (matrizStore?.theme_settings) {
        matrizThemeSettings = typeof matrizStore.theme_settings === 'string'
          ? JSON.parse(matrizStore.theme_settings)
          : matrizStore.theme_settings;
      }

      // Busca também em site_settings da matriz para garantir benefício cards e paleta
      const { data: matrizSiteSettings } = await supabase
        .from('site_settings')
        .select('*')
        .or(`store_id.eq.${sourceStoreId},store_id.eq.suamarcaaqui,store_id.eq.store_default`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (matrizSiteSettings) {
        matrizThemeSettings = {
          ...matrizThemeSettings,
          primary_color: matrizSiteSettings.primary_color || matrizThemeSettings?.primary_color,
          secondary_color: matrizSiteSettings.secondary_color || matrizThemeSettings?.secondary_color,
          color_palette: matrizSiteSettings.color_palette || matrizThemeSettings?.color_palette,
          theme_layout: matrizSiteSettings.theme_layout || matrizThemeSettings?.theme_layout,
          benefit_cards: matrizSiteSettings.benefit_cards ? (
            typeof matrizSiteSettings.benefit_cards === 'string'
              ? JSON.parse(matrizSiteSettings.benefit_cards)
              : matrizSiteSettings.benefit_cards
          ) : matrizThemeSettings?.benefit_cards,
        };
      }
    } catch (themeErr) {
      console.warn('[storeCloneService] Aviso ao recuperar tema da matriz:', themeErr);
    }

    // 2. Salva as configurações iniciais da nova loja (dados digitados + identidade visual da matriz)
    await saveStoreConfigInSupabase({
      id: `cfg_${targetStoreId}`,
      store_id: targetStoreId,
      storeName: initialConfig?.storeName || targetStoreName || 'suamarcaaqui',
      slogan: initialConfig?.slogan || 'subtitulo da sua loja',
      whatsappNumber: initialConfig?.whatsappNumber || 'SeuWhatsApp',
      whatsappDisplay: initialConfig?.whatsappDisplay || 'SeuWhatsAppWhatsApp',
      instagram: initialConfig?.instagram || 'suamarcaaqui',
      address: initialConfig?.address || 'seuendereço',
      city: initialConfig?.city || 'Brasil',
      workingHours: initialConfig?.workingHours || 'SEMPRE ABERTO',
      minOrderValue: initialConfig?.minOrderValue ?? 0.00,
      mpAccessToken: initialConfig?.mpAccessToken || undefined,
      telegramBotToken: initialConfig?.telegramBotToken || undefined,
      telegramChatId: initialConfig?.telegramChatId || undefined,
      primaryColor: matrizThemeSettings?.primary_color || '#FF1493',
      colorPalette: matrizThemeSettings?.color_palette || 'pink_pastel',
      themeLayout: matrizThemeSettings?.theme_layout || 'classic',
      benefitCards: matrizThemeSettings?.benefit_cards,
    }, targetStoreId);

    // Salva também na tabela site_settings da nova loja
    try {
      await supabase.from('site_settings').upsert([{
        store_id: targetStoreId,
        whatsapp: initialConfig?.whatsappNumber || 'SeuWhatsApp',
        display_whatsapp: initialConfig?.whatsappDisplay || 'SeuWhatsAppWhatsApp',
        instagram: initialConfig?.instagram || 'suamarcaaqui',
        slogan: initialConfig?.slogan || 'subtitulo da sua loja',
        address: initialConfig?.address || 'seuendereço',
        business_hours: initialConfig?.workingHours || 'SEMPRE ABERTO',
        primary_color: matrizThemeSettings?.primary_color || '#FF1493',
        color_palette: matrizThemeSettings?.color_palette || 'pink_pastel',
        theme_layout: matrizThemeSettings?.theme_layout || 'classic',
        benefit_cards: matrizThemeSettings?.benefit_cards,
        updated_at: new Date().toISOString()
      }], { onConflict: 'store_id' });
    } catch (siteErr) {
      console.warn('[storeCloneService] Aviso ao atualizar site_settings:', siteErr);
    }

    // 3. Clona Categorias Reais da Matriz (Preservando nomes exatos, ícones e subcategorias)
    let catsCloned = 0;
    const { data: categoriasMatriz } = await fetchAllCategories(sourceStoreId);

    if (categoriasMatriz && categoriasMatriz.length > 0) {
      console.log(`[storeCloneService] 📂 Clonando ${categoriasMatriz.length} categorias originais da matriz...`);
      const categoriasParaInserir = categoriasMatriz.map((cat, catIndex) => {
        const rawSubcats = normalizeSubcategoryArray(cat.subcategories);
        return {
          id: `cat_${Date.now()}_${catIndex}_${Math.random().toString(36).substring(2, 6)}`,
          store_id: targetStoreId,
          name: cat.name.trim(), // Nome original mantido com fidelidade (ex: "Kits Personalizados")
          icon: cat.icon || 'Gift',
          subcategories: rawSubcats,
          created_at: new Date().toISOString()
        };
      });

      const { error: catInsertError } = await supabase
        .from('categories')
        .insert(categoriasParaInserir);

      if (catInsertError) {
        console.warn('[storeCloneService] Inserindo categorias individualmente por segurança...', catInsertError.message);
        for (const c of categoriasParaInserir) {
          const { error: singleErr } = await supabase.from('categories').insert([c]);
          if (!singleErr) catsCloned++;
        }
      } else {
        catsCloned = categoriasParaInserir.length;
      }
      console.log(`[storeCloneService] ✅ ${catsCloned} categorias clonadas com fidelidade total.`);
    }

    // 4. Clona Produtos Reais da Matriz (Preservando nomes, categorias, fotos, preços, links digitais e benefícios)
    let prodsCloned = 0;
    let { data: produtosMatriz } = await fetchAllProducts(sourceStoreId);

    // Fallback: se por acaso a consulta de produtos por storeId retornar vazio, busca produtos com store_id nulo ou base
    if (!produtosMatriz || produtosMatriz.length === 0) {
      console.log('[storeCloneService] 🔍 Buscando produtos base com fallback...');
      const { data: fallbackProds } = await supabase
        .from('products')
        .select('*')
        .or('store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null')
        .limit(200);

      if (fallbackProds && fallbackProds.length > 0) {
        produtosMatriz = fallbackProds as any;
      }
    }

    if (produtosMatriz && produtosMatriz.length > 0) {
      console.log(`[storeCloneService] 📦 Clonando ${produtosMatriz.length} produtos originais da matriz...`);
      for (const prod of produtosMatriz) {
        const { id, ...prodData } = prod;

        await createProductInSupabase({
          ...prodData,
          category: (prod.category || '').trim(), // Categoria real mantida
          subcategory: prod.subcategory ? prod.subcategory.trim() : undefined, // Subcategoria real mantida
          slug: `${prod.slug || prod.name}-${Math.random().toString(36).substring(2, 6)}`,
          store_id: targetStoreId
        }, targetStoreId);

        prodsCloned++;
      }
      console.log(`[storeCloneService] ✅ ${prodsCloned} produtos clonados com sucesso para a nova loja.`);
    }

    // 5. Clona Banners Reais da Matriz
    let bannersCloned = 0;
    const { data: sourceBanners } = await fetchAllBanners(sourceStoreId);

    if (sourceBanners && sourceBanners.length > 0) {
      console.log(`[storeCloneService] 🖼️ Clonando ${sourceBanners.length} banners da matriz...`);
      for (const ban of sourceBanners) {
        const { id, ...banData } = ban;
        await createBannerInSupabase({
          ...banData,
          store_id: targetStoreId
        }, targetStoreId);
        bannersCloned++;
      }
      console.log(`[storeCloneService] ✅ ${bannersCloned} banners clonados.`);
    }

    console.log(`[storeCloneService] 🎉 Clonagem completa finalizada com sucesso: ${prodsCloned} produtos, ${catsCloned} categorias, ${bannersCloned} banners.`);

    return {
      success: true,
      clonedCategories: catsCloned,
      clonedProducts: prodsCloned,
      clonedBanners: bannersCloned
    };
  } catch (err: any) {
    console.error('[storeCloneService] ❌ Erro durante a clonagem:', err);
    return {
      success: false,
      error: err.message || 'Erro inesperado durante a clonagem da loja.'
    };
  }
}
