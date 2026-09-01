import React from 'react';
import { Search, ShoppingBag, SlidersHorizontal, X, Sparkles, Lock } from 'lucide-react';
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
    setIsMobileFiltersOpen, 
    hasActiveFilters 
  } = useFilter();

  const handleOpenAdmin = () => {
    window.location.hash = '/admin';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#F8A4D8]/30 shadow-xs transition-all">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-[#F8A4D8] via-[#D8B4F8] to-[#F8A4D8] text-slate-900 text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-slate-900 animate-pulse" />
        <span>Papelaria Personalizada para a sua Festa dos Sonhos • Pedido Direto no WhatsApp!</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Logo / Brand Title Left */}
          <a 
            href="#" 
            className="flex items-center gap-2.5 sm:gap-3 group shrink-0" 
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#F8A4D8] to-[#D8B4F8] text-white flex items-center justify-center shadow-md shadow-pastel-pink/30 group-hover:scale-105 transition-transform border border-white">
              <span className="text-xl sm:text-2xl">🎀</span>
            </div>
            <div className="flex flex-col">
              <span className="font-festive text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                {storeConfig.storeName}
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-[#B886E8] uppercase tracking-wider -mt-0.5">
                Papelaria Personalizada
              </span>
            </div>
          </a>

          {/* Central Real-Time Search Bar */}
          <div className="flex-1 max-w-xl relative hidden md:block">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome do produto (ex: centro de mesa, caixa milk, aplique)..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-[#D8B4F8]/50 rounded-full text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F8A4D8] focus:bg-white transition-all shadow-inner"
              />
              {filters.search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Actions: Mobile Filter, Admin Button & Cart Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Subtle Admin Icon Link */}
            <button
              onClick={handleOpenAdmin}
              className="p-2.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
              title="Acessar Painel Administrativo (/admin)"
              aria-label="Admin"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Mobile Filter Toggle Button */}
            <button
              onClick={() => setIsMobileFiltersOpen(true)}
              className={`md:hidden flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-full border transition-all ${
                hasActiveFilters 
                  ? 'bg-pastel-pink-light border-[#F8A4D8] text-slate-900' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-[#D8B4F8]" />
              <span>Categorias</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#F8A4D8]"></span>
              )}
            </button>

            {/* Cart Button Right */}
            <button
              onClick={openCart}
              className="relative flex items-center gap-2.5 bg-black hover:bg-slate-800 text-white px-4 sm:px-5 py-2.5 rounded-full font-medium text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95 group border border-slate-800"
              aria-label="Abrir Carrinho"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#F8A4D8] group-hover:scale-110 transition-transform" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-[#F8A4D8] text-slate-900 text-[10px] sm:text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-black animate-bounce">
                    {totalItemsCount > 99 ? '99+' : totalItemsCount}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-[10px] text-slate-300">Carrinho</span>
                <span className="font-bold text-xs text-white">
                  {totalPrice > 0 ? formatCurrency(totalPrice) : '0 itens'}
                </span>
              </div>
            </button>
          </div>

        </div>

        {/* Mobile Search Bar */}
        <div className="mt-2.5 md:hidden relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome do produto..."
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-[#D8B4F8]/60 rounded-full text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F8A4D8] focus:bg-white transition-all"
            />
            {filters.search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
