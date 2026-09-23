import React, { useState } from 'react';
import { 
  Store as StoreIcon, 
  Globe, 
  ExternalLink, 
  Settings, 
  Power, 
  Trash2, 
  Search, 
  CheckCircle, 
  Clock, 
  Crown, 
  Edit2, 
  Check, 
  X, 
  CreditCard, 
  CalendarPlus, 
  Loader2, 
  User, 
  Mail, 
  KeyRound, 
  Gift, 
  Calendar,
  RefreshCw,
  AlertCircle,
  Send,
  MessageCircle
} from 'lucide-react';
import { Store } from '../../types';
import { 
  toggleStoreActive, 
  deleteStore, 
  updateStoreDomain, 
  renewStoreSubscription, 
  extendStoreTrial, 
  activatePaidSubscription, 
  setStoreExpirationDays 
} from '../../services/storeManagementService';
import { notifyStoreCreatedById } from '../../services/adminTelegramNotificationService';

interface StoresListProps {
  stores: Store[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenDns: (store: Store) => void;
}

export const StoresList: React.FC<StoresListProps> = ({
  stores,
  isLoading,
  onRefresh,
  onOpenDns,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'trial' | 'active' | 'expired'>('all');
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState('');
  const [isUpdatingDomain, setIsUpdatingDomain] = useState(false);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [extendingTrialId, setExtendingTrialId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [editingDaysStore, setEditingDaysStore] = useState<Store | null>(null);
  const [customDaysInput, setCustomDaysInput] = useState<string>('180');
  const [customDateInput, setCustomDateInput] = useState<string>('');
  const [isSavingDays, setIsSavingDays] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [notifyFeedback, setNotifyFeedback] = useState<{ id: string; message: string; isError?: boolean } | null>(null);

  // Contagens para os filtros (exclui apenas a Matriz permanente AJPSTORE da contagem de clientes)
  const safeList = Array.isArray(stores) ? stores.filter(Boolean) : [];
  const isEditaveisStore = (s: Store) => 
    s.slug === 'editaveisdocanva' || 
    s.slug === 'editaveis-do-canva' || 
    s.id === 'store_editaveisdocanva' ||
    Boolean(s.custom_domain && s.custom_domain.toLowerCase().includes('editaveisdocanva')) ||
    Boolean((s.name || s.store_name || '').toLowerCase().includes('editaveis'));
  const isMatrizOrBase = (s: Store) => !isEditaveisStore(s) && (Boolean(s.is_matriz) || s.slug === 'ajpstore' || s.id === 'store_ajpstore');
  const trialCount = safeList.filter(s => (s.subscription_status === 'trial' || s.isTrial) && !isMatrizOrBase(s)).length;
  const activeCount = safeList.filter(s => s.subscription_status === 'active' && !s.isExpired && !isMatrizOrBase(s)).length;
  const expiredCount = safeList.filter(s => s.isExpired && !isMatrizOrBase(s)).length;

  // Filtragem defensiva e null-safe
  const filteredStores = safeList.filter((s) => {
    if (filterTab === 'trial' && !(s.subscription_status === 'trial' || s.isTrial)) return false;
    if (filterTab === 'active' && (s.subscription_status !== 'active' || s.isExpired)) return false;
    if (filterTab === 'expired' && !s.isExpired) return false;

    const term = (searchTerm || '').toLowerCase().trim();
    if (!term) return true;

    const name = (s.name || s.store_name || '').toLowerCase();
    const slug = (s.slug || '').toLowerCase();
    const domain = (s.custom_domain || '').toLowerCase();
    const ownerName = (s.owner_name || s.client_name || '').toLowerCase();
    const ownerEmail = (s.owner_email || s.client_email || '').toLowerCase();

    return (
      name.includes(term) ||
      slug.includes(term) ||
      domain.includes(term) ||
      ownerName.includes(term) ||
      ownerEmail.includes(term)
    );
  });

  const handleRenew = async (store: Store) => {
    const fee = store.monthly_fee !== undefined && store.monthly_fee !== null 
      ? `R$ ${store.monthly_fee.toFixed(2).replace('.', ',')}` 
      : 'R$ 50,00';
    const confirmed = window.confirm(
      `Confirmar recebimento da mensalidade (${fee}) da loja "${store.name}" e estender a assinatura por mais 30 dias?`
    );
    if (!confirmed) return;

    setRenewingId(store.id);
    const { success, error, newExpiresAt } = await renewStoreSubscription(store.id, 30);
    setRenewingId(null);

    if (success) {
      alert(`✅ Mensalidade renovada com sucesso! Vencimento estendido para: ${new Date(newExpiresAt!).toLocaleDateString('pt-BR')}`);
      onRefresh();
    } else {
      alert(`❌ Erro ao renovar mensalidade: ${error}`);
    }
  };

  const handleExtendTrial = async (store: Store) => {
    const confirmed = window.confirm(
      `Deseja conceder mais 30 dias de prazo para a loja "${store.name}"?`
    );
    if (!confirmed) return;

    setExtendingTrialId(store.id);
    const { success, error, newExpiresAt } = await extendStoreTrial(store.id, 30);
    setExtendingTrialId(null);

    if (success) {
      alert(`🎁 Prazo estendido por +30 dias! Novo término: ${new Date(newExpiresAt!).toLocaleDateString('pt-BR')}`);
      onRefresh();
    } else {
      alert(`❌ Erro ao estender prazo: ${error}`);
    }
  };

  const handleActivatePaid = async (store: Store) => {
    const confirmed = window.confirm(
      `Confirmar pagamento do Pix (R$ 50) e ativar assinatura oficial de 30 dias para a loja "${store.name}"?`
    );
    if (!confirmed) return;

    setActivatingId(store.id);
    const { success, error, newExpiresAt } = await activatePaidSubscription(store.id);
    setActivatingId(null);

    if (success) {
      alert(`⭐ Assinatura ativada com sucesso! Vencimento em: ${new Date(newExpiresAt!).toLocaleDateString('pt-BR')}`);
      onRefresh();
    } else {
      alert(`❌ Erro ao ativar assinatura: ${error}`);
    }
  };

  const handleToggleStatus = async (store: Store) => {
    const newStatus = !store.is_active;
    const action = newStatus ? 'ativar' : 'pausar';
    if (!window.confirm(`Deseja realmente ${action} a loja "${store.name}"?`)) return;

    const { success, error } = await toggleStoreActive(store.id, newStatus);
    if (success) {
      onRefresh();
    } else {
      alert(`❌ Erro ao ${action} loja: ${error}`);
    }
  };

  const handleDelete = async (store: Store) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente a loja "${store.name}"?`)) {
      return;
    }

    setDeletingId(store.id);
    const { success, error } = await deleteStore(store.id, store.slug);
    setDeletingId(null);

    if (success) {
      alert(`✅ Loja "${store.name}" excluída permanentemente.`);
      onRefresh();
    } else {
      alert(`❌ Erro ao excluir loja: ${error}`);
    }
  };

  const handleOpenEditDays = (store: Store) => {
    setEditingDaysStore(store);
    setCustomDaysInput(store.daysRemaining !== null && store.daysRemaining !== undefined && store.daysRemaining > 0 ? String(store.daysRemaining) : '180');
    if (store.expires_at) {
      try {
        const d = new Date(store.expires_at);
        setCustomDateInput(d.toISOString().split('T')[0]);
      } catch {
        setCustomDateInput('');
      }
    } else {
      setCustomDateInput('');
    }
  };

  const handleApplyDays = async (days: number) => {
    if (!editingDaysStore) return;
    setIsSavingDays(true);
    const { success, error, newExpiresAt } = await setStoreExpirationDays(editingDaysStore.id, days);
    setIsSavingDays(false);
    if (success) {
      alert(`✅ Validade da loja "${editingDaysStore.name}" atualizada para ${days} dias! Novo vencimento: ${new Date(newExpiresAt!).toLocaleDateString('pt-BR')}`);
      setEditingDaysStore(null);
      onRefresh();
    } else {
      alert(`❌ Erro ao salvar dias: ${error}`);
    }
  };

  const handleApplyExactDate = async () => {
    if (!editingDaysStore || !customDateInput) return;
    setIsSavingDays(true);
    const iso = new Date(`${customDateInput}T23:59:59Z`).toISOString();
    const { success, error, newExpiresAt } = await setStoreExpirationDays(editingDaysStore.id, undefined, iso);
    setIsSavingDays(false);
    if (success) {
      alert(`✅ Data de vencimento atualizada para: ${new Date(newExpiresAt!).toLocaleDateString('pt-BR')}`);
      setEditingDaysStore(null);
      onRefresh();
    } else {
      alert(`❌ Erro ao salvar data: ${error}`);
    }
  };

  const handleStartEditDomain = (store: Store) => {
    setEditingDomainId(store.id);
    setDomainInput(store.custom_domain || '');
  };

  const handleSaveDomain = async (storeId: string) => {
    setIsUpdatingDomain(true);
    let clean = domainInput.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    const res = await updateStoreDomain(storeId, clean || null);
    setIsUpdatingDomain(false);
    setEditingDomainId(null);

    if (res.success && res.vercelResult?.message) {
      alert(`✅ ${res.vercelResult.message}`);
    } else if (res.success && res.vercelResult?.notConfigured) {
      alert(`ℹ️ Domínio salvo no banco! (Nota: Adicione VERCEL_AUTH_TOKEN no painel da Vercel para cadastrar automaticamente sem intervenção manual).`);
    } else if (!res.success && res.error) {
      alert(`❌ Erro ao salvar domínio: ${res.error}`);
    }

    onRefresh();
  };

  const handleNotifyTelegram = async (store: Store) => {
    setNotifyingId(store.id);
    try {
      const res = await notifyStoreCreatedById(store.id);
      if (res.success) {
        setNotifyFeedback({ id: store.id, message: `🚀 Notificação de "${store.name || store.store_name}" enviada ao Telegram!` });
        alert(`🚀 Notificação da loja "${store.name || store.store_name}" enviada com sucesso ao Telegram!`);
      } else {
        setNotifyFeedback({ id: store.id, message: res.error || 'Falha ao enviar notificação.', isError: true });
        alert(`⚠️ Não foi possível entregar no Telegram:\n${res.error || 'Verifique o Bot Token e Chat ID nas configurações globais.'}`);
      }
    } catch (e: any) {
      setNotifyFeedback({ id: store.id, message: e.message || 'Erro inesperado.', isError: true });
      alert(`❌ Erro inesperado ao disparar Telegram: ${e.message}`);
    } finally {
      setNotifyingId(null);
      setTimeout(() => {
        setNotifyFeedback((prev) => (prev?.id === store.id ? null : prev));
      }, 5000);
    }
  };

  const getStoreUrl = (store: Store, admin = false) => {
    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname.includes('localhost') || 
      window.location.hostname.includes('127.0.0.1') ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.') ||
      window.location.hostname.endsWith('.local')
    );
    const isEditaveis = store.slug === 'editaveisdocanva' || store.id === 'store_editaveisdocanva' || Boolean(store.custom_domain && store.custom_domain.toLowerCase().includes('editaveisdocanva.com.br'));
    const isBaseStore = !isEditaveis && (Boolean(store.is_matriz) || store.slug === 'ajpstore' || store.id === 'store_ajpstore');

    if (!isLocal && store.custom_domain && (store.domain_status === 'active' || store.domain_status === 'ativo')) {
      const url = store.custom_domain.startsWith('http') ? store.custom_domain : `https://${store.custom_domain}`;
      return `${url}${admin ? '/admin' : ''}`;
    }
    if (isBaseStore && isLocal) {
      return admin ? '/admin' : '/';
    }
    return `/loja/${store.slug || 'ajpstore'}${admin ? '/admin' : ''}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      
      {/* 2. ÁREA DE BUSCA E ABAS */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto w-full sm:w-auto">
          <Tab active={filterTab === 'all'} onClick={() => setFilterTab('all')}>
            Todas ({safeList.length})
          </Tab>
          <Tab active={filterTab === 'trial'} onClick={() => setFilterTab('trial')}>
            Em Teste ({trialCount})
          </Tab>
          <Tab active={filterTab === 'active'} onClick={() => setFilterTab('active')}>
            Assinantes ({activeCount})
          </Tab>
          <Tab active={filterTab === 'expired'} onClick={() => setFilterTab('expired')}>
            Vencidas ({expiredCount})
          </Tab>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar loja ou domínio..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all text-sm"
            />
          </div>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            title="Recarregar lojas"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 3. LISTA DE LOJAS (Design Limpo em Grid de 2 Colunas) */}
      <div className="p-4 bg-gray-50/50">
        {isLoading ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100 p-8 shadow-xs">
            <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Carregando lojas da plataforma...</p>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100 p-8 shadow-xs">
            <StoreIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-800">Nenhuma loja encontrada</p>
            <p className="text-xs text-gray-400 mt-1">Crie a primeira loja clicando no botão "+ Nova Loja" acima.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStores.map((store) => {
              const isEditaveis = store.slug === 'editaveisdocanva' || store.id === 'store_editaveisdocanva' || Boolean(store.custom_domain && store.custom_domain.toLowerCase().includes('editaveisdocanva.com.br'));
              const isMatriz = !isEditaveis && (Boolean(store.is_matriz) || store.slug === 'ajpstore' || store.id === 'store_ajpstore');
              const isEditingThisDomain = editingDomainId === store.id;

              const rawDomain = store.custom_domain;
              const isSeuDominio = rawDomain && rawDomain.startsWith('seudominio');
              const effectiveDomain = (!rawDomain || isSeuDominio)
                ? `${store.slug || 'loja'}.ajpstore.com.br`
                : rawDomain;

              const trialDays = store.daysRemaining != null ? Math.max(store.daysRemaining, 0) : 7;
              const formattedPrice = isMatriz 
                ? '0,00' 
                : (store.monthly_fee || 50).toFixed(2).replace('.', ',');

              return (
                <div
                  key={store.id}
                  className={`bg-white border rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                    isMatriz
                      ? 'border-pink-300 ring-1 ring-pink-400/20 bg-gradient-to-br from-white via-white to-pink-50/20'
                      : store.is_active
                      ? 'border-gray-200 hover:border-pink-500/30'
                      : 'border-gray-200 opacity-70 bg-gray-50'
                  }`}
                >
                  <div>
                    {/* Top Header do Card: Nome, Badges e Preço */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm shadow-xs ${
                          isMatriz 
                            ? 'bg-gradient-to-tr from-pink-500 to-purple-600 text-white' 
                            : 'bg-pink-50 text-pink-600'
                        }`}>
                          {isMatriz ? <Crown size={20} className="text-yellow-300" /> : <StoreIcon size={20} />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 text-base truncate flex items-center gap-1.5" title={store.name || store.store_name}>
                            {store.name || store.store_name || 'Loja sem nome'}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {isMatriz ? (
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-900 text-purple-100 flex items-center gap-1">
                                <Crown size={11} className="text-yellow-400" /> MATRIZ VITALÍCIA
                              </span>
                            ) : (
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                store.is_active 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-gray-100 text-gray-500 border border-gray-200'
                              }`}>
                                {store.is_active ? '● ATIVA' : '○ PAUSADA'}
                              </span>
                            )}

                            {!isMatriz && (store.subscription_status === 'trial' || store.isTrial) && (
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                store.isExpired 
                                  ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' 
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}>
                                {store.isExpired ? 'TESTE EXPIRADO' : `TESTE (${trialDays}d)`}
                              </span>
                            )}

                            {!isMatriz && store.subscription_status === 'active' && !store.isTrial && (
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                store.isExpired 
                                  ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {store.isExpired ? 'VENCIDA' : 'ASSINANTE'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Preço / Mensalidade no topo direito */}
                      <div className="text-right shrink-0">
                        <span className="text-[11px] text-gray-400 block font-medium">Mensalidade</span>
                        <span className={`text-base font-black ${isMatriz ? 'text-purple-900' : 'text-gray-900'}`}>
                          R$ {formattedPrice}
                          {!isMatriz && <span className="text-[10px] text-gray-400 font-normal">/mês</span>}
                        </span>
                      </div>
                    </div>

                    {/* Linha do Domínio e DNS */}
                    <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between gap-2 text-xs mb-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Globe size={14} className="text-sky-500 shrink-0" />
                        {isEditingThisDomain ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={domainInput}
                              onChange={(e) => setDomainInput(e.target.value)}
                              className="px-2 py-0.5 bg-white border border-sky-400 rounded text-xs font-mono outline-none"
                              placeholder="meudominio.com.br"
                            />
                            <button 
                              onClick={() => handleSaveDomain(store.id)} 
                              disabled={isUpdatingDomain} 
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                              title="Salvar"
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              onClick={() => setEditingDomainId(null)} 
                              className="p-1 text-gray-400 hover:bg-gray-200 rounded cursor-pointer"
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <a
                            href={`https://${effectiveDomain.replace(/^https?:\/\//, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-600 hover:text-sky-800 font-mono font-bold hover:underline truncate"
                            title="Abrir link do domínio"
                          >
                            {effectiveDomain}
                          </a>
                        )}
                      </div>

                      {!isEditingThisDomain && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {store.domain_status === 'active' || store.domain_status === 'ativo' ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              DNS Ativo
                            </span>
                          ) : (
                            <button
                              onClick={() => onOpenDns(store)}
                              className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full hover:bg-amber-100 cursor-pointer"
                              title="Clique para ver instruções de DNS"
                            >
                              Aguardando DNS
                            </button>
                          )}
                          <button
                            onClick={() => handleStartEditDomain(store)}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded cursor-pointer"
                            title="Editar domínio"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Informações do Cliente, Senha e Vencimento */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4 bg-gray-50/50 p-2 rounded-lg">
                      <div className="space-y-1">
                        {(store.owner_name || store.client_name) && (
                          <div className="flex items-center gap-1.5 truncate">
                            <User size={13} className="text-gray-400 shrink-0" />
                            <span className="text-gray-700 font-medium truncate">{store.owner_name || store.client_name}</span>
                          </div>
                        )}
                        {(store.owner_email || store.client_email) && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail size={13} className="text-gray-400 shrink-0" />
                            <span className="text-gray-500 font-mono text-[11px] truncate">{store.owner_email || store.client_email}</span>
                          </div>
                        )}
                        {(store.whatsapp_number || store.owner_phone) && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MessageCircle size={13} className="text-emerald-500 shrink-0" />
                            <a
                              href={`https://wa.me/55${(store.whatsapp_number || store.owner_phone || '').replace(/\D/g, '').replace(/^55/, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 font-medium text-[11px] hover:underline truncate"
                              title="Abrir WhatsApp do lojista"
                            >
                              {store.whatsapp_number || store.owner_phone}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        {store.admin_password && (
                          <div className="flex items-center gap-1.5">
                            <KeyRound size={13} className="text-gray-400 shrink-0" />
                            <span className="text-gray-600">Senha:</span>
                            <code className="bg-white border border-gray-200 px-1 py-0.5 rounded text-[11px] font-mono font-bold text-gray-800">{store.admin_password}</code>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-gray-400 shrink-0" />
                          <span className="text-gray-600 truncate">
                            {isMatriz ? 'Sem expiração' : store.expires_at ? `Vence: ${new Date(store.expires_at).toLocaleDateString('pt-BR')}` : 'Sem vencimento'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Ações Inferior */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                    {/* Botões Principais: Ver Loja & Admin */}
                    <div className="flex items-center gap-1.5">
                      <a
                        href={getStoreUrl(store, false)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Ver vitrine pública"
                      >
                        <ExternalLink size={13} className="text-pink-500" />
                        <span>Ver Loja</span>
                      </a>

                      <a
                        href={getStoreUrl(store, true)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        title="Abrir Painel Admin do lojista"
                      >
                        <Settings size={13} className="text-pink-300" />
                        <span>Admin</span>
                      </a>
                    </div>

                    {/* Botões Administrativos e Assinatura */}
                    <div className="flex items-center gap-1.5">
                      {!isMatriz && (store.subscription_status === 'trial' || store.isTrial) ? (
                        <>
                          <button
                            onClick={() => handleActivatePaid(store)}
                            disabled={activatingId === store.id}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                            title="Confirmar Pix de R$ 50 e ativar assinatura oficial (+30 dias)"
                          >
                            {activatingId === store.id ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
                            <span>Ativar (R$ 50)</span>
                          </button>

                          <button
                            onClick={() => handleExtendTrial(store)}
                            disabled={extendingTrialId === store.id}
                            className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            title="Conceder mais 30 dias de prazo"
                          >
                            {extendingTrialId === store.id ? <Loader2 size={13} className="animate-spin" /> : <Gift size={13} />}
                            <span>+30d Prazo</span>
                          </button>
                        </>
                      ) : !isMatriz ? (
                        <button
                          onClick={() => handleRenew(store)}
                          disabled={renewingId === store.id}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Renovar por +30 dias"
                        >
                          {renewingId === store.id ? <Loader2 size={13} className="animate-spin" /> : <CalendarPlus size={13} />}
                          <span>Renovar (+30d)</span>
                        </button>
                      ) : null}

                      {!isMatriz && (
                        <button
                          onClick={() => handleOpenEditDays(store)}
                          className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                          title="Editar dias / validade da loja"
                        >
                          <Clock size={14} />
                        </button>
                      )}

                      {!isMatriz && (
                        <button
                          onClick={() => handleNotifyTelegram(store)}
                          disabled={notifyingId === store.id}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          title="Enviar/Reenviar alerta de Nova Loja no Telegram"
                        >
                          {notifyingId === store.id ? <Loader2 size={14} className="animate-spin text-indigo-600" /> : <Send size={14} />}
                        </button>
                      )}

                      <button
                        onClick={() => onOpenDns(store)}
                        className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                        title="Ver instruções de DNS"
                      >
                        <Globe size={14} />
                      </button>

                      {!isMatriz && (
                        <button
                          onClick={() => handleToggleStatus(store)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            store.is_active 
                              ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50 border-gray-200' 
                              : 'text-emerald-600 bg-emerald-50 border-emerald-200'
                          }`}
                          title={store.is_active ? 'Pausar loja' : 'Ativar loja'}
                        >
                          <Power size={14} />
                        </button>
                      )}

                      {!isMatriz && (
                        <button
                          onClick={() => handleDelete(store)}
                          disabled={deletingId === store.id}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-100 transition-colors cursor-pointer disabled:opacity-50"
                          title="Excluir loja"
                        >
                          {deletingId === store.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Feedback de Notificação do Telegram */}
                  {notifyFeedback?.id === store.id && (
                    <div className={`mt-2.5 p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in duration-200 ${
                      notifyFeedback.isError 
                        ? 'bg-red-50 text-red-700 border border-red-200' 
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                      <Send size={13} className={notifyFeedback.isError ? 'text-red-500' : 'text-emerald-600'} />
                      <span>{notifyFeedback.message}</span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Editar Prazo / Validade da Loja */}
      {editingDaysStore && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Editar Prazo de Validade</h3>
                  <p className="text-xs text-gray-500">{editingDaysStore.name} ({editingDaysStore.slug})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingDaysStore(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Informação atual */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 mb-4 text-xs space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>Prazo atual:</span>
                <strong className="text-gray-900">
                  {editingDaysStore.daysRemaining !== null ? `${editingDaysStore.daysRemaining} dias restantes` : 'Sem prazo'}
                </strong>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Vencimento atual:</span>
                <strong className="text-gray-900">
                  {editingDaysStore.expires_at ? new Date(editingDaysStore.expires_at).toLocaleDateString('pt-BR') : 'Não definido'}
                </strong>
              </div>
            </div>

            {/* Presets Rápidos */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-bold text-gray-700">Atalhos rápidos (a partir de hoje):</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyDays(30)}
                  disabled={isSavingDays}
                  className="py-2.5 px-3 text-xs font-bold rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer transition-colors active:scale-98 disabled:opacity-50 text-left"
                >
                  📅 30 dias <span className="text-[10px] text-gray-400 block font-normal">(1 mês)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyDays(90)}
                  disabled={isSavingDays}
                  className="py-2.5 px-3 text-xs font-bold rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-purple-900 cursor-pointer transition-colors active:scale-98 disabled:opacity-50 text-left"
                >
                  ⚡ 90 dias <span className="text-[10px] text-purple-600 block font-normal">(3 meses)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyDays(180)}
                  disabled={isSavingDays}
                  className="py-2.5 px-3 text-xs font-bold rounded-xl border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 cursor-pointer transition-colors active:scale-98 disabled:opacity-50 text-left"
                >
                  ⭐ 180 dias <span className="text-[10px] text-emerald-600 block font-normal">(6 meses)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyDays(365)}
                  disabled={isSavingDays}
                  className="py-2.5 px-3 text-xs font-bold rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer transition-colors active:scale-98 disabled:opacity-50 text-left"
                >
                  👑 365 dias <span className="text-[10px] text-gray-400 block font-normal">(1 ano)</span>
                </button>
              </div>
            </div>

            {/* Inserir quantidade personalizada de dias */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Ou digite a quantidade exata de dias:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={customDaysInput}
                    onChange={(e) => setCustomDaysInput(e.target.value)}
                    placeholder="Ex: 180"
                    className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const num = parseInt(customDaysInput, 10);
                      if (!isNaN(num) && num > 0) {
                        handleApplyDays(num);
                      } else {
                        alert('Digite um número válido de dias.');
                      }
                    }}
                    disabled={isSavingDays}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors disabled:opacity-50 active:scale-98"
                  >
                    {isSavingDays ? 'Salvando...' : 'Aplicar'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Ou selecione a data de vencimento no calendário:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customDateInput}
                    onChange={(e) => setCustomDateInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyExactDate}
                    disabled={isSavingDays || !customDateInput}
                    className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer transition-colors disabled:opacity-50 active:scale-98"
                  >
                    {isSavingDays ? 'Salvando...' : 'Salvar Data'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingDaysStore(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// COMPONENTE: Aba
interface TabProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

function Tab({ children, active, onClick }: TabProps) {
  return (
    <button 
      onClick={onClick}
      className={`px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
        active ? 'bg-pink-50 text-pink-600 font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}
