import React from 'react';
import { 
  RotateCcw, 
  Check, 
  Filter, 
  X 
} from 'lucide-react';
import { useFilter } from '../../context/FilterContext';
import { useStoreData } from '../../context/StoreDataContext';

export const SidebarFilters: React.FC = () => {
  const { categories } = useStoreData();
  const {
    filters,
    minPriceInput,
    maxPriceInput,
    setMinPriceInput,
    setMaxPriceInput,
    applyPriceFilter,
    setSelectedCategory,
    setSelectedSubcategory,
    setInStockOnly,
    resetFilters,
    hasActiveFilters,
    isMobileFiltersOpen,
    setIsMobileFiltersOpen,
    totalResults
  } = useFilter();

  const handleCategoryClick = (categoryId: string) => {
    if (filters.selectedCategory === categoryId && !filters.selectedSubcategory) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryId);
    }
  };

  const handleSubcategoryClick = (categoryId: string, subcat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategory(categoryId);
    if (filters.selectedSubcategory === subcat) {
      setSelectedSubcategory(null);
    } else {
      setSelectedSubcategory(subcat);
    }
  };

  const content = (
    <div className="space-y-6 select-none">
      
      {/* 1. Título "Todas as Categorias" */}
      <div className="pb-3 border-b border-[#FFA6DF]/40 flex items-center justify-between">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`text-left group transition-all flex items-center gap-1.5 ${
            filters.selectedCategory === null
              ? 'scale-102'
              : 'opacity-90 hover:opacity-100'
          }`}
          title="Exibir todos os produtos"
        >
          <span className="font-festive font-extrabold text-lg sm:text-xl text-[#FF1493] tracking-tight group-hover:drop-shadow-xs">
            Todas as Categorias
          </span>
          {filters.selectedCategory === null && (
            <span className="w-2 h-2 rounded-full bg-[#FF1493] animate-pulse"></span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-[11px] font-bold text-[#2B3A8C] hover:text-[#FF1493] flex items-center gap-1 bg-white/70 hover:bg-white px-2.5 py-1 rounded-full shadow-2xs transition-all"
            title="Limpar todos os filtros"
          >
            <RotateCcw className="w-3 h-3" />
            Limpar
          </button>
        )}
      </div>

      {/* 2. Lista de Categorias e Subcategorias com marcadores • e ° */}
      <nav className="space-y-1.5" aria-label="Menu de Categorias">
        {categories.map((category) => {
          const isCatSelected = filters.selectedCategory === category.id;
          
          // "Itens para Centro de Mesa" tem subcategorias sempre visíveis ou expandidas
          const isCentroDeMesa = category.id === 'itens-centro-de-mesa';
          const showSubcategories = isCentroDeMesa || isCatSelected;

          return (
            <div key={category.id} className="space-y-1">
              
              {/* Item de Categoria Principal com marcador sólido (•) */}
              <button
                onClick={() => handleCategoryClick(category.id)}
                className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[13px] sm:text-sm font-medium transition-all duration-150 group ${
                  isCatSelected && !filters.selectedSubcategory
                    ? 'bg-white text-[#2B3A8C] font-bold shadow-xs border border-white'
                    : isCatSelected
                    ? 'text-[#2B3A8C] font-semibold'
                    : 'text-[#2B3A8C] hover:text-[#FF1493] hover:bg-white/50 hover:translate-x-0.5'
                }`}
              >
                <span className={`text-base leading-none transition-colors ${
                  isCatSelected ? 'text-[#FF1493] font-black' : 'text-[#FF1493] group-hover:scale-125'
                }`}>
                  •
                </span>
                <span className="truncate">
                  {category.name}
                </span>
              </button>

              {/* Subcategorias Indentadas com marcador vazado (°) */}
              {showSubcategories && category.subcategories.length > 0 && (
                <div className="pl-5 space-y-0.5 py-0.5 animate-in fade-in duration-200">
                  {category.subcategories.map((subcat) => {
                    const isSubSelected = isCatSelected && filters.selectedSubcategory === subcat;

                    return (
                      <button
                        key={subcat}
                        onClick={(e) => handleSubcategoryClick(category.id, subcat, e)}
                        className={`w-full text-left flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-all duration-150 group ${
                          isSubSelected
                            ? 'bg-white text-[#FF1493] font-bold shadow-2xs border border-white'
                            : 'text-[#334195] hover:text-[#FF1493] hover:bg-white/40 hover:translate-x-0.5'
                        }`}
                      >
                        <span className={`text-sm leading-none font-bold ${
                          isSubSelected ? 'text-[#FF1493]' : 'text-[#2B3A8C]/70 group-hover:text-[#FF1493]'
                        }`}>
                          °
                        </span>
                        <span className="truncate">
                          {subcat}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

            </div>
          );
        })}
      </nav>

      {/* 3. Filtro por Faixa de Preço (De / Até + Botão Aplicar) */}
      <div className="pt-4 border-t border-[#FFA6DF]/40 space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#2B3A8C] flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-[#FF1493]" />
          Filtrar por Preço
        </h4>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-[#2B3A8C] block mb-0.5">De (R$)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="0,00"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#FFA6DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF1493] text-slate-800 shadow-2xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#2B3A8C] block mb-0.5">Até (R$)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="100,00"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#FFA6DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF1493] text-slate-800 shadow-2xs"
            />
          </div>
        </div>

        <button
          onClick={applyPriceFilter}
          className="w-full py-2 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98 flex items-center justify-center gap-1.5"
        >
          <Filter className="w-3.5 h-3.5 text-[#FFD1EC]" />
          Aplicar Filtro
        </button>
      </div>

      {/* 4. Filtro de Estoque */}
      <div className="pt-2 border-t border-[#FFA6DF]/40">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2B3A8C] select-none hover:text-[#FF1493] transition-colors">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="w-4 h-4 rounded text-[#FF1493] focus:ring-[#FF1493] border-[#FFA6DF] cursor-pointer accent-[#FF1493]"
          />
          <span>Apenas pronta entrega / estoque</span>
        </label>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:block w-64 lg:w-72 shrink-0">
        <div className="bg-[#FFD1EC] p-5 sm:p-6 rounded-3xl border border-[#FFA6DF]/60 shadow-sm sticky top-28">
          {content}
        </div>
      </aside>

      {/* Mobile Drawer (Retrátil / Offcanvas) */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop com blur suave */}
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsMobileFiltersOpen(false)}
          />

          {/* Drawer Panel com fundo rosa suave */}
          <div className="relative ml-auto w-full max-w-xs bg-[#FFD1EC] h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-[#FFA6DF]">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#FFA6DF]/40">
                <span className="font-festive font-extrabold text-[#FF1493] text-lg">
                  Menu de Categorias
                </span>
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/60 text-[#2B3A8C] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {content}
            </div>

            {/* Botão de Fechar e Ver Resultados no Mobile */}
            <div className="pt-4 mt-4 border-t border-[#FFA6DF]/40">
              <button
                onClick={() => setIsMobileFiltersOpen(false)}
                className="w-full py-3 bg-black text-white text-xs font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-98"
              >
                <Check className="w-4 h-4 text-[#FFD1EC]" />
                Ver {totalResults} {totalResults === 1 ? 'produto' : 'produtos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
