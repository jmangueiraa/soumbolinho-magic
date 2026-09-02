import React from 'react';
import { useFilter } from '../../context/FilterContext';
import { useStoreData } from '../../context/StoreDataContext';

export const Breadcrumbs: React.FC = () => {
  const { categories } = useStoreData();
  const { 
    filters, 
    setSelectedCategory, 
    setSelectedSubcategory, 
    resetFilters 
  } = useFilter();

  const currentCategory = categories.find((c) => c.id === filters.selectedCategory);

  return (
    <nav className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-600 font-semibold overflow-x-auto no-scrollbar py-0.5">
      {/* Home */}
      <button
        onClick={resetFilters}
        className="hover:text-black transition-colors cursor-pointer"
      >
        Home
      </button>

      {/* Category */}
      {currentCategory && (
        <>
          <span className="text-slate-400 font-bold">›</span>
          <button
            onClick={() => setSelectedSubcategory(null)}
            className="hover:text-black transition-colors truncate flex items-center gap-1 cursor-pointer"
          >
            <span>•</span>
            <span>{currentCategory.name}</span>
          </button>
        </>
      )}

      {/* Subcategory */}
      {filters.selectedSubcategory && (
        <>
          <span className="text-slate-400 font-bold">›</span>
          <span className="truncate flex items-center gap-1 text-slate-900 font-bold">
            <span>°</span>
            <span>{filters.selectedSubcategory}</span>
          </span>
        </>
      )}

      {/* Search Query */}
      {filters.search && (
        <>
          <span className="text-slate-400 font-bold">›</span>
          <span className="text-black font-bold">
            Busca: "{filters.search}"
          </span>
        </>
      )}
    </nav>
  );
};

export default Breadcrumbs;
