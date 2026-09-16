import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  FolderTree, 
  Settings, 
  ExternalLink, 
  LogOut, 
  Sliders, 
  CheckCircle,
  AlertCircle,
  Info,
  Globe,
  Palette,
  TrendingUp,
  Ticket,
  Menu,
  X,
  ShoppingBag
} from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';
import { useTenant } from '../../context/TenantContext';
import { MetricsDashboard } from './MetricsDashboard';
import { ProductsManager } from './ProductsManager';
import { CategoriesManager } from './CategoriesManager';
import { StoreSettingsManager } from './StoreSettingsManager';
import { BannersManager } from './BannersManager';
import { ButtonsLayoutManager } from './ButtonsLayoutManager';
import { ApiDomainManager } from './ApiDomainManager';
import { CouponsManager } from './CouponsManager';
import { OrdersManager } from './OrdersManager';
import { SubscriptionBlockedScreen } from './SubscriptionBlockedScreen';
import { SoumbolinhoLogo } from '../common/SoumbolinhoLogo';
import { applyThemeToDocument } from '../../utils/theme';
import { ColorPaletteType, ThemeLayoutType } from '../../types';
import { AdminSidebar, AdminTab } from './AdminSidebar';

export { AdminSidebar };
export type { AdminTab };

interface AdminLayoutProps {
  onBackToStore: () => void;
  initialTab?: AdminTab;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onBackToStore, initialTab }) => {
  const { storeConfig, logout, adminNotification, isLoading: isStoreDataLoading } = useStoreData();
  const { 
    currentStore, 
    isResolvingTenant,
    isTrial,
    isExpired, 
    isExpiringSoon, 
    daysRemaining, 
    expiresAt, 
    monthlyFee 
  } = useTenant();
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const adminBasePath = useMemo(() => {
    if (currentPath.startsWith('/loja/') && currentPath.includes('/admin')) {
      const match = currentPath.match(/\/loja\/[^/]+\/admin/);
      return match ? match[0] : '/admin';
    }
    if (currentPath.startsWith('/editaveisdocanva/admin')) {
      return '/editaveisdocanva/admin';
    }
    if (currentPath.startsWith('/editaveis-do-canva/admin')) {
      return '/editaveis-do-canva/admin';
    }
    const match = currentPath.match(/^\/([^/]+)\/admin/);
    if (match && !['admin', 'master', 'super-admin'].includes(match[1].toLowerCase())) {
      return `/${match[1]}/admin`;
    }
    return '/admin';
  }, [currentPath]);

  const getTabFromLocation = (): AdminTab => {
    if (initialTab) return initialTab;
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
      if (pathname.endsWith('/orders') || pathname.endsWith('/pedidos') || pathname.includes('/admin/orders') || pathname.includes('/admin/pedidos') || hash === 'pedidos' || hash === 'orders') return 'orders';
      if (pathname.endsWith('/products') || pathname.endsWith('/produtos') || pathname.includes('/admin/products') || hash === 'produtos' || hash === 'products') return 'products';
      if (pathname.endsWith('/coupons') || pathname.endsWith('/cupons') || pathname.includes('/admin/coupons') || hash === 'cupons' || hash === 'coupons') return 'coupons';
      if (pathname.endsWith('/settings') || pathname.endsWith('/configuracoes') || pathname.includes('/admin/settings') || hash === 'configuracoes' || hash === 'settings') return 'settings';
      if (pathname.endsWith('/layout') || pathname.includes('/admin/layout') || hash === 'layout') return 'layout';
      if (pathname.endsWith('/api') || pathname.endsWith('/api-domain') || pathname.includes('/admin/api-domain') || hash === 'api' || hash === 'api-domain' || hash === 'dominio') return 'api-domain';
      if (pathname.endsWith('/categories') || pathname.endsWith('/categorias') || pathname.includes('/admin/categories') || hash === 'categorias' || hash === 'categories') return 'categories';
      if (pathname.endsWith('/banners') || pathname.includes('/admin/banners') || hash === 'banners') return 'banners';
      if (hash === 'dashboard' || hash === 'metricas') return 'dashboard';
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(getTabFromLocation);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isBaseStore = 
    currentStore?.slug === 'suamarcaaqui' || 
    currentStore?.id === 'suamarcaaqui' || 
    currentStore?.id === 'store_default';

  // Sincroniza abas com mudança de rota/hash na URL
  useEffect(() => {
    const handleUrlChange = () => {
      setActiveTab(getTabFromLocation());
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [initialTab]);

  // Injeta a variável global --primary-color e o tema na raiz do documento ao carregar o painel admin
  useEffect(() => {
    const activePalette = (currentStore?.color_palette as ColorPaletteType) || currentStore?.theme_settings?.color_palette || storeConfig.colorPalette || 'pink_pastel';
    const activePrimary = currentStore?.primary_color || currentStore?.theme_settings?.primary_color || storeConfig.primaryColor || '#FF1493';
    const activeLayout = (currentStore?.layout_style as ThemeLayoutType) || currentStore?.theme_settings?.theme_layout || (currentStore?.theme_settings?.layout_style as ThemeLayoutType) || storeConfig.themeLayout || 'classic';
    document.documentElement.style.setProperty('--primary-color', activePrimary);
    applyThemeToDocument(activePalette, activePrimary, activeLayout);

    const titleName = currentStore?.store_name || currentStore?.name || storeConfig.storeName || 'Loja';
    document.title = `Painel Administrativo | ${titleName}`;
  }, [storeConfig.primaryColor, storeConfig.colorPalette, storeConfig.themeLayout, currentStore]);

  const hasInitialLoadedRef = useRef(false);
  useEffect(() => {
    if (!isResolvingTenant && !isStoreDataLoading && currentStore.id !== '__resolving_tenant__') {
      hasInitialLoadedRef.current = true;
    }
  }, [isResolvingTenant, isStoreDataLoading, currentStore.id]);

  if (!hasInitialLoadedRef.current && (isResolvingTenant || isStoreDataLoading || currentStore.id === '__resolving_tenant__')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-3 font-sans">
        <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-300">Carregando painel da loja...</p>
      </div>
    );
  }

  // Se a mensalidade estiver vencida, bloqueia totalmente o painel do comprador (NUNCA a loja matriz vitalícia)
  if (!isBaseStore && isExpired) {
    return <SubscriptionBlockedScreen onBackToStore={onBackToStore} />;
  }

  const storeDisplayName = currentStore?.store_name || currentStore?.name || storeConfig.storeName || 'Minha Loja';

  const storeDomainDisplay = (() => {
    if (currentStore?.custom_domain && !currentStore.custom_domain.startsWith('seudominio')) {
      return currentStore.custom_domain.replace(/^https?:\/\//, '');
    }
    if (currentStore?.slug && currentStore.slug !== 'suamarcaaqui' && currentStore.slug !== 'store_default') {
      return `${currentStore.slug}.ajpstore.com.br`;
    }
    return null;
  })();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* 1. Admin Navigation Header (Barra superior limpa sem abas) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          
          {/* Lado Esquerdo: Botão Mobile Hamburguer + Logo & Título */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu lateral'}
              aria-label="Abrir menu lateral"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <SoumbolinhoLogo 
              variant="dark" 
              size="sm"
              storeName={storeDisplayName}
              slogan={currentStore?.slogan || storeConfig.slogan || ''}
              logoUrl={currentStore?.logo_url || currentStore?.theme_settings?.logo_url || storeConfig.logoUrl}
              onlyLogo={Boolean(currentStore?.only_logo || currentStore?.theme_settings?.only_logo || storeConfig.onlyLogo)}
            />
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-black text-white hidden sm:inline-block">
              Painel Admin
            </span>

            {/* Domínio da Loja Clicável em Destaque */}
            {storeDomainDisplay && (
              <a
                href={`https://${storeDomainDisplay}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 hover:text-sky-900 text-xs font-mono font-bold rounded-xl border border-sky-200 hover:border-sky-300 transition-all group"
                title="Acessar domínio público da loja em nova aba"
              >
                <Globe className="w-3.5 h-3.5 text-sky-600 group-hover:scale-110 transition-transform" />
                <span>{storeDomainDisplay}</span>
                <ExternalLink className="w-3 h-3 text-sky-500 group-hover:translate-x-0.5 transition-transform" />
              </a>
            )}
          </div>

          {/* Lado Direito: Ações Rápidas (Ver Catálogo & Logout) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onBackToStore}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Voltar para a vitrine da loja"
            >
              <ExternalLink className="w-3.5 h-3.5 text-theme-primary" />
              <span className="hidden sm:inline">Ver Catálogo</span>
            </button>

            <button
              onClick={logout}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Encerrar sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. Container Principal: Menu Lateral (Sidebar) + Área de Conteúdo */}
      <div className="flex-1 flex overflow-hidden">

        {/* Menu Lateral (Sidebar) */}
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          storeDisplayName={storeDisplayName}
          storeDomainDisplay={storeDomainDisplay}
          onBackToStore={onBackToStore}
          logout={logout}
          adminBasePath={adminBasePath}
        />

        {/* 3. Área de Conteúdo à Direita */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

          {/* Banner de Ciclo de 30 Dias / Período Inicial (Apenas para Lojas de Clientes, NUNCA para a Matriz Vitalícia) */}
          {!isBaseStore && isTrial && !isExpiringSoon && (
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold">
              <div className="flex items-center gap-2 mx-auto sm:mx-0">
                <span className="text-base sm:text-lg animate-bounce">🎁</span>
                <span>
                  Período de Mensalidade (30 dias): Restam{' '}
                  <strong className="underline decoration-pink-200">
                    {daysRemaining !== null ? (daysRemaining > 0 ? daysRemaining : 0) : 30}{' '}
                    {daysRemaining === 1 ? 'dia' : 'dias'}
                  </strong>{' '}
                  para gerenciar sua loja. Valor do plano: R$ {(monthlyFee || 50).toFixed(2).replace('.', ',')}/mês.
                </span>
              </div>
              {expiresAt && (
                <span className="hidden md:inline-block bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-mono">
                  Vence em: {new Date(expiresAt).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          )}

          {/* Aviso de Renovação Pendente (5 dias ou menos antes de vencer - Apenas Lojas de Clientes) */}
          {!isBaseStore && isExpiringSoon && (
            <div className="bg-amber-500 text-white border-b border-amber-600 px-4 py-2.5 text-center text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm animate-pulse">
              <AlertCircle className="w-5 h-5 text-yellow-200 shrink-0" />
              <span>
                ⚠️ Aviso de Renovação Pendente: A mensalidade da sua loja vence em <strong>{daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}</strong> ({expiresAt ? new Date(expiresAt).toLocaleDateString('pt-BR') : ''}). Efetue o pagamento de R$ {(monthlyFee || 50).toFixed(2).replace('.', ',')} para evitar o bloqueio automático do seu painel administrativo.
              </span>
            </div>
          )}

          {/* Main Admin Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {activeTab === 'dashboard' && (
              <MetricsDashboard 
                storeId={currentStore?.id} 
                onNavigateToProducts={() => {
                  setActiveTab('products');
                  window.location.hash = 'products';
                }} 
                onNavigateToOrders={() => {
                  setActiveTab('orders');
                  window.location.hash = 'orders';
                }}
              />
            )}
            {activeTab === 'products' && <ProductsManager />}
            {activeTab === 'categories' && <CategoriesManager />}
            {activeTab === 'banners' && <BannersManager />}
            {activeTab === 'orders' && <OrdersManager />}
            {activeTab === 'coupons' && <CouponsManager />}
            {activeTab === 'settings' && (
              <StoreSettingsManager 
                onNavigateToApiDomain={() => setActiveTab('api-domain')} 
                onNavigateToLayout={() => setActiveTab('layout')} 
              />
            )}
            {activeTab === 'layout' && <ButtonsLayoutManager />}
            {activeTab === 'api-domain' && <ApiDomainManager />}
          </main>
        </div>

      </div>

      {/* Toast Notification Banner */}
      {adminNotification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800 text-xs font-bold">
            {adminNotification.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            {adminNotification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {adminNotification.type === 'info' && <Info className="w-4 h-4 text-theme-primary shrink-0" />}
            <span>{adminNotification.message}</span>
          </div>
        </div>
      )}

    </div>
  );
};
