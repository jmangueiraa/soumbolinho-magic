import React, { useEffect, useState } from 'react';
import { Globe, ExternalLink, Sparkles, ShoppingBag, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../context/TenantContext';
import { formatCurrency } from '../../utils/formatters';

interface AdminDashboardProps {
  storeId?: string;
  onNavigateToProducts?: () => void;
  onNavigateToOrders?: () => void;
}

export default function AdminDashboard({ storeId: propStoreId, onNavigateToProducts, onNavigateToOrders }: AdminDashboardProps) {
  const { currentStore } = useTenant();
  const storeId = (propStoreId || currentStore?.id || '').trim();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<{
    totalProducts: number;
    topProducts: any[];
    recentOrders: any[];
    totalVisits: number;
    totalRevenue: number;
  }>({
    totalProducts: 0,
    topProducts: [],
    recentOrders: [],
    totalVisits: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    async function fetchRealMetrics() {
      try {
        setLoading(true);

        if (!storeId || storeId === '__resolving_tenant__') {
          setMetrics({
            totalProducts: 0,
            topProducts: [],
            recentOrders: [],
            totalVisits: 0,
            totalRevenue: 0,
          });
          setLoading(false);
          return;
        }

        // Filtro de store_id suportando variantes de ID/Slug para isolamento correto
        const isEditaveis = 
          storeId === 'store_editaveisdocanva' || 
          storeId === 'editaveisdocanva' || 
          storeId === 'editaveis-do-canva' ||
          (typeof window !== 'undefined' && window.location.hostname.toLowerCase().includes('editaveisdocanva'));

        const isBase = 
          !isEditaveis && (
            storeId === 'ajpstore' || 
            storeId === 'store_ajpstore' || 
            storeId === 'suamarcaaqui' || 
            storeId === 'store_default'
          );

        // 1. Busca os produtos reais da loja atual no Supabase
        let prodQuery = supabase.from('products').select('*');
        if (isEditaveis) {
          prodQuery = prodQuery.or('store_id.eq.store_editaveisdocanva,store_id.eq.editaveisdocanva,store_id.eq.editaveis-do-canva');
        } else if (isBase) {
          prodQuery = prodQuery.or('store_id.eq.ajpstore,store_id.eq.store_ajpstore,store_id.eq.suamarcaaqui,store_id.eq.store_default');
        } else {
          prodQuery = prodQuery.eq('store_id', storeId);
        }

        const { data: products, error: prodError } = await prodQuery;
        if (prodError) throw prodError;

        // 2. Busca pedidos reais da loja no Supabase (se a tabela de orders existir)
        let orderQuery = supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (isEditaveis) {
          orderQuery = orderQuery.or('store_id.eq.store_editaveisdocanva,store_id.eq.editaveisdocanva,store_id.eq.editaveis-do-canva');
        } else if (isBase) {
          orderQuery = orderQuery.or('store_id.eq.ajpstore,store_id.eq.store_ajpstore,store_id.eq.suamarcaaqui,store_id.eq.store_default');
        } else {
          orderQuery = orderQuery.eq('store_id', storeId);
        }

        const { data: orders } = await orderQuery;

        // Se não houver erro em orders, calcula faturamento real
        const totalRevenue = orders ? orders.reduce((acc: number, curr: any) => acc + Number(curr.total || curr.amount || 0), 0) : 0;

        // 3. Contagem real de visitas (se houver tabela store_visits ou localStorage)
        let visitsCount = 0;
        try {
          const { count } = await supabase
            .from('store_visits')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId);
          if (count !== null && count !== undefined) {
            visitsCount = count;
          } else if (typeof window !== 'undefined') {
            const rawVisits = localStorage.getItem(`analytics_visits_${storeId}`);
            if (rawVisits) {
              const parsed = JSON.parse(rawVisits);
              visitsCount = parsed.total || 0;
            }
          }
        } catch {
          if (typeof window !== 'undefined') {
            const rawVisits = localStorage.getItem(`analytics_visits_${storeId}`);
            if (rawVisits) {
              const parsed = JSON.parse(rawVisits);
              visitsCount = parsed.total || 0;
            }
          }
        }

        setMetrics({
          totalProducts: products ? products.length : 0,
          topProducts: products || [], // Produtos reais cadastrados
          recentOrders: orders || [],
          totalVisits: visitsCount,
          totalRevenue,
        });
      } catch (error) {
        console.error('Erro ao carregar métricas:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRealMetrics();
  }, [storeId]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2 font-medium">
        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        <p>Carregando métricas da loja...</p>
      </div>
    );
  }

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
    <div className="p-6 space-y-6 animate-in fade-in">
      {/* Banner de Boas-Vindas com Domínio Público Clicável */}
      {storeDomainDisplay && (
        <div className="bg-gradient-to-r from-sky-900 via-indigo-950 to-slate-900 p-4 sm:p-5 rounded-2xl border border-sky-500/30 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
                Sua Loja Está no Ar
              </p>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                <span>{currentStore?.store_name || currentStore?.name || 'Minha Loja'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  ● Online
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://${storeDomainDisplay}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-xs group cursor-pointer"
              title="Acessar vitrine pública da loja em nova aba"
            >
              <span className="font-mono">{storeDomainDisplay}</span>
              <ExternalLink className="w-3.5 h-3.5 text-sky-600 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
          <p className="text-sm text-gray-500 font-medium">Produtos Cadastrados</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalProducts}</h3>
        </div>
        <div 
          onClick={onNavigateToOrders}
          className={`bg-white p-4 rounded-xl shadow-xs border border-slate-200 transition-all flex flex-col justify-between ${
            onNavigateToOrders ? 'cursor-pointer hover:border-pink-500/40 hover:shadow-md group' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 font-medium">Pedidos Hoje</p>
            <div className="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <h3 className="text-2xl font-bold text-slate-900">{metrics.recentOrders.length}</h3>
            {onNavigateToOrders && (
              <span className="text-xs font-bold text-pink-600 group-hover:underline flex items-center gap-0.5">
                <span>Gerenciar</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            )}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
          <p className="text-sm text-gray-500 font-medium">Visitas na Loja</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalVisits}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
          <p className="text-sm text-gray-500 font-medium">Faturamento</p>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1">
            {formatCurrency ? formatCurrency(metrics.totalRevenue) : `R$ ${metrics.totalRevenue.toFixed(2).replace('.', ',')}`}
          </h3>
        </div>
      </div>

      {/* Seções Principais em 2 Colunas: Produtos da Loja e Últimos Pedidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Produtos da Loja */}
        <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900">Produtos da Loja</h3>
              {metrics.topProducts.length > 0 && onNavigateToProducts && (
                <button
                  type="button"
                  onClick={onNavigateToProducts}
                  className="text-xs text-[#FF1493] hover:underline font-bold cursor-pointer"
                >
                  Gerenciar Produtos &rarr;
                </button>
              )}
            </div>

            {metrics.topProducts.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-6">
                <p className="font-medium text-slate-600">Nenhum produto cadastrado no momento.</p>
                <p className="text-sm text-slate-400 mt-1">Cadastre seu primeiro produto para começar a exibir métricas aqui.</p>
                {onNavigateToProducts && (
                  <button
                    type="button"
                    onClick={onNavigateToProducts}
                    className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    Cadastrar Primeiro Produto
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {metrics.topProducts.map((product: any) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      {(product.image || product.image_url) ? (
                        <img 
                          src={product.image || product.image_url} 
                          alt={product.name || product.title} 
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs font-bold">
                          📦
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-slate-800 text-sm block">{product.name || product.title}</span>
                        {product.category && (
                          <span className="text-[11px] text-slate-400">{product.category}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-emerald-600 font-bold text-sm">
                      {formatCurrency ? formatCurrency(Number(product.price) || 0) : `R$ ${Number(product.price || 0).toFixed(2).replace('.', ',')}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Últimos Pedidos */}
        <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 leading-tight">Últimos Pedidos</h3>
                  <p className="text-[11px] text-slate-400">Vendas recentes na sua loja</p>
                </div>
              </div>
              {onNavigateToOrders && (
                <button
                  type="button"
                  onClick={onNavigateToOrders}
                  className="text-xs text-[#FF1493] hover:underline font-bold cursor-pointer flex items-center gap-1"
                >
                  <span>Gerenciar Pedidos</span>
                  <span>&rarr;</span>
                </button>
              )}
            </div>

            {metrics.recentOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-6">
                <div className="w-12 h-12 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <p className="font-medium text-slate-700">Nenhum pedido recebido ainda.</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Assim que clientes comprarem na sua loja, os pedidos aparecerão aqui em tempo real com status de envio e etiqueta do Melhor Envio.
                </p>
                {onNavigateToOrders && (
                  <button
                    type="button"
                    onClick={onNavigateToOrders}
                    className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Acessar Painel de Pedidos</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {metrics.recentOrders.slice(0, 5).map((order: any) => {
                  const orderId = order.id ? String(order.id).slice(0, 8) : 'ORD';
                  const customerName = order.customer_name || order.customer?.name || order.client_name || order.customer_email || 'Cliente';
                  const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
                  const orderTotal = Number(order.total || order.amount || 0);
                  const status = (order.status || 'pending').toLowerCase();

                  const statusColor = 
                    status === 'paid' || status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    status === 'shipped' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                    status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    'bg-amber-50 text-amber-700 border-amber-200';

                  const statusLabel = 
                    status === 'paid' ? 'Pago' :
                    status === 'delivered' ? 'Entregue' :
                    status === 'shipped' ? 'Enviado' :
                    status === 'cancelled' ? 'Cancelado' : 'Pendente';

                  return (
                    <div 
                      key={order.id} 
                      onClick={onNavigateToOrders}
                      className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-pink-50 text-slate-600 group-hover:text-pink-600 flex items-center justify-center text-xs font-bold shrink-0 transition-colors">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">#{orderId}</span>
                            <span className="text-xs text-slate-700 font-medium truncate max-w-[120px] sm:max-w-[180px]">{customerName}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 block">{orderDate}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                          {statusLabel}
                        </span>
                        <span className="text-slate-900 font-bold text-sm">
                          {formatCurrency ? formatCurrency(orderTotal) : `R$ ${orderTotal.toFixed(2).replace('.', ',')}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {metrics.recentOrders.length > 5 && onNavigateToOrders && (
            <div className="pt-4 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={onNavigateToOrders}
                className="text-xs text-pink-600 hover:underline font-bold cursor-pointer"
              >
                Ver todos os {metrics.recentOrders.length} pedidos &rarr;
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export const MetricsDashboard = AdminDashboard;
