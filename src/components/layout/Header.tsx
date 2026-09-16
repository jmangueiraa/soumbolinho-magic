import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Menu, X, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useFilter } from '../../context/FilterContext';
import { useStoreData } from '../../context/StoreDataContext';
import { formatCurrency } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';
import { AJP_OFFICIAL_LOGO_BASE64 } from '../../assets/officialLogo';

import { 
  useTenant, 
  isPlatformRootHostname, 
  isTenantHost, 
  extractStoreSubdomain, 
  isCustomStoreDomain 
} from '../../context/TenantContext';

interface HeaderProps {
  isSticky?: boolean;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ isSticky = true, className = '' }) => {
  const { storeConfig } = useStoreData();
  const { currentStore } = useTenant();
  const { totalItemsCount, totalPrice, openCart } = useCart();
  const { 
    filters, 
    setSearch, 
    isMobileFiltersOpen, 
    setIsMobileFiltersOpen, 
    hasActiveFilters 
  } = useFilter();

  const isLojaRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/loja/');
  const storeHomeUrl = isLojaRoute && currentStore?.slug && currentStore.id !== '__resolving_tenant__'
    ? `/loja/${currentStore.slug}`
    : '/';

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase().trim() : '';
  const isTenant = isTenantHost(currentHostname) || Boolean(extractStoreSubdomain(currentHostname)) || isCustomStoreDomain(currentHostname);
  const isClientStore = Boolean(
    currentStore && 
    !currentStore.is_matriz && 
    currentStore.slug !== 'ajpstore' && 
    currentStore.id !== 'store_ajpstore' && 
    currentStore.id !== '__resolving_tenant__'
  );
  const showCreateStoreButton = isPlatformRootHostname(currentHostname) && !isTenant && !isLojaRoute && !isClientStore;

  const currentStoreId = currentStore?.id || '';

  // 1. Estado da logo circular e da opção 'Exibir apenas a logo circular'
  const [storeLogoUrl, setStoreLogoUrl] = useState<string | null>(() => {
    return currentStore?.logo_url || currentStore?.theme_settings?.logo_url || storeConfig?.logoUrl || null;
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
        console.warn('[Header] Erro ao buscar logo da tabela stores:', err);
      }
    }

    fetchDirectStoreLogo();

    return () => {
      isSubscribed = false;
    };
  }, [currentStoreId, currentStore?.logo_url, storeConfig?.logoUrl, storeConfig?.onlyLogo]);

  // Resolução final da imagem da logo (prioriza o upload da loja, com fallback seguro para a logo oficial)
  const finalLogoUrl = (
    storeLogoUrl || 
    currentStore?.logo_url || 
    currentStore?.theme_settings?.logo_url || 
    storeConfig?.logoUrl || 
    '/ajpstore-logo.png' ||
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
    ''
  ).trim();

  return (
    <header 
      className={`${isSticky ? 'sticky top-0' : 'relative'} z-40 w-full text-white border-b shadow-md transition-all ${className}`}
      style={{ backgroundColor: 'var(--header-bg, #000000)', borderColor: 'var(--header-border, #27272a)' }}
    >
      
      {/* 1. Main Header Container */}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-5">
          
          {/* LADO ESQUERDO: Botão de Menu (Ícone com Cor de Destaque da Marca) */}
          <div className="flex items-center shrink-0">
            <button
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 text-xs font-bold rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-white transition-all cursor-pointer shrink-0"
              title="Abrir menu de categorias"
              aria-label="Abrir Menu de Categorias"
            >
              <Menu className="w-5 h-5 text-theme-primary shrink-0" />
              <span className="hidden sm:inline font-semibold">Categorias</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-theme-primary animate-pulse"></span>
              )}
            </button>
          </div>

          {/* CENTRO / LOGO: Renderização direta da Logo Circular com condicional onlyLogo */}
          <a 
            href={storeHomeUrl} 
            className="flex items-center gap-2 sm:gap-3.5 group shrink-0 sm:shrink min-w-0 cursor-pointer py-1 select-none" 
            onClick={(e) => { 
              e.preventDefault(); 
              window.location.hash = ''; 
              window.history.pushState(null, '', storeHomeUrl); 
              window.dispatchEvent(new PopStateEvent('popstate'));
              window.scrollTo({ top: 0, behavior: 'smooth' }); 
            }}
          >
            {/* Tag <img> para renderizar a logo circular no topo da página de forma responsiva */}
            <div 
              className={`${isOnlyLogo ? 'w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16' : 'w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12'} aspect-square rounded-full overflow-hidden flex items-center justify-center shrink-0 border-2 border-white/40 ring-2 sm:ring-3 ring-emerald-500/60 shadow-md shadow-emerald-500/20 bg-white transition-all duration-300 group-hover:scale-105 group-hover:ring-emerald-400`}
              style={{
                maxWidth: isOnlyLogo ? '64px' : '48px',
                maxHeight: isOnlyLogo ? '64px' : '48px',
              }}
            >
              <img
                src={finalLogoUrl}
                alt={storeDisplayName}
                onError={(e) => {
                  e.currentTarget.src = AJP_OFFICIAL_LOGO_BASE64;
                }}
                className="w-full h-full object-contain rounded-full drop-shadow-xs transition-transform duration-300 group-hover:scale-110 pointer-events-none"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            </div>

            {/* Condicional do formulário: se 'Exibir apenas a logo circular' for verdadeiro, oculta o texto */}
            {!isOnlyLogo && storeDisplayName && (
              <div className="flex flex-col text-left leading-none min-w-0">
                <div className="flex items-center tracking-tight whitespace-nowrap">
                  {storeDisplayName.toUpperCase() === 'AJPSTORE' ? (
                    <div className="flex items-center tracking-tight whitespace-nowrap text-base sm:text-xl md:text-2xl font-black">
                      <span className="text-[#0062FF]">AJP</span>
                      <span className="text-[#00C853] ml-0.5">STORE</span>
                    </div>
                  ) : (
                    <span className="text-sm sm:text-lg md:text-xl font-black text-white whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] uppercase truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
                      {storeDisplayName}
                    </span>
                  )}
                </div>
                {storeDisplaySlogan && (
                  <span className="text-[8px] sm:text-[10px] md:text-[11px] font-bold text-emerald-400 tracking-wider uppercase mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[120px] sm:max-w-[200px] md:max-w-[280px]">
                    {storeDisplaySlogan}
                  </span>
                )}
              </div>
            )}
          </a>

          {/* BARRA DE PESQUISA (Desktop) */}
          <div className="flex-1 max-w-md relative hidden lg:block mx-4">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por produto..."
                className="w-full pl-9 pr-8 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/50 transition-all"
              />
              {filters.search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* LADO DIREITO: Botão Criar Loja (7 Dias Grátis) + Botão do Carrinho */}
          <div className="flex items-center gap-2 shrink-0">
            {showCreateStoreButton && (
              <a
                href="/cadastro"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-lg font-bold text-xs shadow-xs transition-all hover:scale-102 active:scale-98 shrink-0"
                title="Crie sua loja grátis por 7 dias"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                <span>Criar Loja (7 Dias Grátis)</span>
              </a>
            )}

            {/* Botão do Carrinho com borda e badge (ex: R$ 10,00 🛒 1) */}
            <button
              onClick={openCart}
              className="relative flex items-center gap-1.5 sm:gap-2 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm transition-all active:scale-95 group cursor-pointer shrink-0"
              aria-label="Abrir Carrinho"
            >
              <span className="text-[11px] sm:text-sm">{totalPrice > 0 ? formatCurrency(totalPrice) : 'R$ 0,00'}</span>
              <div className="relative flex items-center">
                <ShoppingBag className="w-4 h-4 text-white group-hover:scale-110 transition-transform shrink-0" />
                {totalItemsCount > 0 && (
                  <span className="ml-1 bg-theme-primary text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs shrink-0">
                    {totalItemsCount > 99 ? '99+' : totalItemsCount}
                  </span>
                )}
              </div>
            </button>
          </div>

        </div>

        {/* BARRA DE PESQUISA (Mobile / Tablet) */}
        <div className="mt-2 lg:hidden relative">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por produto..."
              className="w-full pl-8 pr-7 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-theme-primary focus:border-theme-primary transition-all"
            />
            {filters.search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 p-0.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};

export default Header;
