import React, { useState } from 'react';
import { 
  Store as StoreIcon, 
  Globe, 
  ExternalLink, 
  Settings, 
  FileText, 
  Power, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  AlertOctagon,
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
  Sparkles,
  Calendar
} from 'lucide-react';
import { Store } from '../../types';
import { 
  toggleStoreActive, 
  deleteStore, 
  updateStoreDomain, 
  renewStoreSubscription, 
  toggleStoreSubscription,
  extendStoreTrial,
  activatePaidSubscription,
  setStoreExpirationDays
} from '../../services/storeManagementService';

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

  // Contagens para os filtros (exclui a Matriz permanente AJPSTORE)
  const safeList = Array.isArray(stores) ? stores.filter(Boolean) : [];
  const isMatrizOrBase = (s: Store) => Boolean(s.is_matriz) || s.slug === 'ajpstore' || s.id === 'store_ajpstore' || s.slug === 'suamarcaaqui' || s.id === 'store_default';
  const trialCount = safeList.filter(s => (s.subscription_status === 'trial' || s.isTrial) && !isMatrizOrBase(s)).length;
  const activeCount = safeList.filter(s => s.subscription_status === 'active' && !s.isExpired && !isMatrizOrBase(s)).length;
  const expiredCount = safeList.filter(s => s.isExpired && !isMatrizOrBase(s)).length;

  // Filtragem defensiva e null-safe
  const filteredStores = safeList.filter((s) => {
    // Filtro por Tab de Status
    if (filterTab === 'trial' && !(s.subscription_status === 'trial' || s.isTrial)) return false;
    if (filterTab === 'active' && (s.subscription_status !== 'active' || s.isExpired)) return false;
    if (filterTab === 'expired' && !s.isExpired) return false;

    // Filtro de busca textual
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
    const fee = store.monthly_fee !== undefined && store.monthly_fee !== null 
      ? `R$ ${store.monthly_fee.toFixed(2).replace('.', ',')}` 
      : 'R$ 50,00';
    const confirmed = window.confirm(
      `Confirmar recebimento do Pix de (${fee}) da loja "${store.name}" e ATIVAR a assinatura oficial por 30 dias?`
    );
    if (!confirmed) return;

    setActivatingId(store.id);
    const { success, error, newExpiresAt } = await activatePaidSubscription(store.id, 30);
    setActivatingId(null);

    if (success) {
      alert(`💎 Assinatura oficial ativada com sucesso por 30 dias! Vencimento da mensalidade: ${new Date(newExpiresAt!).toLocaleDateString('pt-BR')}`);
      onRefresh();
    } else {
      alert(`❌ Erro ao ativar assinatura: ${error}`);
    }
  };

  const handleToggleSubscription = async (store: Store) => {
    const isSuspended = store.subscription_status === 'suspended' || store.isExpired;
    const nextStatus: 'active' | 'suspended' = isSuspended ? 'active' : 'suspended';
    const ok = window.confirm(
      `Deseja ${nextStatus === 'suspended' ? 'SUSPENDER (bloquear painel)' : 'REATIVAR'} a mensalidade da loja "${store.name}"?`
    );
    if (!ok) return;

    await toggleStoreSubscription(store.id, nextStatus);
    onRefresh();
  };

  const handleToggleStatus = async (store: Store) => {
    const nextStatus = !store.is_active;
    const ok = window.confirm(`Deseja realmente ${nextStatus ? 'ativar' : 'pausar'} a loja "${store.name}"?`);
    if (!ok) return;

    await toggleStoreActive(store.id, nextStatus);
    onRefresh();
  };

  const handleDelete = async (store: Store) => {
    const storeName = store.name || store.store_name || store.slug || 'esta loja';
    const isMatriz = Boolean(store.is_matriz) || store.slug === 'ajpstore' || store.id === 'store_ajpstore';
    if (isMatriz) {
      alert('A loja AJPSTORE é a Matriz fixa e vitalícia do sistema e não pode ser excluída.');
      return;
    }
    const confirmMsg = `ATENÇÃO: Deseja realmente excluir permanentemente a loja "${storeName}"?\n\nTodos os produtos e dados vinculados serão removidos do banco de dados.`;

    const ok = window.confirm(confirmMsg);
    if (!ok) return;

    setDeletingId(store.id);
    try {
      const res = await deleteStore(store.id, store.slug);
      if (!res.success) {
        alert(`❌ Erro ao excluir conta: ${res.error}`);
      } else {
        alert(`✅ Conta / Loja "${storeName}" excluída com sucesso!`);
        onRefresh();
      }
    } finally {
      setDeletingId(null);
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
    await updateStoreDomain(storeId, clean || null);
    setIsUpdatingDomain(false);
    setEditingDomainId(null);
    onRefresh();
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
    // Formato amigável e direto via slug: /loja/:slug
    return `/loja/${store.slug || 'ajpstore'}${admin ? '/admin' : ''}`;
  };

  return (
    <div className="space-y-4">
      
      {/* Search Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, slug ou domínio..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493]"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Total de lojas cadastradas: <strong className="text-slate-900">{stores.length}</strong>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              filterTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({safeList.length})
          </button>
          <button
            onClick={() => setFilterTab('trial')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === 'trial'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-purple-600" />
            <span>Em Teste ({trialCount})</span>
          </button>
          <button
            onClick={() => setFilterTab('active')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === 'active'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Assinantes ({activeCount})</span>
          </button>
          <button
            onClick={() => setFilterTab('expired')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === 'expired'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            <span>Expiradas ({expiredCount})</span>
          </button>
        </div>
      </div>

      {/* Stores List */}
      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 p-8 shadow-xs">
          <div className="w-8 h-8 border-3 border-[#FF1493] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Carregando lojas da plataforma...</p>
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 p-8 shadow-xs">
          <StoreIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-800">Nenhuma loja encontrada</p>
          <p className="text-xs text-slate-400 mt-1">Crie a primeira loja para seu cliente clicando no botão acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredStores.map((store) => {
            const isEditaveis = store.slug === 'editaveisdocanva' || store.id === 'store_editaveisdocanva' || Boolean(store.custom_domain && store.custom_domain.toLowerCase().includes('editaveisdocanva.com.br'));
            const isBaseStore = !isEditaveis && (Boolean(store.is_matriz) || store.slug === 'ajpstore' || store.id === 'store_ajpstore');
            const isEditingThisDomain = editingDomainId === store.id;

            return (
              <div
                key={store.id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-xs hover:shadow-md ${
                  isBaseStore
                    ? 'border-pink-300 bg-gradient-to-r from-white to-pink-50/30'
                    : store.is_active
                    ? 'border-slate-200 hover:border-[#FF1493]/30'
                    : 'border-slate-200 opacity-60 bg-slate-50'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Store Info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                        {store.name || store.store_name || 'Loja sem nome'}
                      </h3>

                      {isBaseStore && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FF1493] to-pink-500 text-white shadow-xs">
                          <Crown className="w-3 h-3 text-yellow-300" />
                          Matriz / Base
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          store.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {store.is_active ? 'Ativa' : 'Pausada'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span>Slug: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[11px]">{store.slug || 'loja'}</code></span>
                      <span>•</span>
                      <span>ID: <code className="text-slate-400 font-mono text-[10px]">{store.id ? store.id.slice(0, 8) : '--------'}...</code></span>
                      <span>•</span>
                      <span className="text-[11px] text-slate-400">
                        Criada em {store.created_at ? new Date(store.created_at).toLocaleDateString('pt-BR') : 'Recentemente'}
                      </span>
                    </div>

                    {/* Domain Box / Edit Domain */}
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-sky-600" />
                        Domínio:
                      </span>

                      {isEditingThisDomain ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in">
                          <input
                            type="text"
                            value={domainInput}
                            onChange={(e) => setDomainInput(e.target.value)}
                            placeholder="www.lojadocliente.com.br"
                            className="text-xs px-2.5 py-1 bg-slate-50 border border-sky-300 rounded-lg outline-none font-mono focus:bg-white"
                          />
                          <button
                            onClick={() => handleSaveDomain(store.id)}
                            disabled={isUpdatingDomain}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
                            title="Salvar domínio"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingDomainId(null)}
                            className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          {(() => {
                            const rawDomain = store.custom_domain;
                            const isSeuDominio = rawDomain && rawDomain.startsWith('seudominio');
                            const effectiveDomain = (!rawDomain || isSeuDominio)
                              ? `${store.slug}.ajpstore.com.br`
                              : rawDomain;

                            return (
                              <a
                                href={`https://${effectiveDomain.replace(/^https?:\/\//, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-sky-700 hover:underline font-mono"
                              >
                                {effectiveDomain}
                              </a>
                            );
                          })()}

                              {store.domain_status === 'active' || store.domain_status === 'ativo' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" />
                                  DNS Ativo
                                </span>
                              ) : (
                                <button
                                  onClick={() => onOpenDns(store)}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full hover:bg-amber-100 cursor-pointer"
                                  title="Clique para ver instruções de DNS"
                                >
                                  <Clock className="w-3 h-3" />
                                  Aguardando DNS
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              Sem domínio próprio configurado
                            </span>
                          )}

                          <button
                            onClick={() => handleStartEditDomain(store)}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                            title="Editar Domínio"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Subscription & Expiration Status */}
                    <div className="pt-2 flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-semibold text-slate-600 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                        Mensalidade:
                      </span>

                      {isBaseStore ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                          ♾️ Matriz Vitalícia (Sem Expiração)
                        </span>
                      ) : (store.subscription_status === 'trial' || store.isTrial) ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {store.isExpired ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-purple-900 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-full animate-pulse">
                              <AlertOctagon className="w-3.5 h-3.5 text-purple-600" />
                              🎁 Teste Grátis Expirado (Bloqueada)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                              <Gift className="w-3.5 h-3.5 text-purple-600" />
                              🎁 Teste Grátis ({store.daysRemaining != null ? Math.max(store.daysRemaining, 0) : 7}d restantes)
                            </span>
                          )}

                          {store.expires_at && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              Fim do Teste: <strong>{new Date(store.expires_at).toLocaleDateString('pt-BR')}</strong>
                            </span>
                          )}

                          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            Mensalidade pós-teste: R$ {(store.monthly_fee || 50).toFixed(2).replace('.', ',')}
                          </span>

                          {(store.owner_name || store.client_name) && (
                            <span className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                              • <User className="w-3 h-3 text-[#FF1493]" /> {store.owner_name || store.client_name}
                            </span>
                          )}

                          {(store.owner_email || store.client_email) && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              • <Mail className="w-3 h-3 text-slate-400" /> {store.owner_email || store.client_email}
                            </span>
                          )}

                          {store.admin_password && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              • <KeyRound className="w-3 h-3 text-slate-400" /> Senha: <code className="font-mono text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{store.admin_password}</code>
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          {store.isExpired ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-300 px-2.5 py-0.5 rounded-full animate-pulse">
                              <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                              Vencida / Acesso Bloqueado
                            </span>
                          ) : store.isExpiringSoon ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Vence em {store.daysRemaining} {store.daysRemaining === 1 ? 'dia' : 'dias'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Em dia (Faltam {store.daysRemaining} dias)
                            </span>
                          )}

                          {store.expires_at && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              Vencimento: <strong>{new Date(store.expires_at).toLocaleDateString('pt-BR')}</strong>
                            </span>
                          )}

                          <button
                            onClick={() => handleOpenEditDays(store)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors shadow-2xs"
                            title="Editar dias / validade da loja (ex: 180 dias / 3 meses)"
                          >
                            <Edit2 className="w-3 h-3 text-purple-600" />
                            <span>Editar Dias</span>
                          </button>

                          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            R$ {(store.monthly_fee || 50).toFixed(2).replace('.', ',')}/mês
                          </span>

                          {(store.owner_name || store.client_name) && (
                            <span className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                              • <User className="w-3 h-3 text-[#FF1493]" /> {store.owner_name || store.client_name}
                            </span>
                          )}

                          {(store.owner_email || store.client_email) && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              • <Mail className="w-3 h-3 text-slate-400" /> {store.owner_email || store.client_email}
                            </span>
                          )}

                          {store.admin_password && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              • <KeyRound className="w-3 h-3 text-slate-400" /> Senha: <code className="font-mono text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{store.admin_password}</code>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap border-t sm:border-t-0 pt-3 sm:pt-0">
                    {/* Botões de Ação para Trial vs Assinatura Regular */}
                    {!isBaseStore && (store.subscription_status === 'trial' || store.isTrial) ? (
                      <>
                        <button
                          onClick={() => handleActivatePaid(store)}
                          disabled={activatingId === store.id}
                          className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
                          title="Confirmar recebimento do Pix de R$ 50 e ativar assinatura oficial (+30 dias)"
                        >
                          {activatingId === store.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5 text-emerald-100" />
                          )}
                          <span>Ativar (R$ 50)</span>
                        </button>

                        <button
                          onClick={() => handleExtendTrial(store)}
                          disabled={extendingTrialId === store.id}
                          className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all border border-purple-200 cursor-pointer active:scale-98 disabled:opacity-50"
                          title="Conceder mais 30 dias de prazo"
                        >
                          {extendingTrialId === store.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Gift className="w-3.5 h-3.5 text-purple-600" />
                          )}
                          <span>+30d Prazo</span>
                        </button>
                      </>
                    ) : !isBaseStore ? (
                      <button
                        onClick={() => handleRenew(store)}
                        disabled={renewingId === store.id}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
                        title="Renovar assinatura por mais 30 dias após confirmação do Pix de R$ 50"
                      >
                        {renewingId === store.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CalendarPlus className="w-3.5 h-3.5 text-emerald-100" />
                        )}
                        <span>Renovar (+30d)</span>
                      </button>
                    ) : null}

                    {/* Botão para Editar Prazo/Dias da Loja */}
                    {!isBaseStore && (
                      <button
                        onClick={() => handleOpenEditDays(store)}
                        className="px-2.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all border border-purple-200 cursor-pointer active:scale-98"
                        title="Definir dias / validade da loja (ex: 180 dias / 3 meses)"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>Dias</span>
                      </button>
                    )}

                    {/* Botão Ver Loja */}
                    <a
                      href={getStoreUrl(store, false)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Acessar vitrine pública da loja"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#FF1493]" />
                      <span>Ver Loja</span>
                    </a>

                    {/* Botão Painel Admin do Cliente */}
                    <a
                      href={getStoreUrl(store, true)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      title="Abrir painel administrativo isolado desta loja"
                    >
                      <Settings className="w-3.5 h-3.5 text-pink-300" />
                      <span>Admin</span>
                    </a>

                    {/* Botão Instruções DNS */}
                    <button
                      onClick={() => onOpenDns(store)}
                      className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-sky-200/60"
                      title="Ver instruções de apontamento DNS e mensagem de WhatsApp"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>DNS</span>
                    </button>

                    {/* Pausar / Ativar Loja (não aplicável à Matriz fixa) */}
                    {!isBaseStore && (
                      <button
                        onClick={() => handleToggleStatus(store)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          store.is_active
                            ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 border-slate-200'
                            : 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title={store.is_active ? 'Pausar Loja' : 'Ativar Loja'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    )}

                    {/* Excluir Loja / Conta (não aplicável à Matriz fixa) */}
                    {!isBaseStore && (
                      <button
                        onClick={() => handleDelete(store)}
                        disabled={deletingId === store.id}
                        className="px-3 py-2 text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50/80 hover:border-rose-600 rounded-xl border border-rose-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold shadow-2xs"
                        title="Excluir Conta / Loja permanentemente"
                      >
                        {deletingId === store.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Excluindo...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Editar Prazo / Validade da Loja */}
      {editingDaysStore && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Editar Prazo de Validade</h3>
                  <p className="text-xs text-slate-500">{editingDaysStore.name} ({editingDaysStore.slug})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingDaysStore(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Informação atual */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 mb-4 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Prazo atual:</span>
                <strong className="text-slate-900">
                  {editingDaysStore.daysRemaining !== null ? `${editingDaysStore.daysRemaining} dias restantes` : 'Sem prazo'}
                </strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Vencimento atual:</span>
                <strong className="text-slate-900">
                  {editingDaysStore.expires_at ? new Date(editingDaysStore.expires_at).toLocaleDateString('pt-BR') : 'Não definido'}
                </strong>
              </div>
            </div>

            {/* Presets Rápidos */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-bold text-slate-700">Atalhos rápidos (a partir de hoje):</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyDays(30)}
                  disabled={isSavingDays}
                  className="py-2.5 px-3 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors active:scale-98 disabled:opacity-50 text-left"
                >
                  📅 30 dias <span className="text-[10px] text-slate-400 block font-normal">(1 mês)</span>
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
                  className="py-2.5 px-3 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors active:scale-98 disabled:opacity-50 text-left"
                >
                  👑 365 dias <span className="text-[10px] text-slate-400 block font-normal">(1 ano)</span>
                </button>
              </div>
            </div>

            {/* Inserir quantidade personalizada de dias */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ou digite a quantidade exata de dias:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={customDaysInput}
                    onChange={(e) => setCustomDaysInput(e.target.value)}
                    placeholder="Ex: 180"
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 font-bold"
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
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ou selecione a data de vencimento no calendário:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customDateInput}
                    onChange={(e) => setCustomDateInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyExactDate}
                    disabled={isSavingDays || !customDateInput}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors disabled:opacity-50 active:scale-98"
                  >
                    {isSavingDays ? 'Salvando...' : 'Salvar Data'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingDaysStore(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
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
