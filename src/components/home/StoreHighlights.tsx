import React from 'react';
import { FolderArchive, ShieldCheck, Infinity as InfinityIcon, Star, ShoppingBag, FolderOpen, Lock } from 'lucide-react';

export const StoreHighlights: React.FC = () => {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 select-none">
      
      {/* 1. Três Ícones Circulares: Arquivos Editáveis, Compra Segura, Acesso Vitalício */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6 max-w-md sm:max-w-lg mx-auto text-center py-2">
        
        {/* Item 1: Arquivos Editáveis */}
        <div className="flex flex-col items-center justify-center space-y-2 group cursor-default">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black text-white flex items-center justify-center shadow-md p-3 relative transition-transform duration-300 group-hover:scale-105 border border-slate-800">
            {/* Ícone Estilizado de Pasta com Arquivos */}
            <div className="relative flex items-center justify-center">
              <FolderOpen className="w-8 h-8 sm:w-10 sm:h-10 text-slate-100" />
              <span className="absolute -top-1 -right-1 text-[10px] bg-rose-500 text-white font-black px-1 rounded-sm">ZIP</span>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight block">
            Arquivos <br /> Editáveis
          </span>
        </div>

        {/* Item 2: Compra Segura */}
        <div className="flex flex-col items-center justify-center space-y-2 group cursor-default">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black text-white flex items-center justify-center shadow-md p-3 relative transition-transform duration-300 group-hover:scale-105 border border-slate-800">
            {/* Ícone Estilizado de Cesta com Escudo */}
            <div className="relative flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10 text-slate-100" />
              <ShieldCheck className="w-4 h-4 text-emerald-400 absolute -bottom-1 -right-1" />
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight block">
            Compra <br /> Segura
          </span>
        </div>

        {/* Item 3: Acesso Vitalício */}
        <div className="flex flex-col items-center justify-center space-y-2 group cursor-default">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black text-white flex items-center justify-center shadow-md p-3 relative transition-transform duration-300 group-hover:scale-105 border border-slate-800">
            {/* Ícone Estilizado de Infinito */}
            <div className="relative flex items-center justify-center">
              <InfinityIcon className="w-9 h-9 sm:w-11 sm:h-11 text-amber-200 stroke-[2.5]" />
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight block">
            Acesso <br /> Vitalício
          </span>
        </div>

      </div>

      {/* 2. Barra Azul Cyan "Toda loja com Link imediato!" */}
      <div className="max-w-xl mx-auto">
        <div className="w-full py-3.5 sm:py-4 px-6 bg-[#38bdf8] text-white font-extrabold text-base sm:text-xl rounded-2xl shadow-sm text-center tracking-tight flex items-center justify-center">
          <span>Toda loja com Link imediato!</span>
        </div>
      </div>

      {/* 3. Título "Produtos em Destaque" com Linha Pontilhada e Estrela */}
      <div className="pt-4 space-y-2 text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight">
          <span>Produtos em </span>
          <span className="font-extrabold">Destaque</span>
        </h2>

        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-dotted border-slate-300" />
          <div className="absolute bg-white px-3 text-slate-400">
            <Star className="w-4 h-4 fill-slate-200 text-slate-400" />
          </div>
        </div>
      </div>

    </section>
  );
};

export default StoreHighlights;
