import { supabase } from '../lib/supabase';
import { StoreConfig, BenefitCard } from '../types';
import { STORE_CONFIG as INITIAL_STORE_CONFIG, DEFAULT_BENEFIT_CARDS } from '../data/storeConfig';

export function mapSupabaseConfig(item: any): StoreConfig {
  let benefitCards: BenefitCard[] | undefined = undefined;
  if (item.benefit_cards) {
    benefitCards = typeof item.benefit_cards === 'string' ? JSON.parse(item.benefit_cards) : item.benefit_cards;
  } else if (item.benefitCards) {
    benefitCards = typeof item.benefitCards === 'string' ? JSON.parse(item.benefitCards) : item.benefitCards;
  }

  return {
    id: item.id || undefined,
    store_id: item.store_id || undefined,
    storeName: item.store_name || item.storeName || INITIAL_STORE_CONFIG.storeName,
    slogan: item.slogan || INITIAL_STORE_CONFIG.slogan,
    whatsappNumber: item.whatsapp_number || item.whatsappNumber || INITIAL_STORE_CONFIG.whatsappNumber,
    whatsappDisplay: item.whatsapp_display || item.whatsappDisplay || INITIAL_STORE_CONFIG.whatsappDisplay,
    instagram: item.instagram || INITIAL_STORE_CONFIG.instagram,
    address: item.address || INITIAL_STORE_CONFIG.address,
    city: item.city || INITIAL_STORE_CONFIG.city,
    workingHours: item.working_hours || item.workingHours || INITIAL_STORE_CONFIG.workingHours,
    minOrderValue: Number(item.min_order_value ?? item.minOrderValue ?? INITIAL_STORE_CONFIG.minOrderValue),
    mpAccessToken: item.mp_access_token || item.mpAccessToken || undefined,
    telegramBotToken: item.telegram_bot_token || item.telegramBotToken || undefined,
    telegramChatId: item.telegram_chat_id || item.telegramChatId || undefined,
    benefitCards: (benefitCards && Array.isArray(benefitCards) && benefitCards.length > 0) ? benefitCards : DEFAULT_BENEFIT_CARDS,
    primaryColor: item.primary_color || item.primaryColor || undefined,
    whatsappDefaultMessage: item.whatsapp_default_message || item.whatsappDefaultMessage || undefined,
    themeLayout: item.theme_layout || item.themeLayout || undefined,
    colorPalette: item.color_palette || item.colorPalette || undefined,
    logoUrl: item.logo_url || item.logoUrl || undefined,
  };
}

/**
 * 1. Busca as configurações da loja do Supabase (filtrado por store_id com isolamento estrito)
 */
export async function fetchStoreConfig(storeId?: string): Promise<{ data: StoreConfig; error: string | null }> {
  try {
    const targetStoreId = (storeId || '').trim();

    // REQUISITO RIGOROSO: Se o storeId não estiver disponível, vier vazio ou for '__resolving_tenant__',
    // retorna config neutra sem buscar a matriz.
    if (!targetStoreId || targetStoreId === '__resolving_tenant__') {
      console.log('[storeConfigService] ⏸️ store_id não fornecido ou em resolução de tenant. Retornando config neutra.');
      return {
        data: {
          storeName: '',
          slogan: '',
          whatsappNumber: '',
          whatsappDisplay: '',
          instagram: '',
          address: '',
          city: '',
          workingHours: '',
          minOrderValue: 0,
          benefitCards: [],
        },
        error: null,
      };
    }

    const isBaseStore = 
      targetStoreId === 'suamarcaaqui' || 
      targetStoreId === 'store_default';

    console.log(`[storeConfigService] 🌐 Buscando configurações no Supabase (store_id: ${targetStoreId})...`);

    // A) Para lojas clientes (não-matriz), busca estritamente os dados exclusivos desta loja
    if (!isBaseStore) {
      const editaveisFilter = targetStoreId === 'store_editaveisdocanva' || targetStoreId === 'matriz' ? ',store_id.eq.matriz,id.eq.cfg_matriz' : '';
      const { data: clientConfig } = await supabase
        .from('store_config')
        .select('*')
        .or(`store_id.eq.${targetStoreId},id.eq.cfg_${targetStoreId},id.eq.${targetStoreId}${editaveisFilter}`)
        .limit(1)
        .maybeSingle();

      // Consulta complementar na tabela site_settings filtrando pela loja ativa atual (CRUCIAL)
      let siteThemeData: any = null;
      try {
        const siteOrFilters = targetStoreId === 'store_editaveisdocanva' || targetStoreId === 'matriz'
          ? `store_id.eq.${targetStoreId},store_id.eq.matriz`
          : `store_id.eq.${targetStoreId}`;
        const { data: siteRow } = await supabase
          .from('site_settings')
          .select('*')
          .or(siteOrFilters)
          .limit(1)
          .maybeSingle();
        if (siteRow) siteThemeData = siteRow;
      } catch (e) {
        console.warn('[storeConfigService] Aviso ao buscar site_settings:', e);
      }

      if (clientConfig) {
        console.log(`[storeConfigService] ✅ Configurações exclusivas da loja "${storeId}" encontradas:`, clientConfig.store_name);
        const mapped = mapSupabaseConfig(clientConfig);
        if (siteThemeData) {
          if (siteThemeData.whatsapp) mapped.whatsappNumber = siteThemeData.whatsapp;
          if (siteThemeData.display_whatsapp) mapped.whatsappDisplay = siteThemeData.display_whatsapp;
          if (siteThemeData.instagram) mapped.instagram = siteThemeData.instagram;
          if (siteThemeData.slogan) mapped.slogan = siteThemeData.slogan;
          if (siteThemeData.address) mapped.address = siteThemeData.address;
          if (siteThemeData.business_hours) mapped.workingHours = siteThemeData.business_hours;
          if (siteThemeData.whatsapp_default_message) mapped.whatsappDefaultMessage = siteThemeData.whatsapp_default_message;
          if (siteThemeData.theme_layout) mapped.themeLayout = siteThemeData.theme_layout;
          if (siteThemeData.color_palette) mapped.colorPalette = siteThemeData.color_palette;
          if (siteThemeData.primary_color) mapped.primaryColor = siteThemeData.primary_color;
          if (siteThemeData.logo_url) mapped.logoUrl = siteThemeData.logo_url;
          if (siteThemeData.benefit_cards) {
            const parsedCards = typeof siteThemeData.benefit_cards === 'string'
              ? JSON.parse(siteThemeData.benefit_cards)
              : siteThemeData.benefit_cards;
            if (Array.isArray(parsedCards) && parsedCards.length > 0) {
              mapped.benefitCards = parsedCards;
            }
          }
        }
        return { data: mapped, error: null };
      }

      // Se ainda não houver registro em store_config, busca os dados gravados diretamente na tabela stores
      const { data: storeRow } = await supabase
        .from('stores')
        .select('*')
        .or(`id.eq.${storeId},slug.eq.${storeId}`)
        .limit(1)
        .maybeSingle();

      if (storeRow) {
        console.log(`[storeConfigService] 📋 Gerando storeConfig a partir da tabela stores da loja:`, storeRow.name);
        const resolvedName = storeRow.store_name || storeRow.name || 'suamarcaaqui';
        const storeTheme = storeRow.theme_settings || {};
        const resolvedBenefitCards = (siteThemeData?.benefit_cards
          ? (typeof siteThemeData.benefit_cards === 'string' ? JSON.parse(siteThemeData.benefit_cards) : siteThemeData.benefit_cards)
          : storeTheme.benefit_cards) || DEFAULT_BENEFIT_CARDS;

        const storeBasedConfig: StoreConfig = {
          id: `cfg_${storeRow.id}`,
          store_id: storeRow.id,
          storeName: resolvedName,
          slogan: storeRow.slogan || 'subtitulo da sua loja',
          whatsappNumber: storeRow.whatsapp_number || storeRow.owner_phone || 'SeuWhatsApp',
          whatsappDisplay: storeRow.whatsapp_display || 'SeuWhatsAppWhatsApp',
          instagram: storeRow.instagram || 'suamarcaaqui',
          address: storeRow.address || 'seuendereço',
          city: 'Brasil',
          workingHours: storeRow.working_hours || 'SEMPRE ABERTO',
          minOrderValue: 0.00,
          mpAccessToken: storeRow.mp_access_token || undefined,
          telegramBotToken: storeRow.telegram_bot_token || undefined,
          telegramChatId: storeRow.telegram_chat_id || undefined,
          benefitCards: resolvedBenefitCards,
          primaryColor: siteThemeData?.primary_color || storeTheme.primary_color || undefined,
          themeLayout: siteThemeData?.theme_layout || storeTheme.theme_layout || 'classic',
          colorPalette: siteThemeData?.color_palette || storeTheme.color_palette || 'pink_pastel',
          whatsappDefaultMessage: storeTheme.whatsapp_default_message || undefined,
          logoUrl: siteThemeData?.logo_url || storeTheme.logo_url || storeRow.logo_url || undefined,
        };

        // Salva para consolidar o registro exclusivo da nova loja e não consultar novamente
        await saveStoreConfigInSupabase(storeBasedConfig, storeRow.id);
        return { data: storeBasedConfig, error: null };
      }

      // Se a loja cliente não for encontrada de forma alguma, retorna config genérica isolada (NUNCA a matriz)
      return {
        data: {
          storeName: 'suamarcaaqui',
          slogan: 'subtitulo da sua loja',
          whatsappNumber: 'SeuWhatsApp',
          whatsappDisplay: 'SeuWhatsAppWhatsApp',
          instagram: 'suamarcaaqui',
          address: 'seuendereço',
          city: 'Brasil',
          workingHours: 'SEMPRE ABERTO',
          minOrderValue: 0.00,
          benefitCards: DEFAULT_BENEFIT_CARDS,
          themeLayout: siteThemeData?.theme_layout || 'classic',
          colorPalette: siteThemeData?.color_palette || 'pink_pastel',
        },
        error: null,
      };
    }

    // B) Apenas para a loja base matriz (matriz ou store_default)
    const { data: baseData } = await supabase
      .from('store_config')
      .select('*')
      .or('store_id.eq.matriz,store_id.eq.store_default,id.eq.default,id.eq.cfg_matriz')
      .limit(1)
      .maybeSingle();

    let baseSiteTheme: any = null;
    try {
      const { data: baseSiteSettings } = await supabase
        .from('site_settings')
        .select('*')
        .or('store_id.eq.matriz,store_id.eq.store_default,id.eq.default')
        .limit(1)
        .maybeSingle();
      if (baseSiteSettings) baseSiteTheme = baseSiteSettings;
    } catch (e) {}

    if (baseData) {
      const mapped = mapSupabaseConfig(baseData);
      if (baseSiteTheme) {
        if (baseSiteTheme.whatsapp) mapped.whatsappNumber = baseSiteTheme.whatsapp;
        if (baseSiteTheme.display_whatsapp) mapped.whatsappDisplay = baseSiteTheme.display_whatsapp;
        if (baseSiteTheme.instagram) mapped.instagram = baseSiteTheme.instagram;
        if (baseSiteTheme.slogan) mapped.slogan = baseSiteTheme.slogan;
        if (baseSiteTheme.address) mapped.address = baseSiteTheme.address;
        if (baseSiteTheme.business_hours) mapped.workingHours = baseSiteTheme.business_hours;
        if (baseSiteTheme.whatsapp_default_message) mapped.whatsappDefaultMessage = baseSiteTheme.whatsapp_default_message;
        if (baseSiteTheme.theme_layout) mapped.themeLayout = baseSiteTheme.theme_layout;
        if (baseSiteTheme.color_palette) mapped.colorPalette = baseSiteTheme.color_palette;
        if (baseSiteTheme.primary_color) mapped.primaryColor = baseSiteTheme.primary_color;
        if (baseSiteTheme.logo_url) mapped.logoUrl = baseSiteTheme.logo_url;
        if (baseSiteTheme.benefit_cards) {
          const parsedCards = typeof baseSiteTheme.benefit_cards === 'string'
            ? JSON.parse(baseSiteTheme.benefit_cards)
            : baseSiteTheme.benefit_cards;
          if (Array.isArray(parsedCards) && parsedCards.length > 0) {
            mapped.benefitCards = parsedCards;
          }
        }
      }
      return { data: mapped, error: null };
    }

    // Se ainda não houver registro em store_config, busca os dados gravados diretamente na tabela stores da Matriz
    const { data: matrizStoreRow } = await supabase
      .from('stores')
      .select('*')
      .or('slug.eq.suamarcaaqui,id.eq.suamarcaaqui,id.eq.store_default,id.eq.matriz,custom_domain.ilike.editaveisdocanva.com.br')
      .limit(1)
      .maybeSingle();

    if (matrizStoreRow) {
      const storeTheme = matrizStoreRow.theme_settings || {};
      const resolvedBenefitCards = (baseSiteTheme?.benefit_cards
        ? (typeof baseSiteTheme.benefit_cards === 'string' ? JSON.parse(baseSiteTheme.benefit_cards) : baseSiteTheme.benefit_cards)
        : storeTheme.benefit_cards) || DEFAULT_BENEFIT_CARDS;

      const mapped: StoreConfig = {
        id: `cfg_${matrizStoreRow.id}`,
        store_id: matrizStoreRow.id,
        storeName: matrizStoreRow.store_name || matrizStoreRow.name || 'Loja',
        slogan: matrizStoreRow.slogan || 'Sua loja de produtos e arquivos digitais',
        whatsappNumber: baseSiteTheme?.whatsapp || matrizStoreRow.whatsapp_number || '5521974975884',
        whatsappDisplay: baseSiteTheme?.display_whatsapp || matrizStoreRow.whatsapp_display || '(21) 97497-5884',
        instagram: baseSiteTheme?.instagram || matrizStoreRow.instagram || 'suamarcaaqui',
        address: baseSiteTheme?.address || matrizStoreRow.address || 'Atendimento Online',
        city: 'Brasil',
        workingHours: baseSiteTheme?.business_hours || matrizStoreRow.working_hours || 'Segunda a Sábado, 09h às 18h',
        minOrderValue: 0.00,
        benefitCards: resolvedBenefitCards,
        primaryColor: baseSiteTheme?.primary_color || storeTheme.primary_color || '#FF1493',
        themeLayout: baseSiteTheme?.theme_layout || storeTheme.theme_layout || 'classic',
        colorPalette: baseSiteTheme?.color_palette || storeTheme.color_palette || 'pink_pastel',
        whatsappDefaultMessage: baseSiteTheme?.whatsapp_default_message || storeTheme.whatsapp_default_message || undefined,
        logoUrl: baseSiteTheme?.logo_url || storeTheme.logo_url || matrizStoreRow.logo_url || undefined,
      };
      return { data: mapped, error: null };
    }

    return { data: INITIAL_STORE_CONFIG, error: null };
  } catch (err: any) {
    console.error('[storeConfigService] ❌ Exceção ao consultar configurações:', err);
    return { data: INITIAL_STORE_CONFIG, error: null };
  }
}

/**
 * 2. Salva ou atualiza as configurações da loja no Supabase vinculadas à loja (UPSERT)
 */
export async function saveStoreConfigInSupabase(
  config: StoreConfig,
  storeId?: string
): Promise<{ success: boolean; error: string | null }> {
  const targetStoreId = (storeId || config.store_id || '').trim();
  if (!targetStoreId || targetStoreId === '__resolving_tenant__') {
    console.warn('[storeConfigService] ❌ Tentativa de salvar configurações sem store_id válido.');
    return { success: false, error: 'store_id obrigatório e válido para salvar configurações.' };
  }
  const configId = config.id || (targetStoreId === 'store_default' ? 'default' : `cfg_${targetStoreId}`);

  const payload: any = {
    id: configId,
    store_id: targetStoreId,
    store_name: config.storeName,
    slogan: config.slogan,
    logo_url: config.logoUrl || null,
    whatsapp_number: config.whatsappNumber,
    whatsapp_display: config.whatsappDisplay,
    instagram: config.instagram,
    address: config.address,
    city: config.city,
    working_hours: config.workingHours,
    min_order_value: config.minOrderValue,
    mp_access_token: config.mpAccessToken || null,
    telegram_bot_token: config.telegramBotToken || null,
    telegram_chat_id: config.telegramChatId || null,
    benefit_cards: config.benefitCards || DEFAULT_BENEFIT_CARDS,
    primary_color: config.primaryColor || null,
    theme_layout: config.themeLayout || 'classic',
    color_palette: config.colorPalette || 'pink_pastel',
    whatsapp_default_message: config.whatsappDefaultMessage || null,
    updated_at: new Date().toISOString(),
  };

  try {
    console.log('[storeConfigService] 💾 Executando UPSERT das configurações no Supabase:', payload);

    // 0. Atualização na tabela site_settings exatamente como solicitado pelo usuário (CRUCIAL: filtrando por store_id)
    try {
      const siteSettingsUpdate = {
        store_id: targetStoreId,
        whatsapp: config.whatsappNumber,
        display_whatsapp: config.whatsappDisplay,
        instagram: config.instagram,
        slogan: config.slogan,
        address: config.address,
        business_hours: config.workingHours,
        whatsapp_default_message: config.whatsappDefaultMessage,
        theme_layout: config.themeLayout || 'classic',
        color_palette: config.colorPalette || 'pink_pastel',
        primary_color: config.primaryColor || '#FF1493',
        logo_url: config.logoUrl || null,
        benefit_cards: config.benefitCards || DEFAULT_BENEFIT_CARDS,
        updated_at: new Date().toISOString(),
      };

      console.log(`[storeConfigService] 🔄 Atualizando site_settings para loja store_id="${targetStoreId}"...`);
      const { data: updatedRows, error: siteUpdateError } = await supabase
        .from('site_settings')
        .update(siteSettingsUpdate)
        .eq('store_id', targetStoreId)
        .select();

      if (siteUpdateError || !updatedRows || updatedRows.length === 0) {
        // Se ainda não existia registro para este store_id, faz upsert ou insert
        console.log(`[storeConfigService] Registro não encontrado em site_settings para store_id="${targetStoreId}", executando upsert...`);
        const { error: insertError } = await supabase
          .from('site_settings')
          .upsert([siteSettingsUpdate], { onConflict: 'store_id' });
        if (insertError) {
          console.warn('[storeConfigService] Aviso ao dar upsert em site_settings:', insertError.message);
          await supabase.from('site_settings').insert([siteSettingsUpdate]);
        } else {
          console.log(`[storeConfigService] ✅ site_settings upsert realizado com sucesso para store_id="${targetStoreId}"!`);
        }
      } else {
        console.log(`[storeConfigService] ✅ site_settings atualizado com sucesso via .eq('store_id', '${targetStoreId}')!`);
      }
    } catch (siteEx) {
      console.warn('[storeConfigService] Exceção em site_settings:', siteEx);
    }

    // 1. Tentar upsert na tabela store_config
    let { error } = await supabase
      .from('store_config')
      .upsert([payload], { onConflict: 'id' });

    // Fallback caso as novas colunas ainda não existam no Supabase
    if (error && (error.message.includes('column') || error.message.includes('telegram') || error.message.includes('benefit_cards') || error.message.includes('theme_layout') || error.message.includes('color_palette') || error.message.includes('logo_url'))) {
      console.warn('[storeConfigService] ⚠️ Coluna opcional ausente em store_config, tentando salvar sem elas:', error.message);
      const cleanPayload: any = { ...payload };
      delete cleanPayload.telegram_bot_token;
      delete cleanPayload.telegram_chat_id;
      delete cleanPayload.benefit_cards;
      delete cleanPayload.primary_color;
      delete cleanPayload.theme_layout;
      delete cleanPayload.color_palette;
      delete cleanPayload.whatsapp_default_message;
      delete cleanPayload.logo_url;
      const retry = await supabase.from('store_config').upsert([cleanPayload], { onConflict: 'id' });
      error = retry.error;
    }

    // 2. Se falhar por outro motivo, tenta na tabela site_settings
    if (error) {
      console.warn('[storeConfigService] Tentando tabela site_settings...', error.message);
      const res = await supabase
        .from('site_settings')
        .upsert([payload], { onConflict: 'id' });
      error = res.error;
    }

    // 3. Sincroniza também na tabela stores para manter theme_settings preservado
    if (targetStoreId && targetStoreId !== 'store_default') {
      try {
        const { data: currentStoreRow } = await supabase
          .from('stores')
          .select('theme_settings')
          .eq('id', targetStoreId)
          .maybeSingle();

        const currentTheme = currentStoreRow?.theme_settings || {};

        await supabase
          .from('stores')
          .update({
            name: config.storeName,
            store_name: config.storeName,
            slogan: config.slogan,
            whatsapp_number: config.whatsappNumber,
            whatsapp_display: config.whatsappDisplay,
            instagram: config.instagram,
            address: config.address,
            working_hours: config.workingHours,
            logo_url: config.logoUrl || null,
            mp_access_token: config.mpAccessToken || null,
            telegram_bot_token: config.telegramBotToken || null,
            telegram_chat_id: config.telegramChatId || null,
            theme_settings: {
              ...currentTheme,
              primary_color: config.primaryColor || currentTheme.primary_color,
              logo_url: config.logoUrl !== undefined ? config.logoUrl : currentTheme.logo_url,
              benefit_cards: config.benefitCards || DEFAULT_BENEFIT_CARDS,
              whatsapp_default_message: config.whatsappDefaultMessage,
              theme_layout: config.themeLayout || currentTheme.theme_layout || 'classic',
              color_palette: config.colorPalette || currentTheme.color_palette || 'pink_pastel',
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', targetStoreId);
      } catch (syncErr) {
        console.warn('[storeConfigService] Aviso ao sincronizar com stores:', syncErr);
      }
    }

    if (error) {
      console.error('[storeConfigService] ❌ Erro ao salvar configurações no Supabase:', error);
      return { success: false, error: error.message };
    }

    console.log('[storeConfigService] ✅ Configurações salvas no Supabase!');
    return { success: true, error: null };
  } catch (err: any) {
    console.error('[storeConfigService] ❌ Exceção ao salvar configurações:', err);
    return { success: false, error: err.message };
  }
}
