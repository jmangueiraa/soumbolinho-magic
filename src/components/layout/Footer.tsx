import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Instagram, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Truck,
  Download,
  Zap,
  Star,
  Sparkles,
  CheckCircle2,
  Gift,
  Award
} from 'lucide-react';
import { useFilter } from '../../context/FilterContext';
import { useStoreData } from '../../context/StoreDataContext';
import { 
  useTenant, 
  isPlatformRootHostname, 
  isTenantHost, 
  extractStoreSubdomain, 
  isCustomStoreDomain 
} from '../../context/TenantContext';
import { supabase } from '../../lib/supabase';
import { SoumbolinhoLogo } from '../common/SoumbolinhoLogo';
import { AJP_OFFICIAL_LOGO_BASE64 } from '../../assets/officialLogo';
import { DEFAULT_BENEFIT_CARDS } from '../../data/storeConfig';
import type { BenefitCard } from '../../types';

const renderBenefitIcon = (iconName: string) => {
  switch (iconName?.toLowerCase()) {
    case 'heart':
      return <Heart className="w-5 h-5 fill-current/20" />;
    case 'shield':
      return <ShieldCheck className="w-5 h-5" />;
    case 'truck':
      return <Truck className="w-5 h-5" />;
    case 'download':
      return <Download className="w-5 h-5" />;
    case 'zap':
      return <Zap className="w-5 h-5 fill-current/20" />;
    case 'message':
      return <MessageCircle className="w-5 h-5 fill-current/20" />;
    case 'star':
      return <Star className="w-5 h-5 fill-current/20" />;
    case 'sparkles':
      return <Sparkles className="w-5 h-5" />;
    case 'check':
      return <CheckCircle2 className="w-5 h-5" />;
    case 'clock':
      return <Clock className="w-5 h-5" />;
    case 'gift':
      return <Gift className="w-5 h-5" />;
    case 'award':
      return <Award className="w-5 h-5" />;
    default:
      return <Heart className="w-5 h-5 fill-current/20" />;
  }
};

const getBenefitColorClass = (iconName: string, index: number) => {
  switch (iconName?.toLowerCase()) {
    case 'heart':
    case 'shield':
    case 'truck':
    case 'download':
    case 'gift':
      return 'text-theme-primary';
    case 'message':
      return 'text-[#25D366]';
    case 'zap':
    case 'award':
      return 'text-[#eab308]';
    case 'star':
      return 'text-[#f59e0b]';
    case 'sparkles':
      return 'text-[#a855f7]';
    case 'check':
      return 'text-[#10b981]';
    case 'clock':
      return 'text-[#3b82f6]';
    default: {
      const fallbackColors = ['text-theme-primary', 'text-theme-primary', 'text-theme-primary', 'text-[#25D366]'];
      return fallbackColors[index % fallbackColors.length];
    }
  }
};

export const Footer: React.FC = () => {
  const { storeConfig, categories } = useStoreData();
  const { currentStore } = useTenant();
  const { setSelectedCategory } = useFilter();

  const currentStoreId = currentStore?.id || '';
  const isBase = currentStoreId === 'suamarcaaqui' || currentStoreId === 'store_default' || !currentStoreId;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase().trim() : '';
  const isTenant = isTenantHost(currentHostname) || Boolean(extractStoreSubdomain(currentHostname)) || isCustomStoreDomain(currentHostname);
  const isLojaRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/loja/');
  const isClientStore = Boolean(
    currentStore && 
    !currentStore.is_matriz && 
    currentStore.slug !== 'ajpstore' && 
    currentStore.id !== 'store_ajpstore' && 
    currentStore.id !== '__resolving_tenant__'
  );
  const showCreateStoreButton = isPlatformRootHostname(currentHostname) && !isTenant && !isLojaRoute && !isClientStore;

  // 1. Estado da logo da loja e flag de exibição exclusiva
  const [storeLogoUrl, setStoreLogoUrl] = useState<string>(() => {
    return (
      currentStore?.logo_url ||
      currentStore?.theme_settings?.logo_url ||
      storeConfig?.logoUrl ||
      ''
    );
  });

  const [onlyLogoSetting, setOnlyLogoSetting] = useState<boolean>(() => {
    return Boolean(
      (currentStore as any)?.only_logo ??
      (currentStore as any)?.onlyLogo ??
      currentStore?.theme_settings?.only_logo ??
      currentStore?.theme_settings?.onlyLogo ??
      storeConfig?.onlyLogo
    );
  });

  // 2. Buscar a URL da logo diretamente da tabela stores filtrando pelo store_id
  useEffect(() => {
    if (!currentStoreId || currentStoreId === '__resolving_tenant__') return;

    // Sincronização inicial rápida por contexto/cache
    const initialLogo = currentStore?.logo_url || currentStore?.theme_settings?.logo_url || storeConfig?.logoUrl;
    if (initialLogo) setStoreLogoUrl(initialLogo);

    const initialOnly = Boolean(
      (currentStore as any)?.only_logo ??
      (currentStore as any)?.onlyLogo ??
      currentStore?.theme_settings?.only_logo ??
      currentStore?.theme_settings?.onlyLogo ??
      storeConfig?.onlyLogo
    );
    setOnlyLogoSetting(initialOnly);

    let isSubscribed = true;

    async function fetchDirectStoreLogo() {
      try {
        // Consulta direta na tabela stores filtrando pelo store_id
        const { data: storeRow } = await supabase
          .from('stores')
          .select('id, logo_url, only_logo, theme_settings, name, store_name, slogan')
          .eq('id', currentStoreId)
          .maybeSingle();

        if (!isSubscribed) return;

        if (storeRow) {
          const stTheme = typeof storeRow.theme_settings === 'string'
            ? JSON.parse(storeRow.theme_settings)
            : (storeRow.theme_settings || {});

          const fetchedLogo = storeRow.logo_url || stTheme.logo_url;
          if (fetchedLogo) {
            setStoreLogoUrl(fetchedLogo);
          }

          const fetchedOnly = Boolean(
            (storeRow as any).only_logo ??
            (storeRow as any).onlyLogo ??
            stTheme.only_logo ??
            stTheme.onlyLogo
          );
          setOnlyLogoSetting(fetchedOnly);
        } else {
          // Fallback na tabela site_settings filtrando pelo store_id
          const { data: siteRow } = await supabase
            .from('site_settings')
            .select('logo_url, only_logo')
            .eq('store_id', currentStoreId)
            .maybeSingle();

          if (siteRow && isSubscribed) {
            if (siteRow.logo_url) setStoreLogoUrl(siteRow.logo_url);
            if (siteRow.only_logo !== undefined) setOnlyLogoSetting(Boolean(siteRow.only_logo));
          }
        }
      } catch (err) {
        console.warn('[Footer] Erro ao buscar logo da tabela stores:', err);
      }
    }

    fetchDirectStoreLogo();

    return () => {
      isSubscribed = false;
    };
  }, [currentStoreId, currentStore?.logo_url, storeConfig?.logoUrl, storeConfig?.onlyLogo]);

  // Resolução final da imagem da logo do rodapé (prioriza customizada, com fallback seguro para a logo oficial AJPSTORE)
  const finalFooterLogoUrl = (
    storeLogoUrl ||
    currentStore?.logo_url ||
    currentStore?.theme_settings?.logo_url ||
    storeConfig?.logoUrl ||
    AJP_OFFICIAL_LOGO_BASE64
  ).trim();

  // Status do campo 'Exibir apenas a logo circular'
  const isOnlyLogo = Boolean(
    onlyLogoSetting || 
    (currentStore as any)?.only_logo || 
    (currentStore as any)?.onlyLogo || 
    currentStore?.theme_settings?.only_logo || 
    currentStore?.theme_settings?.onlyLogo || 
    storeConfig?.onlyLogo
  );

  const storeDisplayName = (
    currentStore?.name || 
    currentStore?.store_name || 
    storeConfig?.storeName || 
    'AJPSTORE'
  ).trim();

  const storeDisplaySlogan = (
    currentStore?.slogan || 
    currentStore?.theme_settings?.slogan || 
    storeConfig?.slogan || 
    'Sua Loja Online em Minutos'
  ).trim();

  // Leitura dos cartões de benefícios salvos no Supabase (site_settings / storeConfig)
  const [benefitCards, setBenefitCards] = useState<BenefitCard[]>(
    storeConfig.benefitCards && storeConfig.benefitCards.length > 0
      ? storeConfig.benefitCards
      : (isBase ? DEFAULT_BENEFIT_CARDS : [])
  );

  useEffect(() => {
    if (currentStoreId === '__resolving_tenant__') {
      return;
    }

    async function loadStoreSettings() {
      try {
        let q = supabase
          .from('site_settings')
          .select('*');

        if (isBase) {
          q = q.or('store_id.eq.matriz,store_id.eq.store_default');
        } else {
          q = q.eq('store_id', currentStoreId);
        }

        const { data, error } = await q.maybeSingle();

        if (data && data.benefit_cards) {
          const parsed = typeof data.benefit_cards === 'string'
            ? JSON.parse(data.benefit_cards)
            : data.benefit_cards;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBenefitCards(parsed);
          }
        } else if (storeConfig.benefitCards && storeConfig.benefitCards.length > 0) {
          setBenefitCards(storeConfig.benefitCards);
        }
      } catch (err) {
        console.warn('[Footer] Aviso ao ler benefício de site_settings:', err);
      }
    }
    loadStoreSettings();
  }, [currentStoreId, storeConfig.benefitCards]);

  return (
    <footer className="bg-black text-zinc-300 mt-20 border-t border-zinc-800">
      {/* Benefit Highlights */}
      <div className="border-b border-zinc-800/80 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(benefitCards && benefitCards.length > 0
              ? benefitCards
              : DEFAULT_BENEFIT_CARDS
            ).map((card, idx) => {
              const isWhatsAppCard = card.icon === 'message' || card.id === 'card_4';
              const displayDesc =
                isWhatsAppCard && (!card.description || card.description === 'SeuWhatsAppWhatsApp')
                  ? (storeConfig.whatsappDisplay || '(00) 00000-0000')
                  : card.description;

              return (
                <div
                  key={card.id || idx}
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-zinc-900 border border-zinc-800"
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 ${getBenefitColorClass(
                      card.icon,
                      idx
                    )}`}
                  >
                    {renderBenefitIcon(card.icon)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{card.title}</h4>
                    <p className="text-xs text-zinc-400">{displayDesc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {/* Logo Circular do Rodapé */}
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 aspect-square rounded-full overflow-hidden flex items-center justify-center shrink-0 border-2 border-white/40 ring-2 sm:ring-4 ring-emerald-500/60 shadow-lg shadow-emerald-500/25 bg-white transition-all duration-300 hover:scale-105 hover:ring-emerald-400"
                style={{ maxWidth: '56px', maxHeight: '56px' }}
              >
                <img
                  src={finalFooterLogoUrl}
                  alt={storeDisplayName}
                  onError={(e) => {
                    e.currentTarget.src = AJP_OFFICIAL_LOGO_BASE64;
                  }}
                  className="w-full h-full object-contain rounded-full drop-shadow-xs transition-transform duration-300 pointer-events-none"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              </div>

              {/* Nome e subtítulo da loja (oculta o nome se 'Exibir apenas a logo circular' estiver ativo) */}
              {!isOnlyLogo && storeDisplayName && (
                <div className="flex flex-col text-left leading-none min-w-0">
                  <div className="flex items-center tracking-tight whitespace-nowrap">
                    {storeDisplayName.toUpperCase() === 'AJPSTORE' ? (
                      <div className="flex items-center tracking-tight whitespace-nowrap text-base sm:text-lg md:text-xl font-black">
                        <span className="text-[#0062FF]">AJP</span>
                        <span className="text-[#00C853] ml-0.5">STORE</span>
                      </div>
                    ) : (
                      <span className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight truncate">
                        {storeDisplayName}
                      </span>
                    )}
                  </div>
                  {storeDisplaySlogan && (
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 tracking-wider uppercase mt-1 truncate">
                      {storeDisplaySlogan}
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {storeDisplaySlogan}.
            </p>
            <div className="flex items-center gap-3 pt-2">
              {storeConfig.instagram && (
                <a
                  href={`https://instagram.com/${storeConfig.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-white text-zinc-300 hover:text-black flex items-center justify-center transition-colors"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {storeConfig.whatsappNumber && (
                <a
                  href={`https://wa.me/${storeConfig.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Categorias */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Categorias</h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              {categories.slice(0, 5).map((category) => (
                <li key={category.id}>
                  <button
                    onClick={() => {
                      setSelectedCategory(category.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-theme-primary transition-colors cursor-pointer"
                  >
                    {category.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Informações */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Informações</h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>Compra 100% Segura</li>
              <li>Acesso Imediato aos Arquivos</li>
              <li>Suporte no WhatsApp</li>
              <li>Pagamento via Pix ou Cartão</li>
            </ul>
          </div>

          {/* Atendimento */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white mb-4">Atendimento</h4>
            <div className="text-xs text-zinc-400 space-y-2">
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                <span>Segunda a Sábado • 09h às 18h</span>
              </p>
              <p className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>WhatsApp: {storeConfig.whatsappDisplay}</span>
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} {storeConfig.storeName || 'Soumbolinho'} • Todos os direitos reservados.</p>
          {showCreateStoreButton && (
            <a
              href="/cadastro"
              className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 font-semibold"
            >
              <span>Crie sua Loja na AJPSTORE</span>
              <span className="text-[10px] bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2 py-0.5 rounded-full font-bold">
                7 Dias Grátis
              </span>
            </a>
          )}
        </div>
      </div>

    </footer>
  );
};

export default Footer;
