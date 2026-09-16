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
  X
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
import { SubscriptionBlockedScreen } from './SubscriptionBlockedScreen';
import { SoumbolinhoLogo } from '../common/SoumbolinhoLogo';
import { applyThemeToDocument } from '../../utils/theme';
import { ColorPaletteType, ThemeLayoutType } from '../../types';

type AdminTab = 'dashboard' | 'products' | 'categories' | 'banners' | 'coupons' | 'settings' | 'layout' | 'api-domain';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isBaseStore = 
    currentStore?.slug === 'suamarcaaqui' || 
    currentStore?.id === 'suamarcaaqui' || 
    currentStore?.id === 'store_default';

  const navGroups = [
    {
      title: 'Visão Geral',
      items: [
        { id: 'dashboard' as AdminTab, label: 'Métricas & Conversão', icon: TrendingUp, isLive: true },
      ],
    },
    {
      title: 'Catálogo & Conteúdo',
      items: [
        { id: 'products' as AdminTab, label: 'Produtos', icon: Package },
        { id: 'categories' as AdminTab, label: 'Categorias & Subcategorias', icon: FolderTree },
        { id: 'banners' as AdminTab, label: 'Banners / Slides', icon: Sliders },
      ],
    },
    {
      title: 'Vendas & Operação',
      items: [
        { id: 'coupons' as AdminTab, label: 'Cupons & Promoções', icon: Ticket },
      ],
    },
    {
      title: 'Configurações',
      items: [
        { id: 'settings' as AdminTab, label: 'Configurações da Loja', icon: Settings },
        { id: 'layout' as AdminTab, label: 'Layout e Cores', icon: Palette },
        { id: 'api-domain' as AdminTab, label: 'API e Domínio', icon: Globe },
      ],
    },
  ];

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

            {(currentStore?.slug === 'ajpstore' || currentStore?.id === 'store_ajpstore' || currentStore?.id === 'suamarcaaqui' || currentStore?.id === 'store_default' || storeConfig.logoUrl || currentStore?.logo_url || !currentStore) ? (
              <SoumbolinhoLogo variant="dark" size="sm" />
            ) : (
              <div className="font-festive font-black text-lg text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-theme-light text-theme-primary flex items-center justify-center font-sans font-black text-sm border border-theme-primary/20">
                  {storeDisplayName.charAt(0).toUpperCase()}
                </span>
                <span className="truncate max-w-[160px] sm:max-w-[220px]">{storeDisplayName}</span>
              </div>
            )}
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

        {/* Backdrop para mobile drawer */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Menu Lateral (Sidebar) */}
        <aside
          className={`
            fixed lg:static top-0 bottom-0 left-0 z-50 lg:z-30
            w-64 xl:w-72 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0
            transition-transform duration-300 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            h-full lg:h-[calc(100vh-61px)] lg:sticky lg:top-[61px]
          `}
        >
          {/* Header Mobile do Menu com botão fechar */}
          <div className="p-4 flex items-center justify-between border-b border-slate-100 lg:hidden">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-theme-light text-theme-primary flex items-center justify-center font-sans font-black text-xs border border-theme-primary/20">
                {storeDisplayName.charAt(0).toUpperCase()}
              </span>
              <div>
                <span className="text-xs font-bold truncate max-w-[170px] block">{storeDisplayName}</span>
                {storeDomainDisplay && (
                  <a
                    href={`https://${storeDomainDisplay}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono text-sky-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <span>{storeDomainDisplay}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Links de Navegação Agrupados */}
          <div className="p-4 space-y-6 overflow-y-auto flex-1">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                          isActive
                            ? 'bg-black text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-theme-primary' : 'text-slate-500'}`} />
                          <span>{item.label}</span>
                        </div>
                        {'isLive' in item && item.isLive && (
                          <span className="flex items-center gap-1 text-[10px] font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className={isActive ? 'text-emerald-400' : 'text-emerald-600'}>Ao vivo</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Rodapé do Menu Lateral */}
          <div className="p-4 border-t border-slate-100 space-y-2 bg-slate-50/50">
            <button
              onClick={onBackToStore}
              className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-theme-primary" />
              <span>Ver Vitrine da Loja</span>
            </button>
            <button
              onClick={logout}
              className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair da Conta</span>
            </button>
            <div className="pt-2 text-center text-[10px] text-slate-400 font-medium">
              AJPSTORE v2.4 • Multi-Tenant
            </div>
          </div>
        </aside>

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
              <MetricsDashboard storeId={currentStore?.id} onNavigateToProducts={() => setActiveTab('products')} />
            )}
            {activeTab === 'products' && <ProductsManager />}
            {activeTab === 'categories' && <CategoriesManager />}
            {activeTab === 'banners' && <BannersManager />}
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
