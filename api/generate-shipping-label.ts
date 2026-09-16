import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Inicializa cliente do Supabase para atualização segura no backend
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mbwxubnwaeywstnmlrqg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1id3h1Ym53YWV5d3N0bm1scnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODAwNDEsImV4cCI6MjEwMzg1NjA0MX0.gGa7ZDgiDuN_NNiNK7i7nHEVtaBQ8nEuOPSz0eIn4D4';
const supabase = createClient(supabaseUrl, supabaseKey);

interface ShippingPerson {
  name: string;
  phone: string;
  email: string;
  document: string;
  address: string;
  complement?: string;
  number: string;
  district: string;
  city: string;
  state_abbr: string;
  postal_code: string;
}

interface GenerateShippingLabelRequest {
  order_id: string;
  store_id?: string;
  melhor_envio_token?: string;
  is_sandbox?: boolean;
  service_id?: number | string;
  agency_id?: number | string;
  from?: ShippingPerson;
  to?: ShippingPerson;
  products?: Array<{
    name: string;
    quantity: number;
    unitary_value: number;
  }>;
  package?: {
    height: number;
    width: number;
    length: number;
    weight: number;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Utilize POST.' });
  }

  try {
    const {
      order_id,
      store_id,
      melhor_envio_token,
      is_sandbox = false,
      service_id,
      agency_id,
      from,
      to,
      products = [],
      package: pkgDimensions,
    }: GenerateShippingLabelRequest = req.body || {};

    if (!order_id) {
      return res.status(400).json({ success: false, error: 'order_id é obrigatório.' });
    }

    const cleanToken = String(melhor_envio_token || process.env.MELHOR_ENVIO_TOKEN || '').trim();
    if (!cleanToken) {
      return res.status(400).json({
        success: false,
        error: 'Token da API do Melhor Envio não informado. Configure seu token na aba "API e Domínio" no painel.',
      });
    }

    const baseUrl = is_sandbox
      ? 'https://sandbox.melhorenvio.com.br/api/v2'
      : 'https://melhorenvio.com.br/api/v2';

    const authHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cleanToken}`,
      'User-Agent': 'AJPSTORE Multi-Tenant Label Generator (contato@ajpstore.com)',
    };

    // 1. Validação de dados do destinatário e remetente
    if (!to || !to.name || !to.postal_code) {
      return res.status(400).json({
        success: false,
        error: 'Dados de entrega incompletos (nome do cliente e CEP são obrigatórios).',
      });
    }

    // Normaliza CEPs
    const cleanFromCep = String(from?.postal_code || '01001000').replace(/\D/g, '');
    const cleanToCep = String(to.postal_code || '').replace(/\D/g, '');
    const cleanToDoc = String(to.document || '00000000000').replace(/\D/g, '');
    const cleanFromDoc = String(from?.document || '00000000000').replace(/\D/g, '');

    // Determina o serviço (1 = PAC Correios, 2 = SEDEX Correios, 3 = Jadlog .Package, 4 = Jadlog .Com)
    let selectedService = 1; // Padrão PAC
    if (service_id) {
      selectedService = Number(service_id) || 1;
    }

    // Pacote padrão
    const height = Math.max(4, Number(pkgDimensions?.height) || 10);
    const width = Math.max(11, Number(pkgDimensions?.width) || 15);
    const length = Math.max(16, Number(pkgDimensions?.length) || 20);
    const weight = Math.max(0.1, Number(pkgDimensions?.weight) || 0.5);

    // Lista de produtos
    const validProducts = (products.length > 0 ? products : [{ name: 'Item do Pedido', quantity: 1, unitary_value: 20.0 }]).map((p) => ({
      name: p.name || 'Produto',
      quantity: Number(p.quantity) || 1,
      unitary_value: Math.max(1, Number(p.unitary_value) || 10),
    }));

    const totalInsuranceValue = validProducts.reduce((sum, p) => sum + (p.unitary_value * p.quantity), 0);

    // =========================================================================
    // ETAPA 1: ADICIONAR FRETE AO CARRINHO DO MELHOR ENVIO (/me/cart)
    // =========================================================================
    console.log('[generate-shipping-label] 1. Adicionando pedido ao carrinho do Melhor Envio...');
    const cartPayload: any = {
      service: selectedService,
      agency: agency_id ? Number(agency_id) : undefined,
      from: {
        name: from?.name || 'Loja Virtual',
        phone: String(from?.phone || '11999999999').replace(/\D/g, ''),
        email: from?.email || 'contato@loja.com',
        document: cleanFromDoc.length === 14 ? cleanFromDoc : (cleanFromDoc || '00000000000'),
        company_document: cleanFromDoc.length === 14 ? cleanFromDoc : undefined,
        address: from?.address || 'Rua da Loja',
        complement: from?.complement || '',
        number: from?.number || '100',
        district: from?.district || 'Centro',
        city: from?.city || 'São Paulo',
        state_abbr: from?.state_abbr || 'SP',
        postal_code: cleanFromCep,
      },
      to: {
        name: to.name,
        phone: String(to.phone || '11999999999').replace(/\D/g, ''),
        email: to.email || 'cliente@exemplo.com',
        document: cleanToDoc || '00000000000',
        address: to.address || 'Rua de Entrega',
        complement: to.complement || '',
        number: to.number || 'S/N',
        district: to.district || 'Bairro',
        city: to.city || 'Cidade',
        state_abbr: to.state_abbr || 'SP',
        postal_code: cleanToCep,
      },
      products: validProducts,
      volumes: [
        {
          height,
          width,
          length,
          weight,
        },
      ],
      options: {
        insurance_value: Math.min(10000, Math.max(20, totalInsuranceValue)),
        receipt: false,
        own_hand: false,
        reverse: false,
        non_commercial: true,
      },
    };

    const cartRes = await fetch(`${baseUrl}/me/cart`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(cartPayload),
    });

    const cartData = await cartRes.json();

    if (!cartRes.ok || !cartData?.id) {
      console.warn('[generate-shipping-label] Erro na criação do carrinho Melhor Envio:', cartData);
      const errMsg = cartData?.message || cartData?.error || 'Não foi possível adicionar o envio ao Melhor Envio.';
      const detailedErrors = cartData?.errors ? Object.values(cartData.errors).flat().join(', ') : '';
      return res.status(cartRes.status || 400).json({
        success: false,
        step: 'cart',
        error: detailedErrors ? `${errMsg}: ${detailedErrors}` : errMsg,
        raw_response: cartData,
      });
    }

    const shippingOrderId = cartData.id;
    console.log('[generate-shipping-label] ✅ Pedido inserido no carrinho com ID:', shippingOrderId);

    // =========================================================================
    // ETAPA 2: COMPRA DO FRETE / CHECKOUT (/me/shipment/checkout)
    // =========================================================================
    console.log('[generate-shipping-label] 2. Efetuando checkout da etiqueta...');
    const checkoutRes = await fetch(`${baseUrl}/me/shipment/checkout`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ orders: [shippingOrderId] }),
    });

    const checkoutData = await checkoutRes.json();

    if (!checkoutRes.ok) {
      console.warn('[generate-shipping-label] Erro no checkout Melhor Envio (provável falta de saldo):', checkoutData);
      const checkoutErr = checkoutData?.message || checkoutData?.error || 'Saldo insuficiente na carteira do Melhor Envio ou erro no checkout.';
      return res.status(200).json({
        success: false,
        step: 'checkout',
        shipping_order_id: shippingOrderId,
        error: `Etiqueta criada no carrinho, porém o checkout falhou: ${checkoutErr}. Verifique se você possui saldo pré-pago no painel do Melhor Envio.`,
        cart_url: 'https://melhorenvio.com.br/painel/carrinho',
      });
    }

    // =========================================================================
    // ETAPA 3: GERAR A ETIQUETA NA TRANSPORTADORA (/me/shipment/generate)
    // =========================================================================
    console.log('[generate-shipping-label] 3. Solicitando geração da etiqueta...');
    await fetch(`${baseUrl}/me/shipment/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ orders: [shippingOrderId] }),
    });

    // Aguarda 1.5s para que o Melhor Envio processe a fila de geração da etiqueta
    await new Promise((r) => setTimeout(r, 1500));

    // =========================================================================
    // ETAPA 4: SOLICITAR LINK PÚBLICO DO PDF DA ETIQUETA (/me/shipment/print)
    // =========================================================================
    console.log('[generate-shipping-label] 4. Obtendo link do PDF da etiqueta...');
    let labelPdfUrl = '';
    const printRes = await fetch(`${baseUrl}/me/shipment/print`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ mode: 'public', orders: [shippingOrderId] }),
    });

    if (printRes.ok) {
      const printData = await printRes.json();
      labelPdfUrl = printData?.url || '';
      console.log('[generate-shipping-label] ✅ URL do PDF obtida:', labelPdfUrl);
    }

    // =========================================================================
    // ETAPA 5: OBTER CÓDIGO DE RASTREAMENTO (/me/shipment/tracking)
    // =========================================================================
    console.log('[generate-shipping-label] 5. Obtendo código de rastreamento...');
    let trackingCode = '';
    const trackRes = await fetch(`${baseUrl}/me/shipment/tracking`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ orders: [shippingOrderId] }),
    });

    if (trackRes.ok) {
      const trackData = await trackRes.json();
      if (trackData && typeof trackData === 'object') {
        const itemTrack = trackData[shippingOrderId] || Object.values(trackData)[0];
        trackingCode = itemTrack?.tracking || itemTrack?.code || '';
      }
    }

    // Se a transportadora ainda não atribuiu o código imediatamente, usa o ID do envio como referência
    if (!trackingCode && cartData.protocol) {
      trackingCode = String(cartData.protocol);
    }

    // =========================================================================
    // ETAPA 6: ATUALIZA O PEDIDO NO SUPABASE
    // =========================================================================
    try {
      const updatePayload: any = {
        shipping_order_id: shippingOrderId,
        status: 'shipped',
        updated_at: new Date().toISOString(),
      };
      if (trackingCode) updatePayload.tracking_code = trackingCode;
      if (labelPdfUrl) updatePayload.shipping_label_url = labelPdfUrl;

      await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', order_id);

      console.log('[generate-shipping-label] ✅ Pedido atualizado no Supabase com sucesso!', order_id);
    } catch (dbErr) {
      console.warn('[generate-shipping-label] Aviso ao gravar atualização no Supabase:', dbErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Etiqueta de envio gerada com sucesso!',
      shipping_order_id: shippingOrderId,
      tracking_code: trackingCode,
      label_url: labelPdfUrl,
      tracking_url: trackingCode ? `https://melhorrastreio.com.br/rastreio/${trackingCode}` : undefined,
    });
  } catch (err: any) {
    console.error('[generate-shipping-label] ❌ Exceção interna no servidor:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro interno ao se comunicar com o Melhor Envio.',
    });
  }
}
