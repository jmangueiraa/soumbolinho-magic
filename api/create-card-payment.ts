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
      card_number,
      cardholder_name,
      expiration_month,
      expiration_year,
      security_code,
      installments = 1,
      payment_method_id,
      customer_cpf,
      cpf,
      customer_name = 'Cliente',
      customer_email,
      customer_phone,
      description = 'Pedido Soumbolinho',
      order_id,
      access_token: clientAccessToken,
    } = req.body || {};

    const rawToken =
      clientAccessToken ||
      process.env.MERCADO_PAGO_ACCESS_TOKEN ||
      process.env.VITE_MERCADO_PAGO_ACCESS_TOKEN ||
      '';
    const accessToken = rawToken.replace(/['";\s]/g, '').trim();

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access Token do Mercado Pago não configurado nas variáveis de ambiente.',
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

    const cleanCardNumber = String(card_number || '').replace(/\D/g, '');
    if (!cleanCardNumber || cleanCardNumber.length < 13) {
      return res.status(400).json({
        success: false,
        error: 'Número de cartão inválido.',
      });
    }

    const cleanSecurityCode = String(security_code || '').replace(/\D/g, '');
    if (!cleanSecurityCode || cleanSecurityCode.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Código de segurança (CVV) inválido.',
      });
    }

    const month = parseInt(String(expiration_month || ''), 10);
    let year = parseInt(String(expiration_year || ''), 10);
    if (year < 100) year += 2000;

    if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || year < 2024) {
      return res.status(400).json({
        success: false,
        error: 'Data de validade do cartão inválida.',
      });
    }

    const cleanCpf = String(customer_cpf || cpf || '').replace(/\D/g, '');
    const cleanHolderName = String(cardholder_name || customer_name || 'Comprador').trim();
    const cleanEmail = String(customer_email || 'comprador@soumbolinho.com.br').trim().toLowerCase();

    // 1. Criar Card Token na API do Mercado Pago
    console.log('[Mercado Pago Card] 💳 Tokenizando cartão via /v1/card_tokens...');
    const cardTokenPayload = {
      card_number: cleanCardNumber,
      cardholder: {
        name: cleanHolderName,
        identification: cleanCpf
          ? {
              type: 'CPF',
              number: cleanCpf,
            }
          : undefined,
      },
      security_code: cleanSecurityCode,
      expiration_month: month,
      expiration_year: year,
    };

    const tokenRes = await fetch('https://api.mercadopago.com/v1/card_tokens', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cardTokenPayload),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.id) {
      console.error('[Mercado Pago Card] ❌ Erro ao tokenizar cartão:', tokenData);
      let errorMsg = tokenData.message || 'Dados do cartão recusados pelo Mercado Pago.';
      if (Array.isArray(tokenData.cause) && tokenData.cause.length > 0) {
        errorMsg += ` (${tokenData.cause.map((c: any) => c.description || c.code).join(', ')})`;
      }
      return res.status(400).json({
        success: false,
        error: errorMsg,
      });
    }

    const cardTokenId = tokenData.id;
    console.log('[Mercado Pago Card] ✅ Card Token gerado:', cardTokenId);

    // Determinar Bandeira (payment_method_id)
    let brand = payment_method_id;
    if (!brand) {
      if (cleanCardNumber.startsWith('4')) brand = 'visa';
      else if (/^5[1-5]/.test(cleanCardNumber) || /^2[2-7]/.test(cleanCardNumber)) brand = 'master';
      else if (/^(4011|4312|4389|4514|4576|5041|5066|5067|5090|6277|6362|6363|650|6516|6550)/.test(cleanCardNumber)) brand = 'elo';
      else if (/^3[47]/.test(cleanCardNumber)) brand = 'amex';
      else if (/^6062/.test(cleanCardNumber)) brand = 'hipercard';
      else brand = 'master';
    }

    const trimmedName = String(customer_name || cleanHolderName).trim();
    const nameParts = trimmedName.split(' ');
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Comprador';

    // 2. Criar Pagamento de Cartão
    const paymentPayload = {
      transaction_amount: numericAmount,
      token: cardTokenId,
      description: description.slice(0, 250),
      installments: Math.max(1, parseInt(String(installments), 10) || 1),
      payment_method_id: brand,
      binary_mode: true,
      payer: {
        email: cleanEmail,
        first_name: firstName,
        last_name: lastName,
        identification: cleanCpf
          ? {
              type: 'CPF',
              number: cleanCpf,
            }
          : undefined,
      },
      external_reference: order_id || `order_${Date.now()}`,
      metadata: {
        order_id: order_id,
        customer_name: cleanHolderName,
        customer_email: cleanEmail,
        customer_phone: customer_phone,
      },
    };

    const idempotencyKey = `${Date.now()}-${Math.random()}`;

    console.log('[Mercado Pago Card] 🚀 Enviando cobrança de cartão:', {
      amount: numericAmount,
      brand,
      installments: paymentPayload.installments,
    });

    const paymentRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentPayload),
    });

    const paymentData = await paymentRes.json();

    if (!paymentRes.ok) {
      console.error('[Mercado Pago Card] ❌ Erro retornado no pagamento:', paymentData);
      let errorMsg = paymentData.message || 'Erro ao processar pagamento com cartão.';
      if (Array.isArray(paymentData.cause) && paymentData.cause.length > 0) {
        errorMsg = paymentData.cause.map((c: any) => c.description || c.code).join('; ');
      }
      return res.status(paymentRes.status).json({
        success: false,
        status: paymentData.status || 'rejected',
        error: errorMsg,
      });
    }

    console.log(`[Mercado Pago Card] ✅ Cobrança concluída! Status: ${paymentData.status} (ID: ${paymentData.id})`);

    // Tradução de detalhes de rejeição comuns para mensagens amigáveis
    const detailMessages: Record<string, string> = {
      cc_rejected_bad_filled_card_number: 'Número do cartão inválido.',
      cc_rejected_bad_filled_date: 'Data de validade incorreta.',
      cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) incorreto.',
      cc_rejected_bad_filled_other: 'Dados do cartão incorretos.',
      cc_rejected_insufficient_amount: 'Saldo insuficiente no cartão.',
      cc_rejected_call_for_authorize: 'Pagamento não autorizado pelo emissor. Entre em contato com seu banco.',
      cc_rejected_card_disabled: 'O cartão está bloqueado pelo banco emissor.',
      cc_rejected_duplicated_payment: 'Pagamento duplicado recentemente.',
      cc_rejected_high_risk: 'Transação recusada por análise de segurança do cartão.',
      cc_rejected_max_attempts: 'Limite de tentativas excedido para este cartão.',
    };

    const isApproved = paymentData.status === 'approved';
    const isPending = paymentData.status === 'in_process' || paymentData.status === 'pending';

    return res.status(200).json({
      success: isApproved || isPending,
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      friendly_message: detailMessages[paymentData.status_detail] || paymentData.status_detail,
      payment_method_id: paymentData.payment_method_id,
    });
  } catch (err: any) {
    console.error('[Mercado Pago Card] ❌ Exceção:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro interno ao processar cartão de crédito.',
    });
  }
}
