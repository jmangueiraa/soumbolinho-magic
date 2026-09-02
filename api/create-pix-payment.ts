import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Idempotency-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Use POST.' });
  }

  try {
    const {
      amount,
      transaction_amount,
      description = 'Pedido Revistinhas Lucrativas',
      customer_name = 'Cliente',
      customer_email,
      access_token: clientAccessToken,
    } = req.body || {};

    const rawToken = clientAccessToken || process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.VITE_MERCADO_PAGO_ACCESS_TOKEN || '';
    const accessToken = rawToken.replace(/['";\s]/g, '').trim();

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access Token do Mercado Pago não configurado. Configure nas variáveis de ambiente da Vercel (MERCADO_PAGO_ACCESS_TOKEN).',
      });
    }

    const value = amount !== undefined ? amount : transaction_amount;
    const numericAmount = Number(parseFloat(String(value)).toFixed(2));
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'O valor da transação deve ser maior que zero.',
      });
    }

    if (!customer_email) {
      return res.status(400).json({
        success: false,
        error: 'O e-mail do comprador (customer_email) é obrigatório.',
      });
    }

    const trimmedName = String(customer_name).trim();
    const firstName = trimmedName.split(' ')[0] || 'Cliente';
    const lastName = trimmedName.split(' ').slice(1).join(' ') || 'Consumidor';

    // 1. Corpo rigoroso solicitado
    const pixPayload = {
      transaction_amount: Number(numericAmount),
      description: 'Pedido Revistinhas Lucrativas',
      payment_method_id: 'pix',
      payer: {
        email: String(customer_email).trim().toLowerCase(),
        first_name: firstName,
        last_name: lastName,
      },
    };

    // 2. Cabeçalho de Idempotência
    const idempotencyKey = `${Date.now()}-${Math.random()}`;

    console.log('[Mercado Pago v1/payments] 🚀 Enviando requisição Pix:', JSON.stringify(pixPayload));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(pixPayload),
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('[Mercado Pago v1/payments] ❌ Erro retornado pela API:', data);
      
      let detailedCause = '';
      if (Array.isArray(data.cause) && data.cause.length > 0) {
        detailedCause = data.cause.map((c: any) => `${c.code || ''}: ${c.description || JSON.stringify(c)}`).join('; ');
      } else if (data.cause) {
        detailedCause = typeof data.cause === 'object' ? JSON.stringify(data.cause) : String(data.cause);
      }

      const errorMessage = data.message || 'Erro ao gerar pagamento Pix no Mercado Pago.';
      const fullError = detailedCause ? `${errorMessage} (Detalhes: ${detailedCause})` : errorMessage;

      return res.status(mpResponse.status).json({
        success: false,
        status: mpResponse.status,
        message: data.message,
        cause: data.cause,
        error: fullError,
      });
    }

    // 3. Extração correta do QR Code e Copia e Cola
    const transactionData = data.point_of_interaction?.transaction_data;
    const qrCode = transactionData?.qr_code || '';
    const rawQrCodeBase64 = transactionData?.qr_code_base64 || '';
    const qrCodeImage = rawQrCodeBase64 ? `data:image/png;base64,${rawQrCodeBase64}` : '';

    console.log('[Mercado Pago v1/payments] ✅ Pix gerado com sucesso! ID:', data.id);

    return res.status(200).json({
      success: true,
      id: data.id,
      status: data.status,
      status_detail: data.status_detail,
      qr_code: qrCode,
      qr_code_base64: rawQrCodeBase64,
      qr_code_image: qrCodeImage,
      ticket_url: transactionData?.ticket_url || '',
    });
  } catch (err: any) {
    console.error('[Mercado Pago v1/payments] ❌ Exceção:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro interno ao comunicar com o Mercado Pago.',
    });
  }
}
