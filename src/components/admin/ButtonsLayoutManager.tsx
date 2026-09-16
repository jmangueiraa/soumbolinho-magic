import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Save, 
  Sparkles, 
  Heart, 
  ShieldCheck, 
  Truck, 
  Download, 
  Zap, 
  MessageCircle, 
  Star, 
  CheckCircle2, 
  Clock, 
  Gift, 
  Award,
  Loader2,
  Check,
  Layout,
  Layers,
  Grid3X3,
  Feather,
  Smartphone,
  Eye,
  CheckCircle,
  FileArchive,
  ShoppingBasket,
  Users,
  Laptop,
  LayoutTemplate,
  X
} from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';
import { useTenant } from '../../context/TenantContext';
import { supabase } from '../../lib/supabase';
import { DEFAULT_BENEFIT_CARDS, DEFAULT_STORE_FEATURES, DEFAULT_MAIN_CTA_TEXT } from '../../data/storeConfig';
import { BenefitCard, ColorPaletteType, ThemeLayoutType, StoreFeatureItem } from '../../types';
import { COLOR_PALETTES, THEME_LAYOUTS, applyThemeToDocument } from '../../utils/theme';

const AVAILABLE_BENEFIT_ICONS = [
  { value: 'heart', label: 'Coração (Arquivos Digitais / Mimo)', icon: Heart, color: 'text-theme-primary' },
  { value: 'shield', label: 'Escudo (Compra Segura / Confiança)', icon: ShieldCheck, color: 'text-theme-primary' },
  { value: 'truck', label: 'Caminhão (Envio / Entrega)', icon: Truck, color: 'text-theme-primary' },
  { value: 'download', label: 'Download (Link Imediato / Baixar)', icon: Download, color: 'text-theme-primary' },
  { value: 'zap', label: 'Raio (Liberação Rápida / Automático)', icon: Zap, color: 'text-[#eab308]' },
  { value: 'message', label: 'WhatsApp / Chat (Atendimento)', icon: MessageCircle, color: 'text-[#25D366]' },
  { value: 'star', label: 'Estrela (Destaque / Qualidade)', icon: Star, color: 'text-[#f59e0b]' },
  { value: 'sparkles', label: 'Brilho / Especial', icon: Sparkles, color: 'text-[#a855f7]' },
  { value: 'check', label: 'Selo Verificado', icon: CheckCircle2, color: 'text-[#10b981]' },
  { value: 'clock', label: 'Relógio / Sempre Aberto', icon: Clock, color: 'text-[#3b82f6]' },
  { value: 'gift', label: 'Presente / Brinde', icon: Gift, color: 'text-theme-primary' },
  { value: 'award', label: 'Troféu / Garantia', icon: Award, color: 'text-[#eab308]' },
];

const AVAILABLE_FEATURE_ICONS = [
  { value: 'file-archive', label: 'Arquivos / Pastas (Editáveis)', icon: FileArchive },
  { value: 'shopping-basket', label: 'Cesta de Compras (Compra Segura)', icon: ShoppingBasket },
  { value: 'users', label: 'Usuários / Pessoas (Acesso Vitalício)', icon: Users },
  { value: 'shield', label: 'Escudo / Segurança (Confiança)', icon: ShieldCheck },
  { value: 'download', label: 'Download / Baixar (Acesso Imediato)', icon: Download },
  { value: 'zap', label: 'Raio / Relâmpago (Envio Rápido)', icon: Zap },
  { value: 'star', label: 'Estrela (Destaque / Qualidade)', icon: Star },
  { value: 'sparkles', label: 'Brilhos (Exclusivo / Especial)', icon: Sparkles },
  { value: 'heart', label: 'Coração (Feito com Amor / Mimos)', icon: Heart },
  { value: 'gift', label: 'Presente (Brindes / Bônus)', icon: Gift },
  { value: 'award', label: 'Troféu / Medalha (Garantia)', icon: Award },
  { value: 'clock', label: 'Relógio (24h / Imediato)', icon: Clock },
  { value: 'check', label: 'Verificado (Aprovado)', icon: CheckCircle2 },
  { value: 'message', label: 'WhatsApp / Chat (Suporte)', icon: MessageCircle },
  { value: 'smartphone', label: 'Celular (Compatível)', icon: Smartphone },
  { value: 'laptop', label: 'Computador (Canva / Online)', icon: Laptop },
];

export const ButtonsLayoutManager: React.FC = () => {
  const { storeConfig, updateStoreConfig, showNotification } = useStoreData();
  const { currentStore, updateCurrentStore, refreshTenant } = useTenant();

  const [activeTab, setActiveTab] = useState<'aparencia' | 'botoes' | 'whatsapp'>('aparencia');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const getInitialLayout = (): ThemeLayoutType => {
    const dbLayout = 
      (currentStore?.layout_style as ThemeLayoutType) ||
      currentStore?.theme_settings?.theme_layout ||
      (currentStore?.theme_settings?.layout_style as ThemeLayoutType) ||
      storeConfig.themeLayout;
    if (dbLayout && ['classic', 'modern', 'minimal', 'featured_grid'].includes(dbLayout)) {
      return dbLayout;
    }
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(`store_${currentStore?.id}_theme_layout`);
        if (cached && ['classic', 'modern', 'minimal', 'featured_grid'].includes(cached)) {
          return cached as ThemeLayoutType;
        }
      }
    } catch {}
    return 'classic';
  };

  const [themeLayout, setThemeLayout] = useState<ThemeLayoutType>(getInitialLayout);

  const [colorPalette, setColorPalette] = useState<ColorPaletteType>(
    currentStore?.color_palette || currentStore?.theme_settings?.color_palette || storeConfig.colorPalette || 'pink_pastel'
  );

  const [primaryColor, setPrimaryColor] = useState(
    currentStore?.primary_color || currentStore?.theme_settings?.primary_color || storeConfig.primaryColor || COLOR_PALETTES.pink_pastel.primary
  );

  const [whatsappDefaultMessage, setWhatsappDefaultMessage] = useState(
    storeConfig.whatsappDefaultMessage || currentStore?.theme_settings?.whatsapp_default_message || 'Olá! Gostaria de mais informações sobre os produtos da loja.'
  );

  const [benefitCards, setBenefitCards] = useState<BenefitCard[]>(
    storeConfig.benefitCards && storeConfig.benefitCards.length > 0 
      ? storeConfig.benefitCards 
      : (currentStore?.theme_settings?.benefit_cards || DEFAULT_BENEFIT_CARDS)
  );

  // Botões de Destaque da Vitrine (3 Botões Redondos + Barra de Ação Azul)
  const [storeFeatures, setStoreFeatures] = useState<StoreFeatureItem[]>(() => {
    const raw = currentStore?.store_features || currentStore?.theme_settings?.store_features || storeConfig?.storeFeatures;
    if (raw && Array.isArray(raw) && raw.length > 0) return raw;
    return DEFAULT_STORE_FEATURES;
  });

  const [mainCtaText, setMainCtaText] = useState<string>(() => {
    if (currentStore?.main_cta_text !== undefined && currentStore?.main_cta_text !== null) {
      return currentStore.main_cta_text;
    }
    if (currentStore?.theme_settings?.main_cta_text !== undefined && currentStore?.theme_settings?.main_cta_text !== null) {
      return currentStore.theme_settings.main_cta_text;
    }
    if (storeConfig?.mainCtaText !== undefined && storeConfig?.mainCtaText !== null) {
      return storeConfig.mainCtaText;
    }
    return DEFAULT_MAIN_CTA_TEXT;
  });

  const [mainCtaLink, setMainCtaLink] = useState<string>(() => {
    return currentStore?.main_cta_link || currentStore?.theme_settings?.main_cta_link || storeConfig?.mainCtaLink || '';
  });

  const handleFeatureChange = (index: number, field: keyof StoreFeatureItem, value: string) => {
    setStoreFeatures((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const hasLoadedRef = React.useRef(false);

  useEffect(() => {
    // Se o usuário já carregou e está interagindo no painel, evita resets acidentais
    if (hasLoadedRef.current) return;

    const currentStoreId = currentStore?.id;
    if (!currentStoreId || currentStoreId === '__resolving_tenant__') return;

    async function loadFreshSettings() {
      try {
        const isEditaveis = 
          currentStoreId === 'store_editaveisdocanva' || 
          currentStoreId === 'editaveisdocanva' || 
          currentStoreId === 'editaveis-do-canva' ||
          (typeof window !== 'undefined' && window.location.hostname.toLowerCase().includes('editaveisdocanva'));

        // Consulta direta na tabela stores
        const storeOrFilter = isEditaveis
          ? 'slug.eq.editaveisdocanva,id.eq.store_editaveisdocanva,custom_domain.ilike.%editaveisdocanva.com.br%,slug.eq.editaveis-do-canva'
          : `id.eq.${currentStoreId},slug.eq.${currentStore?.slug || currentStoreId}`;

        const { data: storeRow } = await supabase
          .from('stores')
          .select('*')
          .or(storeOrFilter)
          .limit(1)
          .maybeSingle();

        // Consulta direta na tabela site_settings
        const siteFilter = isEditaveis
          ? `store_id.eq.${currentStoreId},store_id.eq.store_editaveisdocanva,store_id.eq.editaveisdocanva`
          : `store_id.eq.${currentStoreId}`;

        const { data: siteData } = await supabase
          .from('site_settings')
          .select('*')
          .or(siteFilter)
          .limit(1)
          .maybeSingle();

        // 1. Layout
        const freshLayout = 
          storeRow?.layout_style || 
          storeRow?.theme_layout || 
          storeRow?.theme_settings?.theme_layout || 
          storeRow?.theme_settings?.layout_style || 
          siteData?.theme_layout || 
          storeConfig.themeLayout;

        if (freshLayout && ['classic', 'modern', 'minimal', 'featured_grid'].includes(freshLayout)) {
          setThemeLayout(freshLayout as ThemeLayoutType);
        }

        // 2. Paleta
        const freshPalette = 
          storeRow?.color_palette || 
          storeRow?.theme_settings?.color_palette || 
          siteData?.color_palette || 
          storeConfig.colorPalette;

        if (freshPalette && COLOR_PALETTES[freshPalette as ColorPaletteType]) {
          setColorPalette(freshPalette as ColorPaletteType);
        }

        // 3. Cor Primária
        const freshPrimary = 
          storeRow?.primary_color || 
          storeRow?.theme_settings?.primary_color || 
          siteData?.primary_color || 
          storeConfig.primaryColor;

        if (freshPrimary && freshPrimary.startsWith('#')) {
          setPrimaryColor(freshPrimary);
        }

        // 4. Mensagem WhatsApp
        const freshMsg = 
          storeRow?.theme_settings?.whatsapp_default_message || 
          siteData?.whatsapp_default_message || 
          storeConfig.whatsappDefaultMessage;

        if (freshMsg) {
          setWhatsappDefaultMessage(freshMsg);
        }

        // 5. Benefit Cards
        const freshCards = 
          siteData?.benefit_cards || 
          storeRow?.theme_settings?.benefit_cards || 
          storeConfig.benefitCards;

        if (freshCards) {
          const parsed = typeof freshCards === 'string' ? JSON.parse(freshCards) : freshCards;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBenefitCards(parsed);
          }
        }

        // 6. Store Features (3 Botões de Destaque da Vitrine)
        const freshFeatures = 
          storeRow?.store_features || 
          storeRow?.theme_settings?.store_features || 
          siteData?.store_features || 
          storeConfig?.storeFeatures;

        if (freshFeatures) {
          const parsedFeatures = typeof freshFeatures === 'string' ? JSON.parse(freshFeatures) : freshFeatures;
          if (Array.isArray(parsedFeatures) && parsedFeatures.length > 0) {
            setStoreFeatures(parsedFeatures);
          }
        }

        // 7. Botão / Barra de Destaque Azul (CTA)
        const freshCtaText = 
          storeRow?.main_cta_text ?? 
          storeRow?.theme_settings?.main_cta_text ?? 
          siteData?.main_cta_text ?? 
          storeConfig?.mainCtaText;

        if (freshCtaText !== undefined && freshCtaText !== null) {
          setMainCtaText(freshCtaText);
        }

        const freshCtaLink = 
          storeRow?.main_cta_link ?? 
          storeRow?.theme_settings?.main_cta_link ?? 
          siteData?.main_cta_link ?? 
          storeConfig?.mainCtaLink;

        if (freshCtaLink !== undefined && freshCtaLink !== null) {
          setMainCtaLink(freshCtaLink);
        }

        hasLoadedRef.current = true;
      } catch (err) {
        console.warn('[ButtonsLayoutManager] Aviso ao carregar configurações frescas:', err);
        hasLoadedRef.current = true;
      }
    }

    loadFreshSettings();
  }, [currentStore?.id]);

  const handlePaletteSelect = (paletteId: ColorPaletteType) => {
    setColorPalette(paletteId);
    const chosen = COLOR_PALETTES[paletteId];
    if (chosen) {
      setPrimaryColor(chosen.primary);
      document.documentElement.style.setProperty('--primary-color', chosen.primary);
    }
  };

  const handleLayoutSelect = (layoutId: ThemeLayoutType) => {
    setThemeLayout(layoutId);
    applyThemeToDocument(colorPalette, primaryColor, layoutId);
  };

  const handleCustomColorChange = (hex: string) => {
    setPrimaryColor(hex);
    applyThemeToDocument(colorPalette, hex, themeLayout);
  };

  const handleBenefitChange = (index: number, field: keyof BenefitCard, value: string) => {
    setBenefitCards((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setIsSaving(true);
    setSaveSuccess(false);

    const currentStoreId = currentStore?.id;
    if (!currentStoreId || currentStoreId === '__resolving_tenant__') {
      showNotification('Loja ainda em carregamento. Aguarde...', 'error');
      setIsSaving(false);
      return;
    }
    try {
      const isEditaveis = 
        currentStoreId === 'store_editaveisdocanva' || 
        currentStoreId === 'editaveisdocanva' || 
        currentStoreId === 'editaveis-do-canva' ||
        (typeof window !== 'undefined' && window.location.hostname.toLowerCase().includes('editaveisdocanva'));

      // 1. Gravação direta na tabela stores (Multi-Tenant por ID, Slug e Variantes)
      const storePayload: any = {
        primary_color: primaryColor,
        layout_style: themeLayout,
        theme_layout: themeLayout,
        color_palette: colorPalette,
        whatsapp_default_message: whatsappDefaultMessage.trim(),
        store_features: storeFeatures,
        main_cta_text: mainCtaText.trim(),
        main_cta_link: mainCtaLink.trim(),
        theme_settings: {
          ...(currentStore?.theme_settings || {}),
          primary_color: primaryColor,
          layout_style: themeLayout,
          theme_layout: themeLayout,
          color_palette: colorPalette,
          whatsapp_default_message: whatsappDefaultMessage.trim(),
          benefit_cards: benefitCards,
          store_features: storeFeatures,
          main_cta_text: mainCtaText.trim(),
          main_cta_link: mainCtaLink.trim(),
        },
        updated_at: new Date().toISOString(),
      };

      if (storeConfig.whatsappNumber) {
        storePayload.whatsapp_number = storeConfig.whatsappNumber;
      }
      if (storeConfig.whatsappDisplay) {
        storePayload.whatsapp_display = storeConfig.whatsappDisplay;
      }

      let storeUpdated = false;

      // Salva por ID com loop adaptativo e verificação .select()
      let idPayload = { ...storePayload };
      for (let attempt = 0; attempt < 8; attempt++) {
        const { data: idRows, error: errId } = await supabase
          .from('stores')
          .update(idPayload)
          .eq('id', currentStoreId)
          .select();

        if (!errId && idRows && idRows.length > 0) {
          storeUpdated = true;
          console.log('[ButtonsLayoutManager] ✅ Tabela stores atualizada por ID com sucesso!', idRows[0]);
          break;
        }

        if (errId) {
          console.warn(`[ButtonsLayoutManager] Tentativa ${attempt + 1} em stores por ID:`, errId.message);
          const colMatch = errId.message?.match(/Could not find the '([^']+)' column/i);
          if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
            delete idPayload[colMatch[1]];
            continue;
          }
        }
        break;
      }

      // Salva por slug se disponível e se o ID não atualizou linhas
      if (!storeUpdated && currentStore?.slug) {
        let slugPayload = { ...storePayload };
        for (let attempt = 0; attempt < 8; attempt++) {
          const { data: slugRows, error: errSlug } = await supabase
            .from('stores')
            .update(slugPayload)
            .eq('slug', currentStore.slug)
            .select();

          if (!errSlug && slugRows && slugRows.length > 0) {
            storeUpdated = true;
            console.log('[ButtonsLayoutManager] ✅ Tabela stores atualizada por slug com sucesso!', slugRows[0]);
            break;
          }

          if (errSlug) {
            const colMatch = errSlug.message?.match(/Could not find the '([^']+)' column/i);
            if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
              delete slugPayload[colMatch[1]];
              continue;
            }
          }
          break;
        }
      }

      // Fallback Matriz AJPSTORE caso nem ID nem Slug tenham casado individualmente
      if (!storeUpdated && (currentStoreId.includes('ajp') || currentStore?.slug === 'ajpstore' || currentStore?.is_matriz)) {
        let matrizPayload = { ...storePayload };
        for (let attempt = 0; attempt < 8; attempt++) {
          const { data: mRows, error: errM } = await supabase
            .from('stores')
            .update(matrizPayload)
            .or('slug.eq.ajpstore,id.eq.store_ajpstore,is_matriz.eq.true')
            .select();

          if (!errM && mRows && mRows.length > 0) {
            storeUpdated = true;
            console.log('[ButtonsLayoutManager] ✅ Tabela stores atualizada via Matriz AJPSTORE!');
            break;
          }

          if (errM) {
            const colMatch = errM.message?.match(/Could not find the '([^']+)' column/i);
            if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
              delete matrizPayload[colMatch[1]];
              continue;
            }
          }
          break;
        }
      }

      // Salva por variantes de Editáveis se aplicável
      if (!storeUpdated && isEditaveis) {
        let editPayload = { ...storePayload };
        for (let attempt = 0; attempt < 8; attempt++) {
          const { data: eRows, error: errEdit } = await supabase
            .from('stores')
            .update(editPayload)
            .or('slug.eq.editaveisdocanva,id.eq.store_editaveisdocanva,custom_domain.ilike.%editaveisdocanva.com.br%,slug.eq.editaveis-do-canva')
            .select();

          if (!errEdit && eRows && eRows.length > 0) {
            storeUpdated = true;
            console.log('[ButtonsLayoutManager] ✅ Tabela stores atualizada via variantes Editáveis!');
            break;
          }
          if (errEdit) {
            const colMatch = errEdit.message?.match(/Could not find the '([^']+)' column/i);
            if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
              delete editPayload[colMatch[1]];
              continue;
            }
          }
          break;
        }
      }

      // 2. Gravação na tabela site_settings filtrando pela loja ativa atual (CRUCIAL)
      const siteSettingsPayload: any = {
        store_id: currentStoreId,
        whatsapp_default_message: whatsappDefaultMessage.trim(),
        theme_layout: themeLayout,
        color_palette: colorPalette,
        primary_color: primaryColor,
        benefit_cards: benefitCards,
        store_features: storeFeatures,
        main_cta_text: mainCtaText.trim(),
        main_cta_link: mainCtaLink.trim(),
        updated_at: new Date().toISOString()
      };

      console.log(`[ButtonsLayoutManager] 🔄 Gravando site_settings para store_id="${currentStoreId}"...`);
      const { data: updatedRows, error: siteUpdateError } = await supabase
        .from('site_settings')
        .update(siteSettingsPayload)
        .eq('store_id', currentStoreId)
        .select();

      if (siteUpdateError || !updatedRows || updatedRows.length === 0) {
        const { error: upsertErr } = await supabase
          .from('site_settings')
          .upsert([siteSettingsPayload], { onConflict: 'store_id' });
        if (upsertErr) {
          console.warn('[ButtonsLayoutManager] Aviso ao dar upsert em site_settings:', upsertErr.message);
          const fallbackSitePayload = {
            store_id: currentStoreId,
            whatsapp_default_message: whatsappDefaultMessage.trim(),
            theme_layout: themeLayout,
            color_palette: colorPalette,
            primary_color: primaryColor,
            benefit_cards: benefitCards,
            updated_at: new Date().toISOString()
          };
          await supabase.from('site_settings').upsert([fallbackSitePayload], { onConflict: 'store_id' });
        }
      }

      if (isEditaveis) {
        for (const aliasId of ['store_editaveisdocanva', 'editaveisdocanva']) {
          if (aliasId !== currentStoreId) {
            await supabase
              .from('site_settings')
              .update({ ...siteSettingsPayload, store_id: aliasId })
              .eq('store_id', aliasId);
          }
        }
      }

      // 3. Persistência imediata no LocalStorage para resposta instantânea
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(`store_${currentStoreId}_theme_layout`, themeLayout);
          localStorage.setItem('soumbolinho_theme_layout', themeLayout);
          localStorage.setItem(`store_${currentStoreId}_color_palette`, colorPalette);
          localStorage.setItem('soumbolinho_color_palette', colorPalette);
          localStorage.setItem(`store_${currentStoreId}_primary_color`, primaryColor);
          localStorage.setItem('soumbolinho_primary_color', primaryColor);
          if (isEditaveis) {
            localStorage.setItem('store_store_editaveisdocanva_theme_layout', themeLayout);
            localStorage.setItem('store_editaveisdocanva_theme_layout', themeLayout);
            localStorage.setItem('store_store_editaveisdocanva_color_palette', colorPalette);
            localStorage.setItem('store_editaveisdocanva_color_palette', colorPalette);
            localStorage.setItem('store_store_editaveisdocanva_primary_color', primaryColor);
            localStorage.setItem('store_editaveisdocanva_primary_color', primaryColor);
          }
        }
      } catch (e) {}

      // 4. Atualiza storeConfig no contexto (persiste em store_config)
      await updateStoreConfig({
        themeLayout,
        colorPalette,
        primaryColor,
        whatsappDefaultMessage: whatsappDefaultMessage.trim(),
        benefitCards,
        storeFeatures,
        mainCtaText: mainCtaText.trim(),
        mainCtaLink: mainCtaLink.trim(),
      });

      // 5. Atualiza TenantContext em memória sem recarregar a tela
      if (updateCurrentStore) {
        updateCurrentStore({
          layout_style: themeLayout,
          theme_layout: themeLayout,
          primary_color: primaryColor,
          color_palette: colorPalette,
          store_features: storeFeatures,
          main_cta_text: mainCtaText.trim(),
          main_cta_link: mainCtaLink.trim(),
          theme_settings: {
            ...(currentStore?.theme_settings || {}),
            primary_color: primaryColor,
            layout_style: themeLayout,
            theme_layout: themeLayout,
            color_palette: colorPalette,
            whatsapp_default_message: whatsappDefaultMessage.trim(),
            benefit_cards: benefitCards,
            store_features: storeFeatures,
            main_cta_text: mainCtaText.trim(),
            main_cta_link: mainCtaLink.trim(),
          }
        });
      }
      if (refreshTenant) {
        await refreshTenant(true); // silent refresh
      }

      // 6. Aplica no DOM em tempo real
      applyThemeToDocument(colorPalette, primaryColor, themeLayout);

      hasLoadedRef.current = true;
      setIsSaving(false);
      setSaveSuccess(true);
      showNotification('Botões, Layout e Cores salvos com sucesso no Supabase!', 'success');
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error('[ButtonsLayoutManager] Erro ao salvar layout:', err);
      setIsSaving(false);
      showNotification('Erro ao salvar layout e cores.', 'error');
    }
  };

  const activePaletteObj = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.pink_pastel;
  const activeLayoutObj = THEME_LAYOUTS[themeLayout] || THEME_LAYOUTS.classic;

  return (
    <div className="min-h-screen pb-24 font-sans text-gray-800">
      
      {/* CABEÇALHO */}
      <header className="bg-white rounded-2xl p-5 mb-6 shadow-xs border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 text-purple-700 p-2.5 rounded-xl shrink-0">
              <Palette size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Layout e Cores</h1>
              <p className="text-xs text-gray-500">Personalize a vitrine da sua loja</p>
            </div>
          </div>

          {/* Botões de Ação do Topo */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye size={16} />
              <span>Prévia</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Salvar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO POR ABAS (Scroll Horizontal no Mobile) */}
        <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar gap-2 sm:gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('aparencia')}
            className={`pb-3 px-2 text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors relative cursor-pointer ${
              activeTab === 'aparencia'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutTemplate size={18} />
            Aparência
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('botoes')}
            className={`pb-3 px-2 text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors relative cursor-pointer ${
              activeTab === 'botoes'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Layers size={18} />
            Botões e Destaques
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`pb-3 px-2 text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors relative cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageCircle size={18} />
            WhatsApp
          </button>
        </div>
      </header>

      {/* FEEDBACK DE SALVAMENTO */}
      {saveSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs sm:text-sm font-medium animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Preferências de layout, cores e destaques salvas com sucesso no banco de dados!</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 1: APARÊNCIA (LAYOUTS + PALETAS DE CORES) */}
      {/* ========================================================= */}
      {activeTab === 'aparencia' && (
        <div className="space-y-6">
          
          {/* Seção 1: Modelo de Layout */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                  <LayoutTemplate size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900">Modelo de Layout da Vitrine</h2>
                  <p className="text-xs text-gray-500">Escolha como os produtos, menus e categorias serão dispostos</p>
                </div>
              </div>

              <span className="text-[11px] font-bold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200 self-start sm:self-auto">
                Ativo: {activeLayoutObj.name}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(THEME_LAYOUTS) as ThemeLayoutType[]).map((layoutKey) => {
                const layout = THEME_LAYOUTS[layoutKey];
                const isSelected = themeLayout === layoutKey;

                return (
                  <div
                    key={layoutKey}
                    onClick={() => handleLayoutSelect(layoutKey)}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/20 shadow-xs ring-2 ring-purple-600/10'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {layoutKey === 'classic' && <Layers className="w-4 h-4 text-gray-700" />}
                          {layoutKey === 'modern' && <Sparkles className="w-4 h-4 text-purple-600" />}
                          {layoutKey === 'minimal' && <Feather className="w-4 h-4 text-emerald-600" />}
                          {layoutKey === 'featured_grid' && <Grid3X3 className="w-4 h-4 text-blue-600" />}
                          <span className="font-bold text-sm text-gray-900">{layout.name}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {isSelected ? 'Ativo' : layout.tag}
                          </span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 leading-relaxed mb-3">
                        {layout.description}
                      </p>

                      {/* Mini Wireframe Ilustrativo */}
                      <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 mb-3 space-y-1.5">
                        <div className="h-2 w-full bg-gray-800 rounded-xs opacity-90" />
                        <div className="h-4 w-full bg-purple-100 rounded-xs flex items-center justify-center text-[8px] text-purple-700 font-bold">
                          Banner da Loja
                        </div>

                        {layoutKey === 'featured_grid' ? (
                          <div className="grid grid-cols-5 gap-1 pt-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <div key={n} className="h-6 bg-blue-100 border border-blue-200 rounded-xs" />
                            ))}
                          </div>
                        ) : layoutKey === 'modern' ? (
                          <div className="space-y-1">
                            <div className="flex gap-1 justify-center">
                              <div className="h-1.5 w-6 bg-purple-200 rounded-full" />
                              <div className="h-1.5 w-8 bg-purple-400 rounded-full" />
                              <div className="h-1.5 w-6 bg-purple-200 rounded-full" />
                            </div>
                            <div className="grid grid-cols-3 gap-1 pt-0.5">
                              {[1, 2, 3].map((n) => (
                                <div key={n} className="h-6 bg-purple-100 border border-purple-200 rounded-md" />
                              ))}
                            </div>
                          </div>
                        ) : layoutKey === 'minimal' ? (
                          <div className="grid grid-cols-3 gap-1 pt-0.5">
                            {[1, 2, 3].map((n) => (
                              <div key={n} className="h-7 bg-white border border-gray-300 rounded-none" />
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 gap-1 pt-0.5">
                            <div className="col-span-1 h-7 bg-gray-200 rounded-xs" />
                            <div className="col-span-3 grid grid-cols-3 gap-1">
                              {[1, 2, 3].map((n) => (
                                <div key={n} className="h-7 bg-purple-50 border border-purple-200 rounded-xs" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Features list */}
                    <ul className="space-y-1 pt-1 border-t border-gray-100">
                      {layout.features.map((feat, fIdx) => (
                        <li key={fIdx} className="text-[11px] text-gray-500 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção 2: Paletas de Cores */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center font-bold text-xs">
                  <Palette size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900">Paleta de Cores Institucional</h2>
                  <p className="text-xs text-gray-500">Transforme botões, badges e detalhes visuais da loja com 1 clique</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: primaryColor }} />
                <span className="text-xs font-mono font-bold text-gray-700">{primaryColor}</span>
              </div>
            </div>

            {/* Grid de Paletas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(Object.keys(COLOR_PALETTES) as ColorPaletteType[]).map((paletteKey) => {
                const pal = COLOR_PALETTES[paletteKey];
                const isSelected = colorPalette === paletteKey;

                return (
                  <div
                    key={paletteKey}
                    onClick={() => handlePaletteSelect(paletteKey)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/20 shadow-xs ring-2 ring-purple-600/10'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/40'
                    }`}
                  >
                    <div>
                      {/* Amostras de cores */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <span 
                          className="w-7 h-7 rounded-xl shadow-xs border border-black/10" 
                          style={{ backgroundColor: pal.primary }} 
                          title={`Cor Primária: ${pal.primary}`}
                        />
                        <span 
                          className="w-7 h-7 rounded-xl shadow-xs border border-black/10" 
                          style={{ backgroundColor: pal.accent }} 
                          title={`Cor de Destaque: ${pal.accent}`}
                        />
                        <span 
                          className="w-7 h-7 rounded-xl shadow-xs border border-gray-300" 
                          style={{ backgroundColor: pal.primaryLight }} 
                          title={`Fundo Suave: ${pal.primaryLight}`}
                        />
                        <span 
                          className="w-7 h-7 rounded-xl shadow-xs border border-black/10" 
                          style={{ backgroundColor: pal.headerBg }} 
                          title={`Fundo Cabeçalho: ${pal.headerBg}`}
                        />
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-xs text-gray-900">{pal.name}</h3>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-gray-500 leading-tight">
                        {pal.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-mono text-gray-600">
                      <span className="font-bold">{pal.primary}</span>
                      <span className={`text-[10px] uppercase font-bold ${isSelected ? 'text-purple-600' : 'text-gray-400'}`}>
                        {isSelected ? 'Ativa' : 'Selecionar'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ajuste Fino da Cor Primária */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-800">
                  Ajuste Fino da Cor Primária
                </label>
                <p className="text-[11px] text-gray-500">
                  Personalize o código hexadecimal exato da identidade da sua marca
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => handleCustomColorChange(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-gray-300 p-0.5 bg-white shrink-0"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => handleCustomColorChange(e.target.value)}
                  placeholder="#FF1493"
                  className="w-28 text-xs sm:text-sm px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 font-mono font-bold"
                />
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 2: BOTÕES E DESTAQUES (TOPO + CTA AZUL + RODAPÉ) */}
      {/* ========================================================= */}
      {activeTab === 'botoes' && (
        <div className="space-y-6">

          {/* Subseção A: 3 Botões Circulares do Topo da Vitrine */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  <Layers size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900">3 Botões Circulares em Destaque</h2>
                  <p className="text-xs text-gray-500">Exibidos no topo da vitrine. Deixe o título em branco para ocultar o botão correspondente.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {storeFeatures.map((feat, idx) => {
                const selectedIconObj = AVAILABLE_FEATURE_ICONS.find((i) => i.value === feat.icon) || AVAILABLE_FEATURE_ICONS[0];
                const IconComponent = selectedIconObj.icon;

                return (
                  <div key={feat.id || idx} className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        Botão {idx + 1}
                      </span>

                      {/* Mini Live Preview */}
                      <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-xs">
                        <IconComponent className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Ícone
                        </label>
                        <select
                          value={feat.icon}
                          onChange={(e) => handleFeatureChange(idx, 'icon', e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-gray-800 font-medium cursor-pointer"
                        >
                          {AVAILABLE_FEATURE_ICONS.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Texto Principal (Título)
                        </label>
                        <input
                          type="text"
                          value={feat.title}
                          onChange={(e) => handleFeatureChange(idx, 'title', e.target.value)}
                          placeholder="Ex: Arquivos Editáveis (vazio = ocultar)"
                          className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-gray-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Subtítulo / Linha 2 (Opcional)
                        </label>
                        <input
                          type="text"
                          value={feat.subtitle || ''}
                          onChange={(e) => handleFeatureChange(idx, 'subtitle', e.target.value)}
                          placeholder="Ex: Editáveis"
                          className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-gray-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Link de Redirecionamento (Opcional)
                        </label>
                        <input
                          type="text"
                          value={feat.link || ''}
                          onChange={(e) => handleFeatureChange(idx, 'link', e.target.value)}
                          placeholder="Ex: #produtos ou /categoria/canva"
                          className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-gray-800"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subseção B: Barra / Botão Principal de Destaque Azul */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#00a8e8]/15 text-[#00a8e8] flex items-center justify-center font-bold text-xs">
                  <Zap size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900">Botão Principal de Destaque (Barra Azul)</h2>
                  <p className="text-xs text-gray-500">Barra de aviso ou promoção logo acima do catálogo. Deixe vazio para ocultar.</p>
                </div>
              </div>
            </div>

            {/* Live Preview da Barra Azul */}
            {mainCtaText && mainCtaText.trim().length > 0 && (
              <div className="w-full py-3 px-4 bg-[#00a8e8] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs text-center">
                <span>{mainCtaText}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Texto do Botão Azul
                </label>
                <input
                  type="text"
                  value={mainCtaText}
                  onChange={(e) => setMainCtaText(e.target.value)}
                  placeholder="Ex: Toda loja com Download imediato!"
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-gray-800"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  💡 Deixe em branco se preferir não exibir esta barra.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Link de Redirecionamento (Opcional)
                </label>
                <input
                  type="text"
                  value={mainCtaLink}
                  onChange={(e) => setMainCtaLink(e.target.value)}
                  placeholder="Ex: #produtos ou /promocoes"
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-gray-800"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  💡 Redireciona o cliente para este destino ao clicar na barra.
                </p>
              </div>
            </div>
          </div>

          {/* Subseção C: 4 Botões Informativos de Benefícios (Rodapé) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900">4 Botões Informativos de Destaque (Rodapé)</h2>
                  <p className="text-xs text-gray-500">Configure os títulos, descrições e ícones que aparecem nos 4 cards no rodapé</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefitCards.map((card, idx) => {
                const selectedIconObj = AVAILABLE_BENEFIT_ICONS.find((i) => i.value === card.icon) || AVAILABLE_BENEFIT_ICONS[0];
                const IconComponent = selectedIconObj.icon;

                return (
                  <div key={card.id || idx} className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        Botão {idx + 1}
                      </span>
                      
                      {/* Live Preview Badge */}
                      <div className="flex items-center gap-2 px-2.5 py-1 bg-gray-900 rounded-lg text-white text-xs">
                        <IconComponent className={`w-3.5 h-3.5 ${selectedIconObj.color}`} />
                        <span className="truncate max-w-[130px] font-medium text-[11px]">{card.title || `Botão ${idx + 1}`}</span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Ícone
                        </label>
                        <select
                          value={card.icon}
                          onChange={(e) => handleBenefitChange(idx, 'icon', e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-gray-800 font-medium cursor-pointer"
                        >
                          {AVAILABLE_BENEFIT_ICONS.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Título Principal *
                        </label>
                        <input
                          type="text"
                          required
                          value={card.title}
                          onChange={(e) => handleBenefitChange(idx, 'title', e.target.value)}
                          placeholder="Ex: Arquivos Digitais"
                          className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-gray-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Subtítulo / Descrição
                        </label>
                        <input
                          type="text"
                          value={card.description}
                          onChange={(e) => handleBenefitChange(idx, 'description', e.target.value)}
                          placeholder={idx === 3 ? "Ex: SeuWhatsAppWhatsApp (ou telefone de atendimento)" : "Ex: Modelos prontos para impressão"}
                          className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-gray-800"
                        />
                        {idx === 3 && (
                          <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                            💡 Dica: Se mantiver "SeuWhatsAppWhatsApp" ou deixar em branco, o sistema exibirá automaticamente o número de WhatsApp cadastrado.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 3: WHATSAPP (MENSAGEM PADRÃO) */}
      {/* ========================================================= */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#25D366] flex items-center justify-center font-bold text-xs">
                  <MessageCircle size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900">Mensagem Padrão do WhatsApp</h2>
                  <p className="text-xs text-gray-500">Texto inicial que é enviado no WhatsApp quando o cliente clica para falar com o suporte</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700">
                Texto da Mensagem Inicial
              </label>
              <textarea
                rows={3}
                value={whatsappDefaultMessage}
                onChange={(e) => setWhatsappDefaultMessage(e.target.value)}
                placeholder="Ex: Olá! Gostaria de mais informações sobre os produtos da loja."
                className="w-full text-xs sm:text-sm p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-gray-800 transition-all resize-none"
              />
              <p className="text-[11px] text-gray-500">
                💡 Quando o cliente clica no botão do WhatsApp da sua loja, essa frase já estará pronta no chat dele, bastando apenas enviar.
              </p>
            </div>

            {/* Simulação Visual de Conversa WhatsApp */}
            <div className="mt-4 p-4 rounded-xl bg-[#e5ddd5] border border-gray-300 max-w-md">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-300/60">
                <div className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center text-xs font-bold">
                  W
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-900 block leading-tight">Atendimento WhatsApp</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Online</span>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="bg-[#dcf8c6] p-3 rounded-xl rounded-tr-xs shadow-xs text-xs text-gray-800 max-w-[85%]">
                  <p>{whatsappDefaultMessage || 'Olá! Gostaria de mais informações sobre os produtos da loja.'}</p>
                  <span className="text-[9px] text-gray-500 block text-right mt-1">12:00 ✓✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE PRÉ-VISUALIZAÇÃO AO VIVO (POPUP COM 'X') */}
      {/* ========================================================= */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <div className="bg-gray-950 text-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-800 shadow-2xl p-6 sm:p-8 space-y-6">
            
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-600 text-white">
                  <Eye size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Pré-visualização da Sua Vitrine</h3>
                  <p className="text-xs text-gray-400">Veja como seus destaques, cores e layout aparecerão para os clientes</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
                title="Fechar Prévia"
              >
                <X size={20} />
              </button>
            </div>

            {/* Badges de Configuração Ativa */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-gray-200">
                Layout: <strong>{activeLayoutObj.name}</strong>
              </span>
              <span className="px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-gray-200 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                <span>Paleta: <strong>{activePaletteObj.name.split('/')[0]}</strong></span>
              </span>
            </div>

            {/* Simulação: Destaques do Topo da Vitrine */}
            <div className="bg-gray-900/70 p-5 rounded-2xl border border-gray-800 space-y-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Topo da Loja: 3 Botões Circulares
              </span>

              <div className="flex items-center justify-center gap-4 sm:gap-8 py-2">
                {storeFeatures.filter(f => f.title && f.title.trim()).map((feat, idx) => {
                  const selectedIconObj = AVAILABLE_FEATURE_ICONS.find((i) => i.value === feat.icon) || AVAILABLE_FEATURE_ICONS[0];
                  const IconComponent = selectedIconObj.icon;

                  return (
                    <div key={idx} className="flex flex-col items-center space-y-1.5 text-center">
                      <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-md border border-gray-700">
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-gray-200 leading-tight block max-w-[90px] truncate">
                        {feat.title}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Barra Azul / CTA */}
              {mainCtaText && mainCtaText.trim().length > 0 && (
                <div className="w-full max-w-lg mx-auto py-2.5 px-4 bg-[#00a8e8] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md text-center">
                  <span>{mainCtaText}</span>
                </div>
              )}
            </div>

            {/* Simulação: Cards Informativos do Rodapé */}
            <div className="bg-gray-900/70 p-5 rounded-2xl border border-gray-800 space-y-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Rodapé da Loja: 4 Botões de Benefícios
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {benefitCards.map((card, idx) => {
                  const selectedIconObj = AVAILABLE_BENEFIT_ICONS.find((i) => i.value === card.icon) || AVAILABLE_BENEFIT_ICONS[0];
                  const IconComponent = selectedIconObj.icon;
                  const isWhatsAppCard = card.icon === 'message' || card.id === 'card_4';
                  const displayDesc = isWhatsAppCard && (!card.description || card.description === 'SeuWhatsAppWhatsApp')
                    ? (storeConfig.whatsappDisplay || '(21) 99999-9999')
                    : card.description;

                  return (
                    <div key={card.id || idx} className="flex items-center gap-3 p-3 rounded-xl bg-gray-950 border border-gray-800">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${primaryColor}25` }}
                      >
                        <IconComponent className="w-5 h-5" style={{ color: primaryColor }} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{card.title || `Botão ${idx + 1}`}</h4>
                        <p className="text-[11px] text-gray-400 truncate">{displayDesc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex justify-end pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Fechar Prévia
              </button>
            </div>

          </div>
        </div>
      )}

      {/* BARRA FIXA DE AÇÃO INFERIOR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20 flex justify-between items-center max-w-5xl mx-auto rounded-t-2xl shadow-lg sm:px-6">
        <button 
          type="button"
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <Eye size={18} />
          <span>Ver Prévia</span>
        </button>

        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isSaving}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Salvando Alterações...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Salvar Alterações</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};

export default ButtonsLayoutManager;

