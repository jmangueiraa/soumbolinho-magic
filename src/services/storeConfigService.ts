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
    logoUrl: item.logo_url || item.logoUrl || undefined,
    onlyLogo: item.only_logo !== undefined ? Boolean(item.only_logo) : (item.onlyLogo !== undefined ? Boolean(item.onlyLogo) : undefined),
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
      targetStoreId === 'ajpstore' ||
      targetStoreId === 'store_ajpstore' ||
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

      // Consulta complementar na tabela stores para obter credenciais e dados exclusivos da loja
      let storeRow: any = null;
      try {
        const { data: sRow } = await supabase
          .from('stores')
          .select('*')
          .or(`id.eq.${targetStoreId},slug.eq.${targetStoreId}`)
          .limit(1)
          .maybeSingle();
        if (sRow) storeRow = sRow;
      } catch (e) {
        console.warn('[storeConfigService] Aviso ao buscar stores:', e);
      }

      if (clientConfig) {
        console.log(`[storeConfigService] ✅ Configurações exclusivas da loja "${storeId}" encontradas:`, clientConfig.store_name);
        const mapped = mapSupabaseConfig(clientConfig);

        // Mescla dados das colunas exclusivas da tabela stores (credenciais e tema)
        if (storeRow) {
          const stTheme = storeRow.theme_settings || {};
          if (storeRow.mp_access_token) mapped.mpAccessToken = storeRow.mp_access_token;
          else if (stTheme.mp_access_token) mapped.mpAccessToken = stTheme.mp_access_token;

          if (storeRow.telegram_bot_token) mapped.telegramBotToken = storeRow.telegram_bot_token;
          else if (stTheme.telegram_bot_token) mapped.telegramBotToken = stTheme.telegram_bot_token;

          if (storeRow.telegram_chat_id) mapped.telegramChatId = storeRow.telegram_chat_id;
          else if (stTheme.telegram_chat_id) mapped.telegramChatId = stTheme.telegram_chat_id;

          if (storeRow.logo_url) mapped.logoUrl = storeRow.logo_url;
          else if (stTheme.logo_url && !mapped.logoUrl) mapped.logoUrl = stTheme.logo_url;
          if (storeRow.only_logo !== undefined) mapped.onlyLogo = Boolean(storeRow.only_logo);
          else if (stTheme.only_logo !== undefined) mapped.onlyLogo = Boolean(stTheme.only_logo);
          else if (storeRow.onlyLogo !== undefined) mapped.onlyLogo = Boolean(storeRow.onlyLogo);
          if (storeRow.whatsapp_number && (!mapped.whatsappNumber || mapped.whatsappNumber === INITIAL_STORE_CONFIG.whatsappNumber)) mapped.whatsappNumber = storeRow.whatsapp_number;
          if (storeRow.whatsapp_display && (!mapped.whatsappDisplay || mapped.whatsappDisplay === INITIAL_STORE_CONFIG.whatsappDisplay)) mapped.whatsappDisplay = storeRow.whatsapp_display;
          if (storeRow.instagram && (!mapped.instagram || mapped.instagram === INITIAL_STORE_CONFIG.instagram)) mapped.instagram = storeRow.instagram;
          if (storeRow.slogan && (!mapped.slogan || mapped.slogan === INITIAL_STORE_CONFIG.slogan)) mapped.slogan = storeRow.slogan;
          if (storeRow.address && (!mapped.address || mapped.address === INITIAL_STORE_CONFIG.address)) mapped.address = storeRow.address;
          if (storeRow.working_hours && (!mapped.workingHours || mapped.workingHours === INITIAL_STORE_CONFIG.workingHours)) mapped.workingHours = storeRow.working_hours;

          // Mapeia layout, paleta e cor primária da tabela stores (layout_style, theme_layout e theme_settings)
          const resolvedRowLayout = storeRow.layout_style || storeRow.theme_layout || stTheme.theme_layout || stTheme.layout_style;
          if (resolvedRowLayout) mapped.themeLayout = resolvedRowLayout;

          const resolvedRowPalette = storeRow.color_palette || stTheme.color_palette;
          if (resolvedRowPalette) mapped.colorPalette = resolvedRowPalette;

          const resolvedRowPrimary = storeRow.primary_color || stTheme.primary_color;
          if (resolvedRowPrimary) mapped.primaryColor = resolvedRowPrimary;

          if (stTheme.whatsapp_default_message) mapped.whatsappDefaultMessage = stTheme.whatsapp_default_message;
          if (stTheme.benefit_cards && Array.isArray(stTheme.benefit_cards) && stTheme.benefit_cards.length > 0) {
            mapped.benefitCards = stTheme.benefit_cards;
          }
        }

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
          if (siteThemeData.only_logo !== undefined) mapped.onlyLogo = Boolean(siteThemeData.only_logo);
          if (siteThemeData.benefit_cards) {
            const parsedCards = typeof siteThemeData.benefit_cards === 'string'
              ? JSON.parse(siteThemeData.benefit_cards)
              : siteThemeData.benefit_cards;
            if (Array.isArray(parsedCards) && parsedCards.length > 0) {
              mapped.benefitCards = parsedCards;
            }
          }
        }

        // Fallback do localStorage para a loja específica ou global
        try {
          if (!mapped.themeLayout && typeof window !== 'undefined') {
            const lsLayout = localStorage.getItem(`store_${storeId}_theme_layout`) || 
                             (targetStoreId.includes('editaveis') ? localStorage.getItem('store_store_editaveisdocanva_theme_layout') || localStorage.getItem('store_editaveisdocanva_theme_layout') : null) ||
                             localStorage.getItem('soumbolinho_theme_layout');
            if (lsLayout) mapped.themeLayout = lsLayout as any;
          }
          if (!mapped.colorPalette && typeof window !== 'undefined') {
            const lsPal = localStorage.getItem(`store_${storeId}_color_palette`) || localStorage.getItem('soumbolinho_color_palette');
            if (lsPal) mapped.colorPalette = lsPal as any;
          }
          if (!mapped.primaryColor && typeof window !== 'undefined') {
            const lsCol = localStorage.getItem(`store_${storeId}_primary_color`) || localStorage.getItem('soumbolinho_primary_color');
            if (lsCol) mapped.primaryColor = lsCol;
          }
          if (!mapped.mpAccessToken && typeof window !== 'undefined') {
            const lsMp = localStorage.getItem(`store_${storeId}_mp_access_token`) || localStorage.getItem('encantando_festa_mp_access_token');
            if (lsMp) mapped.mpAccessToken = lsMp;
          }
          if (!mapped.telegramBotToken && typeof window !== 'undefined') {
            const lsTg = localStorage.getItem(`store_${storeId}_telegram_bot_token`) || localStorage.getItem('encantando_festa_telegram_bot_token');
            if (lsTg) mapped.telegramBotToken = lsTg;
          }
          if (!mapped.telegramChatId && typeof window !== 'undefined') {
            const lsChat = localStorage.getItem(`store_${storeId}_telegram_chat_id`) || localStorage.getItem('encantando_festa_telegram_chat_id');
            if (lsChat) mapped.telegramChatId = lsChat;
          }
        } catch (e) {}

        return { data: mapped, error: null };
      }

      // Se ainda não houver registro em store_config, busca os dados gravados diretamente na tabela stores
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
          mpAccessToken: storeRow.mp_access_token || storeTheme.mp_access_token || (typeof window !== 'undefined' ? localStorage.getItem(`store_${storeRow.id}_mp_access_token`) || localStorage.getItem('encantando_festa_mp_access_token') : undefined) || undefined,
          telegramBotToken: storeRow.telegram_bot_token || storeTheme.telegram_bot_token || (typeof window !== 'undefined' ? localStorage.getItem(`store_${storeRow.id}_telegram_bot_token`) || localStorage.getItem('encantando_festa_telegram_bot_token') : undefined) || undefined,
          telegramChatId: storeRow.telegram_chat_id || storeTheme.telegram_chat_id || (typeof window !== 'undefined' ? localStorage.getItem(`store_${storeRow.id}_telegram_chat_id`) || localStorage.getItem('encantando_festa_telegram_chat_id') : undefined) || undefined,
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

    // Busca dados gravados diretamente na tabela stores da Matriz
    let matrizStoreRow: any = null;
    try {
      const { data: mRow } = await supabase
        .from('stores')
        .select('*')
        .or('slug.eq.ajpstore,id.eq.store_ajpstore,is_matriz.eq.true,slug.eq.suamarcaaqui,id.eq.suamarcaaqui,id.eq.store_default')
        .limit(1)
        .maybeSingle();
      if (mRow) matrizStoreRow = mRow;
    } catch (e) {
      console.warn('[storeConfigService] Aviso ao consultar stores da matriz:', e);
    }

    if (baseData) {
      const mapped = mapSupabaseConfig(baseData);
      if (matrizStoreRow) {
        if (matrizStoreRow.mp_access_token) mapped.mpAccessToken = matrizStoreRow.mp_access_token;
        else if (matrizStoreRow.theme_settings?.mp_access_token) mapped.mpAccessToken = matrizStoreRow.theme_settings.mp_access_token;

        if (matrizStoreRow.telegram_bot_token) mapped.telegramBotToken = matrizStoreRow.telegram_bot_token;
        else if (matrizStoreRow.theme_settings?.telegram_bot_token) mapped.telegramBotToken = matrizStoreRow.theme_settings.telegram_bot_token;

        if (matrizStoreRow.telegram_chat_id) mapped.telegramChatId = matrizStoreRow.telegram_chat_id;
        else if (matrizStoreRow.theme_settings?.telegram_chat_id) mapped.telegramChatId = matrizStoreRow.theme_settings.telegram_chat_id;

        if (matrizStoreRow.logo_url && !mapped.logoUrl) mapped.logoUrl = matrizStoreRow.logo_url;

        const matTheme = matrizStoreRow.theme_settings || {};
        const matLayout = matrizStoreRow.layout_style || matrizStoreRow.theme_layout || matTheme.theme_layout || matTheme.layout_style;
        if (matLayout) mapped.themeLayout = matLayout;
        const matPalette = matrizStoreRow.color_palette || matTheme.color_palette;
        if (matPalette) mapped.colorPalette = matPalette;
        const matPrimary = matrizStoreRow.primary_color || matTheme.primary_color;
        if (matPrimary) mapped.primaryColor = matPrimary;
        if (matTheme.benefit_cards && Array.isArray(matTheme.benefit_cards) && matTheme.benefit_cards.length > 0) {
          mapped.benefitCards = matTheme.benefit_cards;
        }
        if (matTheme.whatsapp_default_message) {
          mapped.whatsappDefaultMessage = matTheme.whatsapp_default_message;
        }
      }
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

      // Fallback em localStorage se ainda não estiver presente:
      try {
        if (!mapped.mpAccessToken) {
          const lsMp = localStorage.getItem('encantando_festa_mp_access_token');
          if (lsMp) mapped.mpAccessToken = lsMp;
        }
        if (!mapped.telegramBotToken) {
          const lsTg = localStorage.getItem('encantando_festa_telegram_bot_token');
          if (lsTg) mapped.telegramBotToken = lsTg;
        }
        if (!mapped.telegramChatId) {
          const lsChat = localStorage.getItem('encantando_festa_telegram_chat_id');
          if (lsChat) mapped.telegramChatId = lsChat;
        }
      } catch {}

      return { data: mapped, error: null };
    }

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
        mpAccessToken: matrizStoreRow.mp_access_token || matrizStoreRow.theme_settings?.mp_access_token || undefined,
        telegramBotToken: matrizStoreRow.telegram_bot_token || matrizStoreRow.theme_settings?.telegram_bot_token || undefined,
        telegramChatId: matrizStoreRow.telegram_chat_id || matrizStoreRow.theme_settings?.telegram_chat_id || undefined,
        benefitCards: resolvedBenefitCards,
        primaryColor: baseSiteTheme?.primary_color || storeTheme.primary_color || '#FF1493',
        themeLayout: baseSiteTheme?.theme_layout || storeTheme.theme_layout || 'classic',
        colorPalette: baseSiteTheme?.color_palette || storeTheme.color_palette || 'pink_pastel',
        whatsappDefaultMessage: baseSiteTheme?.whatsapp_default_message || storeTheme.whatsapp_default_message || undefined,
        logoUrl: baseSiteTheme?.logo_url || storeTheme.logo_url || matrizStoreRow.logo_url || undefined,
      };

      try {
        if (!mapped.mpAccessToken) {
          const lsMp = localStorage.getItem('encantando_festa_mp_access_token');
          if (lsMp) mapped.mpAccessToken = lsMp;
        }
        if (!mapped.telegramBotToken) {
          const lsTg = localStorage.getItem('encantando_festa_telegram_bot_token');
          if (lsTg) mapped.telegramBotToken = lsTg;
        }
        if (!mapped.telegramChatId) {
          const lsChat = localStorage.getItem('encantando_festa_telegram_chat_id');
          if (lsChat) mapped.telegramChatId = lsChat;
        }
      } catch {}

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
    console.log('[storeConfigService] 💾 Executando salvamento das configurações no Supabase:', payload);

    const isEditaveis = 
      targetStoreId === 'store_editaveisdocanva' || 
      targetStoreId === 'editaveisdocanva' || 
      targetStoreId === 'editaveis-do-canva' ||
      (typeof window !== 'undefined' && window.location.hostname.toLowerCase().includes('editaveisdocanva'));

    const isMatrizOrBase = !isEditaveis && (
      targetStoreId === 'ajpstore' || 
      targetStoreId === 'store_ajpstore' || 
      targetStoreId === 'suamarcaaqui'
    );

    const storeOrFilter = isMatrizOrBase
      ? 'slug.eq.ajpstore,id.eq.store_ajpstore,slug.eq.suamarcaaqui,id.eq.suamarcaaqui,id.eq.store_default'
      : isEditaveis
      ? 'slug.eq.editaveisdocanva,id.eq.store_editaveisdocanva,custom_domain.ilike.%editaveisdocanva.com.br%,slug.eq.editaveis-do-canva,id.eq.store_default'
      : `id.eq.${targetStoreId},slug.eq.${targetStoreId}`;

    let storeUpdatedSuccessfully = false;
    try {
      const { data: currentStoreRow } = await supabase
        .from('stores')
        .select('id, slug, theme_settings')
        .or(storeOrFilter)
        .limit(1)
        .maybeSingle();

      const currentTheme = currentStoreRow?.theme_settings || {};
      const actualStoreId = currentStoreRow?.id || targetStoreId;

      const storeUpdatePayload: any = {
        name: config.storeName,
        store_name: config.storeName,
        slogan: config.slogan,
        whatsapp_number: config.whatsappNumber,
        whatsapp_display: config.whatsappDisplay,
        instagram: config.instagram,
        address: config.address,
        working_hours: config.workingHours,
        logo_url: config.logoUrl || null,
        mp_access_token: config.mpAccessToken?.trim() || null,
        telegram_bot_token: config.telegramBotToken?.trim() || null,
        layout_style: config.themeLayout || currentTheme.theme_layout || 'classic',
        theme_layout: config.themeLayout || currentTheme.theme_layout || 'classic',
        primary_color: config.primaryColor || currentTheme.primary_color || '#FF1493',
        color_palette: config.colorPalette || currentTheme.color_palette || 'pink_pastel',
        theme_settings: {
          ...currentTheme,
          layout_style: config.themeLayout || currentTheme.layout_style || currentTheme.theme_layout || 'classic',
          theme_layout: config.themeLayout || currentTheme.theme_layout || 'classic',
          primary_color: config.primaryColor || currentTheme.primary_color || '#FF1493',
          color_palette: config.colorPalette || currentTheme.color_palette || 'pink_pastel',
          logo_url: config.logoUrl !== undefined ? config.logoUrl : currentTheme.logo_url,
          benefit_cards: config.benefitCards || DEFAULT_BENEFIT_CARDS,
          whatsapp_default_message: config.whatsappDefaultMessage,
          mp_access_token: config.mpAccessToken?.trim() || currentTheme.mp_access_token || null,
          telegram_bot_token: config.telegramBotToken?.trim() || currentTheme.telegram_bot_token || null,
          telegram_chat_id: config.telegramChatId?.trim() || currentTheme.telegram_chat_id || null,
        },
        updated_at: new Date().toISOString()
      };

      // Loop adaptativo: remove da raiz apenas colunas que não existirem no schema cache do Supabase,
      // garantindo que theme_settings (JSONB) sempre preserve os tokens do Telegram e Mercado Pago.
      let payloadToUpdate = { ...storeUpdatePayload };
      for (let attempt = 0; attempt < 8; attempt++) {
        const { data: updatedRows, error: storeUpdateErr } = await supabase
          .from('stores')
          .update(payloadToUpdate)
          .eq('id', actualStoreId)
          .select();

        if (!storeUpdateErr && updatedRows && updatedRows.length > 0) {
          storeUpdatedSuccessfully = true;
          console.log(`[storeConfigService] ✅ Tabela stores atualizada com sucesso para loja id="${actualStoreId}"!`);
          break;
        }

        if (storeUpdateErr) {
          console.warn(`[storeConfigService] Tentativa ${attempt + 1} de atualizar stores id="${actualStoreId}":`, storeUpdateErr.message);
          const colMatch = storeUpdateErr.message?.match(/Could not find the '([^']+)' column/i);
          if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
            delete payloadToUpdate[colMatch[1]];
            continue;
          }
        }
        break;
      }

      if (!storeUpdatedSuccessfully && currentStoreRow?.slug) {
        let slugPayload = { ...storeUpdatePayload };
        for (let attempt = 0; attempt < 8; attempt++) {
          const { data: slugRows, error: slugErr } = await supabase
            .from('stores')
            .update(slugPayload)
            .eq('slug', currentStoreRow.slug)
            .select();

          if (!slugErr && slugRows && slugRows.length > 0) {
            storeUpdatedSuccessfully = true;
            console.log(`[storeConfigService] ✅ Tabela stores atualizada via slug="${currentStoreRow.slug}"!`);
            break;
          }

          if (slugErr) {
            const colMatch = slugErr.message?.match(/Could not find the '([^']+)' column/i);
            if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
              delete slugPayload[colMatch[1]];
              continue;
            }
          }
          break;
        }
      }

      if (!storeUpdatedSuccessfully && (targetStoreId === 'ajpstore' || targetStoreId === 'store_ajpstore' || currentStoreRow?.slug === 'ajpstore')) {
        let matrizPayload = { ...storeUpdatePayload };
        for (let attempt = 0; attempt < 8; attempt++) {
          const { data: mRows, error: mErr } = await supabase
            .from('stores')
            .update(matrizPayload)
            .or('slug.eq.ajpstore,id.eq.store_ajpstore,is_matriz.eq.true')
            .select();

          if (!mErr && mRows && mRows.length > 0) {
            storeUpdatedSuccessfully = true;
            console.log('[storeConfigService] ✅ Tabela stores atualizada via Matriz AJPSTORE!');
            break;
          }

          if (mErr) {
            const colMatch = mErr.message?.match(/Could not find the '([^']+)' column/i);
            if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
              delete matrizPayload[colMatch[1]];
              continue;
            }
          }
          break;
        }
      }

      if (!storeUpdatedSuccessfully && isEditaveis) {
        let editaveisPayload = { ...storeUpdatePayload };
        for (let attempt = 0; attempt < 8; attempt++) {
          const { data: eRows, error: eErr } = await supabase
            .from('stores')
            .update(editaveisPayload)
            .or('slug.eq.editaveisdocanva,id.eq.store_editaveisdocanva,custom_domain.ilike.%editaveisdocanva.com.br%,slug.eq.editaveis-do-canva')
            .select();

          if (!eErr && eRows && eRows.length > 0) {
            storeUpdatedSuccessfully = true;
            console.log('[storeConfigService] ✅ Tabela stores atualizada via variantes Editáveis!');
            break;
          }

          if (eErr) {
            const colMatch = eErr.message?.match(/Could not find the '([^']+)' column/i);
            if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
              delete editaveisPayload[colMatch[1]];
              continue;
            }
          }
          break;
        }
      }

      // Persistência espelhada local para resposta imediata
      if (typeof window !== 'undefined') {
        try {
          if (config.telegramBotToken) {
            localStorage.setItem(`store_${actualStoreId}_telegram_bot_token`, config.telegramBotToken.trim());
            localStorage.setItem('encantando_festa_telegram_bot_token', config.telegramBotToken.trim());
          }
          if (config.telegramChatId) {
            localStorage.setItem(`store_${actualStoreId}_telegram_chat_id`, config.telegramChatId.trim());
            localStorage.setItem('encantando_festa_telegram_chat_id', config.telegramChatId.trim());
          }
          if (config.mpAccessToken) {
            const trimmedMp = config.mpAccessToken.trim();
            localStorage.setItem(`store_${actualStoreId}_mp_access_token`, trimmedMp);
            localStorage.setItem('mp_access_token', trimmedMp);
            localStorage.setItem('encantando_festa_mp_access_token', trimmedMp);
          } else if (config.mpAccessToken === '' || config.mpAccessToken === null) {
            localStorage.removeItem(`store_${actualStoreId}_mp_access_token`);
            localStorage.removeItem('mp_access_token');
            localStorage.removeItem('encantando_festa_mp_access_token');
          }
          if (config.themeLayout) {
            localStorage.setItem(`store_${actualStoreId}_theme_layout`, config.themeLayout);
            localStorage.setItem('soumbolinho_theme_layout', config.themeLayout);
            if (isEditaveis) {
              localStorage.setItem('store_store_editaveisdocanva_theme_layout', config.themeLayout);
              localStorage.setItem('store_editaveisdocanva_theme_layout', config.themeLayout);
            }
          }
          if (config.colorPalette) {
            localStorage.setItem(`store_${actualStoreId}_color_palette`, config.colorPalette);
            localStorage.setItem('soumbolinho_color_palette', config.colorPalette);
          }
          if (config.primaryColor) {
            localStorage.setItem(`store_${actualStoreId}_primary_color`, config.primaryColor);
            localStorage.setItem('soumbolinho_primary_color', config.primaryColor);
          }
        } catch (e) {}
      }
    } catch (storeEx) {
      console.warn('[storeConfigService] Exceção ao atualizar stores:', storeEx);
    }

    // 2. Atualização na tabela site_settings exatamente como solicitado pelo usuário (CRUCIAL: filtrando por store_id)
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

      // Se for Editáveis do Canva, atualiza também para as chaves alternativas
      if (isEditaveis) {
        for (const aliasId of ['store_editaveisdocanva', 'editaveisdocanva']) {
          if (aliasId !== targetStoreId) {
            await supabase
              .from('site_settings')
              .update({ ...siteSettingsUpdate, store_id: aliasId })
              .eq('store_id', aliasId);
          }
        }
      }
    } catch (siteEx) {
      console.warn('[storeConfigService] Exceção em site_settings:', siteEx);
    }

    // 3. Tentar upsert na tabela store_config com remoção adaptativa de colunas inexistentes
    let configError: any = null;
    let configPayload: any = { ...payload };
    for (let attempt = 0; attempt < 10; attempt++) {
      const res = await supabase
        .from('store_config')
        .upsert([configPayload], { onConflict: 'id' });

      if (!res.error) {
        configError = null;
        console.log('[storeConfigService] ✅ store_config upsert realizado com sucesso!');
        break;
      }

      configError = res.error;
      const colMatch = res.error.message?.match(/Could not find the '([^']+)' column/i);
      if (colMatch && colMatch[1]) {
        console.warn(`[storeConfigService] Coluna ausente '${colMatch[1]}' em store_config, removendo do payload e tentando novamente...`);
        delete configPayload[colMatch[1]];
        continue;
      }
      break;
    }

    // Se stores foi salvo com sucesso ou store_config foi salvo com sucesso
    if (!configError || storeUpdatedSuccessfully) {
      console.log('[storeConfigService] ✅ Configurações e credenciais de API salvas com sucesso!');
      return { success: true, error: null };
    }

    console.error('[storeConfigService] ❌ Erro ao salvar configurações no Supabase:', configError);
    return { success: false, error: configError?.message || 'Erro ao persistir configurações.' };
  } catch (err: any) {
    console.error('[storeConfigService] ❌ Exceção ao salvar configurações:', err);
    return { success: false, error: err.message };
  }
}
