import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Star, 
  ShoppingBasket, 
  Users, 
  FileArchive,
  Download,
  Zap,
  Sparkles,
  Heart,
  Gift,
  Award,
  Clock,
  CheckCircle2,
  MessageCircle,
  Smartphone,
  Laptop
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { supabase } from '../../lib/supabase';
import { DEFAULT_STORE_FEATURES, DEFAULT_MAIN_CTA_TEXT } from '../../data/storeConfig';
import { StoreFeatureItem } from '../../types';

export const StoreHighlights: React.FC = () => {
  const { currentStore } = useTenant();

  const [storeFeatures, setStoreFeatures] = useState<StoreFeatureItem[]>(() => {
    const raw = currentStore?.store_features || currentStore?.theme_settings?.store_features;
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
    return DEFAULT_MAIN_CTA_TEXT;
  });

  const [mainCtaLink, setMainCtaLink] = useState<string>(() => {
    return currentStore?.main_cta_link || currentStore?.theme_settings?.main_cta_link || '';
  });

  useEffect(() => {
    // 1. Sincroniza imediatamente com o contexto ativo
    if (currentStore) {
      const raw = currentStore?.store_features || currentStore?.theme_settings?.store_features;
      if (raw && Array.isArray(raw)) {
        setStoreFeatures(raw);
      }
      if (currentStore?.main_cta_text !== undefined && currentStore?.main_cta_text !== null) {
        setMainCtaText(currentStore.main_cta_text);
      } else if (currentStore?.theme_settings?.main_cta_text !== undefined && currentStore?.theme_settings?.main_cta_text !== null) {
        setMainCtaText(currentStore.theme_settings.main_cta_text);
      }

      if (currentStore?.main_cta_link !== undefined && currentStore?.main_cta_link !== null) {
        setMainCtaLink(currentStore.main_cta_link);
      } else if (currentStore?.theme_settings?.main_cta_link !== undefined && currentStore?.theme_settings?.main_cta_link !== null) {
        setMainCtaLink(currentStore.theme_settings.main_cta_link);
      }
    }

    // 2. Busca direta no Supabase filtrando pela loja ativa atual
    const storeId = currentStore?.id;
    if (!storeId || storeId === '__resolving_tenant__') return;

    let isMounted = true;
    async function fetchFreshHighlights() {
      try {
        const isEditaveis = 
          storeId === 'store_editaveisdocanva' || 
          storeId === 'editaveisdocanva' || 
          storeId === 'editaveis-do-canva' || 
          (typeof window !== 'undefined' && window.location.hostname.toLowerCase().includes('editaveisdocanva'));

        const orFilter = isEditaveis
          ? 'slug.eq.editaveisdocanva,id.eq.store_editaveisdocanva,slug.eq.editaveis-do-canva'
          : `id.eq.${storeId},slug.eq.${currentStore?.slug || storeId}`;

        const { data } = await supabase
          .from('stores')
          .select('store_features, main_cta_text, main_cta_link, theme_settings')
          .or(orFilter)
          .limit(1)
          .maybeSingle();

        if (isMounted && data) {
          const freshFeatures = data.store_features || data.theme_settings?.store_features;
          if (freshFeatures && Array.isArray(freshFeatures)) {
            setStoreFeatures(freshFeatures);
          }
          if (data.main_cta_text !== undefined && data.main_cta_text !== null) {
            setMainCtaText(data.main_cta_text);
          } else if (data.theme_settings?.main_cta_text !== undefined && data.theme_settings?.main_cta_text !== null) {
            setMainCtaText(data.theme_settings.main_cta_text);
          }
          if (data.main_cta_link !== undefined && data.main_cta_link !== null) {
            setMainCtaLink(data.main_cta_link);
          } else if (data.theme_settings?.main_cta_link !== undefined && data.theme_settings?.main_cta_link !== null) {
            setMainCtaLink(data.theme_settings.main_cta_link);
          }
        }
      } catch (err) {
        console.warn('[StoreHighlights] Aviso ao consultar destaques no Supabase:', err);
      }
    }

    fetchFreshHighlights();

    return () => {
      isMounted = false;
    };
  }, [currentStore?.id, currentStore?.slug, currentStore?.store_features, currentStore?.main_cta_text, currentStore?.main_cta_link]);

  // Ícones mapeados dinamicamente
  const renderFeatureIcon = (iconName?: string) => {
    const iconProps = { className: "w-8 h-8 sm:w-10 sm:h-10 text-white" };
    switch (iconName) {
      case 'shopping-basket': return <ShoppingBasket {...iconProps} />;
      case 'users': return <Users {...iconProps} />;
      case 'shield': return <ShieldCheck {...iconProps} />;
      case 'download': return <Download {...iconProps} />;
      case 'zap': return <Zap {...iconProps} />;
      case 'star': return <Star {...iconProps} />;
      case 'sparkles': return <Sparkles {...iconProps} />;
      case 'heart': return <Heart {...iconProps} />;
      case 'gift': return <Gift {...iconProps} />;
      case 'award': return <Award {...iconProps} />;
      case 'clock': return <Clock {...iconProps} />;
      case 'check': return <CheckCircle2 {...iconProps} />;
      case 'message': return <MessageCircle {...iconProps} />;
      case 'smartphone': return <Smartphone {...iconProps} />;
      case 'laptop': return <Laptop {...iconProps} />;
      case 'file-archive':
      default:
        return <FileArchive {...iconProps} />;
    }
  };

  // Se o lojista deixar o campo em branco no painel, o botão correspondente NÃO deve aparecer
  const activeFeatures = (storeFeatures || []).filter(
    (feat) => feat && feat.title && feat.title.trim().length > 0
  );

  const hasCtaBar = Boolean(mainCtaText && mainCtaText.trim().length > 0);

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 select-none">
      
      {/* 1. Três Ícones Circulares Negros (100% Dinâmicos e Editáveis) */}
      {activeFeatures.length > 0 && (
        <div 
          className={`grid gap-3 sm:gap-6 mx-auto text-center py-1 ${
            activeFeatures.length === 1 
              ? 'grid-cols-1 max-w-xs' 
              : activeFeatures.length === 2 
                ? 'grid-cols-2 max-w-sm' 
                : 'grid-cols-3 max-w-md sm:max-w-lg'
          }`}
        >
          {activeFeatures.map((feat, idx) => {
            const isExternal = feat.link && (feat.link.startsWith('http://') || feat.link.startsWith('https://'));
            
            const ItemInner = (
              <div className="flex flex-col items-center justify-center space-y-2 group cursor-pointer">
                <div 
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full text-white flex items-center justify-center shadow-md p-3 relative transition-transform duration-300 group-hover:scale-105 border border-white/10"
                  style={{ backgroundColor: 'var(--header-bg, #000000)' }}
                >
                  <div className="relative flex items-center justify-center">
                    {renderFeatureIcon(feat.icon)}
                  </div>
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight block">
                  {feat.title}
                  {feat.subtitle && (
                    <>
                      <br />
                      <span className="font-semibold text-slate-600 text-[10px] sm:text-[11px]">
                        {feat.subtitle}
                      </span>
                    </>
                  )}
                </span>
              </div>
            );

            if (feat.link && feat.link.trim().length > 0) {
              return (
                <a
                  key={feat.id || idx}
                  href={feat.link.trim()}
                  target={isExternal ? '_blank' : '_self'}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  className="block no-underline"
                >
                  {ItemInner}
                </a>
              );
            }

            return (
              <div key={feat.id || idx} className="cursor-default">
                {ItemInner}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Barra Principal de Destaque (100% Dinâmica com cor da Paleta) */}
      {hasCtaBar && (
        <div className="max-w-xl mx-auto">
          {mainCtaLink && mainCtaLink.trim().length > 0 ? (
            <a
              href={mainCtaLink.trim()}
              target={mainCtaLink.startsWith('http') ? '_blank' : '_self'}
              rel={mainCtaLink.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="block no-underline group"
            >
              <div 
                className="w-full py-3.5 sm:py-4 px-6 text-white font-bold text-base sm:text-xl rounded-2xl shadow-md text-center tracking-tight flex items-center justify-center transition-all duration-300 group-hover:scale-[1.01] cursor-pointer"
                style={{ backgroundColor: 'var(--primary-color, #0062FF)' }}
              >
                <span>{mainCtaText}</span>
              </div>
            </a>
          ) : (
            <div 
              className="w-full py-3.5 sm:py-4 px-6 text-white font-bold text-base sm:text-xl rounded-2xl shadow-md text-center tracking-tight flex items-center justify-center"
              style={{ backgroundColor: 'var(--primary-color, #0062FF)' }}
            >
              <span>{mainCtaText}</span>
            </div>
          )}
        </div>
      )}

      {/* 3. Título "Produtos em Destaque" com Linha Pontilhada e Estrela */}
      <div className="pt-3 space-y-2 text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight">
          <span>Produtos em </span>
          <span className="font-extrabold">Destaque</span>
        </h2>

        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-dotted border-theme-primary/30" />
          <div className="absolute bg-white px-3 text-theme-primary">
            <Star className="w-4 h-4 fill-theme-light text-theme-primary" />
          </div>
        </div>
      </div>

    </section>
  );
};

export default StoreHighlights;
