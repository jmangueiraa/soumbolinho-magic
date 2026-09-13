import React, { useState, useEffect, useRef } from 'react';
import { 
  Store, 
  MessageCircle, 
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
import { BenefitCard } from '../../types';
import { supabase } from '../../lib/supabase';
import { uploadBannerImage } from '../../lib/storage';
import { SoumbolinhoLogo } from '../common/SoumbolinhoLogo';

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

interface StoreSettingsManagerProps {
  onNavigateToApiDomain?: () => void;
  onNavigateToLayout?: () => void;
}

export const StoreSettingsManager: React.FC<StoreSettingsManagerProps> = ({ 
  onNavigateToApiDomain, 
  onNavigateToLayout 
}) => {
  const { storeConfig, updateStoreConfig, resetToDefaults } = useStoreData();
  const { currentStore } = useTenant();

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

    const cleanWhatsApp = formData.whatsappNumber.replace(/\D/g, '');
    const numMin = parseFloat(formData.minOrderValue.replace(',', '.')) || 0;
    const defaultMsg = (formData.whatsappDefaultMessage || storeConfig.whatsappDefaultMessage || '').trim();

    // 1. Atualização na tabela site_settings filtrando pela loja ativa atual (CRUCIAL)
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
        benefit_cards: formData.benefitCards,
        updated_at: new Date().toISOString()
      };

      if (storeConfig.primaryColor) {
        siteSettingsPayload.primary_color = storeConfig.primaryColor;
      }
      if (storeConfig.colorPalette) {
        siteSettingsPayload.color_palette = storeConfig.colorPalette;
      }
      if (storeConfig.themeLayout) {
        siteSettingsPayload.theme_layout = storeConfig.themeLayout;
      }

      console.log(`[StoreSettingsManager] 🔄 Atualizando site_settings para store_id="${currentStoreId}"...`);
      const { data: updatedRows, error: siteSettingsError } = await supabase
        .from('site_settings')
        .update(siteSettingsPayload)
        .eq('store_id', currentStoreId) // CRUCIAL: Deve filtrar pela loja ativa atual
        .select();

      if (siteSettingsError || !updatedRows || updatedRows.length === 0) {
        // Se ainda não existia linha para esse store_id, faz upsert ou insere
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

    // 2. Atualiza via StoreDataContext (que persiste em store_config, stores e emite notificação toast)
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
    });
  };

  const handleResetDefaults = () => {
    resetToDefaults();
    setIsResetModalOpen(false);
    // Sync local state mantendo isolamento da loja
    const isBase = currentStore?.id === 'store_default' || currentStore?.id === 'suamarcaaqui' || currentStore?.slug === 'suamarcaaqui';
    setFormData({
      storeName: isBase ? 'Encantando Festa - Papelaria Personalizada' : (currentStore?.store_name || currentStore?.name || 'suamarcaaqui'),
      slogan: isBase ? 'Transformando momentos especiais em memórias inesquecíveis' : (currentStore?.slogan || 'subtitulo da sua loja'),
      logoUrl: isBase ? '' : (currentStore?.logo_url || currentStore?.theme_settings?.logo_url || ''),
      whatsappNumber: isBase ? '5521974975884' : (currentStore?.whatsapp_number || 'SeuWhatsApp'),
      whatsappDisplay: isBase ? '(21) 97497-5884' : (currentStore?.whatsapp_display || 'SeuWhatsAppWhatsApp'),
      instagram: isBase ? '@encantandofesta.papelaria' : (currentStore?.instagram || 'suamarcaaqui'),
      address: isBase ? 'Ateliê Criativo - Rio de Janeiro / RJ' : (currentStore?.address || 'seuendereço'),
      city: isBase ? 'Rio de Janeiro - RJ' : 'Brasil',
      workingHours: isBase ? 'Segunda a Sábado das 09h às 18h' : (currentStore?.working_hours || 'SEMPRE ABERTO'),
      minOrderValue: '0,00',
      benefitCards: DEFAULT_BENEFIT_CARDS,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-theme-primary/20 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="font-festive text-xl font-bold text-slate-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-theme-primary" />
            <span>Configurações Gerais da Loja</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure o número de WhatsApp que recebe os pedidos, dados de contato e políticas
          </p>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-theme-primary/20 shadow-sm space-y-6">
        
        {/* 1. WhatsApp para Recebimento de Pedidos */}
        <div className="p-4 sm:p-5 bg-theme-light/40 rounded-3xl border border-theme-primary/30 space-y-4">
          <div className="flex items-center gap-2 text-theme-primary font-bold text-sm">
            <MessageCircle className="w-5 h-5 fill-theme-primary" />
            <span>WhatsApp de Recebimento dos Pedidos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Número do WhatsApp (com DDI e DDD) *
              </label>
              <input
                type="text"
                required
                value={formData.whatsappNumber}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                placeholder="5521974975884"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-2xl outline-none focus:ring-2 focus:ring-theme-primary font-mono font-bold"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Formato numérico internacional sem espaços (ex: 5521974975884)
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Exibição Visual do Telefone *
              </label>
              <input
                type="text"
                required
                value={formData.whatsappDisplay}
                onChange={(e) => setFormData({ ...formData, whatsappDisplay: e.target.value })}
                placeholder="(21) 97497-5884"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-2xl outline-none focus:ring-2 focus:ring-theme-primary"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Como o telefone será exibido no rodapé e botões
              </p>
            </div>
          </div>
        </div>

        {/* 2. Dados Institucionais */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Identidade da Loja
          </h3>

          {/* Logo Circular da Loja */}
          <div className="p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-theme-primary" />
                  <span>Logo Circular</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Envie a foto ou arte da sua logo circular. O nome da loja é individual da foto da logo e continua ao lado com a tipografia estilizada.
                </p>
              </div>

              {formData.logoUrl && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logoUrl: '' })}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                  title="Remover logo circular e voltar ao bolinho padrão"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover Logo Circular</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Preview Box com Logo Circular + Nome da Loja Individual */}
              <div className="w-full sm:w-72 h-24 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center p-3 relative overflow-hidden shrink-0 shadow-inner group">
                <div className="text-center p-1">
                  <SoumbolinhoLogo 
                    variant="light" 
                    size="sm" 
                    storeName={formData.storeName} 
                    slogan={formData.slogan} 
                    logoUrl={formData.logoUrl} 
                  />
                  <span className="block text-[8.5px] text-zinc-400 mt-1 uppercase tracking-wider font-semibold">
                    {formData.logoUrl ? '✨ Logo Circular Ativa' : 'Bolinho Padrão'}
                  </span>
                </div>
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[8px] text-zinc-300 font-bold uppercase tracking-wider">
                  Prévia
                </div>
              </div>

              {/* Upload and Link Inputs */}
              <div className="flex-1 w-full space-y-2.5">
                {/* Upload Button */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="store-logo-file-input"
                  />
                  <button
                    type="button"
                    disabled={isUploadingLogo}
                    onClick={() => logoFileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2 shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-theme-primary" />
                        <span>Fazendo upload...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-theme-primary" />
                        <span>Fazer Upload da Logo Circular (PNG, JPG, SVG)</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-slate-400 font-medium">ou cole o link:</span>
                </div>

                {/* Direct Link Input */}
                <div className="relative flex items-center">
                  <Link2 className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://exemplo.com/imagens/minha-logo-circular.png"
                    className="w-full text-xs pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary text-slate-800 placeholder:text-slate-400 font-mono"
                  />
                </div>

                {logoUploadError && (
                  <p className="text-[11px] text-rose-600 font-semibold">{logoUploadError}</p>
                )}

                <p className="text-[10.5px] text-slate-400 leading-tight">
                  💡 O nome da loja é individual da foto da logo. Você pode personalizar o nome da loja e o subtítulo separadamente nos campos abaixo, enquanto a sua foto da logo circular é exibida ao lado.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nome da Loja *
              </label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-theme-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Instagram
              </label>
              <div className="relative flex items-center">
                <Instagram className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@encantandofesta.papelaria"
                  className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-theme-primary"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Slogan / Subtítulo
            </label>
            <input
              type="text"
              value={formData.slogan}
              onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-theme-primary"
            />
          </div>
        </div>

        {/* 3. Atendimento e Localização */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Endereço & Atendimento
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Endereço do Ateliê (para retirada)
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-theme-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Horário de Funcionamento
              </label>
              <input
                type="text"
                value={formData.workingHours}
                onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-theme-primary"
              />
            </div>
          </div>
        </div>

        {/* 3.1 Destaques & Benefícios do Rodapé (Cards Informativos) */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-theme-primary" />
                <span>Destaques & Benefícios do Rodapé (Cards Informativos)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Personalize os 4 botões com ícones, títulos e textos que aparecem no rodapé da sua loja
              </p>
            </div>

            {onNavigateToLayout && (
              <button
                type="button"
                onClick={onNavigateToLayout}
                className="px-3 py-1.5 bg-theme-light hover:bg-theme-light/80 text-theme-primary text-xs font-bold rounded-xl border border-theme-primary/30 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Abrir na Aba Botões e Layout</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(formData.benefitCards && formData.benefitCards.length > 0 ? formData.benefitCards : DEFAULT_BENEFIT_CARDS).map((card, idx) => {
              const selectedIconObj = AVAILABLE_BENEFIT_ICONS.find((i) => i.value === card.icon) || AVAILABLE_BENEFIT_ICONS[0];
              const IconComponent = selectedIconObj.icon;

              return (
                <div key={card.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-theme-primary/10 text-theme-primary flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      Botão / Card {idx + 1}
                    </span>
                    {/* Mini visualizador em tempo real */}
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-900 rounded-xl text-white text-xs border border-zinc-800">
                      <IconComponent className={`w-3.5 h-3.5 ${selectedIconObj.color}`} />
                      <span className="truncate max-w-[120px] font-medium text-[11px]">{card.title || `Card ${idx + 1}`}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Ícone
                      </label>
                      <select
                        value={card.icon}
                        onChange={(e) => handleBenefitCardChange(idx, 'icon', e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary text-slate-800 font-medium"
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
                        value={card.title}
                        onChange={(e) => handleBenefitCardChange(idx, 'title', e.target.value)}
                        placeholder="Ex: Arquivos Digitais"
                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Subtítulo / Descrição
                      </label>
                      <input
                        type="text"
                        value={card.description}
                        onChange={(e) => handleBenefitCardChange(idx, 'description', e.target.value)}
                        placeholder={idx === 3 ? "Ex: SeuWhatsAppWhatsApp (ou telefone de atendimento)" : "Ex: Modelos prontos para impressão"}
                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary text-slate-800"
                      />
                      {idx === 3 && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          💡 Dica: Se preencher com "SeuWhatsAppWhatsApp" ou deixar em branco, será exibido automaticamente o WhatsApp cadastrado acima.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Atalhos Rápidos para Botões & Layout e Api & Dominio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-r from-pink-50/70 via-purple-50/40 to-pink-50/30 rounded-3xl border border-pink-200/80 flex flex-col justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-theme-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                <Palette className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Layout & Cores da Loja</span>
                  <span className="text-[10px] bg-theme-light text-theme-primary font-bold px-2 py-0.5 rounded-full border border-theme-primary/30">
                    Aba Exclusiva
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Escolha o modelo de layout (Clássico, Moderno, Minimalista, Grid em Destaque) e a paleta de cores na aba <strong>Layout e Cores</strong>.
                </p>
              </div>
            </div>

            {onNavigateToLayout && (
              <button
                type="button"
                onClick={onNavigateToLayout}
                className="w-full py-2 bg-black hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Palette className="w-3.5 h-3.5 text-white" />
                <span>Acessar Layout e Cores</span>
              </button>
            )}
          </div>

          <div className="p-4 bg-gradient-to-r from-sky-50 via-indigo-50/40 to-blue-50/30 rounded-3xl border border-sky-200/80 flex flex-col justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Domínio Próprio & APIs</span>
                  <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full border border-sky-300">
                    Aba Exclusiva
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Apontamento DNS (www), Mercado Pago e Telegram Bot configurados na aba <strong>Api e Dominio</strong>.
                </p>
              </div>
            </div>

            {onNavigateToApiDomain && (
              <button
                type="button"
                onClick={onNavigateToApiDomain}
                className="w-full py-2 bg-black hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Globe className="w-3.5 h-3.5 text-white" />
                <span>Acessar Api e Dominio</span>
              </button>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Dados Originais de Fábrica</span>
          </button>

          <button
            type="submit"
            className="px-6 py-3 bg-black hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md flex items-center gap-2 active:scale-98 transition-all"
          >
            <Save className="w-4 h-4 text-white" />
            <span>Salvar Configurações</span>
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
