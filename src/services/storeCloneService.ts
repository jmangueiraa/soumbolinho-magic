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
 * da loja matriz ativa (slug === 'ajpstore') para a nova loja recém-criada (targetStoreId).
 */
export async function cloneStoreTemplate(
  sourceStoreId: string = 'ajpstore',
  targetStoreId: string,
  targetStoreName?: string,
  initialConfig?: Partial<StoreConfig>
): Promise<CloneResult> {
  console.log(`[storeCloneService] 🧬 Iniciando clonagem fiel da loja matriz (AJPSTORE) para "${targetStoreId}"...`);

  try {
    // 1. Consultar a loja matriz no Supabase (slug === 'ajpstore')
    let { data: matrizStore } = await supabase
      .from('stores')
      .select('*')
      .or('slug.eq.ajpstore,id.eq.store_ajpstore,is_matriz.eq.true')
      .limit(1)
      .maybeSingle();

    if (!matrizStore && sourceStoreId) {
      const { data: fallbackMatriz } = await supabase
        .from('stores')
        .select('*')
        .or(`slug.eq.${sourceStoreId},id.eq.${sourceStoreId}`)
        .limit(1)
        .maybeSingle();
      if (fallbackMatriz) matrizStore = fallbackMatriz;
    }

    const matrizId = matrizStore?.id || 'store_ajpstore';

    // 2. Extrair configurações visuais, layout, banners, logo, cores e botões exatos da matriz
    let matrizThemeSettings: any = null;
    if (matrizStore?.theme_settings) {
      matrizThemeSettings = typeof matrizStore.theme_settings === 'string'
        ? JSON.parse(matrizStore.theme_settings)
        : matrizStore.theme_settings;
    }

    // Busca também em site_settings da matriz para garantir benefício cards, botões e paleta
    let matrizSiteSettings: any = null;
    try {
      const { data: siteSettingsData } = await supabase
        .from('site_settings')
        .select('*')
        .or(`store_id.eq.${matrizId},store_id.eq.ajpstore,store_id.eq.store_ajpstore`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (siteSettingsData) matrizSiteSettings = siteSettingsData;
    } catch (siteErr) {
      console.warn('[storeCloneService] Aviso ao recuperar site_settings da matriz:', siteErr);
    }

    const resolvedPrimaryColor = matrizStore?.primary_color || matrizThemeSettings?.primary_color || matrizSiteSettings?.primary_color || '#FF1493';
    const resolvedSecondaryColor = matrizStore?.secondary_color || matrizThemeSettings?.secondary_color || matrizSiteSettings?.secondary_color || '#00a8e8';
    const resolvedColorPalette = matrizStore?.color_palette || matrizThemeSettings?.color_palette || matrizSiteSettings?.color_palette || 'pink_pastel';
    const resolvedLayoutStyle = matrizStore?.layout_style || matrizThemeSettings?.theme_layout || matrizSiteSettings?.theme_layout || 'classic';
    const resolvedLogoUrl = matrizStore?.logo_url || matrizSiteSettings?.logo_url || null;
    const resolvedBannerUrl = matrizStore?.banner_url || matrizSiteSettings?.banner_url || null;
    const resolvedBannerDesktop = matrizStore?.banner_desktop || null;
    const resolvedBannerMobile = matrizStore?.banner_mobile || null;
    const resolvedBannersConfig = matrizStore?.banners_config || matrizThemeSettings?.banners_config || null;
    const resolvedButtonsConfig = matrizStore?.buttons_config || matrizThemeSettings?.buttons_config || null;
    const resolvedBenefitCards = matrizStore?.benefit_cards || matrizSiteSettings?.benefit_cards || matrizThemeSettings?.benefit_cards || null;
    const resolvedStoreFeatures = matrizStore?.store_features || matrizThemeSettings?.store_features || null;
    const resolvedMainCtaText = matrizStore?.main_cta_text !== undefined ? matrizStore.main_cta_text : (matrizThemeSettings?.main_cta_text !== undefined ? matrizThemeSettings.main_cta_text : 'Toda loja com Download imediato!');
    const resolvedMainCtaLink = matrizStore?.main_cta_link || matrizThemeSettings?.main_cta_link || '';

    const mergedThemeSettings = {
      ...(matrizThemeSettings || {}),
      primary_color: resolvedPrimaryColor,
      secondary_color: resolvedSecondaryColor,
      color_palette: resolvedColorPalette,
      theme_layout: resolvedLayoutStyle,
      layout_style: resolvedLayoutStyle,
      buttons_config: resolvedButtonsConfig,
      banners_config: resolvedBannersConfig,
      benefit_cards: resolvedBenefitCards,
      store_features: resolvedStoreFeatures,
      main_cta_text: resolvedMainCtaText,
      main_cta_link: resolvedMainCtaLink,
    };

    // Atualiza a nova loja na tabela stores copiando todas as configurações de layout, banners, logo, cores e botões exatos
    try {
      const storeUpdatePayload: any = {
        layout_style: resolvedLayoutStyle,
        primary_color: resolvedPrimaryColor,
        secondary_color: resolvedSecondaryColor,
        color_palette: resolvedColorPalette,
        logo_url: resolvedLogoUrl,
        banner_url: resolvedBannerUrl,
        banner_desktop: resolvedBannerDesktop,
        banner_mobile: resolvedBannerMobile,
        banners_config: resolvedBannersConfig,
        buttons_config: resolvedButtonsConfig,
        benefit_cards: resolvedBenefitCards,
        store_features: resolvedStoreFeatures,
        main_cta_text: resolvedMainCtaText,
        main_cta_link: resolvedMainCtaLink,
        theme_settings: mergedThemeSettings,
        updated_at: new Date().toISOString()
      };

      let currUpdate = { ...storeUpdatePayload };
      for (let attempt = 0; attempt < 6; attempt++) {
        const { error: upErr } = await supabase
          .from('stores')
          .update(currUpdate)
          .eq('id', targetStoreId);
        if (!upErr) break;
        const colMatch = upErr.message?.match(/Could not find the '([^']+)' column/i);
        if (colMatch && colMatch[1]) {
          delete currUpdate[colMatch[1]];
          continue;
        }
        break;
      }
    } catch (storeUpErr) {
      console.warn('[storeCloneService] Aviso ao atualizar stores com configurações da matriz:', storeUpErr);
    }

    // Salva store_config da nova loja de forma protegida
    try {
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
        primaryColor: resolvedPrimaryColor,
        colorPalette: resolvedColorPalette,
        themeLayout: resolvedLayoutStyle,
        benefitCards: resolvedBenefitCards,
        logoUrl: resolvedLogoUrl || undefined,
        bannerUrl: resolvedBannerUrl || undefined
      }, targetStoreId);
    } catch (cfgErr) {
      console.warn('[storeCloneService] Aviso ao salvar store_config:', cfgErr);
    }

    // Salva na tabela site_settings da nova loja
    try {
      await supabase.from('site_settings').upsert([{
        store_id: targetStoreId,
        whatsapp: initialConfig?.whatsappNumber || 'SeuWhatsApp',
        display_whatsapp: initialConfig?.whatsappDisplay || 'SeuWhatsAppWhatsApp',
        instagram: initialConfig?.instagram || 'suamarcaaqui',
        slogan: initialConfig?.slogan || 'subtitulo da sua loja',
        address: initialConfig?.address || 'seuendereço',
        business_hours: initialConfig?.workingHours || 'SEMPRE ABERTO',
        primary_color: resolvedPrimaryColor,
        secondary_color: resolvedSecondaryColor,
        color_palette: resolvedColorPalette,
        theme_layout: resolvedLayoutStyle,
        benefit_cards: resolvedBenefitCards,
        logo_url: resolvedLogoUrl,
        banner_url: resolvedBannerUrl,
        updated_at: new Date().toISOString()
      }], { onConflict: 'store_id' });
    } catch (siteErr) {
      console.warn('[storeCloneService] Aviso ao atualizar site_settings:', siteErr);
    }

    // 3. Clona Categorias Reais da Matriz AJPSTORE
    let catsCloned = 0;
    const categoryIdMap = new Map<string, string>(); // oldId -> newId

    const { data: categoriasMatriz } = await supabase
      .from('categories')
      .select('*')
      .or(`store_id.eq.${matrizId},store_id.eq.ajpstore,store_id.eq.store_ajpstore,store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null`)
      .order('name', { ascending: true });

    if (categoriasMatriz && categoriasMatriz.length > 0) {
      console.log(`[storeCloneService] 📂 Clonando ${categoriasMatriz.length} categorias originais da matriz AJPSTORE...`);
      const seenNames = new Set<string>();

      for (let i = 0; i < categoriasMatriz.length; i++) {
        try {
          const cat = categoriasMatriz[i];
          const cleanName = (cat.name || '').trim().toLowerCase();
          if (!cleanName) continue;
          if (seenNames.has(cleanName)) continue;
          seenNames.add(cleanName);

          const newCatId = `cat_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
          categoryIdMap.set(String(cat.id), newCatId);
          const rawSubcats = normalizeSubcategoryArray(cat.subcategories);

          const { error: catErr } = await supabase.from('categories').insert([{
            id: newCatId,
            store_id: targetStoreId,
            name: cat.name.trim(),
            icon: cat.icon || 'Gift',
            subcategories: rawSubcats,
            created_at: new Date().toISOString()
          }]);

          if (!catErr) {
            catsCloned++;
          }
        } catch (catEx) {
          console.warn('[storeCloneService] Aviso ao clonar categoria individual:', catEx);
        }
      }
      console.log(`[storeCloneService] ✅ ${catsCloned} categorias clonadas da matriz.`);
    }

    // 4. Clona Produtos Reais da Matriz AJPSTORE (preservando imagens, preços, categorias, etc.)
    let prodsCloned = 0;
    const { data: produtosMatriz } = await supabase
      .from('products')
      .select('*')
      .or(`store_id.eq.${matrizId},store_id.eq.ajpstore,store_id.eq.store_ajpstore,store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null`);

    if (produtosMatriz && produtosMatriz.length > 0) {
      console.log(`[storeCloneService] 📦 Clonando ${produtosMatriz.length} produtos da matriz AJPSTORE...`);
      for (const prod of produtosMatriz) {
        try {
          const { id, ...prodData } = prod;
          const remappedCatId = prod.category_id && categoryIdMap.has(String(prod.category_id))
            ? categoryIdMap.get(String(prod.category_id))
            : undefined;

          await createProductInSupabase({
            ...prodData,
            category: (prod.category || '').trim(),
            subcategory: prod.subcategory ? prod.subcategory.trim() : undefined,
            category_id: remappedCatId,
            slug: `${prod.slug || prod.name}-${Math.random().toString(36).substring(2, 6)}`,
            store_id: targetStoreId
          }, targetStoreId);

          prodsCloned++;
        } catch (prodEx) {
          console.warn('[storeCloneService] Aviso ao clonar produto individual:', prodEx);
        }
      }
      console.log(`[storeCloneService] ✅ ${prodsCloned} produtos clonados para a nova loja.`);
    }

    // 5. Clona Banners Reais da Matriz AJPSTORE
    let bannersCloned = 0;
    const { data: bannersMatriz } = await supabase
      .from('banners')
      .select('*')
      .or(`store_id.eq.${matrizId},store_id.eq.ajpstore,store_id.eq.store_ajpstore,store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null`);

    if (bannersMatriz && bannersMatriz.length > 0) {
      console.log(`[storeCloneService] 🖼️ Clonando ${bannersMatriz.length} banners da matriz AJPSTORE...`);
      for (const ban of bannersMatriz) {
        try {
          const { id, ...banData } = ban;
          await createBannerInSupabase({
            ...banData,
            store_id: targetStoreId
          }, targetStoreId);
          bannersCloned++;
        } catch (banEx) {
          console.warn('[storeCloneService] Aviso ao clonar banner individual:', banEx);
        }
      }
      console.log(`[storeCloneService] ✅ ${bannersCloned} banners clonados.`);
    }

    console.log(`[storeCloneService] 🎉 Clonagem completa da matriz AJPSTORE finalizada: ${prodsCloned} produtos, ${catsCloned} categorias, ${bannersCloned} banners.`);

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
