import React, { createContext, useContext, useState, useMemo } from 'react';
import { Product, SortOption, FilterState } from '../types';
import { useStoreData } from './StoreDataContext';

interface FilterContextType {
  filters: FilterState;
  minPriceInput: string;
  maxPriceInput: string;
  setMinPriceInput: (val: string) => void;
  setMaxPriceInput: (val: string) => void;
  applyPriceFilter: () => void;
  setSearch: (search: string) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  setSelectedSubcategory: (subcategory: string | null) => void;
  setInStockOnly: (inStock: boolean) => void;
  setSortBy: (sortBy: SortOption) => void;
  resetFilters: () => void;
  filteredProducts: Product[];
  totalResults: number;
  hasActiveFilters: boolean;
  isMobileFiltersOpen: boolean;
  setIsMobileFiltersOpen: (open: boolean) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { products } = useStoreData();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategoryState] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  
  // Price inputs (De e Até)
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [appliedMinPrice, setAppliedMinPrice] = useState<number>(0);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<number>(1000);

  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const setSelectedCategory = (categoryId: string | null) => {
    setSelectedCategoryState(categoryId);
    setSelectedSubcategory(null);
  };

  const applyPriceFilter = () => {
    const min = parseFloat(minPriceInput.replace(',', '.')) || 0;
    const max = parseFloat(maxPriceInput.replace(',', '.')) || 1000;
    setAppliedMinPrice(min);
    setAppliedMaxPrice(max);
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedCategoryState(null);
    setSelectedSubcategory(null);
    setMinPriceInput('');
    setMaxPriceInput('');
    setAppliedMinPrice(0);
    setAppliedMaxPrice(1000);
    setInStockOnly(false);
    setSortBy('relevance');
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
    selectedCategory ||
    selectedSubcategory ||
    appliedMinPrice > 0 ||
    appliedMaxPrice < 1000 ||
    inStockOnly ||
    sortBy !== 'relevance'
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Busca textual por nome do produto, descrição ou tags
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesDesc = product.description?.toLowerCase().includes(query);
        const matchesSubcat = product.subcategory?.toLowerCase().includes(query);
        const matchesTags = product.tags?.some((t) => t.toLowerCase().includes(query));

        if (!matchesName && !matchesDesc && !matchesSubcat && !matchesTags) {
          return false;
        }
      }

      // 2. Categoria ativa
      if (selectedCategory && product.category !== selectedCategory) {
        return false;
      }

      // 3. Subcategoria ativa
      if (selectedSubcategory && product.subcategory !== selectedSubcategory) {
        return false;
      }

      // 4. Faixa de preço (De / Até)
      if (product.price < appliedMinPrice || product.price > appliedMaxPrice) {
        return false;
      }

      // 5. Em estoque
      if (inStockOnly && !product.inStock) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-asc':
          return a.name.localeCompare(b.name, 'pt-BR');
        case 'relevance':
        default:
          return (a.badge === 'Mais Vendido' ? -1 : 1);
      }
    });
  }, [products, search, selectedCategory, selectedSubcategory, appliedMinPrice, appliedMaxPrice, inStockOnly, sortBy]);

  return (
    <FilterContext.Provider
      value={{
        filters: {
          search,
          selectedCategory,
          selectedSubcategory,
          minPrice: appliedMinPrice,
          maxPrice: appliedMaxPrice,
          inStockOnly,
          sortBy
        },
        minPriceInput,
        maxPriceInput,
        setMinPriceInput,
        setMaxPriceInput,
        applyPriceFilter,
        setSearch,
        setSelectedCategory,
        setSelectedSubcategory,
        setInStockOnly,
        setSortBy,
        resetFilters,
        filteredProducts,
        totalResults: filteredProducts.length,
        hasActiveFilters,
        isMobileFiltersOpen,
        setIsMobileFiltersOpen,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter deve ser usado dentro de um FilterProvider');
  }
  return context;
};
