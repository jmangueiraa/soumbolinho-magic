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
    if (isMobileFiltersOpen) setIsMobileFiltersOpen(false);
  };

  const handleSubcategoryClick = (categoryId: string, subcat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategory(categoryId);
    if (filters.selectedSubcategory === subcat) {
      setSelectedSubcategory(null);
    } else {
      setSelectedSubcategory(subcat);
    }
    if (isMobileFiltersOpen) setIsMobileFiltersOpen(false);
  };

  const handleAllCategoriesClick = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    if (isMobileFiltersOpen) setIsMobileFiltersOpen(false);
  };

  const content = (
    <div className="space-y-6 select-none">
      
      {/* 1. Header do Filtro: Todas as Categorias + Botão Limpar */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <button
          onClick={handleAllCategoriesClick}
          className={`flex items-center gap-1.5 text-left transition-all cursor-pointer group ${
            filters.selectedCategory === null 
              ? 'opacity-100' 
              : 'opacity-90 hover:opacity-100'
          }`}
          title="Exibir todos os produtos"
        >
          <span className="font-sans font-black text-base sm:text-lg text-slate-900 tracking-tight">
            Todas as Categorias
          </span>
          {filters.selectedCategory === null && (
            <span className="w-2 h-2 rounded-full bg-theme-primary animate-pulse"></span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-[11px] font-bold text-slate-500 hover:text-theme-primary flex items-center gap-1 bg-white hover:bg-theme-light border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs transition-all cursor-pointer"
            title="Limpar todos os filtros"
          >
            <RotateCcw className="w-3 h-3" />
            Limpar
          </button>
        )}
      </div>

      {/* 2. Lista de Categorias e Subcategorias com marcadores • e ° */}
      <nav className="space-y-1" aria-label="Menu de Categorias">
        {categories.map((category) => {
          const isCatSelected = filters.selectedCategory === category.id;
          const isCentroDeMesa = category.id === 'itens-centro-de-mesa';
          const showSubcategories = isCentroDeMesa || isCatSelected;

          return (
            <div key={category.id} className="space-y-0.5">
              
              {/* Item de Categoria Principal */}
              <button
                onClick={() => handleCategoryClick(category.id)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 group cursor-pointer ${
                  isCatSelected && !filters.selectedSubcategory
                    ? 'bg-theme-primary text-white shadow-xs'
                    : isCatSelected
                    ? 'text-theme-primary font-bold bg-theme-light'
                    : 'text-slate-700 hover:text-theme-primary hover:bg-theme-light/60'
                }`}
              >
                <span className={`text-base leading-none ${
                  isCatSelected && !filters.selectedSubcategory ? 'text-white' : 'text-theme-primary group-hover:text-theme-primary'
                }`}>
                  •
                </span>
                <span className="truncate">
                  {category.name}
                </span>
              </button>

              {/* Subcategorias Indentadas */}
              {showSubcategories && category.subcategories.length > 0 && (
                <div className="pl-4 space-y-0.5 py-0.5 animate-in fade-in duration-200">
                  {category.subcategories.map((subcat) => {
                    const isSubSelected = isCatSelected && filters.selectedSubcategory === subcat;

                    return (
                      <button
                        key={subcat}
                        onClick={(e) => handleSubcategoryClick(category.id, subcat, e)}
                        className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all duration-150 group cursor-pointer ${
                          isSubSelected
                            ? 'bg-theme-primary text-white font-bold shadow-2xs'
                            : 'text-slate-600 hover:text-theme-primary hover:bg-theme-light/50'
                        }`}
                      >
                        <span className={`text-sm leading-none font-bold ${
                          isSubSelected ? 'text-white' : 'text-slate-400 group-hover:text-theme-primary'
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
      <div className="pt-4 border-t border-slate-200 space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-black" />
          Filtrar por Preço
        </h4>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">De (R$)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="0,00"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-theme-primary text-slate-900 shadow-2xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Até (R$)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="100,00"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-theme-primary text-slate-900 shadow-2xs"
            />
          </div>
        </div>

        <button
          onClick={applyPriceFilter}
          className="w-full py-2 bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold rounded-lg shadow-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Filter className="w-3.5 h-3.5 text-white" />
          Aplicar Filtro
        </button>
      </div>

      {/* 4. Filtro de Estoque */}
      <div className="pt-2 border-t border-slate-200">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none hover:text-theme-primary transition-colors">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="w-4 h-4 rounded text-theme-primary focus:ring-theme-primary border-slate-300 cursor-pointer accent-theme-primary"
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
        <div className="bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs sticky top-28">
          {content}
        </div>
      </aside>

      {/* Mobile Drawer (Retrátil pelo Lado Esquerdo) */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop com blur suave */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsMobileFiltersOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative mr-auto w-4/5 max-w-xs bg-white h-full shadow-2xl p-5 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-left duration-200 border-r border-slate-200 z-10">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                <span className="font-sans font-extrabold text-slate-900 text-lg">
                  Menu de Categorias
                </span>
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {content}
            </div>

            {/* Botão de Fechar e Ver Resultados no Mobile */}
            <div className="pt-4 mt-4 border-t border-slate-200">
              <button
                onClick={() => setIsMobileFiltersOpen(false)}
                className="w-full py-3 bg-black text-white text-xs font-bold rounded-lg shadow-md flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <Check className="w-4 h-4 text-white" />
                Ver {totalResults} {totalResults === 1 ? 'produto' : 'produtos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SidebarFilters;
