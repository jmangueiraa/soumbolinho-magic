import React, { useEffect, useState } from 'react';
import { Globe, ExternalLink, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../context/TenantContext';
import { formatCurrency } from '../../utils/formatters';

interface AdminDashboardProps {
  storeId?: string;
  onNavigateToProducts?: () => void;
}

export default function AdminDashboard({ storeId: propStoreId, onNavigateToProducts }: AdminDashboardProps) {
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
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
          <p className="text-sm text-gray-500 font-medium">Pedidos Hoje</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.recentOrders.length}</h3>
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

      {/* Seção de Produtos Mais Acessados / Cadastrados */}
      <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200">
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
  );
}

export const MetricsDashboard = AdminDashboard;
