import { supabase } from '../lib/supabase';
import { Coupon } from '../types';

export const DEFAULT_INITIAL_COUPONS: Omit<Coupon, 'id' | 'store_id' | 'created_at'>[] = [
  {
    code: 'FESTA10',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_value: 0,
    max_uses: 100,
    uses_count: 3,
    is_active: true,
    description: '10% de desconto na primeira compra',
  },
  {
    code: 'QUEIMATUDO',
    discount_type: 'fixed',
    discount_value: 15.00,
    min_order_value: 50.00,
    max_uses: 50,
    uses_count: 8,
    is_active: true,
    description: 'R$ 15,00 OFF em compras acima de R$ 50,00',
  },
  {
    code: 'LANCAMENTO20',
    discount_type: 'percentage',
    discount_value: 20,
    min_order_value: 0,
    max_uses: 30,
    uses_count: 1,
    is_active: true,
    description: '20% OFF para campanha de lançamento',
  },
];

const getStorageKey = (storeId: string) => `soumbolinho_coupons_${(storeId || 'suamarcaaqui').toLowerCase().trim()}`;

/**
 * 1. Lista todos os cupons da loja
 */
export async function fetchAllCoupons(storeId: string): Promise<{ data: Coupon[]; error: string | null }> {
  const sId = (storeId || 'suamarcaaqui').toLowerCase().trim();
  const isBase = sId === 'suamarcaaqui' || sId === 'store_default';

  // 1. Tenta buscar no Supabase
  try {
    let query = supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (isBase) {
      query = query.or('store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null');
    } else {
      query = query.eq('store_id', sId);
    }

    const { data: dbCoupons, error } = await query;

    if (!error && dbCoupons && dbCoupons.length > 0) {
      // Sincroniza cache local
      if (typeof window !== 'undefined') {
        localStorage.setItem(getStorageKey(sId), JSON.stringify(dbCoupons));
      }
      return { data: dbCoupons as Coupon[], error: null };
    }
  } catch (err) {
    console.warn('[couponService] Aviso ao buscar cupons do Supabase:', err);
  }

  // 2. Fallback no LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(getStorageKey(sId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { data: parsed, error: null };
        }
      }
    } catch {}
  }

  // 3. Inicializa com cupons padrão para novas lojas
  const initialList: Coupon[] = DEFAULT_INITIAL_COUPONS.map((c, i) => ({
    ...c,
    id: `coup_default_${i}_${Date.now()}`,
    store_id: sId,
    created_at: new Date().toISOString(),
  }));

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getStorageKey(sId), JSON.stringify(initialList));
    } catch {}
  }

  // Opcional: tenta semear no Supabase em segundo plano
  try {
    supabase.from('coupons').insert(initialList).then(() => {}, () => {});
  } catch {}

  return { data: initialList, error: null };
}

/**
 * 2. Cria um novo cupom para a loja
 */
export async function createCoupon(
  couponInput: Omit<Coupon, 'id' | 'created_at'>
): Promise<{ data: Coupon | null; error: string | null }> {
  const sId = (couponInput.store_id || 'suamarcaaqui').toLowerCase().trim();
  const cleanCode = couponInput.code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');

  if (!cleanCode) {
    return { data: null, error: 'Código de cupom inválido.' };
  }

  const newCoupon: Coupon = {
    ...couponInput,
    id: `coup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    store_id: sId,
    code: cleanCode,
    discount_value: Number(couponInput.discount_value) || 0,
    min_order_value: Number(couponInput.min_order_value) || 0,
    max_uses: couponInput.max_uses ? Number(couponInput.max_uses) : null,
    uses_count: 0,
    is_active: couponInput.is_active ?? true,
    created_at: new Date().toISOString(),
  };

  // 1. Salva no Supabase
  try {
    const { data: dbData, error } = await supabase.from('coupons').insert([newCoupon]).select().single();
    if (!error && dbData) {
      // Atualiza localStorage
      await updateLocalCouponCache(sId, newCoupon);
      return { data: dbData as Coupon, error: null };
    }
  } catch (err: any) {
    console.warn('[couponService] Falha ao gravar cupom no Supabase:', err);
  }

  // 2. Persistência local garantida
  await updateLocalCouponCache(sId, newCoupon);
  return { data: newCoupon, error: null };
}

/**
 * 3. Atualiza um cupom existente
 */
export async function updateCoupon(
  id: string,
  updates: Partial<Coupon>,
  storeId: string
): Promise<{ success: boolean; error: string | null }> {
  const sId = (storeId || 'suamarcaaqui').toLowerCase().trim();

  // 1. Supabase
  try {
    await supabase.from('coupons').update(updates).eq('id', id);
  } catch (err) {
    console.warn('[couponService] Falha ao atualizar cupom no Supabase:', err);
  }

  // 2. LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(getStorageKey(sId));
      if (raw) {
        const list: Coupon[] = JSON.parse(raw);
        const updated = list.map((c) => (c.id === id ? { ...c, ...updates } : c));
        localStorage.setItem(getStorageKey(sId), JSON.stringify(updated));
      }
    } catch {}
  }

  return { success: true, error: null };
}

/**
 * 4. Exclui um cupom
 */
export async function deleteCoupon(
  id: string,
  storeId: string
): Promise<{ success: boolean; error: string | null }> {
  const sId = (storeId || 'suamarcaaqui').toLowerCase().trim();

  // 1. Supabase
  try {
    await supabase.from('coupons').delete().eq('id', id);
  } catch (err) {
    console.warn('[couponService] Falha ao excluir cupom no Supabase:', err);
  }

  // 2. LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(getStorageKey(sId));
      if (raw) {
        const list: Coupon[] = JSON.parse(raw);
        const filtered = list.filter((c) => c.id !== id);
        localStorage.setItem(getStorageKey(sId), JSON.stringify(filtered));
      }
    } catch {}
  }

  return { success: true, error: null };
}

/**
 * 5. Alterna status do cupom (Ativo / Inativo)
 */
export async function toggleCouponStatus(
  id: string,
  currentStatus: boolean,
  storeId: string
): Promise<{ success: boolean }> {
  const newStatus = !currentStatus;
  await updateCoupon(id, { is_active: newStatus }, storeId);
  return { success: true };
}

/**
 * 6. Validação Completa de Cupom no Checkout
 */
export async function validateAndApplyCoupon(
  code: string,
  storeId: string,
  orderTotal: number
): Promise<{
  valid: boolean;
  discountAmount: number;
  finalTotal: number;
  coupon?: Coupon;
  error?: string;
  successMessage?: string;
}> {
  const cleanCode = code.toUpperCase().trim();
  if (!cleanCode) {
    return { valid: false, discountAmount: 0, finalTotal: orderTotal, error: 'Digite o código do cupom.' };
  }

  const { data: coupons } = await fetchAllCoupons(storeId);
  const found = coupons.find((c) => c.code.toUpperCase().trim() === cleanCode);

  if (!found) {
    return { valid: false, discountAmount: 0, finalTotal: orderTotal, error: 'Cupom inválido ou não encontrado.' };
  }

  if (!found.is_active) {
    return { valid: false, discountAmount: 0, finalTotal: orderTotal, error: 'Este cupom foi desativado temporariamente.' };
  }

  // Validação de expiração
  if (found.expires_at) {
    const expDate = new Date(found.expires_at).getTime();
    if (Date.now() > expDate) {
      return { valid: false, discountAmount: 0, finalTotal: orderTotal, error: 'Este cupom já expirou.' };
    }
  }

  // Validação de limite de usos
  if (found.max_uses !== null && found.max_uses !== undefined && found.max_uses > 0) {
    if ((found.uses_count || 0) >= found.max_uses) {
      return { valid: false, discountAmount: 0, finalTotal: orderTotal, error: 'Este cupom atingiu o limite máximo de utilizações.' };
    }
  }

  // Validação de valor mínimo de pedido
  if (found.min_order_value && orderTotal < found.min_order_value) {
    return {
      valid: false,
      discountAmount: 0,
      finalTotal: orderTotal,
      error: `Este cupom é válido apenas para compras acima de R$ ${found.min_order_value.toFixed(2).replace('.', ',')}.`,
    };
  }

  // Cálculo do desconto
  let discountAmount = 0;
  if (found.discount_type === 'percentage') {
    discountAmount = Number(((orderTotal * found.discount_value) / 100).toFixed(2));
  } else {
    discountAmount = Number(found.discount_value.toFixed(2));
  }

  // Garante que o desconto não exceda o total
  discountAmount = Math.min(orderTotal, discountAmount);
  const finalTotal = Math.max(0, Number((orderTotal - discountAmount).toFixed(2)));

  const successMessage = found.discount_type === 'percentage'
    ? `Cupom ${found.code} aplicado! ${found.discount_value}% OFF (-R$ ${discountAmount.toFixed(2).replace('.', ',')})`
    : `Cupom ${found.code} aplicado! Economia de R$ ${discountAmount.toFixed(2).replace('.', ',')}`;

  return {
    valid: true,
    discountAmount,
    finalTotal,
    coupon: found,
    successMessage,
  };
}

/**
 * 7. Incrementa o contador de utilizações de um cupom ao finalizar compra
 */
export async function incrementCouponUses(code: string, storeId: string): Promise<void> {
  const cleanCode = code.toUpperCase().trim();
  const sId = (storeId || 'suamarcaaqui').toLowerCase().trim();

  try {
    const { data: coupons } = await fetchAllCoupons(sId);
    const target = coupons.find((c) => c.code.toUpperCase().trim() === cleanCode);
    if (target) {
      const newCount = (target.uses_count || 0) + 1;
      await updateCoupon(target.id, { uses_count: newCount }, sId);
    }
  } catch (err) {
    console.warn('[couponService] Erro ao incrementar uso do cupom:', err);
  }
}

async function updateLocalCouponCache(storeId: string, newOrUpdated: Coupon): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const key = getStorageKey(storeId);
    const raw = localStorage.getItem(key);
    const list: Coupon[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((c) => c.id === newOrUpdated.id);
    if (index >= 0) {
      list[index] = newOrUpdated;
    } else {
      list.unshift(newOrUpdated);
    }
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}
