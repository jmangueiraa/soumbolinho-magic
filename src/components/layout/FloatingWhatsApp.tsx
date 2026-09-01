import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';

export const FloatingWhatsApp: React.FC = () => {
  const { storeConfig } = useStoreData();
  const [showTooltip, setShowTooltip] = useState(true);

  const whatsappUrl = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(
    `Olá! Estava visualizando o catálogo da ${storeConfig.storeName} e gostaria de tirar uma dúvida sobre os personalizados.`
  )}`;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end group">
      {/* Tooltip */}
      {showTooltip && (
        <div className="mb-2.5 bg-white text-slate-900 text-xs font-bold px-3.5 py-2 rounded-2xl shadow-xl border border-[#D8B4F8]/60 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Dúvidas? Fale no WhatsApp!</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            className="text-slate-400 hover:text-slate-700 p-0.5 ml-1 rounded-full"
            title="Fechar"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* WhatsApp Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative w-14 h-14 bg-gradient-to-tr from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-600/40 hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white"
        aria-label={`Atendimento via WhatsApp ${storeConfig.whatsappDisplay}`}
      >
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-25"></span>
        <MessageCircle className="w-7 h-7 fill-white" />
      </a>
    </div>
  );
};
