import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings,
  Store, 
  MessageCircle, 
  LayoutTemplate,
  Instagram, 
  Save, 
  RotateCcw,
  Globe, 
  Heart,
  ShieldCheck,
  Truck,
  Download,
  Zap,
  Star,
  Sparkles,
  CheckCircle2,
  Clock,
  Gift,
  Award,
  Palette,
  Upload,
  Image as ImageIcon,
  Trash2,
  Loader2,
  Link2
} from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';
import { useTenant } from '../../context/TenantContext';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { DEFAULT_BENEFIT_CARDS } from '../../data/storeConfig';
import { BenefitCard, ThemeLayoutType } from '../../types';
import { supabase } from '../../lib/supabase';
import { uploadBannerImage } from '../../lib/storage';
import { SoumbolinhoLogo } from '../common/SoumbolinhoLogo';

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

interface StoreSettingsManagerProps {
  onNavigateToApiDomain?: () => void;
  onNavigateToLayout?: () => void;
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
      active
        ? 'bg-gray-900 text-white shadow-sm'
        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-2xs'
    }`}
  >
    {icon}
    <span>{children}</span>
  </button>
);

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  prefix?: string;
  required?: boolean;
  helperText?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  prefix,
  required = false,
  helperText
}) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 mb-1.5">
      {label}
    </label>
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-gray-400 font-bold text-xs pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full text-xs sm:text-sm py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-800 placeholder:text-gray-400 ${
          prefix ? 'pl-8 pr-3.5' : 'px-3.5'
        }`}
      />
    </div>
    {helperText && (
      <p className="text-[11px] text-gray-400 mt-1">{helperText}</p>
    )}
  </div>
);

export const StoreSettingsManager: React.FC<StoreSettingsManagerProps> = ({ 
  onNavigateToApiDomain, 
  onNavigateToLayout 
}) => {
  const { storeConfig, updateStoreConfig, resetToDefaults, showNotification } = useStoreData();
  const { currentStore, updateCurrentStore, refreshTenant } = useTenant();

  const [activeTab, setActiveTab] = useState<'identidade' | 'atendimento' | 'rodape'>('identidade');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    storeName: storeConfig.storeName || currentStore?.store_name || currentStore?.name || '',
    slogan: storeConfig.slogan || currentStore?.slogan || '',
    logoUrl: storeConfig.logoUrl || currentStore?.logo_url || currentStore?.theme_settings?.logo_url || '',
    whatsappNumber: storeConfig.whatsappNumber || currentStore?.whatsapp_number || '',
    whatsappDisplay: storeConfig.whatsappDisplay || currentStore?.whatsapp_display || '',
    instagram: storeConfig.instagram || currentStore?.instagram || '',
    address: storeConfig.address || currentStore?.address || '',
    city: storeConfig.city || 'Brasil',
    workingHours: storeConfig.workingHours || currentStore?.working_hours || 'SEMPRE ABERTO',
    minOrderValue: (storeConfig.minOrderValue ?? 0).toString().replace('.', ','),
    whatsappDefaultMessage: storeConfig.whatsappDefaultMessage || currentStore?.theme_settings?.whatsapp_default_message || '',
    benefitCards: storeConfig.benefitCards && storeConfig.benefitCards.length > 0 
      ? storeConfig.benefitCards 
      : DEFAULT_BENEFIT_CARDS,
    onlyLogo: storeConfig.onlyLogo ?? false,
  });

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza o formulário sempre que storeConfig ou currentStore forem carregados do Supabase
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      storeName: storeConfig.storeName || currentStore?.store_name || currentStore?.name || prev.storeName,
      slogan: storeConfig.slogan || currentStore?.slogan || prev.slogan,
      logoUrl: storeConfig.logoUrl !== undefined ? storeConfig.logoUrl : (currentStore?.logo_url || currentStore?.theme_settings?.logo_url || prev.logoUrl),
      whatsappNumber: storeConfig.whatsappNumber || currentStore?.whatsapp_number || prev.whatsappNumber,
      whatsappDisplay: storeConfig.whatsappDisplay || currentStore?.whatsapp_display || prev.whatsappDisplay,
      instagram: storeConfig.instagram || currentStore?.instagram || prev.instagram,
      address: storeConfig.address || currentStore?.address || prev.address,
      city: storeConfig.city || prev.city,
      workingHours: storeConfig.workingHours || currentStore?.working_hours || prev.workingHours,
      minOrderValue: storeConfig.minOrderValue !== undefined ? storeConfig.minOrderValue.toString().replace('.', ',') : prev.minOrderValue,
      whatsappDefaultMessage: storeConfig.whatsappDefaultMessage || currentStore?.theme_settings?.whatsapp_default_message || prev.whatsappDefaultMessage,
      benefitCards: storeConfig.benefitCards && storeConfig.benefitCards.length > 0 
        ? storeConfig.benefitCards 
        : (prev.benefitCards || DEFAULT_BENEFIT_CARDS),
      onlyLogo: storeConfig.onlyLogo !== undefined ? storeConfig.onlyLogo : prev.onlyLogo,
    }));

    // Leitura direta da tabela site_settings para garantia de dados frescos
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
          setFormData((prev) => ({
            ...prev,
            whatsappNumber: data.whatsapp || prev.whatsappNumber,
            whatsappDisplay: data.display_whatsapp || prev.whatsappDisplay,
            instagram: data.instagram || prev.instagram,
            slogan: data.slogan || prev.slogan,
            address: data.address || prev.address,
            workingHours: data.business_hours || prev.workingHours,
            whatsappDefaultMessage: data.whatsapp_default_message !== undefined ? data.whatsapp_default_message : prev.whatsappDefaultMessage,
            logoUrl: data.logo_url || prev.logoUrl,
            benefitCards: data.benefit_cards ? (typeof data.benefit_cards === 'string' ? JSON.parse(data.benefit_cards) : data.benefit_cards) : prev.benefitCards,
          }));
        }
      } catch (err) {
        console.warn('[StoreSettingsManager] Aviso ao carregar site_settings:', err);
      }
    }
    loadFromSiteSettings();
  }, [storeConfig, currentStore]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('A imagem do logo deve ter no máximo 5MB.');
      return;
    }

    try {
      setIsUploadingLogo(true);
      setLogoUploadError(null);
      const { url, error } = await uploadBannerImage(file);
      if (error || !url) {
        setLogoUploadError(`Erro no upload: ${error || 'Falha ao salvar a imagem'}`);
      } else {
        setFormData((prev) => ({ ...prev, logoUrl: url }));
      }
    } catch (err: any) {
      setLogoUploadError(`Falha inesperada no upload: ${err.message || err}`);
    } finally {
      setIsUploadingLogo(false);
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = '';
      }
    }
  };

  const handleBenefitCardChange = (index: number, field: keyof BenefitCard, value: string) => {
    setFormData((prev) => {
      const currentList = prev.benefitCards && prev.benefitCards.length > 0 
        ? [...prev.benefitCards] 
        : [...DEFAULT_BENEFIT_CARDS];
      currentList[index] = {
        ...currentList[index],
        [field]: value,
      };
      return { ...prev, benefitCards: currentList };
    });
  };

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentStoreId = currentStore?.id;
    if (!currentStoreId || currentStoreId === '__resolving_tenant__') {
      showNotification('Loja ainda em carregamento. Aguarde...', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const cleanWhatsApp = formData.whatsappNumber.replace(/\D/g, '');
    const numMin = parseFloat(formData.minOrderValue.replace(',', '.')) || 0;
    const defaultMsg = (formData.whatsappDefaultMessage || storeConfig.whatsappDefaultMessage || '').trim();

    // 1. Atualização na tabela site_settings filtrando pela loja ativa atual (CRUCIAL)
    const currentLayout = currentStore?.layout_style || currentStore?.theme_settings?.theme_layout || storeConfig.themeLayout || 'classic';
    const currentPalette = currentStore?.color_palette || currentStore?.theme_settings?.color_palette || storeConfig.colorPalette || 'pink_pastel';
    const currentPrimary = currentStore?.primary_color || currentStore?.theme_settings?.primary_color || storeConfig.primaryColor || '#FF1493';

    // 1. Gravação direta e verificada na tabela 'stores' (Multi-Tenant por ID, Slug e Matriz)
    try {
      const storeDirectPayload: any = {
        name: formData.storeName.trim(),
        store_name: formData.storeName.trim(),
        slogan: formData.slogan.trim(),
        whatsapp_number: cleanWhatsApp,
        whatsapp_display: formData.whatsappDisplay.trim(),
        instagram: formData.instagram.trim(),
        address: formData.address.trim(),
        working_hours: formData.workingHours.trim(),
        logo_url: formData.logoUrl?.trim() || undefined,
        only_logo: Boolean(formData.onlyLogo),
        onlyLogo: Boolean(formData.onlyLogo),
        layout_style: currentLayout as ThemeLayoutType,
        theme_layout: currentLayout as ThemeLayoutType,
        primary_color: currentPrimary,
        color_palette: currentPalette,
        theme_settings: {
          ...(currentStore?.theme_settings || {}),
          layout_style: currentLayout as ThemeLayoutType,
          theme_layout: currentLayout as ThemeLayoutType,
          primary_color: currentPrimary,
          color_palette: currentPalette,
          logo_url: formData.logoUrl?.trim() || undefined,
          only_logo: Boolean(formData.onlyLogo),
          onlyLogo: Boolean(formData.onlyLogo),
          whatsapp_default_message: defaultMsg,
          benefit_cards: formData.benefitCards,
        },
        updated_at: new Date().toISOString(),
      };

      let storeSaved = false;
      let payloadId = { ...storeDirectPayload };
      for (let attempt = 0; attempt < 8; attempt++) {
        const { data: idRows, error: errId } = await supabase
          .from('stores')
          .update(payloadId)
          .eq('id', currentStoreId)
          .select();

        if (!errId && idRows && idRows.length > 0) {
          storeSaved = true;
          console.log('[StoreSettingsManager] ✅ Tabela stores atualizada por ID com sucesso!');
          break;
        }
        if (errId) {
          const colMatch = errId.message?.match(/Could not find the '([^']+)' column/i);
          if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
            delete payloadId[colMatch[1]];
            continue;
          }
        }
        break;
      }

      if (!storeSaved && currentStore?.slug) {
        let payloadSlug = { ...storeDirectPayload };
        for (let attempt = 0; attempt < 8; attempt++) {
          const { data: slugRows, error: errSlug } = await supabase
            .from('stores')
            .update(payloadSlug)
            .eq('slug', currentStore.slug)
            .select();

          if (!errSlug && slugRows && slugRows.length > 0) {
            storeSaved = true;
            console.log('[StoreSettingsManager] ✅ Tabela stores atualizada por slug com sucesso!');
            break;
          }
          if (errSlug) {
            const colMatch = errSlug.message?.match(/Could not find the '([^']+)' column/i);
            if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
              delete payloadSlug[colMatch[1]];
              continue;
            }
          }
          break;
        }
      }

      if (!storeSaved && (currentStoreId.includes('ajp') || currentStore?.slug === 'ajpstore' || currentStore?.is_matriz)) {
        let payloadMatriz = { ...storeDirectPayload };
        for (let attempt = 0; attempt < 8; attempt++) {
          const { data: mRows, error: errM } = await supabase
            .from('stores')
            .update(payloadMatriz)
            .or('slug.eq.ajpstore,id.eq.store_ajpstore,is_matriz.eq.true')
            .select();

          if (!errM && mRows && mRows.length > 0) {
            storeSaved = true;
            console.log('[StoreSettingsManager] ✅ Tabela stores atualizada via Matriz AJPSTORE!');
            break;
          }
          if (errM) {
            const colMatch = errM.message?.match(/Could not find the '([^']+)' column/i);
            if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
              delete payloadMatriz[colMatch[1]];
              continue;
            }
          }
          break;
        }
      }
    } catch (storeEx) {
      console.warn('[StoreSettingsManager] Aviso ao atualizar stores diretamente:', storeEx);
    }

    // 2. Atualização na tabela site_settings filtrando pela loja ativa atual (CRUCIAL)
    try {
      const siteSettingsPayload: any = {
        store_id: currentStoreId,
        whatsapp: cleanWhatsApp,
        display_whatsapp: formData.whatsappDisplay.trim(),
        instagram: formData.instagram.trim(),
        slogan: formData.slogan.trim(),
        address: formData.address.trim(),
        business_hours: formData.workingHours.trim(),
        whatsapp_default_message: defaultMsg,
        logo_url: formData.logoUrl?.trim() || null,
        only_logo: Boolean(formData.onlyLogo),
        benefit_cards: formData.benefitCards,
        theme_layout: currentLayout,
        color_palette: currentPalette,
        primary_color: currentPrimary,
        updated_at: new Date().toISOString()
      };

      console.log(`[StoreSettingsManager] 🔄 Atualizando site_settings para store_id="${currentStoreId}"...`);
      const { data: updatedRows, error: siteSettingsError } = await supabase
        .from('site_settings')
        .update(siteSettingsPayload)
        .eq('store_id', currentStoreId)
        .select();

      if (siteSettingsError || !updatedRows || updatedRows.length === 0) {
        const { error: upsertErr } = await supabase
          .from('site_settings')
          .upsert([siteSettingsPayload], { onConflict: 'store_id' });
        if (upsertErr) {
          console.warn('[StoreSettingsManager] Aviso ao dar upsert em site_settings:', upsertErr.message);
          await supabase.from('site_settings').insert([siteSettingsPayload]);
        } else {
          console.log(`[StoreSettingsManager] ✅ site_settings inserido/atualizado com sucesso via upsert!`);
        }
      } else {
        console.log(`[StoreSettingsManager] ✅ site_settings atualizado com sucesso para store_id="${currentStoreId}"!`);
      }
    } catch (err) {
      console.warn('[StoreSettingsManager] Exceção em site_settings:', err);
    }

    // 3. Atualiza via StoreDataContext (persiste em store_config e emite notificação toast)
    await updateStoreConfig({
      storeName: formData.storeName.trim(),
      slogan: formData.slogan.trim(),
      logoUrl: formData.logoUrl?.trim() || '',
      whatsappNumber: cleanWhatsApp,
      whatsappDisplay: formData.whatsappDisplay.trim(),
      instagram: formData.instagram.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      workingHours: formData.workingHours.trim(),
      minOrderValue: numMin,
      benefitCards: formData.benefitCards,
      whatsappDefaultMessage: defaultMsg,
      onlyLogo: formData.onlyLogo,
      themeLayout: currentLayout as any,
      colorPalette: currentPalette as any,
      primaryColor: currentPrimary,
    });

    // 4. Atualiza o TenantContext em memória imediatamente
    if (updateCurrentStore) {
      updateCurrentStore({
        name: formData.storeName.trim(),
        store_name: formData.storeName.trim(),
        slogan: formData.slogan.trim(),
        whatsapp_number: cleanWhatsApp,
        whatsapp_display: formData.whatsappDisplay.trim(),
        instagram: formData.instagram.trim(),
        address: formData.address.trim(),
        working_hours: formData.workingHours.trim(),
        logo_url: formData.logoUrl?.trim() || undefined,
        only_logo: Boolean(formData.onlyLogo),
        onlyLogo: Boolean(formData.onlyLogo),
        layout_style: currentLayout as ThemeLayoutType,
        theme_layout: currentLayout as ThemeLayoutType,
        primary_color: currentPrimary,
        color_palette: currentPalette,
        theme_settings: {
          ...(currentStore?.theme_settings || {}),
          layout_style: currentLayout as ThemeLayoutType,
          theme_layout: currentLayout as ThemeLayoutType,
          primary_color: currentPrimary,
          color_palette: currentPalette,
          logo_url: formData.logoUrl?.trim() || undefined,
          only_logo: Boolean(formData.onlyLogo),
          onlyLogo: Boolean(formData.onlyLogo),
          whatsapp_default_message: defaultMsg,
          benefit_cards: formData.benefitCards,
        }
      });
    }
    if (refreshTenant) {
      await refreshTenant(true);
    }
  } finally {
    setIsSaving(false);
  }
};

  const handleResetDefaults = () => {
    resetToDefaults();
    setIsResetModalOpen(false);
    // Sync local state mantendo isolamento da loja
    const isBase = currentStore?.id === 'store_default' || currentStore?.id === 'suamarcaaqui' || currentStore?.slug === 'suamarcaaqui' || currentStore?.slug === 'ajpstore' || currentStore?.id === 'store_ajpstore';
    setFormData({
      storeName: isBase ? 'AJPSTORE' : (currentStore?.store_name || currentStore?.name || 'suamarcaaqui'),
      slogan: isBase ? 'Sua Loja Online em Minutos' : (currentStore?.slogan || 'subtitulo da sua loja'),
      logoUrl: isBase ? '/ajpstore-logo.png' : (currentStore?.logo_url || currentStore?.theme_settings?.logo_url || ''),
      whatsappNumber: isBase ? '5511999999999' : (currentStore?.whatsapp_number || 'SeuWhatsApp'),
      whatsappDisplay: isBase ? '(11) 99999-9999' : (currentStore?.whatsapp_display || 'SeuWhatsAppWhatsApp'),
      instagram: isBase ? '@ajpstore' : (currentStore?.instagram || 'suamarcaaqui'),
      address: isBase ? 'São Paulo - SP' : (currentStore?.address || 'seuendereço'),
      city: isBase ? 'São Paulo - SP' : 'Brasil',
      workingHours: isBase ? 'Segunda a Sábado das 09h às 18h' : (currentStore?.working_hours || 'SEMPRE ABERTO'),
      minOrderValue: '0,00',
      whatsappDefaultMessage: '',
      benefitCards: DEFAULT_BENEFIT_CARDS,
      onlyLogo: false,
    });
  };

  return (
    <div className="space-y-6 font-sans text-gray-800 animate-in fade-in duration-300">
      
      {/* CABEÇALHO */}
      <header className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2.5 rounded-xl text-blue-700 shrink-0">
              <Settings size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Configurações da Loja</h1>
              <p className="text-xs text-gray-500">Gerencie informações e identidade visual</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              form="store-settings-form"
              disabled={isSaving}
              className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-white" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO POR ABAS (Scroll Horizontal no Mobile) */}
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <TabButton active={activeTab === 'identidade'} onClick={() => setActiveTab('identidade')} icon={<Store size={16}/>}>
            Identidade
          </TabButton>
          <TabButton active={activeTab === 'atendimento'} onClick={() => setActiveTab('atendimento')} icon={<MessageCircle size={16}/>}>
            Atendimento
          </TabButton>
          <TabButton active={activeTab === 'rodape'} onClick={() => setActiveTab('rodape')} icon={<LayoutTemplate size={16}/>}>
            Rodapé & Destaques
          </TabButton>
        </div>
      </header>

      {/* FORMULÁRIO PRINCIPAL */}
      <form id="store-settings-form" onSubmit={handleSubmit} className="space-y-6">

        {/* ABA 1: IDENTIDADE */}
        {activeTab === 'identidade' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Logo & Marca</h2>
              
              {/* Upload Compacto */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                <div 
                  onClick={() => logoFileInputRef.current?.click()}
                  className="w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center text-white shrink-0 relative overflow-hidden group cursor-pointer border border-gray-800 shadow-inner"
                  title="Clique para alterar a imagem"
                >
                  {formData.logoUrl ? (
                    <img 
                      src={formData.logoUrl} 
                      alt="Logo da Loja" 
                      className="w-full h-full object-contain p-1.5 rounded-2xl" 
                    />
                  ) : (
                    <span className="text-xs font-bold tracking-wider">LOGO</span>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white">
                    <Upload size={20} />
                  </div>
                </div>

                <div className="flex-1 space-y-2.5">
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="store-logo-file-input"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      type="button"
                      disabled={isUploadingLogo}
                      onClick={() => logoFileInputRef.current?.click()}
                      className="text-xs font-bold text-blue-600 border border-blue-200 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Fazendo upload...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={14} />
                          <span>Alterar Imagem</span>
                        </>
                      )}
                    </button>

                    {formData.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logoUrl: '' })}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                        title="Remover logo"
                      >
                        <Trash2 size={14} />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  <div className="relative flex items-center">
                    <Link2 className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
                    <input
                      type="url"
                      value={formData.logoUrl}
                      onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                      placeholder="Ou cole a URL direta da imagem (ex: https://...)"
                      className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder:text-gray-400 font-mono"
                    />
                  </div>

                  {logoUploadError && (
                    <p className="text-[11px] text-rose-600 font-semibold">{logoUploadError}</p>
                  )}

                  <label className="flex items-center gap-2 pt-1 text-xs text-gray-700 font-medium cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={Boolean(formData.onlyLogo)}
                      onChange={(e) => setFormData({ ...formData, onlyLogo: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" 
                    />
                    <span>Ocultar nome em texto no topo (exibir apenas a logo circular)</span>
                  </label>
                </div>
              </div>

              {/* Inputs Limpos */}
              <div className="space-y-4 pt-2">
                <InputField 
                  label="Nome da Loja *" 
                  value={formData.storeName} 
                  onChange={(val) => setFormData({ ...formData, storeName: val })}
                  required 
                  placeholder="Ex: AJPSTORE"
                />
                <InputField 
                  label="Slogan / Subtítulo" 
                  value={formData.slogan} 
                  onChange={(val) => setFormData({ ...formData, slogan: val })}
                  placeholder="Ex: Site em Minutos"
                />
                <InputField 
                  label="Usuário do Instagram" 
                  value={formData.instagram} 
                  onChange={(val) => setFormData({ ...formData, instagram: val })}
                  prefix="@" 
                  placeholder="suamarcaaqui"
                />
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: ATENDIMENTO */}
        {activeTab === 'atendimento' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">WhatsApp & Contato</h2>
              <div className="space-y-4">
                <InputField 
                  label="Número do WhatsApp (com DDI e DDD) *" 
                  value={formData.whatsappNumber} 
                  onChange={(val) => setFormData({ ...formData, whatsappNumber: val })}
                  required
                  placeholder="5521974975884"
                  helperText="Formato numérico internacional sem espaços (ex: 5521974975884)"
                />

                <InputField 
                  label="Texto de Exibição do Telefone *" 
                  value={formData.whatsappDisplay} 
                  onChange={(val) => setFormData({ ...formData, whatsappDisplay: val })}
                  required
                  placeholder="(21) 97497-5884"
                  helperText="Como o telefone será exibido no rodapé e botões de contato"
                />

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Mensagem Padrão do WhatsApp (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.whatsappDefaultMessage}
                    onChange={(e) => setFormData({ ...formData, whatsappDefaultMessage: e.target.value })}
                    placeholder="Ex: Olá! Gostaria de tirar uma dúvida sobre os produtos da loja."
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-800 placeholder:text-gray-400"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Mensagem pré-preenchida quando o cliente clica no botão de atendimento no WhatsApp
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <InputField 
                    label="Endereço do Ateliê / Retirada" 
                    value={formData.address} 
                    onChange={(val) => setFormData({ ...formData, address: val })}
                    placeholder="Ex: Rua das Flores, 123 - Centro"
                    helperText="Exibido nas informações de contato e rodapé"
                  />

                  <InputField 
                    label="Horário de Funcionamento" 
                    value={formData.workingHours} 
                    onChange={(val) => setFormData({ ...formData, workingHours: val })}
                    placeholder="Ex: SEMPRE ABERTO ou Seg a Sex 09h às 18h"
                    helperText="Disponibilidade para atendimento ou entregas"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: RODAPÉ */}
        {activeTab === 'rodape' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <LayoutTemplate size={18} className="text-blue-600" />
                  <span>Destaques & Benefícios do Rodapé</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Personalize os 4 cards informativos com ícones, títulos e textos que aparecem no rodapé da sua loja
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(formData.benefitCards && formData.benefitCards.length > 0 ? formData.benefitCards : DEFAULT_BENEFIT_CARDS).map((card, idx) => {
                  const selectedIconObj = AVAILABLE_BENEFIT_ICONS.find((i) => i.value === card.icon) || AVAILABLE_BENEFIT_ICONS[0];
                  const IconComponent = selectedIconObj.icon;

                  return (
                    <div key={card.id || idx} className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200/80 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          Card {idx + 1}
                        </span>

                        {/* Preview Badge */}
                        <div className="flex items-center gap-2 px-2.5 py-1 bg-gray-900 rounded-xl text-white text-xs border border-gray-800">
                          <IconComponent className={`w-3.5 h-3.5 ${selectedIconObj.color}`} />
                          <span className="truncate max-w-[120px] font-medium text-[11px]">{card.title || `Card ${idx + 1}`}</span>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Ícone
                          </label>
                          <select
                            value={card.icon}
                            onChange={(e) => handleBenefitCardChange(idx, 'icon', e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-medium"
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
                            value={card.title}
                            onChange={(e) => handleBenefitCardChange(idx, 'title', e.target.value)}
                            placeholder="Ex: Arquivos Digitais"
                            className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Subtítulo / Descrição
                          </label>
                          <input
                            type="text"
                            value={card.description}
                            onChange={(e) => handleBenefitCardChange(idx, 'description', e.target.value)}
                            placeholder={idx === 3 ? "Ex: SeuWhatsApp (ou telefone de atendimento)" : "Ex: Modelos prontos para impressão"}
                            className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Atalhos Rápidos para Botões & Layout e Api & Dominio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-gray-200 flex flex-col justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Palette className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <span>Layout & Cores da Loja</span>
                      <span className="text-[10px] bg-pink-50 text-pink-600 font-bold px-2 py-0.5 rounded-full border border-pink-200">
                        Aba Exclusiva
                      </span>
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Escolha o modelo de vitrine e paleta de cores oficial na aba <strong>Layout e Cores</strong>.
                    </p>
                  </div>
                </div>

                {onNavigateToLayout && (
                  <button
                    type="button"
                    onClick={onNavigateToLayout}
                    className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Palette className="w-3.5 h-3.5 text-white" />
                    <span>Acessar Layout e Cores</span>
                  </button>
                )}
              </div>

              <div className="p-4 bg-white rounded-2xl border border-gray-200 flex flex-col justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <span>Domínio Próprio & APIs</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                        Aba Exclusiva
                      </span>
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Apontamento DNS (www), Mercado Pago e Telegram configurados na aba <strong>Api e Dominio</strong>.
                    </p>
                  </div>
                </div>

                {onNavigateToApiDomain && (
                  <button
                    type="button"
                    onClick={onNavigateToApiDomain}
                    className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Globe className="w-3.5 h-3.5 text-white" />
                    <span>Acessar Api e Dominio</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BARRA INFERIOR DE AÇÕES */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restaurar Dados Originais de Fábrica</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-white" />
                <span>Salvar Configurações</span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* Confirmation Reset Modal */}
      <DeleteConfirmModal
        isOpen={isResetModalOpen}
        title="Restaurar Configurações Originais"
        message="Esta ação irá restaurar todos os produtos, categorias e configurações para o estado original de fábrica. Deseja continuar?"
        onConfirm={handleResetDefaults}
        onCancel={() => setIsResetModalOpen(false)}
      />

    </div>
  );
};

export default StoreSettingsManager;

