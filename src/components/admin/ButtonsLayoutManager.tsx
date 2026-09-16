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
    <div className="space-y-8 max-w-5xl">
      
      {/* Header da Aba */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-2xl bg-black text-white">
              <Palette className="w-5 h-5 text-white" />
            </span>
            <h2 className="font-festive text-xl sm:text-2xl font-bold text-slate-900">
              Layout e Cores da Loja
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Escolha o modelo de layout do catálogo, paleta de cores institucional, botões de benefícios e mensagem do WhatsApp.
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-center px-3.5 py-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
          <span>Tema: <strong>{activePaletteObj.name.split('/')[0]}</strong></span>
          <span className="text-slate-300">•</span>
          <span>Layout: <strong>{activeLayoutObj.name}</strong></span>
        </div>
      </div>

      <div className="space-y-8">

        {/* ========================================================= */}
        {/* 1. SELEÇÃO DE LAYOUT DO SITE (4 OPÇÕES VISUAIS) */}
        {/* ========================================================= */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Layout className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>1. Modelo de Layout do Site</span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                    Visual do Catálogo
                  </span>
                </h3>
                <p className="text-xs text-slate-500">Escolha a disposição dos produtos, menus e cabeçalho na sua loja</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(THEME_LAYOUTS) as ThemeLayoutType[]).map((layoutKey) => {
              const layout = THEME_LAYOUTS[layoutKey];
              const isSelected = themeLayout === layoutKey;

              return (
                <div
                  key={layoutKey}
                  onClick={() => handleLayoutSelect(layoutKey)}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-black bg-slate-50/70 shadow-md ring-2 ring-black/5'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/30'
                  }`}
                >
                  {/* Top Header Card */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        {layoutKey === 'classic' && <Layers className="w-4 h-4 text-slate-700" />}
                        {layoutKey === 'modern' && <Sparkles className="w-4 h-4 text-theme-primary" />}
                        {layoutKey === 'minimal' && <Feather className="w-4 h-4 text-emerald-600" />}
                        {layoutKey === 'featured_grid' && <Grid3X3 className="w-4 h-4 text-blue-600" />}
                        <span className="font-bold text-sm text-slate-900">{layout.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-black text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {layout.tag}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      {layout.description}
                    </p>

                    {/* Mini Wireframe Ilustrativo */}
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 mb-3 space-y-1.5 shadow-2xs">
                      {/* Top bar */}
                      <div className="h-2 w-full bg-slate-900 rounded-sm opacity-80" />
                      
                      {/* Banner */}
                      <div className="h-4 w-full bg-slate-200 rounded-sm flex items-center justify-center text-[9px] text-slate-400 font-bold">
                        Banner Topo
                      </div>

                      {/* Content Area Wireframe */}
                      {layoutKey === 'featured_grid' ? (
                        /* Full width grid wireframe */
                        <div className="space-y-1">
                          <div className="h-2 w-3/4 bg-slate-200 rounded-sm mx-auto" />
                          <div className="grid grid-cols-5 gap-1 pt-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <div key={n} className="h-6 bg-blue-50 border border-blue-200 rounded-xs" />
                            ))}
                          </div>
                        </div>
                      ) : layoutKey === 'modern' ? (
                        /* Modern wireframe with horizontal chips */
                        <div className="space-y-1">
                          <div className="flex gap-1 justify-center">
                            <div className="h-1.5 w-6 bg-pink-200 rounded-full" />
                            <div className="h-1.5 w-8 bg-pink-300 rounded-full" />
                            <div className="h-1.5 w-6 bg-pink-200 rounded-full" />
                          </div>
                          <div className="grid grid-cols-3 gap-1 pt-0.5">
                            {[1, 2, 3].map((n) => (
                              <div key={n} className="h-6 bg-pink-50 border border-pink-200 rounded-md" />
                            ))}
                          </div>
                        </div>
                      ) : layoutKey === 'minimal' ? (
                        /* Minimal wireframe */
                        <div className="grid grid-cols-3 gap-1 pt-1">
                          {[1, 2, 3].map((n) => (
                            <div key={n} className="h-7 bg-slate-50 border border-slate-200 rounded-none" />
                          ))}
                        </div>
                      ) : (
                        /* Classic wireframe with left sidebar */
                        <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                          <div className="col-span-1 h-8 bg-slate-100 border border-slate-200 rounded-xs" />
                          <div className="col-span-3 grid grid-cols-3 gap-1">
                            {[1, 2, 3].map((n) => (
                              <div key={n} className="h-8 bg-pink-50/60 border border-pink-100 rounded-xs" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bullet features */}
                  <ul className="space-y-1 pt-1">
                    {layout.features.map((feat, fIdx) => (
                      <li key={fIdx} className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. PALETA DE CORES INSTITUCIONAL (4 OPÇÕES + AJUSTE FINO) */}
        {/* ========================================================= */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-theme-primary text-white flex items-center justify-center shadow-xs">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>2. Paleta de Cores do Site</span>
                  <span className="text-[10px] bg-theme-light text-theme-primary font-bold px-2 py-0.5 rounded-full border border-theme-primary/30">
                    Identidade Visual
                  </span>
                </h3>
                <p className="text-xs text-slate-500">Transforme botões, badges e elementos visuais da loja instantaneamente</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(COLOR_PALETTES) as ColorPaletteType[]).map((paletteKey) => {
              const pal = COLOR_PALETTES[paletteKey];
              const isSelected = colorPalette === paletteKey;

              return (
                <div
                  key={paletteKey}
                  onClick={() => handlePaletteSelect(paletteKey)}
                  className={`p-4 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-black bg-slate-50/80 shadow-md ring-2 ring-black/5'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
                  }`}
                >
                  <div>
                    {/* Amostras de Cores */}
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
                        className="w-7 h-7 rounded-xl shadow-xs border border-slate-300" 
                        style={{ backgroundColor: pal.primaryLight }} 
                        title={`Cor Suave: ${pal.primaryLight}`}
                      />
                      <span 
                        className="w-7 h-7 rounded-xl shadow-xs border border-black/10" 
                        style={{ backgroundColor: pal.headerBg }} 
                        title={`Fundo do Cabeçalho: ${pal.headerBg}`}
                      />
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-xs text-slate-900">{pal.name}</h4>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 leading-tight">
                      {pal.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono text-slate-600">
                    <span className="font-bold">{pal.primary}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Ativar</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ajuste Fino da Cor Principal (Color Picker e Hex) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800">
                Ajuste Fino da Cor Primária
              </label>
              <p className="text-[11px] text-slate-500">
                Você pode personalizar o código hexadecimal exato da sua marca caso possua uma cor específica
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white shrink-0"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                placeholder="#FF1493"
                className="w-28 text-xs sm:text-sm px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-black font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. BOTÕES DE DESTAQUE DA VITRINE (TOPO DA LOJA) */}
        {/* ========================================================= */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#00a8e8] text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                3. Botões de Destaque da Vitrine (Topo da Loja)
              </h3>
              <p className="text-xs text-slate-500">
                Personalize os 3 botões circulares e a barra de destaque azul exibidos acima dos produtos. Se deixar o campo em branco, o botão correspondente não aparecerá na vitrine pública.
              </p>
            </div>
          </div>

          {/* Subseção A: 3 Botões Redondos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-black inline-block"></span>
                3 Botões Circulares em Destaque
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">Deixe o título vazio para ocultar o botão</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {storeFeatures.map((feat, idx) => {
                const selectedIconObj = AVAILABLE_FEATURE_ICONS.find((i) => i.value === feat.icon) || AVAILABLE_FEATURE_ICONS[0];
                const IconComponent = selectedIconObj.icon;

                return (
                  <div key={feat.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        Botão {idx + 1}
                      </span>

                      {/* Mini Live Preview */}
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shadow-xs">
                          <IconComponent className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Ícone
                        </label>
                        <select
                          value={feat.icon}
                          onChange={(e) => handleFeatureChange(idx, 'icon', e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-black text-slate-800 font-medium cursor-pointer"
                        >
                          {AVAILABLE_FEATURE_ICONS.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Texto Principal (Título)
                        </label>
                        <input
                          type="text"
                          value={feat.title}
                          onChange={(e) => handleFeatureChange(idx, 'title', e.target.value)}
                          placeholder="Ex: Arquivos Editáveis (vazio = ocultar)"
                          className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-black text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Subtítulo / Linha 2 (Opcional)
                        </label>
                        <input
                          type="text"
                          value={feat.subtitle || ''}
                          onChange={(e) => handleFeatureChange(idx, 'subtitle', e.target.value)}
                          placeholder="Ex: Editáveis"
                          className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-black text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Link de Redirecionamento (Opcional)
                        </label>
                        <input
                          type="text"
                          value={feat.link || ''}
                          onChange={(e) => handleFeatureChange(idx, 'link', e.target.value)}
                          placeholder="Ex: #produtos ou /categoria/canva"
                          className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-black text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subseção B: Barra / Botão Principal de Destaque Azul */}
          <div className="pt-4 border-t border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-md bg-[#00a8e8] inline-block"></span>
                Botão Principal de Destaque (Barra Azul)
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">Deixe vazio para ocultar na vitrine</span>
            </div>

            {/* Live Preview da Barra Azul */}
            {mainCtaText && mainCtaText.trim().length > 0 && (
              <div className="w-full py-3 px-4 bg-[#00a8e8] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs text-center">
                <span>{mainCtaText}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/90">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Texto do Botão Azul *
                </label>
                <input
                  type="text"
                  value={mainCtaText}
                  onChange={(e) => setMainCtaText(e.target.value)}
                  placeholder="Ex: Toda loja com Download imediato!"
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-black text-slate-800"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 Deixe em branco caso prefira não exibir este botão na sua vitrine.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Link de Redirecionamento (Opcional)
                </label>
                <input
                  type="text"
                  value={mainCtaLink}
                  onChange={(e) => setMainCtaLink(e.target.value)}
                  placeholder="Ex: #produtos ou /promocoes"
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-black text-slate-800"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 Se preenchido, o cliente será levado a esse link ao clicar no botão.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. OS 4 BOTÕES DE BENEFÍCIOS DO RODAPÉ */}
        {/* ========================================================= */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                4. 4 Botões Informativos de Destaque (Rodapé)
              </h3>
              <p className="text-xs text-slate-500">
                Configure os títulos, textos e ícones que aparecem nos 4 botões no rodapé da loja
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefitCards.map((card, idx) => {
              const selectedIconObj = AVAILABLE_BENEFIT_ICONS.find((i) => i.value === card.icon) || AVAILABLE_BENEFIT_ICONS[0];
              const IconComponent = selectedIconObj.icon;

              return (
                <div key={card.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      Botão {idx + 1}
                    </span>
                    
                    {/* Live Preview Badge */}
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-900 rounded-xl text-white text-xs border border-zinc-800">
                      <IconComponent className={`w-3.5 h-3.5 ${selectedIconObj.color}`} />
                      <span className="truncate max-w-[130px] font-medium text-[11px]">{card.title || `Botão ${idx + 1}`}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Ícone
                      </label>
                      <select
                        value={card.icon}
                        onChange={(e) => handleBenefitChange(idx, 'icon', e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-black text-slate-800 font-medium cursor-pointer"
                      >
                        {AVAILABLE_BENEFIT_ICONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Título Principal *
                      </label>
                      <input
                        type="text"
                        required
                        value={card.title}
                        onChange={(e) => handleBenefitChange(idx, 'title', e.target.value)}
                        placeholder="Ex: Arquivos Digitais"
                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-black text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Subtítulo / Descrição
                      </label>
                      <input
                        type="text"
                        value={card.description}
                        onChange={(e) => handleBenefitChange(idx, 'description', e.target.value)}
                        placeholder={idx === 3 ? "Ex: SeuWhatsAppWhatsApp (ou telefone de atendimento)" : "Ex: Modelos prontos para impressão"}
                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-black text-slate-800"
                      />
                      {idx === 3 && (
                        <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                          💡 Dica: Se mantiver "SeuWhatsAppWhatsApp" ou deixar em branco, o sistema exibirá automaticamente o número de WhatsApp configurado na sua loja.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. BOTÃO DE ATENDIMENTO WHATSAPP & MENSAGEM */}
        {/* ========================================================= */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                5. Mensagem Padrão do WhatsApp
              </h3>
              <p className="text-xs text-slate-500">Texto inicial pré-preenchido ao clicar no suporte ou no card de atendimento</p>
            </div>
          </div>

          <div>
            <input
              type="text"
              value={whatsappDefaultMessage}
              onChange={(e) => setWhatsappDefaultMessage(e.target.value)}
              placeholder="Ex: Olá! Gostaria de mais informações sobre os produtos da loja."
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#25D366] text-slate-800"
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* 6. PRÉ-VISUALIZAÇÃO AO VIVO INTEGRADA */}
        {/* ========================================================= */}
        <div className="bg-zinc-950 p-6 sm:p-8 rounded-3xl border border-zinc-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-white" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Pré-visualização em Tempo Real da Sua Loja
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-200 text-[11px] font-semibold border border-zinc-700">
                Layout: <strong>{activeLayoutObj.name}</strong>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-200 text-[11px] font-semibold border border-zinc-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                <span>{activePaletteObj.name.split('/')[0]}</span>
              </span>
            </div>
          </div>

          {/* Destaque do Topo da Vitrine (3 Botões Redondos + Barra Azul) */}
          <div className="space-y-4 pt-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Destaques do Topo da Vitrine
            </span>

            {/* 3 Botões Redondos */}
            <div className="flex items-center justify-center gap-4 sm:gap-8 py-2">
              {storeFeatures.filter(f => f.title && f.title.trim()).map((feat, idx) => {
                const selectedIconObj = AVAILABLE_FEATURE_ICONS.find((i) => i.value === feat.icon) || AVAILABLE_FEATURE_ICONS[0];
                const IconComponent = selectedIconObj.icon;

                return (
                  <div key={idx} className="flex flex-col items-center space-y-1.5 text-center">
                    <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-md border border-zinc-800">
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-zinc-200 leading-tight block max-w-[80px] truncate">
                      {feat.title}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Barra Azul / CTA */}
            {mainCtaText && mainCtaText.trim().length > 0 && (
              <div className="w-full max-w-md mx-auto py-2.5 px-4 bg-[#00a8e8] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md text-center">
                <span>{mainCtaText}</span>
              </div>
            )}
          </div>

          {/* Cards Informativos do Rodapé com Estilo da Paleta */}
          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Botões Informativos do Rodapé
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
                  <div key={card.id || idx} className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${primaryColor}25` }}
                    >
                      <IconComponent className="w-5 h-5" style={{ color: primaryColor }} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{card.title || `Botão ${idx + 1}`}</h4>
                      <p className="text-[11px] text-zinc-400 truncate">{displayDesc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Botão de Salvar Tudo */}
        <div className="pt-2 flex items-center justify-between">
          <div className="text-xs">
            {saveSuccess && (
              <span className="text-emerald-600 font-bold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4" />
                Preferências salvas com sucesso em site_settings e no banco de dados!
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-8 py-3.5 bg-black hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md flex items-center gap-2.5 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Salvando Configurações...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-white" />
                <span>Salvar Layout e Cores</span>
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
};

export default ButtonsLayoutManager;
