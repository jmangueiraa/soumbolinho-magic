import React from 'react';
import { PackageSearch, RotateCcw } from 'lucide-react';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';
import { SortDropdown } from './SortDropdown';
import { Breadcrumbs } from './Breadcrumbs';
import { useFilter } from '../../context/FilterContext';
import { useStoreData } from '../../context/StoreDataContext';

interface ProductGridProps {
  onSelectProduct: (product: Product) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ onSelectProduct }) => {
  const { categories } = useStoreData();
  const { 
    filteredProducts, 
    resetFilters, 
    hasActiveFilters, 
    filters 
  } = useFilter();

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
          <span className="text-lg sm:text-xl font-bold text-slate-400">{marker}</span>
          <span>{activeTitle}</span>
        </h1>

        <SortDropdown />
      </div>

      {/* 3. Text "Mostrando todos os X resultados" igual à referência */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 font-medium pt-1">
        <span>Mostrando todos os {filteredProducts.length} resultados</span>
      </div>

      {/* 4. Grade de 2 Colunas no Mobile / 3-4 no Desktop */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
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
        <div className="bg-white/80 rounded-3xl p-8 sm:p-12 text-center border border-dashed border-[#FFA6DF] shadow-xs max-w-md mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl bg-pastel-pink-light text-[#FF1493] flex items-center justify-center mx-auto mb-3">
            <PackageSearch className="w-7 h-7" />
          </div>
          <h3 className="font-festive text-base font-bold text-[#2B3A8C] mb-1">
            Nenhum produto encontrado
          </h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Não encontramos produtos para esta combinação de filtros.
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-full shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#FFD1EC]" />
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductGrid;
