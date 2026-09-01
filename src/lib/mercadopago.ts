import { CartItem, OrderCustomerInfo, StoreConfig } from '../types';

export interface CreatePreferenceOptions {
  items: CartItem[];
  customerInfo?: Partial<OrderCustomerInfo>;
  storeConfig?: Partial<StoreConfig>;
  customAccessToken?: string;
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
  description?: string;
  storeConfig?: Partial<StoreConfig>;
  customAccessToken?: string;
}

export interface PixPaymentResponse {
  success: boolean;
  paymentId?: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl?: string;
  error?: string;
}

/**
 * Obtém o Access Token do Mercado Pago de forma centralizada
 */
export function getMercadoPagoAccessToken(storeConfig?: Partial<StoreConfig>): string {
  return (
    localStorage.getItem('encantando_festa_mp_access_token') ||
    storeConfig?.mpAccessToken ||
    (import.meta as any).env?.VITE_MERCADO_PAGO_ACCESS_TOKEN ||
    ''
  ).trim();
}

/**
 * Verifica se o Mercado Pago está configurado
 */
export function isMercadoPagoConfigured(storeConfig?: Partial<StoreConfig>): boolean {
  const token = getMercadoPagoAccessToken(storeConfig);
  return Boolean(token && token.length > 10);
}

/**
 * 1. Cria um Pagamento Pix Direto via Mercado Pago API (v1/payments)
 */
export async function createMercadoPagoPixPayment(
  options: PixPaymentOptions
): Promise<PixPaymentResponse> {
  const { amount, customerName, customerEmail, description, storeConfig, customAccessToken } = options;

  const accessToken = (customAccessToken || getMercadoPagoAccessToken(storeConfig)).trim();
  const numericAmount = Number(parseFloat(String(amount)).toFixed(2));
  const emailCliente = String(customerEmail || '').trim().toLowerCase();
  const nameParts = String(customerName || 'Cliente').trim().split(' ');
  const firstName = nameParts[0] || 'Cliente';
  const lastName = nameParts.slice(1).join(' ') || 'Cliente';
  const desc = description || 'Pedido Revistinhas Lucrativas';

  // 1. Tentar primeiro via Endpoint da Vercel (evita bloqueios de CORS do navegador)
  try {
    const serverlessRes = await fetch('/api/create-pix-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_amount: numericAmount,
        description: desc,
        customer_name: customerName,
        customer_email: emailCliente,
        access_token: accessToken || undefined,
      }),
    });

    if (serverlessRes.ok) {
      const data = await serverlessRes.json();
      if (data.success && (data.qr_code || data.qr_code_base64)) {
        console.log('[Mercado Pago Pix] ✅ Pix gerado via Serverless Function:', data);
        return {
          success: true,
          paymentId: String(data.id || ''),
          qrCode: data.qr_code,
          qrCodeBase64: data.qr_code_base64,
          ticketUrl: data.ticket_url,
        };
      }
    } else {
      const errData = await serverlessRes.json().catch(() => ({}));
      console.warn('[Mercado Pago Pix] ⚠️ Erro na Serverless Function:', errData);
      if (errData.error || errData.message) {
        throw new Error(errData.error || errData.message);
      }
    }
  } catch (serverlessErr: any) {
    if (serverlessErr.message && !serverlessErr.message.includes('Failed to fetch')) {
      throw serverlessErr;
    }
    console.warn('[Mercado Pago Pix] Tentando chamada direta de fallback para api.mercadopago.com...');
  }

  // 2. Chamada direta de fallback para https://api.mercadopago.com/v1/payments
  if (!accessToken) {
    throw new Error('Access Token do Mercado Pago não configurado. Adicione o token no painel admin ou nas variáveis de ambiente da Vercel.');
  }

  const pixPayload = {
    transaction_amount: numericAmount,
    description: desc,
    payment_method_id: 'pix',
    payer: {
      email: emailCliente,
      first_name: firstName,
      last_name: lastName,
    },
  };

  const idempotencyKey = `pix-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  console.log('[Mercado Pago Pix] 🚀 Enviando para https://api.mercadopago.com/v1/payments:', pixPayload);

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Idempotency-Key': idempotencyKey,
      'Content-Type': 'application/json',
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
  const qrCodeBase64 = transactionData?.qr_code_base64 || '';

  return {
    success: true,
    paymentId: String(data.id || ''),
    qrCode,
    qrCodeBase64,
    ticketUrl: transactionData?.ticket_url,
  };
}

/**
 * 2. Cria uma preferência de pagamento no Mercado Pago Checkout Pro (se necessário)
 */
export async function createMercadoPagoPreference(
  options: CreatePreferenceOptions
): Promise<PreferenceResponse> {
  const { items, customerInfo, storeConfig, customAccessToken } = options;

  const accessToken = customAccessToken || getMercadoPagoAccessToken(storeConfig);

  if (!accessToken) {
    throw new Error('Access Token do Mercado Pago não configurado.');
  }

  const preferenceItems = items.map((item) => ({
    id: item.product.id,
    title: item.product.name.slice(0, 120),
    description: (item.product.description || item.product.name).slice(0, 200),
    quantity: item.quantity,
    currency_id: 'BRL',
    unit_price: Number(item.product.price),
  }));

  const currentOrigin = window.location.origin + window.location.pathname;
  const backUrls = {
    success: `${currentOrigin}?payment_status=success`,
    pending: `${currentOrigin}?payment_status=pending`,
    failure: `${currentOrigin}?payment_status=failure`,
  };

  const preferencePayload: any = {
    items: preferenceItems,
    back_urls: backUrls,
    auto_return: 'approved',
    statement_descriptor: 'REVISTINHAS',
    external_reference: `PEDIDO_${Date.now()}`,
    payment_methods: {
      default_payment_method_id: 'pix',
      installments: 12,
    },
  };

  if (customerInfo && customerInfo.name) {
    const nameParts = customerInfo.name.trim().split(' ');
    preferencePayload.payer = {
      name: nameParts[0] || 'Cliente',
      surname: nameParts.slice(1).join(' ') || 'Cliente',
      email: customerInfo.email?.trim().toLowerCase() || 'cliente@revistinhaslucrativas.com.br',
    };
  }

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferencePayload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Falha ao gerar preferência no Mercado Pago.');
  }

  return {
    id: data.id,
    init_point: data.init_point,
    sandbox_init_point: data.sandbox_init_point,
  };
}
