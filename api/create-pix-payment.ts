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
      transaction_amount,
      description = 'Pedido Revistinhas Lucrativas',
      customer_name = 'Cliente',
      customer_email,
      access_token: clientAccessToken,
    } = req.body || {};

    const accessToken = clientAccessToken || process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.VITE_MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access Token do Mercado Pago não configurado. Configure nas variáveis de ambiente da Vercel (MERCADO_PAGO_ACCESS_TOKEN).',
      });
    }

    const numericAmount = Number(parseFloat(String(transaction_amount)).toFixed(2));
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'O valor da transação (transaction_amount) deve ser maior que zero.',
      });
    }

    if (!customer_email) {
      return res.status(400).json({
        success: false,
        error: 'O e-mail do comprador (customer_email) é obrigatório para gerar o Pix.',
      });
    }

    const nameParts = String(customer_name).trim().split(' ');
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Cliente';

    // Payload rigoroso do Mercado Pago Pix
    const pixPayload = {
      transaction_amount: numericAmount,
      description: String(description).slice(0, 100),
      payment_method_id: 'pix',
      payer: {
        email: String(customer_email).trim().toLowerCase(),
        first_name: firstName,
        last_name: lastName,
      },
    };

    const idempotencyKey = `pix-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    console.log('[Mercado Pago API] 🚀 Enviando requisição para https://api.mercadopago.com/v1/payments:', pixPayload);

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'X-Idempotency-Key': idempotencyKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pixPayload),
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('[Mercado Pago API] ❌ Erro retornado pela API do Mercado Pago:', data);
      
      let detailedCause = '';
      if (Array.isArray(data.cause) && data.cause.length > 0) {
        detailedCause = data.cause.map((c: any) => `${c.code || ''}: ${c.description || JSON.stringify(c)}`).join('; ');
      } else if (data.cause) {
        detailedCause = JSON.stringify(data.cause);
      }

      const errorMessage = data.message || 'Erro ao gerar pagamento Pix no Mercado Pago.';
      const fullError = detailedCause ? `${errorMessage} Detalhes: ${detailedCause}` : errorMessage;

      return res.status(mpResponse.status).json({
        success: false,
        status: mpResponse.status,
        message: data.message,
        cause: data.cause,
        error: fullError,
      });
    }

    const transactionData = data.point_of_interaction?.transaction_data;
    const qrCode = transactionData?.qr_code || '';
    const qrCodeBase64 = transactionData?.qr_code_base64 || '';
    const ticketUrl = transactionData?.ticket_url || '';

    console.log('[Mercado Pago API] ✅ Pix gerado com sucesso! Payment ID:', data.id);

    return res.status(200).json({
      success: true,
      id: data.id,
      status: data.status,
      status_detail: data.status_detail,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      ticket_url: ticketUrl,
    });
  } catch (err: any) {
    console.error('[Mercado Pago API] ❌ Exceção ao processar Pix:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro interno ao comunicar com o Mercado Pago.',
    });
  }
}
