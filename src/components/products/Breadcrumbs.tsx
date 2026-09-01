import React from 'react';
import { ChevronRight } from 'lucide-react';
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
    <nav className="flex items-center gap-1.5 text-xs sm:text-[13px] text-[#2B3A8C] font-semibold overflow-x-auto no-scrollbar py-0.5">
      {/* Home */}
      <button
        onClick={resetFilters}
        className="hover:text-[#FF1493] transition-colors"
      >
        Home
      </button>

      {/* Category */}
      {currentCategory && (
        <>
          <span className="text-[#2B3A8C] font-bold">›</span>
          <button
            onClick={() => setSelectedSubcategory(null)}
            className="hover:text-[#FF1493] transition-colors truncate flex items-center gap-1"
          >
            <span>•</span>
            <span>{currentCategory.name}</span>
          </button>
        </>
      )}

      {/* Subcategory */}
      {filters.selectedSubcategory && (
        <>
          <span className="text-[#2B3A8C] font-bold">›</span>
          <span className="truncate flex items-center gap-1">
            <span>°</span>
            <span>{filters.selectedSubcategory}</span>
          </span>
        </>
      )}

      {/* Search Query */}
      {filters.search && (
        <>
          <span className="text-[#2B3A8C] font-bold">›</span>
          <span className="text-[#FF1493]">
            Busca: "{filters.search}"
          </span>
        </>
      )}
    </nav>
  );
};
