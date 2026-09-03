import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';

export const FloatingWhatsApp: React.FC = () => {
  const { storeConfig } = useStoreData();

  const whatsappUrl = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(
    `Olá! Estava visualizando o catálogo da ${storeConfig.storeName} e gostaria de tirar uma dúvida sobre os personalizados.`
  )}`;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Botão Flutuante do WhatsApp */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative w-14 h-14 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-950/20 hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-white"
        aria-label={`Atendimento via WhatsApp ${storeConfig.whatsappDisplay}`}
        title="Fale conosco no WhatsApp"
      >
        <MessageCircle className="w-7 h-7 fill-white" />
      </a>
    </div>
  );
};

export default FloatingWhatsApp;
