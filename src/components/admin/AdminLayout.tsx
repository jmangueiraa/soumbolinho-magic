import React, { useState, useEffect } from 'react';
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
  Truck
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
import { ShippingManager } from './ShippingManager';
import { SubscriptionBlockedScreen } from './SubscriptionBlockedScreen';
import { SoumbolinhoLogo } from '../common/SoumbolinhoLogo';
import { applyThemeToDocument } from '../../utils/theme';

type AdminTab = 'dashboard' | 'products' | 'categories' | 'banners' | 'coupons' | 'shipping' | 'settings' | 'layout' | 'api-domain';

interface AdminLayoutProps {
  onBackToStore: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onBackToStore }) => {
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
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const isBaseStore = 
    currentStore?.slug === 'suamarcaaqui' || 
    currentStore?.id === 'suamarcaaqui' || 
    currentStore?.id === 'store_default';

  // Injeta a variável global --primary-color e o tema na raiz do documento ao carregar o painel admin
  useEffect(() => {
    const activePalette = storeConfig.colorPalette || currentStore?.theme_settings?.color_palette || 'pink_pastel';
    const activePrimary = storeConfig.primaryColor || currentStore?.theme_settings?.primary_color || '#FF1493';
    const activeLayout = storeConfig.themeLayout || currentStore?.theme_settings?.theme_layout || 'classic';
    document.documentElement.style.setProperty('--primary-color', activePrimary);
    applyThemeToDocument(activePalette, activePrimary, activeLayout);
  }, [storeConfig.primaryColor, storeConfig.colorPalette, storeConfig.themeLayout, currentStore]);

  if (isResolvingTenant || isStoreDataLoading || currentStore.id === '__resolving_tenant__') {
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* 1. Admin Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          
          {/* Brand Logo / Admin Title */}
          <div className="flex items-center gap-3">
            {(currentStore?.id === 'suamarcaaqui' || currentStore?.id === 'store_default' || storeConfig.logoUrl || currentStore?.logo_url) ? (
              <SoumbolinhoLogo variant="dark" size="sm" />
            ) : (
              <div className="font-festive font-black text-lg text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-theme-light text-theme-primary flex items-center justify-center font-sans font-black text-sm border border-theme-primary/20">
                  {storeDisplayName.charAt(0).toUpperCase()}
                </span>
                <span className="truncate max-w-[200px]">{storeDisplayName}</span>
              </div>
            )}
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-black text-white">
              Admin
            </span>
          </div>

          {/* Top Actions: Ver Loja & Logout */}
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
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-colors"
              title="Encerrar sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>

        </div>

        {/* 2. Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 border-t border-slate-100 overflow-x-auto no-scrollbar py-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Métricas & Conversão</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'products'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 text-theme-primary" />
            <span>Produtos</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'categories'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-4 h-4 text-theme-primary" />
            <span>Categorias & Subcategorias</span>
          </button>

          <button
            onClick={() => setActiveTab('banners')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'banners'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-theme-primary" />
            <span>Banners / Slides</span>
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'coupons'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Ticket className="w-4 h-4 text-theme-primary" />
            <span>Cupons & Promoções</span>
          </button>

          <button
            onClick={() => setActiveTab('shipping')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'shipping'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4 text-theme-primary" />
            <span>Frete & Envio</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'settings'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4 text-theme-primary" />
            <span>Configurações da Loja</span>
          </button>

          <button
            onClick={() => setActiveTab('layout')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'layout'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Palette className="w-4 h-4 text-theme-primary" />
            <span>Layout e Cores</span>
          </button>

          <button
            onClick={() => setActiveTab('api-domain')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'api-domain'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4 text-theme-primary" />
            <span>Api e Dominio</span>
          </button>
        </div>
      </header>

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

      {/* 3. Main Admin Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <MetricsDashboard onNavigateToProducts={() => setActiveTab('products')} />
        )}
        {activeTab === 'products' && <ProductsManager />}
        {activeTab === 'categories' && <CategoriesManager />}
        {activeTab === 'banners' && <BannersManager />}
        {activeTab === 'coupons' && <CouponsManager />}
        {activeTab === 'shipping' && <ShippingManager />}
        {activeTab === 'settings' && (
          <StoreSettingsManager 
            onNavigateToApiDomain={() => setActiveTab('api-domain')} 
            onNavigateToLayout={() => setActiveTab('layout')} 
          />
        )}
        {activeTab === 'layout' && <ButtonsLayoutManager />}
        {activeTab === 'api-domain' && <ApiDomainManager />}
      </main>

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
