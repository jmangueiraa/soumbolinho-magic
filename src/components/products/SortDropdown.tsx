import React from 'react';
import { ChevronDown } from 'lucide-react';
import { SortOption } from '../../types';
import { useFilter } from '../../context/FilterContext';

export const SortDropdown: React.FC = () => {
  const { filters, setSortBy } = useFilter();

  return (
    <div className="relative inline-block">
      <select
        id="sort-select"
        value={filters.sortBy}
        onChange={(e) => setSortBy(e.target.value as SortOption)}
        className="appearance-none bg-white border border-slate-300 hover:border-black text-slate-900 text-xs sm:text-sm font-semibold rounded-lg pl-3 sm:pl-4 pr-8 sm:pr-9 py-2 focus:outline-none focus:ring-1 focus:ring-black transition-all cursor-pointer shadow-2xs"
      >
        <option value="relevance">Ordenar por</option>
        <option value="price-asc">Menor preço</option>
        <option value="price-desc">Maior preço</option>
        <option value="name-asc">Nome A-Z</option>
      </select>
      <ChevronDown className="w-4 h-4 text-slate-700 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
    </div>
  );
};

export default SortDropdown;
