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
        
        {/* Botão de Todos os Produtos */}
        <button
          onClick={() => {
            setSelectedCategory(null);
            setSelectedSubcategory(null);
          }}
          className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
            filters.selectedCategory === null
              ? 'bg-theme-primary text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Todos os Produtos</span>
        </button>

        {/* Lista de Categorias Principais */}
        {categories.map((cat) => {
          const isCatSelected = filters.selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                if (isCatSelected) {
                  setSelectedCategory(null);
                  setSelectedSubcategory(null);
                } else {
                  setSelectedCategory(cat.id);
                  setSelectedSubcategory(null);
                }
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all border shadow-xs cursor-pointer ${
                isCatSelected
                  ? 'bg-theme-primary text-white font-bold border-transparent shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              {cat.name}
            </button>
          );
        })}

        {/* Subcategorias da Categoria Selecionada */}
        {currentCategory && currentCategory.subcategories && currentCategory.subcategories.length > 0 && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300">
            {currentCategory.subcategories.map((subcat) => {
              const isSubSelected = filters.selectedSubcategory === subcat;
              return (
                <button
                  key={subcat}
                  onClick={() => setSelectedSubcategory(isSubSelected ? null : subcat)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all border shadow-2xs cursor-pointer ${
                    isSubSelected
                      ? 'bg-black text-white font-bold border-black'
                      : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {subcat}
                </button>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
