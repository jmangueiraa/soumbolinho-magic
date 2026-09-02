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
import { CreditCardCheckoutPage } from './components/checkout/CreditCardCheckoutPage';
import { StoreHighlights } from './components/home/StoreHighlights';

const StoreFront: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-white text-slate-900">
      {/* 1. Header */}
      <Header />

      {/* 2. Banner Imagem Única no Topo */}
      <BannerSlider />

      {/* 3. Destaques da Loja (3 Ícones Circulares + Barra Link Imediato + Produtos em Destaque) */}
      <StoreHighlights />

      {/* 4. Catálogo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
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
  const [currentRoute, setCurrentRoute] = useState<'store' | 'admin' | 'checkout' | 'checkout-cartao'>(() => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (hash.includes('/admin') || path.includes('/admin')) return 'admin';
    if (hash.includes('/checkout/cartao') || hash.includes('/pagamento-cartao') || hash.includes('cartao')) return 'checkout-cartao';
    if (hash.includes('/finalizar-compra') || hash.includes('/checkout') || path.includes('/finalizar-compra') || path.includes('/checkout')) return 'checkout';
    return 'store';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash.includes('/admin') || path.includes('/admin')) {
        setCurrentRoute('admin');
      } else if (hash.includes('/checkout/cartao') || hash.includes('/pagamento-cartao') || hash.includes('cartao')) {
        setCurrentRoute('checkout-cartao');
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

  if (currentRoute === 'checkout-cartao') {
    return <CreditCardCheckoutPage />;
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
