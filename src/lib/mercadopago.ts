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

/**
 * Verifica se o Mercado Pago está configurado no painel admin ou variáveis de ambiente
 */
export function isMercadoPagoConfigured(storeConfig?: Partial<StoreConfig>): boolean {
  const token = 
    localStorage.getItem('encantando_festa_mp_access_token') ||
    storeConfig?.mpAccessToken ||
    import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN ||
    '';
  return Boolean(token && token.trim().length > 10);
}

/**
 * Cria uma preferência de pagamento no Mercado Pago Checkout Pro
 * e retorna a URL de redirecionamento (init_point)
 */
export async function createMercadoPagoPreference(
  options: CreatePreferenceOptions
): Promise<PreferenceResponse> {
  const { items, customerInfo, storeConfig, customAccessToken } = options;

  // 1. Obter Access Token de forma prioritária e segura
  const accessToken = 
    customAccessToken ||
    localStorage.getItem('encantando_festa_mp_access_token') ||
    storeConfig?.mpAccessToken ||
    import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN ||
    '';

  if (!accessToken) {
    console.warn('[Mercado Pago] ⚠️ Access Token não configurado.');
    throw new Error('NO_TOKEN');
  }

  // 2. Formatar os itens do carrinho para a API do Mercado Pago
  const preferenceItems = items.map((item) => {
    const rawImg = (
      item.product.imageUrl ||
      item.product.image ||
      item.product.image_url ||
      item.product.photo_url ||
      ''
    ).trim();

    const titleWithNotes = item.observations
      ? `${item.product.name} (Obs: ${item.observations.slice(0, 50)})`
      : item.product.name;

    return {
      id: item.product.id,
      title: titleWithNotes.slice(0, 120),
      description: (item.product.description || item.product.name).slice(0, 200),
      picture_url: rawImg.startsWith('http') ? rawImg : undefined,
      category_id: 'art_crafts',
      quantity: item.quantity,
      currency_id: 'BRL',
      unit_price: Number(item.product.price),
    };
  });

  // 3. URLs de retorno pós-pagamento
  const currentOrigin = window.location.origin + window.location.pathname;
  const backUrls = {
    success: `${currentOrigin}?payment_status=success`,
    pending: `${currentOrigin}?payment_status=pending`,
    failure: `${currentOrigin}?payment_status=failure`,
  };

  // 4. Montar o payload da preferência
  const preferencePayload: any = {
    items: preferenceItems,
    back_urls: backUrls,
    auto_return: 'approved',
    statement_descriptor: (storeConfig?.storeName || 'ENCANTANDOFESTA').slice(0, 16),
    external_reference: `PEDIDO_${Date.now()}`,
    payment_methods: {
      excluded_payment_types: [],
      default_payment_method_id: 'pix',
      installments: 12,
    },
  };

  // Se houver dados do cliente, adiciona o payer
  if (customerInfo && customerInfo.name) {
    const nameParts = customerInfo.name.trim().split(' ');
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Festa';
    const cleanPhone = customerInfo.phone ? customerInfo.phone.replace(/\D/g, '') : '';

    preferencePayload.payer = {
      name: firstName,
      surname: lastName,
      email: customerInfo.email?.trim() || `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}_cliente@encantandofesta.com`,
      phone: cleanPhone
        ? {
            area_code: cleanPhone.slice(0, 2),
            number: cleanPhone.slice(2),
          }
        : undefined,
      address: customerInfo.address
        ? {
            street_name: customerInfo.address,
            zip_code: '20000000',
          }
        : undefined,
    };
  }

  console.log('[Mercado Pago] 🚀 Enviando preferência para a API:', preferencePayload);

  // 5. Enviar requisição para a API do Mercado Pago
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
    console.error('[Mercado Pago] ❌ Erro retornado pela API do Mercado Pago:', data);
    throw new Error(data.message || 'Falha ao gerar link de pagamento no Mercado Pago.');
  }

  console.log('[Mercado Pago] ✅ Preferência criada com sucesso:', {
    id: data.id,
    init_point: data.init_point,
    sandbox_init_point: data.sandbox_init_point,
  });

  return {
    id: data.id,
    init_point: data.init_point,
    sandbox_init_point: data.sandbox_init_point,
  };
}
