import { CartItem, OrderCustomerInfo, StoreConfig } from '../types';

export interface CreatePreferenceOptions {
  items: CartItem[];
  customerInfo?: Partial<OrderCustomerInfo>;
  storeConfig?: Partial<StoreConfig>;
  customAccessToken?: string;
  orderId?: string;
  storeId?: string;
}

export interface PreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
  error?: string;
}

export interface PixPaymentOptions {
  amount: number;
  customerName: string;
  customerEmail: string;
  customerCpf?: string;
  description?: string;
  storeConfig?: Partial<StoreConfig>;
  customAccessToken?: string;
}

export interface PixPaymentResponse {
  success: boolean;
  paymentId?: string;
  qrCode: string;
  qrCodeBase64: string;
  qrCodeImage: string;
  ticketUrl?: string;
  error?: string;
}

/**
 * Obtém o Access Token do Mercado Pago de forma centralizada
 */
export function getMercadoPagoAccessToken(storeConfig?: Partial<StoreConfig>): string {
  const token = (
    localStorage.getItem('encantando_festa_mp_access_token') ||
    storeConfig?.mpAccessToken ||
    (import.meta as any).env?.VITE_MERCADO_PAGO_ACCESS_TOKEN ||
    ''
  ).replace(/['";\s]/g, '').trim();
  return token;
}

/**
 * Verifica se o Mercado Pago está configurado no sistema
 */
export const isMercadoPagoConfigured = (storeConfig?: Partial<StoreConfig>): boolean => {
  const token = getMercadoPagoAccessToken(storeConfig);
  return Boolean(
    token ||
    (import.meta as any).env?.VITE_MERCADO_PAGO_PUBLIC_KEY ||
    (import.meta as any).env?.VITE_MERCADO_PAGO_ACCESS_TOKEN ||
    true
  );
};

/**
 * Cria uma preferência do Mercado Pago (Checkout Pro / Redirect)
 */
export async function createMercadoPagoPreference(
  options: CreatePreferenceOptions
): Promise<PreferenceResponse> {
  const { items, storeConfig, customAccessToken, customerInfo, orderId, storeId } = options;
  const accessToken = customAccessToken || getMercadoPagoAccessToken(storeConfig);
  const origin = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '';
  const finalOrderId = orderId || `order_${Date.now()}`;

  // 1. Tentar primeiro via Endpoint Serverless (/api/create-preference)
  try {
    const serverlessRes = await fetch('/api/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        customer_name: customerInfo?.name || 'Cliente',
        customer_email: customerInfo?.email || '',
        customer_phone: customerInfo?.phone || '',
        order_id: finalOrderId,
        store_id: storeId || storeConfig?.storeId || '',
        back_url_origin: origin,
        access_token: accessToken || undefined,
      }),
    });

    if (serverlessRes.ok) {
      const data = await serverlessRes.json();
      if (data.success && data.init_point) {
        console.log('[Mercado Pago Checkout Pro] ✅ Preferência criada via Serverless:', data);
        return {
          id: data.id,
          init_point: data.init_point,
          sandbox_init_point: data.sandbox_init_point,
        };
      }
    }
  } catch (err: any) {
    console.warn('[Mercado Pago Checkout Pro] Fallback para chamada direta:', err?.message);
  }

  // 2. Chamada direta de fallback para api.mercadopago.com/checkout/preferences
  if (!accessToken) {
    return {
      id: '',
      init_point: '',
      error: 'Access Token do Mercado Pago não configurado.',
    };
  }

  const trimmedName = String(customerInfo?.name || 'Cliente').trim();
  const nameParts = trimmedName.split(' ');
  const firstName = nameParts[0] || 'Cliente';
  const lastName = nameParts.slice(1).join(' ') || 'Comprador';
  const cleanPhone = String(customerInfo?.phone || '').replace(/\D/g, '');
  const areaCode = cleanPhone.length >= 10 ? cleanPhone.slice(0, 2) : '11';
  const phoneNumber = cleanPhone.length >= 10 ? cleanPhone.slice(2) : cleanPhone;

  const preferencePayload = {
    items: items.map((item) => {
      const rawPrice = item.customPrice !== undefined ? item.customPrice : (item.product?.price !== undefined ? item.product.price : (item as any).price || 0);
      const unitPrice = Number(parseFloat(String(rawPrice)).toFixed(2)) || 1.0;
      const baseTitle = String(item.product?.name || 'Produto Digital').trim();
      const title = item.observations ? `${baseTitle} (${item.observations})` : baseTitle;
      return {
        title: title.slice(0, 250),
        unit_price: unitPrice,
        quantity: Math.max(1, item.quantity || 1),
        currency_id: 'BRL',
      };
    }),
    payer: {
      name: firstName,
      surname: lastName,
      email: customerInfo?.email ? String(customerInfo.email).trim() : 'comprador@soumbolinho.com.br',
      phone: cleanPhone ? { area_code: areaCode, number: phoneNumber } : undefined,
    },
    external_reference: finalOrderId,
    metadata: {
      order_id: finalOrderId,
      customer_name: trimmedName,
      customer_email: customerInfo?.email,
      customer_phone: customerInfo?.phone,
    },
    back_urls: {
      success: `${origin}/finalizar-compra?status=approved&order_id=${encodeURIComponent(finalOrderId)}`,
      failure: `${origin}/finalizar-compra?status=rejected&order_id=${encodeURIComponent(finalOrderId)}`,
      pending: `${origin}/finalizar-compra?status=pending&order_id=${encodeURIComponent(finalOrderId)}`,
    },
    auto_return: 'approved',
  };

  try {
    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencePayload),
    });

    const data = await res.json();
    if (res.ok && data.init_point) {
      return {
        id: data.id,
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point,
      };
    }
    return {
      id: '',
      init_point: '',
      error: data.message || 'Erro ao criar preferência.',
    };
  } catch (err: any) {
    return {
      id: '',
      init_point: '',
      error: err.message || 'Erro de conexão.',
    };
  }
}

/**
 * Cria um Pagamento Pix Direto via Mercado Pago API (v1/payments)
 */
export async function createMercadoPagoPixPayment(
  options: PixPaymentOptions
): Promise<PixPaymentResponse> {
  const { amount, customerName, customerEmail, customerCpf, storeConfig, customAccessToken } = options;

  const accessToken = (customAccessToken || getMercadoPagoAccessToken(storeConfig)).trim();
  const numericAmount = Number(parseFloat(String(amount)).toFixed(2));
  const emailCliente = String(customerEmail || '').trim().toLowerCase();
  const cleanCpf = String(customerCpf || '').replace(/\D/g, '');
  const trimmedName = String(customerName || 'Cliente').trim();
  const firstName = trimmedName.split(' ')[0] || 'Cliente';
  const lastName = trimmedName.split(' ').slice(1).join(' ') || 'Comprador';

  // 1. Tentar primeiro via Endpoint Serverless da Vercel (/api/create-pix-payment)
  try {
    const serverlessRes = await fetch('/api/create-pix-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: numericAmount,
        transaction_amount: numericAmount,
        description: 'Pedido Soumbolinho',
        customer_name: customerName,
        customer_email: emailCliente,
        customer_cpf: cleanCpf,
        access_token: accessToken || undefined,
      }),
    });

    const data = await serverlessRes.json();

    if (serverlessRes.ok && data.success && data.qr_code) {
      console.log('[Mercado Pago Pix] ✅ Pix gerado via Serverless Function com CPF:', data);
      const rawBase64 = data.qr_code_base64 || '';
      const qrCodeImg = data.qr_code_image || (rawBase64 ? `data:image/png;base64,${rawBase64}` : '');

      return {
        success: true,
        paymentId: String(data.id || ''),
        qrCode: data.qr_code,
        qrCodeBase64: rawBase64,
        qrCodeImage: qrCodeImg,
        ticketUrl: data.ticket_url,
      };
    } else if (!serverlessRes.ok) {
      console.warn('[Mercado Pago Pix] ⚠️ Resposta com erro da Serverless Function:', data);
      throw new Error(data.error || data.message || 'Erro ao gerar Pix no Mercado Pago.');
    }
  } catch (serverlessErr: any) {
    if (serverlessErr.message && !serverlessErr.message.includes('Failed to fetch')) {
      throw serverlessErr;
    }
    console.warn('[Mercado Pago Pix] Tentando chamada direta para api.mercadopago.com/v1/payments...');
  }

  // 2. Chamada direta de fallback para https://api.mercadopago.com/v1/payments
  if (!accessToken) {
    throw new Error('Access Token do Mercado Pago não configurado na Vercel.');
  }

  const payerObj: any = {
    email: 'cobranca@soumbolinho.com.br',
    first_name: firstName,
    last_name: lastName,
  };

  if (cleanCpf && cleanCpf.length === 11) {
    payerObj.identification = {
      type: 'CPF',
      number: cleanCpf,
    };
  }

  const pixPayload = {
    transaction_amount: numericAmount,
    description: 'Pedido Soumbolinho',
    payment_method_id: 'pix',
    binary_mode: true,
    payer: payerObj,
  };

  const idempotencyKey = `${Date.now()}-${Math.random()}`;

  console.log('[Mercado Pago Pix] 🚀 Enviando para https://api.mercadopago.com/v1/payments:', pixPayload);

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(pixPayload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[Mercado Pago Pix] ❌ Erro retornado pela API do Mercado Pago:', data);

    let detailedCause = '';
    if (Array.isArray(data.cause) && data.cause.length > 0) {
      detailedCause = data.cause.map((c: any) => `${c.code || ''}: ${c.description || JSON.stringify(c)}`).join('; ');
    } else if (data.cause) {
      detailedCause = typeof data.cause === 'object' ? JSON.stringify(data.cause) : String(data.cause);
    }

    const errorMsg = data.message || 'Erro ao gerar pagamento Pix no Mercado Pago.';
    const fullErrorMessage = detailedCause ? `${errorMsg} (Causa: ${detailedCause})` : errorMsg;

    throw new Error(fullErrorMessage);
  }

  const transactionData = data.point_of_interaction?.transaction_data;
  const qrCode = transactionData?.qr_code || '';
  const rawBase64 = transactionData?.qr_code_base64 || '';
  const qrCodeImg = rawBase64 ? `data:image/png;base64,${rawBase64}` : '';

  return {
    success: true,
    paymentId: String(data.id || ''),
    qrCode,
    qrCodeBase64: rawBase64,
    qrCodeImage: qrCodeImg,
    ticketUrl: transactionData?.ticket_url,
  };
}

/**
 * Consulta o status atualizado do pagamento no Mercado Pago (GET /v1/payments/{id})
 */
export async function checkMercadoPagoPaymentStatus(
  paymentId: string | number,
  storeConfig?: Partial<StoreConfig>
): Promise<{ success: boolean; status?: string; statusDetail?: string; error?: string }> {
  const cleanId = String(paymentId).replace(/\D/g, '');
  if (!cleanId) {
    console.warn('[Pix Polling] ⚠️ ID de pagamento inválido:', paymentId);
    return { success: false, error: 'ID inválido' };
  }

  const accessToken = getMercadoPagoAccessToken(storeConfig);
  console.log(`[Pix Polling] 🔍 Consultando status do pagamento #${cleanId}...`);

  // 1. Tentar primeiro via Endpoint Serverless /api/check-payment
  try {
    const res = await fetch(`/api/check-payment?id=${cleanId}`, {
      method: 'GET',
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`[Pix Polling] 📡 Resposta de /api/check-payment para #${cleanId}: status = '${data.status}'`);
      return {
        success: true,
        status: data.status,
        statusDetail: data.status_detail,
      };
    } else {
      console.warn(`[Pix Polling] ⚠️ /api/check-payment retornou HTTP ${res.status}`);
    }
  } catch (e: any) {
    console.warn('[Pix Polling] ⚠️ Erro ao chamar /api/check-payment:', e.message);
  }

  // 2. Fallback via /api/check-payment-status
  try {
    const res2 = await fetch(`/api/check-payment-status?id=${cleanId}`, {
      method: 'GET',
    });

    if (res2.ok) {
      const data2 = await res2.json();
      console.log(`[Pix Polling] 📡 Resposta de /api/check-payment-status para #${cleanId}: status = '${data2.status}'`);
      return {
        success: true,
        status: data2.status,
        statusDetail: data2.status_detail,
      };
    }
  } catch (e: any) {
    console.warn('[Pix Polling] ⚠️ Erro ao chamar /api/check-payment-status:', e.message);
  }

  // 3. Fallback chamada direta para a API do Mercado Pago
  if (accessToken) {
    try {
      console.log(`[Pix Polling] 🌐 Tentando chamada direta para api.mercadopago.com/v1/payments/${cleanId}...`);
      const directRes = await fetch(`https://api.mercadopago.com/v1/payments/${cleanId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (directRes.ok) {
        const data = await directRes.json();
        console.log(`[Pix Polling] 📡 Chamada direta MP retornou status = '${data.status}'`);
        return {
          success: true,
          status: data.status,
          statusDetail: data.status_detail,
        };
      }
    } catch (e: any) {
      console.warn('[Pix Polling] ❌ Erro na chamada direta ao MP:', e.message);
      return { success: false, error: e.message };
    }
  }

  return { success: false, error: 'Não foi possível verificar status' };
}

export interface CardPaymentOptions {
  amount: number;
  cardNumber: string;
  cardholderName: string;
  expirationMonth: string | number;
  expirationYear: string | number;
  securityCode: string;
  installments?: number;
  paymentMethodId?: string;
  customerCpf?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  orderId?: string;
  storeConfig?: Partial<StoreConfig>;
  customAccessToken?: string;
}

export interface CardPaymentResponse {
  success: boolean;
  paymentId?: string;
  status?: string;
  statusDetail?: string;
  friendlyMessage?: string;
  error?: string;
}

/**
 * Processa pagamento com Cartão de Crédito Transparente (Serverless + Fallback Direto)
 */
export async function createMercadoPagoCardPayment(
  options: CardPaymentOptions
): Promise<CardPaymentResponse> {
  const {
    amount,
    cardNumber,
    cardholderName,
    expirationMonth,
    expirationYear,
    securityCode,
    installments = 1,
    paymentMethodId,
    customerCpf,
    customerName,
    customerEmail,
    customerPhone,
    description,
    orderId,
    storeConfig,
    customAccessToken,
  } = options;

  const accessToken = (customAccessToken || getMercadoPagoAccessToken(storeConfig)).trim();

  // 1. Tentar primeiro via Endpoint Serverless /api/create-card-payment
  try {
    const res = await fetch('/api/create-card-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        card_number: cardNumber,
        cardholder_name: cardholderName,
        expiration_month: expirationMonth,
        expiration_year: expirationYear,
        security_code: securityCode,
        installments,
        payment_method_id: paymentMethodId,
        customer_cpf: customerCpf,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        description,
        order_id: orderId,
        access_token: accessToken || undefined,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        paymentId: String(data.id || ''),
        status: data.status,
        statusDetail: data.status_detail,
        friendlyMessage: data.friendly_message,
      };
    } else {
      return {
        success: false,
        paymentId: data.id ? String(data.id) : undefined,
        status: data.status,
        statusDetail: data.status_detail,
        error: data.friendly_message || data.error || data.message || 'Erro ao processar cartão de crédito.',
      };
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('Failed to fetch')) {
      return { success: false, error: err.message };
    }
  }

  // 2. Fallback direto se serverless falhar
  if (!accessToken) {
    return { success: false, error: 'Access Token do Mercado Pago não configurado.' };
  }

  try {
    const cleanCard = cardNumber.replace(/\D/g, '');
    const cleanCpf = (customerCpf || '').replace(/\D/g, '');
    let fullYear = parseInt(String(expirationYear), 10);
    if (fullYear < 100) fullYear += 2000;

    const tokenRes = await fetch('https://api.mercadopago.com/v1/card_tokens', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        card_number: cleanCard,
        cardholder: {
          name: cardholderName || customerName || 'Comprador',
          identification: cleanCpf ? { type: 'CPF', number: cleanCpf } : undefined,
        },
        security_code: securityCode.replace(/\D/g, ''),
        expiration_month: parseInt(String(expirationMonth), 10),
        expiration_year: fullYear,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.id) {
      return {
        success: false,
        error: tokenData.message || 'Não foi possível validar os dados do cartão.',
      };
    }

    let brand = paymentMethodId;
    if (!brand) {
      if (cleanCard.startsWith('4')) brand = 'visa';
      else if (/^5[1-5]/.test(cleanCard) || /^2[2-7]/.test(cleanCard)) brand = 'master';
      else if (/^(4011|4312|4389|4514|4576|5041|5066|5067|5090|6277|6362|6363|650|6516|6550)/.test(cleanCard)) brand = 'elo';
      else if (/^3[47]/.test(cleanCard)) brand = 'amex';
      else if (/^6062/.test(cleanCard)) brand = 'hipercard';
      else brand = 'master';
    }

    const payRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${Date.now()}-${Math.random()}`,
      },
      body: JSON.stringify({
        transaction_amount: Number(parseFloat(String(amount)).toFixed(2)),
        token: tokenData.id,
        description: description || 'Pedido Soumbolinho',
        installments: installments || 1,
        payment_method_id: brand,
        binary_mode: true,
        payer: {
          email: customerEmail || 'comprador@soumbolinho.com.br',
          identification: cleanCpf ? { type: 'CPF', number: cleanCpf } : undefined,
        },
        external_reference: orderId,
      }),
    });

    const payData = await payRes.json();
    if (payRes.ok && (payData.status === 'approved' || payData.status === 'in_process')) {
      return {
        success: true,
        paymentId: String(payData.id || ''),
        status: payData.status,
        statusDetail: payData.status_detail,
      };
    } else {
      return {
        success: false,
        status: payData.status,
        error: payData.message || 'Pagamento recusado pela operadora do cartão.',
      };
    }
  } catch (directErr: any) {
    return {
      success: false,
      error: directErr.message || 'Erro ao comunicar com o Mercado Pago.',
    };
  }
}
