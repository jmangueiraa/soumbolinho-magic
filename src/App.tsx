import React from 'react';
import { StoreDataProvider, useStoreData } from './context/StoreDataContext';
import { CartProvider } from './context/CartContext';
import { FilterProvider } from './context/FilterContext';
import { BrowserRouter, Routes, Route, useNavigate } from './lib/router';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { FloatingWhatsApp } from './components/layout/FloatingWhatsApp';
import { SidebarFilters } from './components/filters/SidebarFilters';
import { ProductGrid } from './components/products/ProductGrid';
import { ProductDetails } from './components/products/ProductDetails';
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
  const navigate = useNavigate();

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
          <ProductGrid onSelectProduct={(prod) => navigate(`/produto/${prod.id}`)} />
        </div>
      </main>

      {/* 5. Modals, Drawers & WhatsApp Overlays */}
      <CartDrawer />
      <CheckoutModal />
      <PaymentFeedbackModal />
      <Toast />
      <FloatingWhatsApp />

      {/* 6. Footer */}
      <Footer />
    </div>
  );
};

const NavigationRouter: React.FC = () => {
  const { isAuthenticated } = useStoreData();
  const navigate = useNavigate();

  const handleBackToStore = () => {
    window.location.hash = '';
    navigate('/');
  };

  return (
    <Routes>
      {/* 1. Rota Raiz da Loja */}
      <Route path="/" element={<StoreFront />} />

      {/* 2. Rotas Fixas Administrativas */}
      <Route
        path="/admin"
        element={
          isAuthenticated ? (
            <AdminLayout onBackToStore={handleBackToStore} />
          ) : (
            <AdminLogin onBackToStore={handleBackToStore} />
          )
        }
      />

      {/* 3. Rotas Fixas de Checkout */}
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/finalizar-compra" element={<CheckoutPage />} />
      <Route path="/checkout/cartao" element={<CreditCardCheckoutPage />} />
      <Route path="/pagamento-cartao" element={<CreditCardCheckoutPage />} />

      {/* 4. Compatibilidade com rota antiga /produto/:id */}
      <Route path="/produto/:id" element={<ProductDetails />} />

      {/* 5. Rota Dinâmica Amigável na Raiz (/:slug) no Final da Lista */}
      <Route path="/:slug" element={<ProductDetails />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <StoreDataProvider>
      <CartProvider>
        <FilterProvider>
          <BrowserRouter>
            <NavigationRouter />
          </BrowserRouter>
        </FilterProvider>
      </CartProvider>
    </StoreDataProvider>
  );
};

export default App;
