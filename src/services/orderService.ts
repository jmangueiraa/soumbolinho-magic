import { supabase } from '../lib/supabase';
import { CartItem } from '../types';

export interface CreateOrderPayload {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: CartItem[];
  totalAmount: number;
  paymentId?: string;
  status?: 'pending' | 'approved' | 'cancelled';
}

/**
 * Registra o pedido com os links de entrega digital na tabela 'orders' do Supabase
 */
export async function createOrderInSupabase(
  payload: CreateOrderPayload
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const primaryItem = payload.items[0];
    const productNames = payload.items.map((i) => `${i.product.name} (x${i.quantity})`).join(', ');
    const productIds = payload.items.map((i) => i.product.id).join(', ');
    
    // Coleta todos os links de entrega digital dos produtos do carrinho
    const deliveryUrls = payload.items
      .map((i) => i.product.delivery_url || i.product.deliveryUrl)
      .filter(Boolean)
      .join(', ');

    const orderRow = {
      id: payload.orderId,
      customer_name: payload.customerName.trim(),
      customer_email: payload.customerEmail.trim(),
      customer_phone: payload.customerPhone ? payload.customerPhone.trim() : null,
      product_id: primaryItem?.product?.id || productIds || null,
      product_name: productNames || 'Produtos Encantando Festa',
      delivery_url: deliveryUrls || null,
      amount: payload.totalAmount,
      payment_id: payload.paymentId || payload.orderId,
      status: payload.status || 'pending',
      created_at: new Date().toISOString(),
    };

    console.log('[orderService] 💾 Salvando registro de pedido no Supabase (orders):', orderRow);

    const { data, error } = await supabase.from('orders').insert([orderRow]).select();

    if (error) {
      console.warn('[orderService] ⚠️ Aviso ao salvar pedido no Supabase (verifique se a tabela orders existe):', error.message);
      return { success: false, error: error.message };
    }

    console.log('[orderService] ✅ Pedido registrado com sucesso no banco de dados:', data);
    return { success: true, data: data?.[0] };
  } catch (err: any) {
    console.error('[orderService] ❌ Exceção ao gravar pedido no Supabase:', err);
    return { success: false, error: err.message || 'Erro inesperado ao registrar pedido.' };
  }
}

/**
 * Atualiza o status do pedido para 'approved' e libera os links
 */
export async function updateOrderStatusInSupabase(
  orderId: string,
  status: 'approved' | 'pending' | 'cancelled'
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
