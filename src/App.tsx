import React, { useEffect, useState } from 'react';
import { TenantProvider, useTenant } from './context/TenantContext';
import { StoreDataProvider, useStoreData } from './context/StoreDataContext';
import { CartProvider } from './context/CartContext';
import { FilterProvider } from './context/FilterContext';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from './lib/router';
import { supabase } from './lib/supabase';
import { Store } from './types';
import { Loader2, AlertCircle } from 'lucide-react';
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
import { MasterLayout } from './components/master/MasterLayout';
import { CheckoutPage } from './components/checkout/CheckoutPage';
import { CreditCardCheckoutPage } from './components/checkout/CreditCardCheckoutPage';
import { StoreHighlights } from './components/home/StoreHighlights';
import { ArquivosPage } from './components/pages/ArquivosPage';
import { CategoryPills } from './components/filters/CategoryPills';
import { applyThemeToDocument } from './utils/theme';
import { ThemeLayoutType, ColorPaletteType } from './types';

export const StoreFront: React.FC = () => {
  const { slug, storeSlug } = useParams<{ slug?: string; storeSlug?: string }>();
  const activeSlug = slug || storeSlug;
  const { currentStore, switchStore, isResolvingTenant, tenantNotFound, tenantError } = useTenant();
  const { storeConfig, isLoading: isStoreDataLoading } = useStoreData();
  const navigate = useNavigate();

  const [notFound, setNotFound] = useState<boolean>(false);

  const activeLayout: ThemeLayoutType = storeConfig.themeLayout || currentStore?.theme_settings?.theme_layout || 'classic';
  const activePalette: ColorPaletteType = storeConfig.colorPalette || currentStore?.theme_settings?.color_palette || 'pink_pastel';
  const activePrimary = storeConfig.primaryColor || currentStore?.theme_settings?.primary_color;

  // Injeção de variáveis CSS de tema em tempo real
  useEffect(() => {
    applyThemeToDocument(activePalette, activePrimary, activeLayout);
  }, [activePalette, activePrimary, activeLayout]);

  // Sincronização e resolução da loja da rota caso slug esteja presente
  useEffect(() => {
    if (!activeSlug) return;
    const cleanSlug = activeSlug.toLowerCase().trim();
    if (currentStore && (currentStore.slug?.toLowerCase() === cleanSlug || currentStore.id === cleanSlug)) {
      setNotFound(false);
      return;
    }

    let isMounted = true;
    async function fetchStoreBySlug() {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .or(`slug.ilike.${cleanSlug},id.eq.${cleanSlug}`)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        if (cleanSlug === 'suamarcaaqui') {
          const { ensureMatrizStoreExists } = await import('./services/storeManagementService');
          const createdMatriz = await ensureMatrizStoreExists();
          setNotFound(false);
          switchStore(createdMatriz);
          return;
        }
        console.warn('[StoreFront] Loja não encontrada para slug:', cleanSlug);
        setNotFound(true);
      } else {
        setNotFound(false);
        switchStore(data as Store);
      }
    }

    fetchStoreBySlug();

    return () => {
      isMounted = false;
    };
  }, [activeSlug, currentStore?.slug, currentStore?.id, switchStore]);

  // Validação se a loja em memória já corresponde ao slug da URL
  const slugMatches = !activeSlug || (
    currentStore && 
    currentStore.id !== '__resolving_tenant__' && 
    (currentStore.slug?.toLowerCase() === activeSlug.toLowerCase() || currentStore.id === activeSlug)
  );

  // REQUISITO RIGOROSO: Estado de carregamento global unificado
  // Permanece ativo até que a query do Supabase valide e traga as configurações e produtos específicos da loja
  const isStoreLoading = 
    isResolvingTenant || 
    isStoreDataLoading || 
    currentStore.id === '__resolving_tenant__' || 
    !slugMatches;

  if (isStoreLoading && !tenantNotFound && !notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFBFD] text-slate-700 gap-3">
        <Loader2 className="w-8 h-8 text-theme-primary animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Carregando loja...</p>
      </div>
    );
  }

  if (tenantNotFound || notFound || (activeSlug && !slugMatches)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFBFD] text-slate-800 p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold font-festive text-slate-900 mb-2">Loja não encontrada</h1>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          Não encontramos nenhuma loja cadastrada com o endereço <strong>/loja/{activeSlug || ''}</strong>.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-black text-white text-xs font-bold rounded-2xl hover:bg-slate-800 transition-all cursor-pointer"
        >
          Voltar para a Página Inicial
        </button>
      </div>
    );
  }

  return (
    <div 
      data-theme={activePalette}
      data-layout={activeLayout}
      className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[#FFFBFD] text-slate-900 selection:bg-theme-primary selection:text-white"
    >
      {/* 1. Header Dinâmico com suporte a Tema */}
      <Header />

      {/* 2. Banner Imagem Única no Topo */}
      <BannerSlider />

      {/* 3. Destaques da Loja (renderiza nos modos Clássico e Moderno; simplificado no Minimalista) */}
      {activeLayout !== 'minimal' && <StoreHighlights />}

      {/* 4. Catálogo Principal com Variação Estrutural de Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* No modo Moderno ou Grid em Destaque, exibe barra horizontal de categorias no topo */}
        {(activeLayout === 'modern' || activeLayout === 'featured_grid') && (
          <div className="mb-4 sm:mb-6">
            <CategoryPills />
          </div>
        )}

        {/* Layout Condicional: Grid em Destaque ocupa 100% de largura sem sidebar fixa no desktop */}
        {activeLayout === 'featured_grid' ? (
          <div>
            {/* SidebarFilters montada para dar suporte ao drawer no mobile */}
            <div className="md:hidden">
              <SidebarFilters />
            </div>
            <ProductGrid 
              onSelectProduct={(prod) => {
                const targetSlug = prod.slug || prod.id;
                navigate(activeSlug ? `/loja/${activeSlug}/produto/${targetSlug}` : `/produto/${targetSlug}`);
              }} 
              isFullWidth={true} 
            />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Left Sidebar Filter */}
            <SidebarFilters />

            {/* Right Product Grid */}
            <ProductGrid 
              onSelectProduct={(prod) => {
                const targetSlug = prod.slug || prod.id;
                navigate(activeSlug ? `/loja/${activeSlug}/produto/${targetSlug}` : `/produto/${targetSlug}`);
              }} 
            />
          </div>
        )}
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

export const Storefront = StoreFront;

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

      {/* 1.1. Rotas Dinâmicas de Loja por Slug (/loja/:slug e /loja/:storeSlug) */}
      <Route path="/loja/:slug" element={<StoreFront />} />
      <Route path="/loja/:storeSlug" element={<StoreFront />} />
      <Route
        path="/loja/:slug/admin"
        element={
          isAuthenticated ? (
            <AdminLayout onBackToStore={handleBackToStore} />
          ) : (
            <AdminLogin onBackToStore={handleBackToStore} />
          )
        }
      />
      <Route
        path="/loja/:storeSlug/admin"
        element={
          isAuthenticated ? (
            <AdminLayout onBackToStore={handleBackToStore} />
          ) : (
            <AdminLogin onBackToStore={handleBackToStore} />
          )
        }
      />

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

      {/* 2.1. Painel Mestre de Vendas (SaaS Multi-Tenant) */}
      <Route path="/master" element={<MasterLayout />} />
      <Route path="/super-admin" element={<MasterLayout />} />

      {/* 3. Rotas Fixas de Checkout */}
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/finalizar-compra" element={<CheckoutPage />} />
      <Route path="/checkout/cartao" element={<CreditCardCheckoutPage />} />
      <Route path="/pagamento-cartao" element={<CreditCardCheckoutPage />} />

      {/* 4. Rota Interna de Arquivos */}
      <Route path="/arquivos" element={<ArquivosPage />} />

      {/* 5. Rotas Dinâmicas de Landing Page do Produto */}
      <Route path="/loja/:slug/produto/:productId" element={<ProductDetails />} />
      <Route path="/loja/:storeSlug/produto/:productId" element={<ProductDetails />} />
      <Route path="/loja/:slug/p/:productId" element={<ProductDetails />} />
      <Route path="/loja/:storeSlug/p/:productId" element={<ProductDetails />} />
      <Route path="/produto/:slug" element={<ProductDetails />} />
      <Route path="/produto/:id" element={<ProductDetails />} />
      <Route path="/p/:id" element={<ProductDetails />} />
      <Route path="/produto" element={<StoreFront />} />
      <Route path="/p" element={<StoreFront />} />

      {/* 6. Rota Dinâmica Amigável na Raiz (/:slug) no Final da Lista */}
      <Route path="/:slug" element={<ProductDetails />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <TenantProvider>
      <StoreDataProvider>
        <CartProvider>
          <FilterProvider>
            <BrowserRouter>
              <NavigationRouter />
            </BrowserRouter>
          </FilterProvider>
        </CartProvider>
      </StoreDataProvider>
    </TenantProvider>
  );
};

export default App;
