import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Use GET.' });
  }

  try {
    const paymentId = req.query.id as string;
    const clientToken = req.headers.authorization?.replace('Bearer ', '') || (req.query.token as string);

    if (!paymentId) {
      return res.status(400).json({ success: false, error: 'ID do pagamento (id) é obrigatório.' });
    }

    const rawToken = clientToken || process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.VITE_MERCADO_PAGO_ACCESS_TOKEN || '';
    const accessToken = rawToken.replace(/['";\s]/g, '').trim();

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access Token do Mercado Pago não configurado na Vercel.',
      });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.warn(`[check-payment-status] ⚠️ Pagamento ${paymentId} não encontrado ou erro:`, data.message);
      return res.status(mpResponse.status).json({
        success: false,
        status: mpResponse.status,
        message: data.message || 'Erro ao consultar status no Mercado Pago.',
      });
    }

    return res.status(200).json({
      success: true,
      id: data.id,
      status: data.status, // 'approved', 'pending', 'in_process', 'rejected', 'cancelled'
      status_detail: data.status_detail,
      date_approved: data.date_approved,
      transaction_amount: data.transaction_amount,
    });
  } catch (err: any) {
    console.error('[check-payment-status] ❌ Exceção:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro interno ao consultar status.',
    });
  }
}
