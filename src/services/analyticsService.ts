import { supabase } from '../lib/supabase';

export interface ProductViewStat {
  productId: string;
  productName: string;
  views: number;
  imageUrl?: string;
  price?: number;
  category?: string;
}

export interface StoreMetrics {
  todayVisits: number;
  totalVisits: number;
  todayOrders: number;
  totalOrders: number;
  todayRevenue: number;
  totalRevenue: number;
  approvedOrdersCount: number;
  pendingOrdersCount: number;
  conversionRate: number; // percentual (ex: 2.5)
  averageTicket: number;
  topProducts: ProductViewStat[];
  recentOrders: Array<{
    id: string;
    customerName: string;
    customerEmail?: string;
    amount: number;
    status: string;
    createdAt: string;
    productName?: string;
  }>;
}

const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * 1. Registra uma visita à loja em tempo real
 */
export function recordStoreVisit(storeId: string, path: string = '/'): void {
  if (typeof window === 'undefined') return;
  const sId = (storeId || 'suamarcaaqui').toLowerCase().trim();
  const today = getTodayKey();

  try {
    const storageKey = `analytics_visits_${sId}`;
    const raw = localStorage.getItem(storageKey);
    const data: { total: number; byDate: Record<string, number> } = raw 
      ? JSON.parse(raw) 
      : { total: 0, byDate: {} };

    data.total = (data.total || 0) + 1;
    data.byDate[today] = (data.byDate[today] || 0) + 1;
    localStorage.setItem(storageKey, JSON.stringify(data));

    // Opcional: tenta salvar no Supabase sem quebrar caso a tabela não exista
    supabase
      .from('store_visits')
      .insert([{ store_id: sId, path, created_at: new Date().toISOString() }])
      .then(() => {}, () => {});
  } catch (err) {
    console.warn('[analyticsService] Aviso ao registrar visita:', err);
  }
}

/**
 * 2. Registra a visualização de um produto específico
 */
export function recordProductView(
  storeId: string, 
  productId: string, 
  productName: string, 
  price?: number,
  imageUrl?: string
): void {
  if (typeof window === 'undefined' || !productId) return;
  const sId = (storeId || 'suamarcaaqui').toLowerCase().trim();

  try {
    const storageKey = `analytics_prod_views_${sId}`;
    const raw = localStorage.getItem(storageKey);
    const map: Record<string, ProductViewStat> = raw ? JSON.parse(raw) : {};

    if (!map[productId]) {
      map[productId] = {
        productId,
        productName: productName || 'Produto',
        views: 1,
        price: Number(price) || 0,
        imageUrl: imageUrl || '',
      };
    } else {
      map[productId].views += 1;
      if (productName) map[productId].productName = productName;
      if (price !== undefined) map[productId].price = Number(price);
      if (imageUrl) map[productId].imageUrl = imageUrl;
    }

    localStorage.setItem(storageKey, JSON.stringify(map));
  } catch (err) {
    console.warn('[analyticsService] Aviso ao registrar visualização de produto:', err);
  }
}

/**
 * 3. Busca as métricas consolidadas da loja para o Dashboard
 */
export async function fetchStoreMetrics(storeId: string): Promise<StoreMetrics> {
  const sId = (storeId || 'suamarcaaqui').toLowerCase().trim();
  const isBase = sId === 'suamarcaaqui' || sId === 'store_default';
  const today = getTodayKey();

  // 1. Visitas do LocalStorage (acumulador local persistente)
  let todayVisits = 0;
  let totalVisits = 0;
  try {
    const storageKey = `analytics_visits_${sId}`;
    const rawVisits = localStorage.getItem(storageKey);
    if (rawVisits) {
      const parsed = JSON.parse(rawVisits);
      totalVisits = parsed.total || 0;
      todayVisits = parsed.byDate?.[today] || 0;
    }
  } catch {}

  // Garante ao menos um baseline mínimo para demonstração caso nova loja
  if (totalVisits === 0) {
    totalVisits = 12;
    todayVisits = 4;
  }

  // 2. Pedidos no Supabase
  let ordersList: any[] = [];
  try {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (isBase) {
      query = query.or('store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null');
    } else {
      query = query.eq('store_id', sId);
    }
    const { data: dbOrders, error } = await query;
    if (!error && dbOrders) {
      ordersList = dbOrders;
    }
  } catch (err) {
    console.warn('[analyticsService] Aviso ao buscar pedidos do Supabase:', err);
  }

  // 3. Fallback de pedidos locais (caso gravados em localStorage)
  if (ordersList.length === 0 && typeof window !== 'undefined') {
    try {
      const localOrders = localStorage.getItem(`orders_${sId}`);
      if (localOrders) {
        ordersList = JSON.parse(localOrders);
      }
    } catch {}
  }

  // 4. Cálculos Financeiros e de Conversão
  let todayOrders = 0;
  let todayRevenue = 0;
  let totalRevenue = 0;
  let approvedCount = 0;
  let pendingCount = 0;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  ordersList.forEach((ord: any) => {
    const amt = Number(ord.amount || ord.total || 0);
    const st = String(ord.status || ord.payment_status || 'pending').toLowerCase();
    const isApproved = st === 'approved' || st === 'pago' || st === 'concluido' || st === 'paid';
    
    // Contagem de status
    if (isApproved) {
      approvedCount += 1;
      totalRevenue += amt;
    } else {
      pendingCount += 1;
    }

    // Pedidos de hoje
    const ordDate = ord.created_at ? new Date(ord.created_at) : new Date();
    if (ordDate >= startOfToday) {
      todayOrders += 1;
      if (isApproved) {
        todayRevenue += amt;
      }
    }
  });

  const totalOrders = ordersList.length;
  const conversionRate = totalVisits > 0 ? Number(((totalOrders / totalVisits) * 100).toFixed(1)) : 0;
  const approvedTotal = approvedCount > 0 ? approvedCount : 1;
  const averageTicket = totalRevenue > 0 ? Number((totalRevenue / approvedTotal).toFixed(2)) : 0;

  // 5. Ranking de Produtos Mais Acessados
  let topProducts: ProductViewStat[] = [];
  try {
    const storageKey = `analytics_prod_views_${sId}`;
    const rawViews = localStorage.getItem(storageKey);
    if (rawViews) {
      const map: Record<string, ProductViewStat> = JSON.parse(rawViews);
      topProducts = Object.values(map).sort((a, b) => b.views - a.views);
    }
  } catch {}

  // Se ainda não houver histórico de views registrado, busca produtos do catálogo para preencher o ranking
  if (topProducts.length === 0) {
    try {
      let prodQuery = supabase.from('products').select('id, name, price, image, image_url').limit(6);
      if (isBase) {
        prodQuery = prodQuery.or('store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null');
      } else {
        prodQuery = prodQuery.eq('store_id', sId);
      }
      const { data: prods } = await prodQuery;
      if (prods && prods.length > 0) {
        topProducts = prods.map((p, idx) => ({
          productId: p.id,
          productName: p.name,
          price: Number(p.price) || 0,
          imageUrl: p.image_url || p.image || '',
          views: Math.max(1, 15 - idx * 2), // Views estimadas iniciais
        }));
      }
    } catch {}
  }

  // 6. Formatação dos Pedidos Recentes
  const recentOrders = ordersList.slice(0, 6).map((ord: any) => ({
    id: ord.id,
    customerName: ord.customer_name || 'Cliente',
    customerEmail: ord.customer_email || '',
    amount: Number(ord.amount || ord.total || 0),
    status: ord.status || ord.payment_status || 'pending',
    createdAt: ord.created_at || new Date().toISOString(),
    productName: ord.product_name || 'Pedido Digital',
  }));

  return {
    todayVisits,
    totalVisits,
    todayOrders,
    totalOrders,
    todayRevenue,
    totalRevenue,
    approvedOrdersCount: approvedCount,
    pendingOrdersCount: pendingCount,
    conversionRate,
    averageTicket,
    topProducts: topProducts.slice(0, 8),
    recentOrders,
  };
}

/**
 * 4. Inscreve no Realtime do Supabase para atualizar métricas instantaneamente
 */
export function subscribeToStoreMetrics(storeId: string, onUpdate: () => void): () => void {
  const sId = (storeId || 'suamarcaaqui').toLowerCase().trim();

  const channel = supabase
    .channel(`metrics_realtime_${sId}_${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      () => {
        console.log('[analyticsService] ⚡ Novo evento em orders, recarregando métricas...');
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
