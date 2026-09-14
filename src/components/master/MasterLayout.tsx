import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Plus, 
  Store as StoreIcon, 
  Globe, 
  CheckCircle2, 
  LogOut, 
  ExternalLink, 
  RefreshCw,
  Sparkles,
  Layers,
  CreditCard,
  AlertOctagon,
  DollarSign,
  Gift
} from 'lucide-react';
import { Store } from '../../types';
import { fetchAllStores } from '../../services/storeManagementService';
import { StoresList } from './StoresList';
import { CreateStoreModal } from './CreateStoreModal';
import { DnsInstructionsModal } from './DnsInstructionsModal';
import { MasterLogin } from './MasterLogin';

const MASTER_SESSION_KEY = 'saas_master_auth_session';

export const MasterLayout: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(MASTER_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedDnsStore, setSelectedDnsStore] = useState<Store | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadStores = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await fetchAllStores();
      if (error) {
        setLoadError(error);
      }
      if (data) {
        setStores(data);
      }
    } catch (err: any) {
      console.error('Erro ao listar lojas:', err);
      setLoadError(err?.message || 'Erro inesperado ao consultar lojas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadStores();
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    sessionStorage.removeItem(MASTER_SESSION_KEY);
    setIsAuthenticated(false);
  };

  const handleBackToStore = () => {
    window.location.href = '/';
  };

  if (!isAuthenticated) {
    return (
      <MasterLogin 
        onLoginSuccess={() => setIsAuthenticated(true)} 
        onBackToStore={handleBackToStore} 
      />
    );
  }

  // Estatísticas de Assinatura e Lojas (exclui a loja matriz vitalícia AJPSTORE)
  const isBase = (s: Store) => Boolean(s && (s.is_matriz || s.slug === 'ajpstore' || s.id === 'store_ajpstore' || s.slug === 'suamarcaaqui' || s.id === 'suamarcaaqui' || s.id === 'store_default'));
  const safeStores = Array.isArray(stores) ? stores.filter(Boolean) : [];
  const totalStores = safeStores.length;
  const trialStores = safeStores.filter((s) => (s.subscription_status === 'trial' || s.isTrial) && !s.isExpired && !isBase(s)).length;
  const activeSubscriptionStores = safeStores.filter((s) => s.subscription_status === 'active' && !s.isExpired && !isBase(s)).length;
  const expiredSubscriptionStores = safeStores.filter((s) => s.isExpired && !isBase(s)).length;
  const customDomainStores = safeStores.filter((s) => Boolean(s.custom_domain)).length;
  const estimatedMRR = safeStores
    .filter((s) => !s.isExpired && !isBase(s) && s.subscription_status === 'active')
    .reduce((acc, s) => acc + (s.monthly_fee || 50), 0);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      
      {/* Top Header */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF1493] to-purple-600 text-white flex items-center justify-center shadow-md shadow-[#FF1493]/30">
              <Crown className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base tracking-tight text-white">
                  AJPSTORE
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gestão de Lojas & Mensalidades (R$ 50/mês)
              </p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 sm:px-4 py-2 bg-gradient-to-r from-[#FF1493] to-pink-600 hover:from-pink-500 hover:to-pink-700 text-white text-xs font-bold rounded-xl shadow-md shadow-[#FF1493]/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Cadastrar Nova Loja</span>
              <span className="sm:hidden">Nova Loja</span>
            </button>

            <button
              onClick={handleBackToStore}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Acessar catálogo matriz"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Ver Loja Matriz</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-800/40"
              title="Encerrar sessão mestre"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        
        {/* Stats Grid: 5 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-pink-50 text-[#FF1493] flex items-center justify-center shrink-0">
              <StoreIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Total de Lojas</span>
              <span className="text-2xl font-black text-slate-900">{totalStores}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Em Teste (Trial)</span>
              <span className="text-2xl font-black text-purple-700">{trialStores}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Assinantes Ativos</span>
              <span className="text-2xl font-black text-slate-900">{activeSubscriptionStores}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Vencidas / Bloq.</span>
              <span className="text-2xl font-black text-slate-900">{expiredSubscriptionStores}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">MRR Pago (Mensal)</span>
              <span className="text-lg sm:text-xl font-black text-emerald-700">
                R$ {estimatedMRR.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

        </div>

        {/* Action Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-purple-900/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <h2 className="text-sm sm:text-base font-bold text-white">
                Como funciona o Plano Mensal (30 dias)?
              </h2>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Ao cadastrar uma nova loja, o cliente inicia com <strong>30 dias de mensalidade (R$ 50,00/mês)</strong> com catálogo completo clonado e isolamento total. Quando os 30 dias completarem, o painel do cliente é temporariamente bloqueado solicitando o pagamento de renovação via Pix.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="shrink-0 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md active:scale-98 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#FF1493]" />
            <span>Cadastrar Loja de Cliente</span>
          </button>
        </div>

        {/* Stores List Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" />
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                Lojas Registradas na Plataforma
              </h2>
            </div>

            <button
              onClick={loadStores}
              disabled={isLoading}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 disabled:opacity-50"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Recarregar</span>
            </button>
          </div>

          {loadError && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-800 text-xs">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                <span><strong>Aviso do Banco de Dados:</strong> {loadError}</span>
              </div>
              <button
                onClick={loadStores}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold cursor-pointer transition-colors shrink-0"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          <StoresList
            stores={stores}
            isLoading={isLoading}
            onRefresh={loadStores}
            onOpenDns={(store) => setSelectedDnsStore(store)}
          />
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Plataforma SaaS Multi-Tenant • Editáveis do Canva • Arquitetura White-Label com Domínios Próprios
      </footer>

      {/* Modals */}
      <CreateStoreModal
        isOpen={isCreateModalOpen}
        stores={stores}
        onClose={() => setIsCreateModalOpen(false)}
        onStoreCreated={(newStore) => {
          loadStores();
          if (newStore.custom_domain) {
            setSelectedDnsStore(newStore);
          }
        }}
      />

      <DnsInstructionsModal
        isOpen={!!selectedDnsStore}
        store={selectedDnsStore}
        onClose={() => setSelectedDnsStore(null)}
      />

    </div>
  );
};
