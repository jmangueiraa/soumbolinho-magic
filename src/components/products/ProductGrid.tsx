import React from 'react';
import { PackageSearch, RotateCcw } from 'lucide-react';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';
import { SortDropdown } from './SortDropdown';
import { Breadcrumbs } from './Breadcrumbs';
import { useFilter } from '../../context/FilterContext';
import { useStoreData } from '../../context/StoreDataContext';
import { useTenant } from '../../context/TenantContext';

interface ProductGridProps {
  onSelectProduct: (product: Product) => void;
  isFullWidth?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ onSelectProduct, isFullWidth }) => {
  const { categories, storeConfig } = useStoreData();
  const { currentStore } = useTenant();
  const { 
    filteredProducts, 
    resetFilters, 
    hasActiveFilters, 
    filters 
  } = useFilter();

  const currentLayout = (currentStore?.layout_style as string) || currentStore?.theme_settings?.theme_layout || storeConfig.themeLayout || 'classic';
  const isWide = isFullWidth || currentLayout === 'featured_grid' || currentLayout === 'modern' || currentLayout === 'minimal';

  const currentCategory = categories.find((c) => c.id === filters.selectedCategory);
  const activeTitle = filters.selectedSubcategory 
    ? filters.selectedSubcategory 
    : currentCategory 
    ? currentCategory.name 
    : 'Todas as Categorias';

  const marker = filters.selectedSubcategory ? '°' : '•';

  return (
    <div className="flex-1 space-y-4 sm:space-y-6">
      
      {/* 1. Breadcrumbs */}
      <Breadcrumbs />

      {/* 2. Category Title and Sort Dropdown */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-sans text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
          <span className="text-lg sm:text-xl font-bold text-theme-primary">{marker}</span>
          <span>{activeTitle}</span>
        </h1>

        <SortDropdown />
      </div>

      {/* 3. Text "Mostrando todos os X resultados" igual à referência */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 font-medium pt-1">
        <span>Mostrando todos os {filteredProducts.length} resultados</span>
      </div>

      {/* 4. Grade de Produtos (3-4 no modo clássico / até 5 colunas no modo full-width/featured_grid) */}
      {filteredProducts.length > 0 ? (
        <div className={`grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 ${
          isWide ? 'lg:grid-cols-4 xl:grid-cols-5' : 'lg:grid-cols-4'
        }`}>
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white/80 rounded-3xl p-8 sm:p-12 text-center border border-dashed border-slate-300 shadow-xs max-w-md mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-3">
            <PackageSearch className="w-7 h-7" />
          </div>
          <h3 className="font-sans text-base font-bold text-slate-900 mb-1">
            Nenhum produto encontrado
          </h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Não encontramos produtos para esta combinação de filtros.
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold rounded-full shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white" />
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductGrid;
