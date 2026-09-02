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
  customerCpf: string;
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

  const pixPayload = {
    transaction_amount: numericAmount,
    description: 'Pedido Soumbolinho',
    payment_method_id: 'pix',
    payer: {
      email: emailCliente,
      first_name: firstName,
      last_name: lastName,
      identification: {
        type: 'CPF',
        number: cleanCpf,
      },
    },
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
  paymentId: string,
  storeConfig?: Partial<StoreConfig>
): Promise<{ success: boolean; status?: string; statusDetail?: string; error?: string }> {
  const cleanId = String(paymentId).replace(/\D/g, '');
  if (!cleanId) return { success: false, error: 'ID inválido' };

  const accessToken = getMercadoPagoAccessToken(storeConfig);

  // 1. Tentar via Serverless Function
  try {
    const res = await fetch(`/api/check-payment-status?id=${cleanId}`, {
      method: 'GET',
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        status: data.status,
        statusDetail: data.status_detail,
      };
    }
  } catch (e) {
    // Fallback para chamada direta
  }

  // 2. Fallback chamada direta
  if (accessToken) {
    try {
      const directRes = await fetch(`https://api.mercadopago.com/v1/payments/${cleanId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (directRes.ok) {
        const data = await directRes.json();
        return {
          success: true,
          status: data.status,
          statusDetail: data.status_detail,
        };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  return { success: false, error: 'Não foi possível verificar status' };
}
