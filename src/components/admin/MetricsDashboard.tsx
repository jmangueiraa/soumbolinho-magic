import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Eye, 
  RefreshCw, 
  ArrowUpRight, 
  Flame, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Package, 
  Users, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Zap
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useStoreData } from '../../context/StoreDataContext';
import { 
  fetchStoreMetrics, 
  subscribeToStoreMetrics, 
  StoreMetrics 
} from '../../services/analyticsService';
import { formatCurrency } from '../../utils/formatters';

interface MetricsDashboardProps {
  onNavigateToProducts?: () => void;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ onNavigateToProducts }) => {
  const { currentStore } = useTenant();
  const { storeConfig } = useStoreData();
  const currentStoreId = currentStore?.id || 'suamarcaaqui';

  const [metrics, setMetrics] = useState<StoreMetrics>({
    todayVisits: 0,
    totalVisits: 0,
    todayOrders: 0,
    totalOrders: 0,
    todayRevenue: 0,
    totalRevenue: 0,
    approvedOrdersCount: 0,
    pendingOrdersCount: 0,
    conversionRate: 0,
    averageTicket: 0,
    topProducts: [],
    recentOrders: [],
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    try {
      const data = await fetchStoreMetrics(currentStoreId);
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[MetricsDashboard] Erro ao carregar métricas:', err);
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, [currentStoreId]);

  useEffect(() => {
    loadData(true);

    // Escuta eventos em tempo real na tabela de pedidos do Supabase
    const unsubscribe = subscribeToStoreMetrics(currentStoreId, () => {
      loadData(false);
    });

    // Auto-refresh a cada 30 segundos
    const interval = setInterval(() => {
      loadData(false);
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [currentStoreId, loadData]);

  // Formatação de valores
  const formattedTodayRevenue = formatCurrency(metrics.todayRevenue);
  const formattedTotalRevenue = formatCurrency(metrics.totalRevenue);
  const formattedAverageTicket = formatCurrency(metrics.averageTicket);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header do Dashboard com Status em Tempo Real */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Painel de Métricas & Conversão
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Tempo Real
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhe as visitas, pedidos e faturamento da sua loja atualizados ao vivo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
            Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            onClick={() => loadData(true)}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl flex items-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            title="Atualizar métricas agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-theme-primary' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* 2. Grid de 4 Cards Principais de Indicadores (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Faturamento do Dia */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wide uppercase text-emerald-100/90">
              Faturamento Hoje
            </span>
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {formattedTodayRevenue}
            </div>
            <div className="mt-2 text-[11px] text-emerald-100/80 flex items-center justify-between border-t border-white/10 pt-2">
              <span>Total Acumulado:</span>
              <strong className="text-white font-bold">{formattedTotalRevenue}</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Pedidos do Dia */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wide uppercase text-slate-500">
              Pedidos Hoje
            </span>
            <div className="w-10 h-10 rounded-2xl bg-pink-50 text-theme-primary flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {metrics.todayOrders}
              <span className="text-xs text-slate-400 font-semibold ml-1.5">
                {metrics.todayOrders === 1 ? 'pedido' : 'pedidos'}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
              <span>Total de Pedidos:</span>
              <strong className="text-slate-800 font-bold">{metrics.totalOrders}</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Visitas da Loja */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wide uppercase text-slate-500">
              Visitas na Loja
            </span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {metrics.todayVisits}
              <span className="text-xs text-slate-400 font-semibold ml-1.5">hoje</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
              <span>Visitas Totais:</span>
              <strong className="text-slate-800 font-bold">{metrics.totalVisits}</strong>
            </div>
          </div>
        </div>

        {/* Card 4: Taxa de Conversão */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wide uppercase text-slate-500">
              Taxa de Conversão
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>{metrics.conversionRate}%</span>
              {metrics.conversionRate > 2 && (
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                  Alta
                </span>
              )}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
              <span>Ticket Médio:</span>
              <strong className="text-slate-800 font-bold">{formattedAverageTicket}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Seção Dividida: Produtos Mais Acessados & Pedidos em Tempo Real */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Lado Esquerdo: Produtos Mais Acessados (7 Colunas) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Produtos Mais Acessados
                  </h2>
                  <p className="text-xs text-slate-500">
                    Itens que mais despertam interesse e cliques dos seus clientes
                  </p>
                </div>
              </div>

              {onNavigateToProducts && (
                <button
                  onClick={onNavigateToProducts}
                  className="text-xs font-bold text-theme-primary hover:text-pink-700 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Ver Catálogo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Lista de Produtos do Ranking */}
            {metrics.topProducts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhum clique registrado ainda. Os produtos acessados pelos visitantes aparecerão aqui.
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.topProducts.map((prod, index) => {
                  const maxViews = metrics.topProducts[0]?.views || 1;
                  const percent = Math.min(100, Math.round((prod.views / maxViews) * 100));

                  return (
                    <div 
                      key={prod.productId || index}
                      className="p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-100 transition-all flex items-center gap-3.5"
                    >
                      {/* Posição no Ranking */}
                      <span className={`w-6 text-center font-black text-xs ${
                        index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-amber-700' : 'text-slate-300'
                      }`}>
                        #{index + 1}
                      </span>

                      {/* Imagem do Produto */}
                      <div className="w-12 h-12 rounded-xl bg-slate-200 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                        {prod.imageUrl ? (
                          <img 
                            src={prod.imageUrl} 
                            alt={prod.productName} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>

                      {/* Nome e Barra de Visualizações */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-bold text-slate-800 truncate" title={prod.productName}>
                            {prod.productName}
                          </h3>
                          <span className="text-xs font-black text-slate-900 shrink-0">
                            {formatCurrency(prod.price || 0)}
                          </span>
                        </div>

                        {/* Barra de progresso de views */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-theme-primary to-orange-400 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 shrink-0 flex items-center gap-1">
                            <Eye className="w-3 h-3 text-slate-400" />
                            {prod.views} {prod.views === 1 ? 'visualização' : 'visualizações'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dica de Conversão */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-center gap-2.5 text-xs text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Dica de Ouro:</strong> Os produtos no topo são os favoritos do seu público. Use-os como <em>Order Bump</em> ou no topo dos banners para dobrar suas vendas!
            </span>
          </div>
        </div>

        {/* Lado Direito: Pedidos em Tempo Real (5 Colunas) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-theme-primary flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Pedidos Recentes
                  </h2>
                  <p className="text-xs text-slate-500">
                    Histórico de compras registradas
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {metrics.totalOrders} {metrics.totalOrders === 1 ? 'pedido' : 'pedidos'}
              </span>
            </div>

            {/* Lista de Pedidos */}
            {metrics.recentOrders.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-600">
                  Nenhum pedido registrado ainda
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Quando um cliente comprar via Pix ou Cartão, os dados e o faturamento atualizarão automaticamente em tempo real.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.recentOrders.map((ord) => {
                  const isApproved = ['approved', 'pago', 'concluido', 'paid'].includes(ord.status.toLowerCase());
                  const formattedDate = new Date(ord.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div 
                      key={ord.id}
                      className="p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-100 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {ord.customerName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate" title={ord.productName}>
                          {ord.productName}
                        </p>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formattedDate}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-900 block">
                          {formatCurrency(ord.amount)}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          isApproved 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isApproved ? 'Pago' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumo de Conversão no Rodapé */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Aprovados: <strong className="text-emerald-700 font-bold">{metrics.approvedOrdersCount}</strong></span>
            <span>Pendentes: <strong className="text-amber-700 font-bold">{metrics.pendingOrdersCount}</strong></span>
            <span>Ticket: <strong className="text-slate-800 font-bold">{formattedAverageTicket}</strong></span>
          </div>
        </div>

      </div>

    </div>
  );
};
