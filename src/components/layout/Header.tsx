import React from 'react';
import { Search, ShoppingBag, Menu, X, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useFilter } from '../../context/FilterContext';
import { useStoreData } from '../../context/StoreDataContext';
import { formatCurrency } from '../../utils/formatters';

import { useTenant } from '../../context/TenantContext';
import { SoumbolinhoLogo } from '../common/SoumbolinhoLogo';

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

  return (
    <header 
      className={`${isSticky ? 'sticky top-0' : 'relative'} z-40 w-full text-white border-b shadow-md transition-all ${className}`}
      style={{ backgroundColor: 'var(--header-bg, #000000)', borderColor: 'var(--header-border, #27272a)' }}
    >
      
      {/* 1. Main Header Container */}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between gap-1.5 sm:gap-4">
          
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

          {/* CENTRO / LOGO: Logo Festivo Soumbolinho sem Fundo */}
          <a 
            href={storeHomeUrl} 
            className="flex items-center group shrink min-w-0 cursor-pointer overflow-hidden" 
            onClick={(e) => { 
              e.preventDefault(); 
              window.location.hash = ''; 
              window.history.pushState(null, '', storeHomeUrl); 
              window.dispatchEvent(new PopStateEvent('popstate'));
              window.scrollTo({ top: 0, behavior: 'smooth' }); 
            }}
          >
            <SoumbolinhoLogo variant="light" size="md" onlyLogo={Boolean(storeConfig?.onlyLogo)} />
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

          {/* LADO DIREITO: Botão do Carrinho Estilo Referência */}
          <div className="flex items-center shrink-0">
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
