import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ShoppingBag,
  AlertTriangle,
  Sparkles,
  Clock,
  RefreshCw,
  KeyRound
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
import { ChangePasswordModal } from './ChangePasswordModal';
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
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalTargetPlan, setRenewalTargetPlan] = useState<30 | 50>(30);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const isBaseStore = 
    Boolean(currentStore?.is_matriz) ||
    currentStore?.slug === 'ajpstore' || 
    currentStore?.id === 'store_ajpstore' ||
    currentStore?.slug === 'suamarcaaqui' || 
    currentStore?.id === 'suamarcaaqui' || 
    currentStore?.id === 'store_default';

  const isExemptFromBlock = isBaseStore;

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
    try {
      document.documentElement.style.setProperty('--primary-color', activePrimary);
      if (typeof applyThemeToDocument === 'function') {
        applyThemeToDocument(activePalette, activePrimary, activeLayout);
      } else if (typeof window !== 'undefined' && typeof (window as any).applyThemeToDocument === 'function') {
        (window as any).applyThemeToDocument(activePalette, activePrimary, activeLayout);
      }
    } catch {}

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

  // Se a mensalidade estiver vencida, bloqueia totalmente o painel do comprador (NUNCA a loja matriz vitalícia nem a loja Editáveis do Canva)
  if (!isExemptFromBlock && isExpired) {
    return <SubscriptionBlockedScreen onBackToStore={onBackToStore} isHardLock={true} />;
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

  const expiryFormatted = expiresAt 
    ? new Date(expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
    : (daysRemaining !== null 
        ? new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
        : '');
  const monthlyFeeFormatted = monthlyFee 
    ? (Number(monthlyFee) % 1 === 0 ? String(Math.round(Number(monthlyFee))) : Number(monthlyFee).toFixed(2).replace('.', ','))
    : '50';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Modal de Renovação Preventiva (aberto ao clicar em 'Renovar Plano' no card oficial) */}
      {showRenewalModal && (
        <SubscriptionBlockedScreen 
          isHardLock={false} 
          onClose={() => setShowRenewalModal(false)}
          initialTargetPlan={renewalTargetPlan}
        />
      )}

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

            {/* BOTÃO PROEMINENTE DE ACESSO AO GERENCIADOR DE PEDIDOS */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('orders');
                window.location.hash = 'orders';
                if (typeof window !== 'undefined' && window.history.pushState) {
                  try { window.history.pushState(null, '', `${adminBasePath}/orders`); } catch {}
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-2xs'
              }`}
              title="Acessar Gerenciador de Pedidos"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Pedidos</span>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                activeTab === 'orders' ? 'bg-indigo-800 text-white' : 'bg-indigo-200 text-indigo-800'
              }`}>
                Novo
              </span>
            </button>
          </div>

          {/* Lado Direito: Ações Rápidas (Alterar Senha, Ver Catálogo & Logout) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowChangePasswordModal(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-indigo-50 text-slate-800 hover:text-indigo-700 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Alterar senha do painel administrativo"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Alterar Senha</span>
            </button>

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

        {/* 1.1. Barra de Navegação Horizontal Rápida para Telas Menores (Tablet / Mobile) */}
        <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar lg:hidden">
          <button
            type="button"
            onClick={() => { setActiveTab('dashboard'); window.location.hash = 'dashboard'; }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-black text-white' : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Métricas</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('orders'); window.location.hash = 'orders'; }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'orders' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Pedidos</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('products'); window.location.hash = 'products'; }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'products' ? 'bg-black text-white' : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Produtos</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('coupons'); window.location.hash = 'coupons'; }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'coupons' ? 'bg-black text-white' : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Cupons</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('settings'); window.location.hash = 'settings'; }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings' ? 'bg-black text-white' : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configurações</span>
          </button>
          <button
            type="button"
            onClick={() => setShowChangePasswordModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50"
            title="Alterar senha administrativa"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
            <span>Senha</span>
          </button>
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
          onOpenChangePassword={() => setShowChangePasswordModal(true)}
          adminBasePath={adminBasePath}
        />

        {/* 3. Área de Conteúdo à Direita */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

          {/* Card Oficial de Status do Plano Mensal (Exibido para TODAS as lojas da plataforma) */}
          {!isExpired && (
            <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-0">
              <div className="bg-[#E8F8EE] border border-[#BBECCD] rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                
                {/* Lado Esquerdo: Ícone Redondo com borda + Textos */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#D1F3DE] border border-[#A1E4BA] text-[#059669] flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-[#059669]" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight flex items-center gap-1.5">
                        <span>{monthlyFee <= 30 ? 'Plano Iniciante Ativo' : 'Plano Máximo Ativo'}</span>
                        {monthlyFee > 30 && (
                          <span className="text-[10px] font-bold bg-[#D1F3DE] text-[#047857] px-1.5 py-0.5 rounded border border-[#A1E4BA]">
                            Completo
                          </span>
                        )}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        isExpiringSoon 
                          ? 'bg-amber-100 text-amber-800 border-amber-300' 
                          : 'bg-[#D1F3DE] text-[#047857] border-[#A1E4BA]'
                      }`}>
                        {daysRemaining !== null 
                          ? (daysRemaining === 1 ? 'Resta 1 dia' : `Restam ${daysRemaining} dias`) 
                          : 'Restam 30 dias'}
                      </span>
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-tight">
                      Validade da assinatura até <strong className="text-slate-700 font-bold">{expiryFormatted || '30 dias'}</strong>. Todos os recursos e redirecionamentos estão operando normalmente.
                    </p>
                  </div>
                </div>

                {/* Lado Direito: Botões de Renovar e Migrar */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {monthlyFee <= 30 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRenewalTargetPlan(50);
                        setShowRenewalModal(true);
                      }}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-98 cursor-pointer shrink-0"
                      title="Migrar para o Plano Máximo (R$ 50)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                      <span>Migrar p/ Plano Máximo (R$ 50)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setRenewalTargetPlan(monthlyFee <= 30 ? 30 : 50);
                      setShowRenewalModal(true);
                    }}
                    className="bg-white hover:bg-emerald-50/60 text-[#047857] border border-[#9EE2B9] hover:border-[#059669] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all active:scale-98 cursor-pointer shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Renovar Plano (R$ {monthlyFeeFormatted})</span>
                  </button>
                </div>

              </div>
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

      {/* Modal de Alteração de Senha Administrativa */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

    </div>
  );
};
