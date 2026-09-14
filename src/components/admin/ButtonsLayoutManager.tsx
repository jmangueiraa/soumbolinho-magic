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
  CheckCircle
} from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';
import { useTenant } from '../../context/TenantContext';
import { supabase } from '../../lib/supabase';
import { DEFAULT_BENEFIT_CARDS } from '../../data/storeConfig';
import { BenefitCard, ColorPaletteType, ThemeLayoutType } from '../../types';
import { COLOR_PALETTES, THEME_LAYOUTS, applyThemeToDocument } from '../../utils/theme';

const AVAILABLE_BENEFIT_ICONS = [
  { value: 'heart', label: 'Coração (Arquivos Digitais / Mimo)', icon: Heart, color: 'text-theme-primary' },
  { value: 'shield', label: 'Escudo (Compra Segura / Confiança)', icon: ShieldCheck, color: 'text-[#00a8e8]' },
  { value: 'truck', label: 'Caminhão (Envio / Entrega)', icon: Truck, color: 'text-[#00a8e8]' },
  { value: 'download', label: 'Download (Link Imediato / Baixar)', icon: Download, color: 'text-[#00a8e8]' },
  { value: 'zap', label: 'Raio (Liberação Rápida / Automático)', icon: Zap, color: 'text-[#eab308]' },
  { value: 'message', label: 'WhatsApp / Chat (Atendimento)', icon: MessageCircle, color: 'text-[#25D366]' },
  { value: 'star', label: 'Estrela (Destaque / Qualidade)', icon: Star, color: 'text-[#f59e0b]' },
  { value: 'sparkles', label: 'Brilho / Especial', icon: Sparkles, color: 'text-[#a855f7]' },
  { value: 'check', label: 'Selo Verificado', icon: CheckCircle2, color: 'text-[#10b981]' },
  { value: 'clock', label: 'Relógio / Sempre Aberto', icon: Clock, color: 'text-[#3b82f6]' },
  { value: 'gift', label: 'Presente / Brinde', icon: Gift, color: 'text-[#ec4899]' },
  { value: 'award', label: 'Troféu / Garantia', icon: Award, color: 'text-[#eab308]' },
];

export const ButtonsLayoutManager: React.FC = () => {
  const { storeConfig, updateStoreConfig, showNotification } = useStoreData();
  const { currentStore } = useTenant();

  const [themeLayout, setThemeLayout] = useState<ThemeLayoutType>(
    storeConfig.themeLayout || currentStore?.theme_settings?.theme_layout || 'classic'
  );

  const [colorPalette, setColorPalette] = useState<ColorPaletteType>(
    storeConfig.colorPalette || currentStore?.theme_settings?.color_palette || 'pink_pastel'
  );

  const [primaryColor, setPrimaryColor] = useState(
    storeConfig.primaryColor || currentStore?.theme_settings?.primary_color || COLOR_PALETTES.pink_pastel.primary
  );

  const [whatsappDefaultMessage, setWhatsappDefaultMessage] = useState(
    storeConfig.whatsappDefaultMessage || 'Olá! Gostaria de mais informações sobre os produtos da loja.'
  );

  const [benefitCards, setBenefitCards] = useState<BenefitCard[]>(
    storeConfig.benefitCards && storeConfig.benefitCards.length > 0 
      ? storeConfig.benefitCards 
      : DEFAULT_BENEFIT_CARDS
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (storeConfig.themeLayout) {
      setThemeLayout(storeConfig.themeLayout);
    }
    if (storeConfig.colorPalette) {
      setColorPalette(storeConfig.colorPalette);
    }
    if (storeConfig.primaryColor) {
      setPrimaryColor(storeConfig.primaryColor);
    }
    if (storeConfig.whatsappDefaultMessage) {
      setWhatsappDefaultMessage(storeConfig.whatsappDefaultMessage);
    }
    if (storeConfig.benefitCards && storeConfig.benefitCards.length > 0) {
      setBenefitCards(storeConfig.benefitCards);
    }

    // Leitura direta e imediata da tabela site_settings para garantir dados frescos
    async function loadFromSiteSettings() {
      const currentStoreId = currentStore?.id;
      if (!currentStoreId || currentStoreId === '__resolving_tenant__') return;

      try {
        const { data } = await supabase
          .from('site_settings')
          .select('*')
          .eq('store_id', currentStoreId)
          .maybeSingle();

        if (data) {
          if (data.benefit_cards) {
            const parsed = typeof data.benefit_cards === 'string' ? JSON.parse(data.benefit_cards) : data.benefit_cards;
            if (Array.isArray(parsed) && parsed.length > 0) setBenefitCards(parsed);
          }
          if (data.theme_layout) setThemeLayout(data.theme_layout);
          if (data.color_palette) setColorPalette(data.color_palette);
          if (data.primary_color) setPrimaryColor(data.primary_color);
          if (data.whatsapp_default_message !== undefined) setWhatsappDefaultMessage(data.whatsapp_default_message || '');
        }
      } catch (err) {
        console.warn('[ButtonsLayoutManager] Aviso ao carregar site_settings:', err);
      }
    }
    loadFromSiteSettings();
  }, [storeConfig, currentStore?.id]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const currentStoreId = currentStore?.id;
    if (!currentStoreId || currentStoreId === '__resolving_tenant__') {
      showNotification('Loja ainda em carregamento. Aguarde...', 'error');
      setIsSaving(false);
      return;
    }
    try {
      // 1. Gravação na tabela site_settings filtrando pela loja ativa atual (CRUCIAL)
      const siteSettingsPayload = {
        store_id: currentStoreId,
        whatsapp_default_message: whatsappDefaultMessage.trim(),
        theme_layout: themeLayout,
        color_palette: colorPalette,
        primary_color: primaryColor,
        benefit_cards: benefitCards,
        updated_at: new Date().toISOString()
      };

      console.log(`[ButtonsLayoutManager] 🔄 Gravando site_settings para store_id="${currentStoreId}"...`);
      const { data: updatedRows, error: siteUpdateError } = await supabase
        .from('site_settings')
        .update(siteSettingsPayload)
        .eq('store_id', currentStoreId) // CRUCIAL: Deve filtrar pela loja ativa atual
        .select();

      if (siteUpdateError || !updatedRows || updatedRows.length === 0) {
        // Se ainda não existia registro para este store_id, faz upsert ou insert
        const { error: upsertErr } = await supabase
          .from('site_settings')
          .upsert([siteSettingsPayload], { onConflict: 'store_id' });
        if (upsertErr) {
          console.warn('[ButtonsLayoutManager] Aviso ao dar upsert em site_settings:', upsertErr.message);
          await supabase.from('site_settings').insert([siteSettingsPayload]);
        }
      }

      await updateStoreConfig({
        themeLayout,
        colorPalette,
        primaryColor,
        whatsappDefaultMessage: whatsappDefaultMessage.trim(),
        benefitCards,
      });

      // Aplica no DOM em tempo real
      applyThemeToDocument(colorPalette, primaryColor, themeLayout);

      setIsSaving(false);
      setSaveSuccess(true);
      showNotification('Botões, Layout e Cores salvos com sucesso no Supabase!', 'success');
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
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

      <form onSubmit={handleSave} className="space-y-8">

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
        {/* 3. OS 4 BOTÕES DE BENEFÍCIOS DO RODAPÉ */}
        {/* ========================================================= */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                3. 4 Botões Informativos de Destaque (Rodapé)
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
        {/* 4. BOTÃO DE ATENDIMENTO WHATSAPP & MENSAGEM */}
        {/* ========================================================= */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                4. Mensagem Padrão do WhatsApp
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
        {/* 5. PRÉ-VISUALIZAÇÃO AO VIVO INTEGRADA */}
        {/* ========================================================= */}
        <div className="bg-zinc-950 p-6 sm:p-8 rounded-3xl border border-zinc-800 space-y-4">
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

          {/* Cards do Rodapé com Estilo da Paleta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
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
            type="submit"
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

      </form>

    </div>
  );
};

export default ButtonsLayoutManager;
