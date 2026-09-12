import React, { useEffect } from 'react';
import { Header } from '../layout/Header';
import { Footer } from '../layout/Footer';
import { CartDrawer } from '../cart/CartDrawer';
import { FloatingWhatsApp } from '../layout/FloatingWhatsApp';
import { Toast } from '../common/Toast';
import { useStoreData } from '../../context/StoreDataContext';
import { applyThemeToDocument } from '../../utils/theme';

export const ArquivosPage: React.FC = () => {
  const { storeConfig } = useStoreData();

  useEffect(() => {
    document.title = `Arquivos | ${storeConfig.storeName || 'Soumbolinho'}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (storeConfig?.primaryColor) {
      applyThemeToDocument(storeConfig.colorPalette, storeConfig.primaryColor, storeConfig.themeLayout);
    }
  }, [storeConfig.storeName, storeConfig?.primaryColor, storeConfig?.colorPalette, storeConfig?.themeLayout]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#FFFBFD] text-slate-900 selection:bg-theme-primary selection:text-white">
      {/* 1. Cabeçalho Oficial da Loja */}
      <Header />

      {/* 2. Corpo Centralizado */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24 select-none">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight text-center">
          Arquivos
        </h1>
      </main>

      {/* 3. Componentes Globais / Modais */}
      <CartDrawer />
      <Toast />
      <FloatingWhatsApp />

      {/* 4. Rodapé Oficial da Loja */}
      <Footer />
    </div>
  );
};

export default ArquivosPage;
