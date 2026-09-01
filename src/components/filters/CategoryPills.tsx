import React from 'react';
import { Sparkles, Layers } from 'lucide-react';
import { useFilter } from '../../context/FilterContext';
import { useStoreData } from '../../context/StoreDataContext';

export const CategoryPills: React.FC = () => {
  const { categories } = useStoreData();
  const { 
    filters, 
    setSelectedCategory, 
    setSelectedSubcategory 
  } = useFilter();

  const currentCategory = categories.find((c) => c.id === filters.selectedCategory);

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2">
      <div className="flex items-center gap-2 min-w-max">
        
        {/* If no category is selected: show all top categories pills */}
        {!currentCategory ? (
          <>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                filters.selectedCategory === null
                  ? 'bg-black text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-pastel-pink-light border border-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F8A4D8]" />
              Todos os Produtos
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-white text-slate-700 hover:bg-pastel-pink-light/70 hover:text-slate-900 border border-[#D8B4F8]/40 transition-all shadow-xs"
              >
                {cat.name}
              </button>
            ))}
          </>
        ) : (
          /* If a category is selected: show quick subcategory pills */
          <>
            <button
              onClick={() => setSelectedSubcategory(null)}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                filters.selectedSubcategory === null
                  ? 'bg-black text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#F8A4D8]" />
              Todos em {currentCategory.name}
            </button>

            {currentCategory.subcategories.map((subcat) => {
              const isSelected = filters.selectedSubcategory === subcat;
              return (
                <button
                  key={subcat}
                  onClick={() => setSelectedSubcategory(isSelected ? null : subcat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all border shadow-xs ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#F8A4D8] to-[#D8B4F8] text-slate-900 font-bold border-white shadow-md'
                      : 'bg-white text-slate-700 hover:bg-pastel-pink-light/60 hover:text-slate-900 border-[#D8B4F8]/40'
                  }`}
                >
                  {subcat}
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};
