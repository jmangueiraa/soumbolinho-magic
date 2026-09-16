import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  RefreshCw, 
  Filter, 
  Package, 
  Truck, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  ExternalLink, 
  MessageCircle, 
  ChevronRight,
  Printer,
  Copy,
  Check,
  Calendar,
  X
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { Order, fetchStoreOrders } from '../../services/orderService';
import { OrderDetailsModal } from './OrderDetailsModal';

export const OrdersManager: React.FC = () => {
  const { currentStore } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'physical' | 'digital'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadOrders = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    const storeKey = currentStore?.id || 'suamarcaaqui';
    const res = await fetchStoreOrders(storeKey);
    if (res.success) {
      setOrders(res.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadOrders();
  }, [currentStore?.id]);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Métricas calculadas
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const paidOrders = orders.filter((o) => o.status === 'paid' || o.status === 'approved' || o.status === 'shipped' || o.status === 'delivered');
    const revenue = paidOrders.reduce((sum, o) => sum + (Number(o.amount) || 0) + (Number(o.shipping_cost) || 0), 0);
    const pendingCount = orders.filter((o) => o.status === 'pending').length;
    const shippedCount = orders.filter((o) => o.status === 'shipped').length;

    return { totalOrders, revenue, pendingCount, shippedCount };
  }, [orders]);

  // Filtros aplicados
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filtro de texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchId = order.id.toLowerCase().includes(query);
        const matchName = (order.customer_name || '').toLowerCase().includes(query);
        const matchEmail = (order.customer_email || '').toLowerCase().includes(query);
        const matchPhone = (order.customer_phone || '').includes(query);
        const matchTracking = (order.tracking_code || '').toLowerCase().includes(query);
        if (!matchId && !matchName && !matchEmail && !matchPhone && !matchTracking) {
          return false;
        }
      }

      // Filtro de status
      if (statusFilter !== 'all') {
        if (statusFilter === 'paid') {
          if (order.status !== 'paid' && order.status !== 'approved') return false;
        } else if (order.status !== statusFilter) {
          return false;
        }
      }

      // Filtro de tipo (físico com envio vs digital)
      if (typeFilter === 'physical') {
        const hasShipping = Boolean(order.shipping_cost && order.shipping_cost > 0) || Boolean(order.shipping_method);
        if (!hasShipping) return false;
      } else if (typeFilter === 'digital') {
        const isDigital = Boolean(order.delivery_url) || (order.items && order.items.some((i) => i.is_digital));
        if (!isDigital) return false;
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, typeFilter]);

  const statusBadges = {
    pending: { label: 'Pendente', bg: 'bg-amber-100 text-amber-800 border-amber-200' },
    approved: { label: 'Pago', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    paid: { label: 'Pago', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    shipped: { label: 'Enviado', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    delivered: { label: 'Entregue', bg: 'bg-teal-100 text-teal-800 border-teal-200' },
    cancelled: { label: 'Cancelado', bg: 'bg-rose-100 text-rose-800 border-rose-200' },
  };

  return (
    <div className="space-y-6 pb-20 font-sans text-gray-800 animate-in fade-in">
      
      {/* 1. CABEÇALHO DA SEÇÃO */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Gerenciador de Pedidos
            </h1>
            <p className="text-xs text-gray-500">
              Controle de vendas, dados de envio e despacho com o Melhor Envio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadOrders(true)}
            disabled={refreshing || loading}
            className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
            <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
        </div>
      </header>

      {/* 2. GRID DE MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Pedidos */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Total de Pedidos</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <ShoppingBag size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-gray-900">{metrics.totalOrders}</span>
          <span className="text-[11px] text-gray-400 block mt-0.5">cadastrados na loja</span>
        </div>

        {/* Faturamento Pago */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold text-gray-500">Faturamento Pago</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            R$ {metrics.revenue.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-[11px] text-gray-400 block mt-0.5">pedidos aprovados</span>
        </div>

        {/* Pendentes */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-semibold text-gray-500">Aguardando Pagamento</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-600">{metrics.pendingCount}</span>
          <span className="text-[11px] text-gray-400 block mt-0.5">pedidos pendentes</span>
        </div>

        {/* Enviados */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-semibold text-gray-500">Despachados / Rastreio</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Truck size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-indigo-600">{metrics.shippedCount}</span>
          <span className="text-[11px] text-gray-400 block mt-0.5">a caminho do cliente</span>
        </div>
      </div>

      {/* 3. BARRA DE BUSCA E FILTROS */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Input de Busca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, e-mail, telefone, ID do pedido ou rastreio..."
              className="w-full text-xs sm:text-sm pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtro de Tipo de Pedido */}
          <div className="flex items-center gap-1.5 self-start md:self-auto bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('physical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                typeFilter === 'physical' ? 'bg-white text-orange-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Truck size={13} />
              <span>Físicos</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('digital')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                typeFilter === 'digital' ? 'bg-white text-purple-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package size={13} />
              <span>Digitais</span>
            </button>
          </div>
        </div>

        {/* Chips de Status */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 pt-1 border-t border-gray-100">
          {[
            { id: 'all', label: 'Todos os Status', count: orders.length },
            { id: 'pending', label: 'Pendentes', count: orders.filter((o) => o.status === 'pending').length },
            { id: 'paid', label: 'Pagos', count: orders.filter((o) => o.status === 'paid' || o.status === 'approved').length },
            { id: 'shipped', label: 'Enviados', count: orders.filter((o) => o.status === 'shipped').length },
            { id: 'delivered', label: 'Entregues', count: orders.filter((o) => o.status === 'delivered').length },
            { id: 'cancelled', label: 'Cancelados', count: orders.filter((o) => o.status === 'cancelled').length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-gray-900 text-white shadow-2xs'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. LISTA DE PEDIDOS (TABELA DESKTOP & CARDS MOBILE) */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-gray-500">Carregando pedidos da loja...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <ShoppingBag size={28} />
            </div>
            <h3 className="text-base font-bold text-gray-900">Nenhum pedido encontrado</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Nenhum pedido corresponde aos filtros selecionados. Tente limpar os filtros.'
                : 'Quando os clientes finalizarem compras na vitrine, os pedidos aparecerão automaticamente aqui.'}
            </p>
            {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
                className="mt-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Limpar Todos os Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50/80 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Pedido</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Itens</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Envio / Rastreio</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredOrders.map((order) => {
                  const badge = statusBadges[order.status] || statusBadges.pending;
                  const totalFormatted = (Number(order.amount) + Number(order.shipping_cost || 0))
                    .toFixed(2)
                    .replace('.', ',');
                  const itemsCount = order.items?.length || 1;

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* PEDIDO */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(order.id, e)}
                            className="text-gray-300 hover:text-gray-600 p-0.5 cursor-pointer"
                            title="Copiar ID completo"
                          >
                            {copiedId === order.id ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                        <span className="text-[11px] text-gray-400 block mt-0.5">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')} • {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* CLIENTE */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block truncate max-w-[160px]">
                          {order.customer_name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                          {order.customer_phone ? (
                            <span className="font-mono">{order.customer_phone}</span>
                          ) : (
                            <span className="truncate max-w-[140px]">{order.customer_email}</span>
                          )}
                        </div>
                      </td>

                      {/* ITENS */}
                      <td className="py-3.5 px-4">
                        <span className="text-gray-800 font-semibold block">
                          {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
                        </span>
                        <span className="text-[11px] text-gray-400 truncate block max-w-[180px]">
                          {order.product_name || order.items?.[0]?.name || 'Produtos da Loja'}
                        </span>
                      </td>

                      {/* TOTAL */}
                      <td className="py-3.5 px-4">
                        <span className="font-black text-gray-900 text-sm font-mono block">
                          R$ {totalFormatted}
                        </span>
                        {order.shipping_cost && order.shipping_cost > 0 ? (
                          <span className="text-[10px] text-orange-600 font-semibold block">
                            inclui frete
                          </span>
                        ) : (
                          <span className="text-[10px] text-purple-600 font-semibold block">
                            digital / grátis
                          </span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* ENVIO / RASTREIO */}
                      <td className="py-3.5 px-4">
                        {order.tracking_code ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                              {order.tracking_code}
                            </span>
                            {order.shipping_label_url && (
                              <Printer size={13} className="text-emerald-600" title="Etiqueta impressa disponível" />
                            )}
                          </div>
                        ) : order.shipping_method ? (
                          <span className="text-[11px] text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md font-bold">
                            {order.shipping_method}
                          </span>
                        ) : (
                          <span className="text-[11px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md font-bold">
                            Entrega Digital
                          </span>
                        )}
                      </td>

                      {/* AÇÃO */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-600 hover:text-white text-gray-700 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs group-hover:bg-indigo-600 group-hover:text-white"
                        >
                          <Eye size={13} />
                          <span>Detalhes</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE DETALHES DO PEDIDO */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdated={(updated) => {
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            setSelectedOrder(updated);
          }}
        />
      )}

    </div>
  );
};

export default OrdersManager;
