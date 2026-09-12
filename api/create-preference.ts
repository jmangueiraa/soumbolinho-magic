import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Use POST.' });
  }

  try {
    const {
      items = [],
      customer_name = 'Cliente',
      customer_email = '',
      customer_phone = '',
      order_id = '',
      store_id = '',
      back_url_origin = '',
      access_token: clientAccessToken,
    } = req.body || {};

    const rawToken =
      clientAccessToken ||
      process.env.MERCADO_PAGO_ACCESS_TOKEN ||
      process.env.VITE_MERCADO_PAGO_ACCESS_TOKEN ||
      '';
    const accessToken = String(rawToken).replace(/['";\s]/g, '').trim();

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          'Access Token do Mercado Pago não encontrado. Configure no painel administrativo da loja ou nas variáveis de ambiente da Vercel.',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'O carrinho deve conter pelo menos 1 item para checkout.',
      });
    }

    // Processamento do nome e telefone do comprador
    const trimmedName = String(customer_name || 'Cliente').trim();
    const nameParts = trimmedName.split(' ');
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Comprador';

    const cleanPhone = String(customer_phone || '').replace(/\D/g, '');
    const areaCode = cleanPhone.length >= 10 ? cleanPhone.slice(0, 2) : '11';
    const phoneNumber = cleanPhone.length >= 10 ? cleanPhone.slice(2) : cleanPhone;

    // Resolução da URL base da loja para os retornos
    const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || '';
    const protoHeader = req.headers['x-forwarded-proto'] || 'https';
    const detectedOrigin = hostHeader ? `${protoHeader}://${hostHeader}` : '';
    const origin = (back_url_origin || detectedOrigin || 'https://editaveisdocanva.com.br').replace(/\/$/, '');

    // Formatação dos itens para o Mercado Pago
    const formattedItems = items.map((item: any) => {
      const rawPrice = item.customPrice !== undefined ? item.customPrice : (item.product?.price !== undefined ? item.product.price : (item.unit_price || item.price || 0));
      const unitPrice = Number(parseFloat(String(rawPrice)).toFixed(2)) || 1.0;
      const baseTitle = String(item.product?.name || item.title || item.name || 'Produto Digital').trim();
      const title = item.observations ? `${baseTitle} (${item.observations})` : baseTitle;
      const qty = Math.max(1, parseInt(String(item.quantity || 1), 10));

      return {
        title: title.slice(0, 250),
        unit_price: unitPrice,
        quantity: qty,
        currency_id: 'BRL',
      };
    });

    const preferencePayload = {
      items: formattedItems,
      payer: {
        name: firstName,
        surname: lastName,
        email: customer_email ? String(customer_email).trim() : 'comprador@soumbolinho.com.br',
        phone: cleanPhone
          ? {
              area_code: areaCode,
              number: phoneNumber,
            }
          : undefined,
      },
      external_reference: order_id || `order_${Date.now()}`,
      metadata: {
        order_id: order_id,
        customer_name: trimmedName,
        customer_email: customer_email,
        customer_phone: customer_phone,
        store_id: store_id,
      },
      back_urls: {
        success: `${origin}/finalizar-compra?status=approved&order_id=${encodeURIComponent(order_id)}`,
        failure: `${origin}/finalizar-compra?status=rejected&order_id=${encodeURIComponent(order_id)}`,
        pending: `${origin}/finalizar-compra?status=pending&order_id=${encodeURIComponent(order_id)}`,
      },
      auto_return: 'approved',
      statement_descriptor: 'SOUMBOLINHO',
    };

    console.log('[api/create-preference] 🚀 Enviando preferência para o Mercado Pago:', {
      order_id,
      customer_name: trimmedName,
      customer_email,
      itemsCount: formattedItems.length,
    });

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencePayload),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error('[api/create-preference] ❌ Erro retornado pela API do Mercado Pago:', mpData);
      return res.status(mpRes.status || 400).json({
        success: false,
        error: mpData.message || 'Erro ao gerar preferência no Mercado Pago.',
        details: mpData,
      });
    }

    console.log('[api/create-preference] ✅ Preferência Checkout Pro gerada com sucesso:', {
      id: mpData.id,
      init_point: mpData.init_point,
    });

    return res.status(200).json({
      success: true,
      id: mpData.id,
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
    });
  } catch (error: any) {
    console.error('[api/create-preference] ❌ Exceção:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno ao processar preferência de checkout.',
    });
  }
}
