import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Gift, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  Plus, 
  LogOut, 
  ExternalLink 
} from 'lucide-react';
import { Store as StoreType } from '../../types';
import { fetchAllStores } from '../../services/storeManagementService';
import { useTenant } from '../../context/TenantContext';
import { StoresList } from './StoresList';
import { CreateStoreModal } from './CreateStoreModal';
import { DnsInstructionsModal } from './DnsInstructionsModal';
import { MasterLogin } from './MasterLogin';

const MASTER_SESSION_KEY = 'saas_master_auth_session';

export const MasterLayout: React.FC = () => {
  const { currentStore } = useTenant();
  const siteName = currentStore?.store_name || currentStore?.name || 'AJPSTORE';

  useEffect(() => {
    document.title = `Painel Master | ${siteName}`;
  }, [siteName]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(MASTER_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [stores, setStores] = useState<StoreType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedDnsStore, setSelectedDnsStore] = useState<StoreType | null>(null);
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
        // Regra de filtro estrita para remover completamente a loja store_editaveisdocanva da interface
        const activeStores = data.filter((s) => {
          const id = (s?.id || '').toLowerCase();
          const slug = (s?.slug || '').toLowerCase();
          const domain = (s?.custom_domain || '').toLowerCase();
          const name = (s?.name || s?.store_name || '').toLowerCase();
          return (
            id !== 'store_editaveisdocanva' &&
            slug !== 'editaveisdocanva' &&
            slug !== 'editaveis-do-canva' &&
            !domain.includes('editaveisdocanva') &&
            !name.includes('editáveis do canva') &&
            !name.includes('editaveis do canva')
          );
        });
        setStores(activeStores);
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

  // Estatísticas de Assinatura e Lojas (exclui a loja matriz vitalícia AJPSTORE e a loja bloqueada editaveisdocanva)
  const isBase = (s: StoreType) => Boolean(s && (s.is_matriz || s.slug === 'ajpstore' || s.id === 'store_ajpstore' || s.slug === 'suamarcaaqui' || s.id === 'suamarcaaqui' || s.id === 'store_default'));
  const isBlocked = (s: StoreType) => {
    const id = (s?.id || '').toLowerCase();
    const slug = (s?.slug || '').toLowerCase();
    const domain = (s?.custom_domain || '').toLowerCase();
    const name = (s?.name || s?.store_name || '').toLowerCase();
    return (
      id === 'store_editaveisdocanva' ||
      slug === 'editaveisdocanva' ||
      slug === 'editaveis-do-canva' ||
      domain.includes('editaveisdocanva') ||
      name.includes('editáveis do canva') ||
      name.includes('editaveis do canva')
    );
  };
  const safeStores = (Array.isArray(stores) ? stores.filter(Boolean) : []).filter((s) => !isBlocked(s));
  const totalStores = safeStores.length;
  const trialStores = safeStores.filter((s) => (s.subscription_status === 'trial' || s.isTrial) && !s.isExpired && !isBase(s)).length;
  const activeSubscriptionStores = safeStores.filter((s) => s.subscription_status === 'active' && !s.isExpired && !isBase(s)).length;
  const expiredSubscriptionStores = safeStores.filter((s) => s.isExpired && !isBase(s)).length;
  const estimatedMRR = safeStores
    .filter((s) => !s.isExpired && !isBase(s) && s.subscription_status === 'active')
    .reduce((acc, s) => acc + (s.monthly_fee || 50), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        
        {/* HEADER PRINCIPAL */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
              <span className="bg-pink-500 text-white p-1.5 rounded-lg flex items-center justify-center shadow-xs">
                <Store size={20} />
              </span>
              AJPSTORE <span className="text-xs bg-purple-900 text-purple-100 px-2.5 py-1 rounded-full ml-2 font-bold tracking-wider">SUPER ADMIN</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 cursor-pointer text-sm active:scale-98"
            >
              <Plus size={18} />
              <span>Nova Loja</span>
            </button>

            <button
              onClick={handleBackToStore}
              className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Acessar vitrine matriz"
            >
              <ExternalLink size={14} className="text-pink-500" />
              <span className="hidden sm:inline">Ver Loja Matriz</span>
            </button>

            <button
              onClick={handleLogout}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Encerrar sessão master"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        {/* 1. MÉTRICAS EM GRID (Substituindo os cards gigantes) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard icon={<Store size={20}/>} title="Lojas" value={totalStores} color="text-pink-500" bg="bg-pink-50" />
          <StatCard icon={<Gift size={20}/>} title="Em Teste" value={trialStores} color="text-purple-500" bg="bg-purple-50" />
          <StatCard icon={<CheckCircle size={20}/>} title="Assinantes" value={activeSubscriptionStores} color="text-emerald-500" bg="bg-emerald-50" />
          <StatCard icon={<AlertCircle size={20}/>} title="Vencidas" value={expiredSubscriptionStores} color="text-red-500" bg="bg-red-50" />
          <StatCard icon={<DollarSign size={20}/>} title="MRR" value={`R$ ${estimatedMRR.toFixed(2).replace('.', ',')}`} color="text-green-600" bg="bg-green-50" />
        </div>

        {loadError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-red-700 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span><strong>Aviso do Banco de Dados:</strong> {loadError}</span>
            </div>
            <button
              onClick={loadStores}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold cursor-pointer transition-colors shrink-0"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* 2. ÁREA DE BUSCA, ABAS E LISTA DE LOJAS */}
        <StoresList
          stores={safeStores}
          isLoading={isLoading}
          onRefresh={loadStores}
          onOpenDns={(store) => setSelectedDnsStore(store)}
        />

      </div>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
        Plataforma SaaS Multi-Tenant • AJPSTORE • Arquitetura White-Label com Domínios Próprios
      </footer>

      {/* Modals */}
      <CreateStoreModal
        isOpen={isCreateModalOpen}
        stores={safeStores}
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

// COMPONENTE: Card de Métrica
interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color: string;
  bg: string;
}

function StatCard({ icon, title, value, color, bg }: StatCardProps) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3.5 sm:gap-4 transition-all hover:shadow-md">
      <div className={`${bg} ${color} p-2.5 sm:p-3 rounded-lg shrink-0 flex items-center justify-center`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-gray-500 text-[11px] sm:text-xs font-medium uppercase tracking-wider truncate">{title}</p>
        <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}
