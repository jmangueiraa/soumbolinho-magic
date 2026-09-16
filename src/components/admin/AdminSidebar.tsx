import React from 'react';
import { 
  Package, 
  FolderTree, 
  Settings, 
  ExternalLink, 
  LogOut, 
  Sliders, 
  Globe, 
  Palette, 
  TrendingUp, 
  Ticket, 
  ShoppingBag, 
  X 
} from 'lucide-react';

export type AdminTab = 
  | 'dashboard' 
  | 'products' 
  | 'categories' 
  | 'banners' 
  | 'orders' 
  | 'coupons' 
  | 'settings' 
  | 'layout' 
  | 'api-domain';

export interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  isNew?: boolean;
  isLive?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  storeDisplayName: string;
  storeDomainDisplay: string | null;
  onBackToStore: () => void;
  logout: () => void;
  adminBasePath?: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  storeDisplayName,
  storeDomainDisplay,
  onBackToStore,
  logout,
  adminBasePath = '/admin',
}) => {
  const basePath = adminBasePath.replace(/\/+$/, '') || '/admin';

  const navGroups: NavGroup[] = [
    {
      title: 'Visão Geral',
      items: [
        { 
          id: 'dashboard', 
          label: 'Métricas & Conversão', 
          icon: TrendingUp, 
          path: `${basePath}`, 
          isLive: true 
        },
      ],
    },
    {
      title: 'Catálogo & Conteúdo',
      items: [
        { 
          id: 'products', 
          label: 'Produtos', 
          icon: Package, 
          path: `${basePath}/products` 
        },
        { 
          id: 'categories', 
          label: 'Categorias & Subcategorias', 
          icon: FolderTree, 
          path: `${basePath}/categories` 
        },
        { 
          id: 'banners', 
          label: 'Banners / Slides', 
          icon: Sliders, 
          path: `${basePath}/banners` 
        },
      ],
    },
    {
      title: 'VENDAS & OPERAÇÃO',
      items: [
        { 
          id: 'orders', 
          label: 'Pedidos', 
          icon: ShoppingBag, 
          path: `${basePath}/orders`, 
          isNew: true 
        },
        { 
          id: 'coupons', 
          label: 'Cupons & Promoções', 
          icon: Ticket, 
          path: `${basePath}/coupons` 
        },
      ],
    },
    {
      title: 'Configurações',
      items: [
        { 
          id: 'settings', 
          label: 'Configurações da Loja', 
          icon: Settings, 
          path: `${basePath}/settings` 
        },
        { 
          id: 'layout', 
          label: 'Layout e Cores', 
          icon: Palette, 
          path: `${basePath}/layout` 
        },
        { 
          id: 'api-domain', 
          label: 'API e Domínio', 
          icon: Globe, 
          path: `${basePath}/api-domain` 
        },
      ],
    },
  ];

  const handleItemClick = (item: NavItem, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveTab(item.id);
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState(null, '', item.path);
      } catch {
        // Fallback caso pushState encontre restrição de ambiente
      }
      window.location.hash = item.id;
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
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
                    <a
                      key={item.id}
                      href={item.path}
                      onClick={(e) => handleItemClick(item, e)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left no-underline select-none ${
                        isActive
                          ? 'bg-black text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-theme-primary' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.isNew && (
                        <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider ${
                          isActive ? 'bg-theme-primary text-white' : 'bg-pink-100 text-pink-700'
                        }`}>
                          Novo
                        </span>
                      )}
                      {item.isLive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className={isActive ? 'text-emerald-400' : 'text-emerald-600'}>Ao vivo</span>
                        </span>
                      )}
                    </a>
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
    </>
  );
};

export default AdminSidebar;
