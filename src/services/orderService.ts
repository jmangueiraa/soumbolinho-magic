import { supabase } from '../lib/supabase';
import { CartItem } from '../types';

export interface OrderItemData {
  id: string;
  product_id?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  is_digital?: boolean;
  delivery_url?: string;
}

export interface ShippingAddressData {
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface Order {
  id: string;
  store_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_document?: string;
  product_id?: string;
  product_name?: string;
  delivery_url?: string;
  items?: OrderItemData[];
  amount: number;
  shipping_cost?: number;
  shipping_method?: string;
  shipping_service_id?: string;
  shipping_agency_id?: string;
  delivery_address?: string;
  shipping_address_data?: ShippingAddressData;
  tracking_code?: string;
  shipping_label_url?: string;
  shipping_order_id?: string;
  payment_id?: string;
  payment_method?: string;
  status: 'pending' | 'approved' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  notes?: string;
  email_sent?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateOrderPayload {
  orderId: string;
  store_id?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerDocument?: string;
  items: CartItem[];
  totalAmount: number;
  paymentId?: string;
  paymentMethod?: string;
  status?: 'pending' | 'approved' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  shippingCost?: number;
  shippingMethod?: string;
  shippingServiceId?: string;
  shippingAgencyId?: string;
  deliveryAddress?: string;
  shippingAddressData?: ShippingAddressData;
  trackingCode?: string;
  shippingLabelUrl?: string;
  notes?: string;
}

/**
 * Normaliza o ID da loja para garantir o isolamento Multi-Tenant
 */
function resolveStoreId(storeId?: string): string {
  if (!storeId || storeId === 'suamarcaaqui' || storeId === 'store_default') {
    return 'suamarcaaqui';
  }
  return storeId;
}

/**
 * Registra o pedido na tabela 'orders' do Supabase com tratamento adaptativo de colunas
 */
export async function createOrderInSupabase(
  payload: CreateOrderPayload
): Promise<{ success: boolean; data?: Order; error?: string }> {
  try {
    const primaryItem = payload.items[0];
    const productNames = payload.items.map((i) => `${i.product?.name || 'Item'} (x${i.quantity})`).join(', ');
    const resolvedStoreId = resolveStoreId(payload.store_id || primaryItem?.product?.store_id);
    
    // Coleta links de entrega digital dos produtos do carrinho
    const deliveryUrls = payload.items
      .map((i) => i.product?.delivery_url || (i.product as any)?.deliveryUrl)
      .filter(Boolean)
      .join(', ');

    // Estrutura rica dos itens comprados
    const structuredItems: OrderItemData[] = payload.items.map((item) => ({
      id: item.id,
      product_id: item.product?.id,
      name: item.product?.name || 'Produto',
      price: item.customPrice !== undefined ? item.customPrice : (item.product?.price || 0),
      quantity: item.quantity,
      image: item.product?.images?.[0] || (item.product as any)?.image,
      is_digital: Boolean(item.product?.is_digital),
      delivery_url: item.product?.delivery_url || (item.product as any)?.deliveryUrl,
    }));

    const orderRow: any = {
      id: payload.orderId,
      store_id: resolvedStoreId,
      customer_name: payload.customerName.trim(),
      customer_email: payload.customerEmail.trim(),
      customer_phone: payload.customerPhone ? payload.customerPhone.trim() : null,
      customer_document: payload.customerDocument ? payload.customerDocument.trim() : null,
      product_id: primaryItem?.product?.id || null,
      product_name: productNames || 'Produtos AJPSTORE',
      delivery_url: deliveryUrls || null,
      items: structuredItems,
      amount: payload.totalAmount,
      shipping_cost: payload.shippingCost || 0,
      shipping_method: payload.shippingMethod || null,
      shipping_service_id: payload.shippingServiceId || null,
      shipping_agency_id: payload.shippingAgencyId || null,
      delivery_address: payload.deliveryAddress || null,
      shipping_address_data: payload.shippingAddressData || null,
      tracking_code: payload.trackingCode || null,
      shipping_label_url: payload.shippingLabelUrl || null,
      payment_id: payload.paymentId || payload.orderId,
      payment_method: payload.paymentMethod || 'mercadopago',
      status: payload.status || 'pending',
      notes: payload.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('[orderService] 💾 Gravando registro de pedido no Supabase (orders):', orderRow);

    // Salva em cache local resiliente para contingência
    try {
      const cacheKey = `store_orders_${resolvedStoreId}`;
      const existingRaw = localStorage.getItem(cacheKey);
      const existingList: Order[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updatedList = [orderRow as Order, ...existingList.filter((o) => o.id !== orderRow.id)];
      localStorage.setItem(cacheKey, JSON.stringify(updatedList.slice(0, 100)));
    } catch (cacheErr) {
      console.warn('[orderService] Cache local indisponível:', cacheErr);
    }

    let { data, error } = await supabase.from('orders').insert([orderRow]).select();

    // Fallback adaptativo caso colunas recém-adicionadas ainda não existam no Supabase
    if (error && error.message.includes('column')) {
      console.warn('[orderService] ⚠️ Coluna ausente em orders, tentando salvar com fallback adaptativo:', error.message);
      const cleanRow = { ...orderRow };
      const optionalCols = [
        'customer_document',
        'items',
        'shipping_service_id',
        'shipping_agency_id',
        'shipping_address_data',
        'tracking_code',
        'shipping_label_url',
        'shipping_order_id',
        'payment_method',
        'notes',
        'updated_at',
        'shipping_cost',
        'shipping_method',
        'delivery_address',
        'customer_phone',
      ];
      
      for (const col of optionalCols) {
        if (error?.message.includes(`'${col}'`)) {
          delete cleanRow[col];
        }
      }

      const retry = await supabase.from('orders').insert([cleanRow]).select();
      if (!retry.error && retry.data) {
        data = retry.data;
        error = null;
      }
    }

    if (error) {
      console.warn('[orderService] ⚠️ Aviso ao salvar pedido no Supabase (tabela orders):', error.message);
      return { success: false, error: error.message };
    }

    console.log('[orderService] ✅ Pedido registrado com sucesso no banco de dados:', data);
    return { success: true, data: data?.[0] as Order };
  } catch (err: any) {
    console.error('[orderService] ❌ Exceção ao gravar pedido no Supabase:', err);
    return { success: false, error: err.message || 'Erro inesperado ao registrar pedido.' };
  }
}

/**
 * Busca a listagem de pedidos da loja atual garantindo o isolamento Multi-Tenant
 */
export async function fetchStoreOrders(
  storeId: string
): Promise<{ success: boolean; data: Order[]; error?: string }> {
  const resolvedStoreId = resolveStoreId(storeId);
  const cacheKey = `store_orders_${resolvedStoreId}`;

  try {
    console.log('[orderService] 📥 Buscando pedidos para a loja:', resolvedStoreId);

    // Consulta no Supabase filtrando estritamente pelo store_id da loja
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (resolvedStoreId === 'suamarcaaqui' || resolvedStoreId === 'ajpstore' || resolvedStoreId === 'store_ajpstore') {
      query = query.or('store_id.eq.ajpstore,store_id.eq.store_ajpstore,store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null');
    } else if (resolvedStoreId === 'store_editaveisdocanva' || resolvedStoreId === 'editaveisdocanva' || resolvedStoreId === 'editaveis-do-canva') {
      query = query.or('store_id.eq.store_editaveisdocanva,store_id.eq.editaveisdocanva,store_id.eq.editaveis-do-canva,store_id.eq.matriz');
    } else {
      query = query.eq('store_id', resolvedStoreId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[orderService] ⚠️ Erro na consulta do Supabase, buscando do cache local:', error.message);
      const local = localStorage.getItem(cacheKey);
      return {
        success: true,
        data: local ? JSON.parse(local) : [],
        error: error.message,
      };
    }

    const orders: Order[] = (data || []).map((row: any) => {
      // Normaliza items caso tenham sido salvos como string ou nulos
      let parsedItems: OrderItemData[] = [];
      if (Array.isArray(row.items)) {
        parsedItems = row.items;
      } else if (typeof row.items === 'string') {
        try {
          parsedItems = JSON.parse(row.items);
        } catch {
          parsedItems = [];
        }
      }

      // Se items ainda estiver vazio mas tiver product_name, monta item sintético
      if (parsedItems.length === 0 && (row.product_name || row.product_id)) {
        parsedItems = [
          {
            id: row.product_id || row.id,
            product_id: row.product_id,
            name: row.product_name || 'Produto da Loja',
            price: Number(row.amount) || 0,
            quantity: 1,
            is_digital: Boolean(row.delivery_url),
            delivery_url: row.delivery_url,
          },
        ];
      }

      return {
        ...row,
        items: parsedItems,
        amount: Number(row.amount) || 0,
        shipping_cost: Number(row.shipping_cost) || 0,
      };
    });

    // Atualiza cache local
    try {
      localStorage.setItem(cacheKey, JSON.stringify(orders.slice(0, 100)));
    } catch (e) {
      // ignora quota
    }

    return { success: true, data: orders };
  } catch (err: any) {
    console.error('[orderService] Falha inesperada ao buscar pedidos:', err);
    const local = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    return {
      success: true,
      data: local ? JSON.parse(local) : [],
      error: err.message,
    };
  }
}

/**
 * Busca detalhes completos de um pedido específico
 */
export async function fetchOrderById(
  orderId: string
): Promise<{ success: boolean; data?: Order; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Pedido não encontrado.' };
    }

    let parsedItems = [];
    if (Array.isArray(data.items)) {
      parsedItems = data.items;
    } else if (typeof data.items === 'string') {
      try {
        parsedItems = JSON.parse(data.items);
      } catch {
        parsedItems = [];
      }
    }

    return {
      success: true,
      data: {
        ...data,
        items: parsedItems,
        amount: Number(data.amount) || 0,
        shipping_cost: Number(data.shipping_cost) || 0,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Atualiza o status do pedido (pending, approved, paid, shipped, delivered, cancelled)
 */
export async function updateOrderStatusInSupabase(
  orderId: string,
  status: 'approved' | 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      console.warn('[orderService] Falha ao atualizar status:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Atualiza o código de rastreamento e URL da etiqueta de frete
 */
export async function updateOrderTrackingInSupabase(
  orderId: string,
  trackingCode: string,
  shippingLabelUrl?: string,
  shippingOrderId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: any = {
      tracking_code: trackingCode.trim(),
      updated_at: new Date().toISOString(),
    };
    if (shippingLabelUrl) payload.shipping_label_url = shippingLabelUrl;
    if (shippingOrderId) payload.shipping_order_id = shippingOrderId;

    const { error } = await supabase
      .from('orders')
      .update(payload)
      .eq('id', orderId);

    if (error) {
      console.warn('[orderService] Falha ao atualizar rastreamento:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Atualiza anotações internas do lojista no pedido
 */
export async function updateOrderNotesInSupabase(
  orderId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Marca o pedido com email_sent = true no Supabase
 */
export async function markOrderEmailSentInSupabase(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ email_sent: true, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      console.warn('[orderService] Falha ao marcar email_sent:', error.message);
      return { success: false, error: error.message };
    }

    console.log('[orderService] ✅ Pedido marcado com email_sent = true no Supabase:', orderId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
