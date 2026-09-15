import React, { useEffect, useState } from 'react';
import { TenantProvider, useTenant, isTenantHost, isPlatformRootHostname } from './context/TenantContext';
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
import { MarketingLandingPage } from './components/marketing/MarketingLandingPage';
import { applyThemeToDocument } from './utils/theme';
import { ThemeLayoutType, ColorPaletteType } from './types';
import { recordStoreVisit, recordProductView } from './services/analyticsService';

export const StoreFront: React.FC = () => {
  const { slug, storeSlug } = useParams<{ slug?: string; storeSlug?: string }>();
  const activeSlug = slug || storeSlug;
  const { currentStore, switchStore, isResolvingTenant, tenantNotFound, tenantError } = useTenant();
  const { storeConfig, isLoading: isStoreDataLoading } = useStoreData();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  const cachedLayout = (() => {
    try {
      if (typeof window !== 'undefined') {
        const storeId = currentStore?.id;
        const cached = (storeId ? localStorage.getItem(`store_${storeId}_theme_layout`) : null) || 
                       (currentStore?.slug === 'editaveisdocanva' || storeId === 'store_editaveisdocanva' ? localStorage.getItem('store_store_editaveisdocanva_theme_layout') || localStorage.getItem('store_editaveisdocanva_theme_layout') : null) ||
                       localStorage.getItem('soumbolinho_theme_layout');
        if (cached && ['classic', 'modern', 'minimal', 'featured_grid'].includes(cached)) {
          return cached as ThemeLayoutType;
        }
      }
    } catch {}
    return null;
  })();

  const activeLayout: ThemeLayoutType = 
    (currentStore?.layout_style as ThemeLayoutType) ||
    currentStore?.theme_settings?.theme_layout ||
    (currentStore?.theme_settings?.layout_style as ThemeLayoutType) ||
    storeConfig.themeLayout ||
    cachedLayout ||
    'classic';

  const activePalette: ColorPaletteType = 
    (currentStore?.color_palette as ColorPaletteType) ||
    currentStore?.theme_settings?.color_palette ||
    storeConfig.colorPalette || 
    'pink_pastel';

  const activePrimary = 
    currentStore?.primary_color || 
    currentStore?.theme_settings?.primary_color || 
    storeConfig.primaryColor;

  // Injeção de variáveis CSS de tema em tempo real
  useEffect(() => {
    applyThemeToDocument(activePalette, activePrimary, activeLayout);
  }, [activePalette, activePrimary, activeLayout]);

  // Registro de visita em tempo real para o painel de métricas
  useEffect(() => {
    if (currentStore?.id && currentStore.id !== '__resolving_tenant__') {
      recordStoreVisit(currentStore.id, window.location.pathname);
    }
  }, [currentStore?.id]);

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
        
        {/* Nos modos Moderno, Minimalista ou Grid em Destaque: exibe barra horizontal rápida de categorias no topo */}
        {activeLayout !== 'classic' && (
          <div className="mb-4 sm:mb-6">
            <CategoryPills />
          </div>
        )}

        {/* Layout Condicional Estrutural */}
        {activeLayout === 'featured_grid' ? (
          /* MODO 4: Grid em Destaque - 100% largura total, até 5 colunas no desktop, máxima conversão */
          <div>
            <div className="md:hidden">
              <SidebarFilters />
            </div>
            <ProductGrid 
              onSelectProduct={(prod) => {
                recordProductView(currentStore?.id || 'suamarcaaqui', prod.id, prod.name, prod.price, prod.image_url || prod.image);
                const targetSlug = prod.slug || prod.id;
                navigate(activeSlug ? `/loja/${activeSlug}/produto/${targetSlug}` : `/produto/${targetSlug}`);
              }} 
              isFullWidth={true} 
            />
          </div>
        ) : activeLayout === 'modern' ? (
          /* MODO 2: Moderno - Visual fluido com Pills horizontais no topo e catálogo expandido com cards modernos */
          <div>
            <div className="md:hidden">
              <SidebarFilters />
            </div>
            <ProductGrid 
              onSelectProduct={(prod) => {
                recordProductView(currentStore?.id || 'suamarcaaqui', prod.id, prod.name, prod.price, prod.image_url || prod.image);
                const targetSlug = prod.slug || prod.id;
                navigate(activeSlug ? `/loja/${activeSlug}/produto/${targetSlug}` : `/produto/${targetSlug}`);
              }} 
              isFullWidth={true} 
            />
          </div>
        ) : activeLayout === 'minimal' ? (
          /* MODO 3: Minimalista - Design limpo, sem barra lateral pesada, foco total nos produtos */
          <div>
            <div className="md:hidden">
              <SidebarFilters />
            </div>
            <ProductGrid 
              onSelectProduct={(prod) => {
                recordProductView(currentStore?.id || 'suamarcaaqui', prod.id, prod.name, prod.price, prod.image_url || prod.image);
                const targetSlug = prod.slug || prod.id;
                navigate(activeSlug ? `/loja/${activeSlug}/produto/${targetSlug}` : `/produto/${targetSlug}`);
              }} 
              isFullWidth={true} 
            />
          </div>
        ) : (
          /* MODO 1: Clássico - Barra lateral de categorias à esquerda + grade balanceada à direita */
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <SidebarFilters />
            <ProductGrid 
              onSelectProduct={(prod) => {
                recordProductView(currentStore?.id || 'suamarcaaqui', prod.id, prod.name, prod.price, prod.image_url || prod.image);
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

const DynamicTitleHandler: React.FC = () => {
  const { currentStore } = useTenant();
  const { storeConfig } = useStoreData();

  useEffect(() => {
    const updateTitle = () => {
      const siteName = currentStore?.store_name || currentStore?.name || storeConfig?.storeName || 'AJPSTORE';
      if (!siteName || siteName === '__resolving_tenant__' || siteName === 'Carregando loja...') {
        return;
      }

      const path = (typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '');
      const hash = (typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '');
      const fullRoute = path + hash;

      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const isRoot = isPlatformRootHostname(hostname);
      const isTenant = isTenantHost(hostname);

      if (isRoot && (path === '/' || path === '' || path === '/index.html')) {
        document.title = 'AJPSTORE — Crie seu sistema para seu negócio em minutos';
      } else if (fullRoute.includes('/master') || fullRoute.includes('/super-admin')) {
        document.title = `Painel Master | ${siteName}`;
      } else if (fullRoute.includes('/cadastro') || fullRoute.includes('/criar-loja') || fullRoute.includes('/planos') || fullRoute.includes('/comecar') || fullRoute.includes('/onboarding')) {
        document.title = `Criar Minha Loja (7 Dias Grátis) | ${siteName}`;
      } else if (!isTenant && (path === '/' || path === '' || path === '/index.html')) {
        document.title = 'AJPSTORE — Crie seu sistema para seu negócio em minutos';
      } else if (fullRoute.includes('/admin')) {
        document.title = `Painel Administrativo | ${siteName}`;
      } else if (fullRoute.includes('/checkout') || fullRoute.includes('/finalizar-compra')) {
        document.title = `Finalizar Pedido | ${siteName}`;
      } else if (fullRoute.includes('/arquivos')) {
        document.title = `Arquivos Digitais | ${siteName}`;
      } else if (!fullRoute.includes('/produto') && !fullRoute.includes('/p/')) {
        const slogan = currentStore?.slogan || storeConfig?.slogan;
        document.title = slogan && slogan !== 'subtitulo da sua loja'
          ? `${siteName} - ${slogan}`
          : siteName;
      }
    };

    updateTitle();
    window.addEventListener('popstate', updateTitle);
    window.addEventListener('hashchange', updateTitle);
    return () => {
      window.removeEventListener('popstate', updateTitle);
      window.removeEventListener('hashchange', updateTitle);
    };
  }, [currentStore?.name, currentStore?.store_name, currentStore?.slogan, storeConfig?.storeName, storeConfig?.slogan]);

  return null;
};

/**
 * Roteador Raiz Inteligente Multi-Tenant:
 * Se o hostname for o domínio principal (ajpstore.com.br, www.ajpstore.com.br, localhost ou vercel.app),
 * renderiza estritamente a Landing Page de Marketing principal da plataforma.
 * A vitrine da loja só carrega se a requisição vier de um subdomínio válido (ex: slug.ajpstore.com.br)
 * ou de um domínio personalizado mapeado.
 */
const RootRouteHandler: React.FC = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isRoot = isPlatformRootHostname(hostname);

  // Se for o domínio raiz da plataforma, NUNCA renderiza a vitrine de uma loja cliente, renderiza estritamente a Landing Page de Marketing!
  if (isRoot) {
    return <MarketingLandingPage />;
  }

  const isTenant = isTenantHost(hostname);
  if (!isTenant) {
    return <MarketingLandingPage />;
  }

  return <StoreFront />;
};

const NavigationRouter: React.FC = () => {
  const { isAuthenticated } = useStoreData();
  const navigate = useNavigate();

  const handleBackToStore = () => {
    window.location.hash = '';
    navigate('/');
  };

  return (
    <>
      <DynamicTitleHandler />
      <Routes>
        {/* 1. Rota Raiz Inteligente (Marketing na Raiz / Vitrine nos Subdomínios) */}
        <Route path="/" element={<RootRouteHandler />} />

        {/* 1.1. Página de Marketing & Onboarding (7 Dias Grátis) */}
        <Route path="/cadastro" element={<MarketingLandingPage />} />
        <Route path="/criar-loja" element={<MarketingLandingPage />} />
        <Route path="/planos" element={<MarketingLandingPage />} />
        <Route path="/comecar" element={<MarketingLandingPage />} />
        <Route path="/onboarding" element={<MarketingLandingPage />} />
        <Route path="/recursos" element={<MarketingLandingPage />} />
        <Route path="/como-funciona" element={<MarketingLandingPage />} />
        <Route path="/beneficios" element={<MarketingLandingPage />} />
        <Route path="/precos" element={<MarketingLandingPage />} />
        <Route path="/faq" element={<MarketingLandingPage />} />

        {/* 1.2. Rotas Dinâmicas de Loja por Slug (/loja/:slug e /loja/:storeSlug) */}
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

        {/* 1.3. Rota Direta de Admin da Loja: /:slug/admin */}
        <Route
          path="/:slug/admin"
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
  </>
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
