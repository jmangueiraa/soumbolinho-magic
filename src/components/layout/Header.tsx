import React from 'react';
import { Search, ShoppingBag, Menu, X, Sparkles, Lock, SlidersHorizontal } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useFilter } from '../../context/FilterContext';
import { useStoreData } from '../../context/StoreDataContext';
import { formatCurrency } from '../../utils/formatters';

export const Header: React.FC = () => {
  const { storeConfig } = useStoreData();
  const { totalItemsCount, totalPrice, openCart } = useCart();
  const { 
    filters, 
    setSearch, 
    isMobileFiltersOpen,
    setIsMobileFiltersOpen, 
    hasActiveFilters 
  } = useFilter();

  const handleOpenAdmin = () => {
    window.location.hash = '/admin';
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#F8A4D8]/30 shadow-xs transition-all">
      
      {/* 1. Top Banner Notice */}
      <div className="w-full bg-gradient-to-r from-[#F8A4D8] via-[#D8B4F8] to-[#F8A4D8] text-slate-900 text-[11px] sm:text-xs font-semibold py-1.5 px-3 text-center flex items-center justify-center gap-1.5 truncate">
        <Sparkles className="w-3.5 h-3.5 text-slate-900 animate-pulse shrink-0" />
        <span className="truncate">Papelaria Personalizada para a sua Festa dos Sonhos • Pedido Direto no WhatsApp!</span>
      </div>

      {/* 2. Main Header Container */}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* LADO ESQUERDO: Botão de Menu / Categorias Fixo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-bold rounded-2xl border transition-all cursor-pointer ${
                hasActiveFilters || isMobileFiltersOpen
                  ? 'bg-pastel-pink-light border-[#F8A4D8] text-slate-900 shadow-xs' 
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title="Abrir menu de categorias"
              aria-label="Abrir Menu de Categorias"
            >
              <Menu className="w-4 h-4 text-slate-800" />
              <span className="hidden sm:inline">Categorias</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#FF1493] animate-pulse"></span>
              )}
            </button>
          </div>

          {/* CENTRO / LOGO: Nome da Loja */}
          <a 
            href="#" 
            className="flex items-center gap-2 group shrink min-w-0" 
            onClick={(e) => { e.preventDefault(); window.location.hash = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#F8A4D8] to-[#D8B4F8] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <span className="text-base sm:text-xl">🎀</span>
            </div>
            <div className="flex flex-col min-w-0 truncate">
              <span className="font-festive text-base sm:text-xl font-bold tracking-tight text-slate-900 leading-tight truncate">
                {storeConfig.storeName}
              </span>
              <span className="text-[9px] sm:text-[11px] font-semibold text-[#B886E8] uppercase tracking-wider -mt-0.5 truncate hidden xs:block">
                Papelaria Personalizada
              </span>
            </div>
          </a>

          {/* BARRA DE PESQUISA (Desktop) */}
          <div className="flex-1 max-w-md relative hidden lg:block mx-4">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome do produto..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-[#D8B4F8]/50 rounded-full text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F8A4D8] focus:bg-white transition-all shadow-inner"
              />
              {filters.search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* LADO DIREITO: Admin & Carrinho */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Botão Admin Discreto */}
            <button
              onClick={handleOpenAdmin}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
              title="Acessar Painel Administrativo (/admin)"
              aria-label="Admin"
            >
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Botão do Carrinho */}
            <button
              onClick={openCart}
              className="relative flex items-center gap-1.5 sm:gap-2 bg-black hover:bg-slate-800 text-white px-3 sm:px-4 py-2 rounded-full font-medium text-xs shadow-sm hover:shadow-md transition-all active:scale-95 group cursor-pointer"
              aria-label="Abrir Carrinho"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 text-[#F8A4D8] group-hover:scale-110 transition-transform" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#F8A4D8] text-slate-900 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-black animate-bounce">
                    {totalItemsCount > 99 ? '99+' : totalItemsCount}
                  </span>
                )}
              </div>
              <div className="hidden md:flex flex-col items-start leading-tight">
                <span className="font-bold text-[11px] text-white">
                  {totalPrice > 0 ? formatCurrency(totalPrice) : '0 itens'}
                </span>
              </div>
            </button>
          </div>

        </div>

        {/* BARRA DE PESQUISA (Mobile / Tablet) */}
        <div className="mt-2 lg:hidden relative">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome do produto..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-[#D8B4F8]/60 rounded-full text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F8A4D8] focus:bg-white transition-all shadow-inner"
            />
            {filters.search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
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
