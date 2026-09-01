import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Product } from './types';
import { StoreDataProvider, useStoreData } from './context/StoreDataContext';
import { CartProvider } from './context/CartContext';
import { FilterProvider } from './context/FilterContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { FloatingWhatsApp } from './components/layout/FloatingWhatsApp';
import { SidebarFilters } from './components/filters/SidebarFilters';
import { ProductGrid } from './components/products/ProductGrid';
import { ProductDetailModal } from './components/products/ProductDetailModal';
import { CartDrawer } from './components/cart/CartDrawer';
import { CheckoutModal } from './components/cart/CheckoutModal';
import { PaymentFeedbackModal } from './components/cart/PaymentFeedbackModal';
import { Toast } from './components/common/Toast';
import { BannerSlider } from './components/home/BannerSlider';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLogin } from './components/admin/AdminLogin';
import { CheckoutPage } from './components/checkout/CheckoutPage';

const StoreFront: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-[#FFEBF6] text-slate-900">
      {/* 1. Header */}
      <Header />

      {/* 2. Banner Slider Rotativo no Topo */}
      <BannerSlider />

      {/* 2. Hero Banner Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pastel-pink-light/80 via-pastel-lilac-light/40 to-transparent py-8 sm:py-12 border-b border-[#D8B4F8]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl space-y-3 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-[#D8B4F8] shadow-xs text-xs font-bold text-slate-900">
              <span className="w-2 h-2 rounded-full bg-[#F8A4D8] animate-pulse"></span>
              Encantando Festa • Catálogo Oficial
            </div>
            <h1 className="font-festive text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Papelaria Personalizada <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pastel-pink-dark via-[#B886E8] to-slate-900">
                para Festas Inesquecíveis.
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
              Kits personalizados, centros de mesa, caixinhas milk, apliques e topos de bolo exclusivos. Selecione os itens, informe seu tema e envie o pedido formatado direto para o WhatsApp!
            </p>
          </div>
        </div>

        {/* Soft decorative background circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#F8A4D8]/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-[#D8B4F8]/25 blur-3xl pointer-events-none" />
      </section>

      {/* 3. Main Catalog Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left Sidebar Filter */}
          <SidebarFilters />

          {/* Right Product Grid */}
          <ProductGrid onSelectProduct={(prod) => setSelectedProduct(prod)} />
        </div>
      </main>

      {/* 4. Modals, Drawers & WhatsApp Overlays */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
      <CartDrawer />
      <CheckoutModal />
      <PaymentFeedbackModal />
      <Toast />
      <FloatingWhatsApp />

      {/* 5. Footer */}
      <Footer />
    </div>
  );
};

const NavigationRouter: React.FC = () => {
  const { isAuthenticated } = useStoreData();
  const [currentRoute, setCurrentRoute] = useState<'store' | 'admin' | 'checkout'>(() => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (hash.includes('/admin') || path.includes('/admin')) return 'admin';
    if (hash.includes('/finalizar-compra') || hash.includes('/checkout') || path.includes('/finalizar-compra') || path.includes('/checkout')) return 'checkout';
    return 'store';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash.includes('/admin') || path.includes('/admin')) {
        setCurrentRoute('admin');
      } else if (hash.includes('/finalizar-compra') || hash.includes('/checkout') || path.includes('/finalizar-compra') || path.includes('/checkout')) {
        setCurrentRoute('checkout');
      } else {
        setCurrentRoute('store');
      }
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const handleBackToStore = () => {
    window.location.hash = '';
    setCurrentRoute('store');
  };

  if (currentRoute === 'admin') {
    if (!isAuthenticated) {
      return <AdminLogin onBackToStore={handleBackToStore} />;
    }
    return <AdminLayout onBackToStore={handleBackToStore} />;
  }

  if (currentRoute === 'checkout') {
    return <CheckoutPage />;
  }

  return <StoreFront />;
};

export const App: React.FC = () => {
  return (
    <StoreDataProvider>
      <CartProvider>
        <FilterProvider>
          <NavigationRouter />
        </FilterProvider>
      </CartProvider>
    </StoreDataProvider>
  );
};

export default App;
