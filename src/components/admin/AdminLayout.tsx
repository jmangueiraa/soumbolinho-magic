import React, { useState } from 'react';
import { 
  Package, 
  FolderTree, 
  Settings, 
  ExternalLink, 
  LogOut, 
  Sliders, 
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';
import { ProductsManager } from './ProductsManager';
import { CategoriesManager } from './CategoriesManager';
import { StoreSettingsManager } from './StoreSettingsManager';
import { BannersManager } from './BannersManager';

type AdminTab = 'products' | 'categories' | 'banners' | 'settings';

interface AdminLayoutProps {
  onBackToStore: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onBackToStore }) => {
  const { storeConfig, logout, adminNotification } = useStoreData();
  const [activeTab, setActiveTab] = useState<AdminTab>('products');

  return (
    <div className="min-h-screen bg-[#FFEBF6] text-slate-900 flex flex-col font-sans">
      
      {/* 1. Admin Navigation Header */}
      <header className="bg-white border-b border-[#FFA6DF]/50 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          
          {/* Brand Logo / Admin Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF1493] to-[#D8B4F8] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              🎀
            </div>
            <div>
              <h1 className="font-festive font-extrabold text-slate-900 text-lg leading-tight flex items-center gap-2">
                <span>{storeConfig.storeName}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-black text-white">
                  Admin
                </span>
              </h1>
              <p className="text-[11px] text-[#2B3A8C] font-semibold">
                Painel de Controle e Gestão
              </p>
            </div>
          </div>

          {/* Top Actions: Ver Loja & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onBackToStore}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-colors"
              title="Voltar para a vitrine da loja"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#FF1493]" />
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
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'products'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 text-[#FFD1EC]" />
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
            <FolderTree className="w-4 h-4 text-[#FFD1EC]" />
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
            <Sliders className="w-4 h-4 text-[#FFD1EC]" />
            <span>Banners / Slides</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'settings'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4 text-[#FFD1EC]" />
            <span>Configurações da Loja</span>
          </button>
        </div>
      </header>

      {/* 3. Main Admin Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'products' && <ProductsManager />}
        {activeTab === 'categories' && <CategoriesManager />}
        {activeTab === 'banners' && <BannersManager />}
        {activeTab === 'settings' && <StoreSettingsManager />}
      </main>

      {/* Toast Notification Banner */}
      {adminNotification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800 text-xs font-bold">
            {adminNotification.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            {adminNotification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {adminNotification.type === 'info' && <Info className="w-4 h-4 text-[#FFD1EC] shrink-0" />}
            <span>{adminNotification.message}</span>
          </div>
        </div>
      )}

    </div>
  );
};
