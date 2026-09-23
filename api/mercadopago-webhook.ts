// @ts-nocheck
type VercelRequest = any;
type VercelResponse = any;

/**
 * Helper para formatar o WhatsApp do lojista com link direto wa.me
 */
function formatLojistaWhatsApp(rawPhone: any) {
  const fallback = '19981356505';
  let digits = String(rawPhone || '').replace(/\D/g, '');

  if (!digits) {
    digits = fallback;
  }

  let localNumber = digits;
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    localNumber = digits.slice(2);
  }

  let display = (rawPhone && String(rawPhone).trim()) || '';
  if (!display || display === localNumber || display === digits) {
    if (localNumber.length === 11) {
      display = `(${localNumber.slice(0, 2)}) ${localNumber.slice(2, 7)}-${localNumber.slice(7)}`;
    } else if (localNumber.length === 10) {
      display = `(${localNumber.slice(0, 2)}) ${localNumber.slice(2, 6)}-${localNumber.slice(6)}`;
    } else {
      display = localNumber;
    }
  }

  return {
    display,
    waLink: `https://wa.me/55${localNumber}`
  };
}

function escapeTgMarkdown(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text).replace(/([_*`\[\]])/g, '\\$1');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Mercado Pago pode enviar tanto POST com body quanto GET/POST com query params
  try {
    const body = req.body || {};
    const query = req.query || {};

    let paymentId = 
      body?.data?.id || 
      body?.id || 
      query?.['data.id'] || 
      query?.id;

    const topic = body?.type || body?.topic || query?.type || query?.topic;

    console.log('[mercadopago-webhook] 📩 Webhook recebido:', { paymentId, topic });

    // Se for notificação sem ID de pagamento (ex: merchant_order), responde 200
    if (!paymentId) {
      return res.status(200).json({ received: true, message: 'Nenhum paymentId encontrado no payload.' });
    }

    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://mbwxubnwaeywstnmlrqg.supabase.co').trim();
    const supabaseKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1id3h1Ym53YWV5d3N0bm1scnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODAwNDEsImV4cCI6MjEwMzg1NjA0MX0.gGa7ZDgiDuN_NNiNK7i7nHEVtaBQ8nEuOPSz0eIn4D4').trim();

    const reqHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    };

    // 1. Busca configurações globais (Access Token do MP e Credenciais do Telegram)
    let mpAccessToken = process.env.MP_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
    let telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';
    let telegramChatId = process.env.TELEGRAM_CHAT_ID || '';

    try {
      const gsRes = await fetch(`${supabaseUrl}/rest/v1/global_settings?select=*&limit=1`, { headers: reqHeaders });
      if (gsRes.ok) {
        const gsData = await gsRes.json();
        if (Array.isArray(gsData) && gsData.length > 0) {
          if (!mpAccessToken && gsData[0]?.mp_access_token) mpAccessToken = gsData[0].mp_access_token.trim();
          if (!telegramToken && gsData[0]?.telegram_bot_token) telegramToken = gsData[0].telegram_bot_token.trim();
          if (!telegramChatId && gsData[0]?.telegram_chat_id) telegramChatId = gsData[0].telegram_chat_id.trim();
        }
      }

      if (!mpAccessToken || !telegramToken) {
        const stRes = await fetch(`${supabaseUrl}/rest/v1/stores?or=(is_matriz.eq.true,slug.eq.ajpstore)&select=*&limit=1`, { headers: reqHeaders });
        if (stRes.ok) {
          const stData = await stRes.json();
          if (Array.isArray(stData) && stData.length > 0) {
            if (!mpAccessToken && stData[0]?.mp_access_token) mpAccessToken = stData[0].mp_access_token.trim();
            if (!telegramToken && stData[0]?.telegram_bot_token) telegramToken = stData[0].telegram_bot_token.trim();
            if (!telegramChatId && stData[0]?.telegram_chat_id) telegramChatId = stData[0].telegram_chat_id.trim();
          }
        }
      }
    } catch (confErr) {
      console.warn('[mercadopago-webhook] Aviso ao ler configurações globais:', confErr);
    }

    if (!mpAccessToken) {
      console.warn('[mercadopago-webhook] ⚠️ Access Token do Mercado Pago não encontrado.');
      return res.status(200).json({ received: true, warning: 'Access Token do MP ausente.' });
    }

    // 2. Consulta o pagamento na API do Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!mpRes.ok) {
      console.warn(`[mercadopago-webhook] Erro ao consultar pagamento #${paymentId} no MP.`);
      return res.status(200).json({ received: true, warning: 'Não foi possível consultar pagamento no MP.' });
    }

    const paymentData = await mpRes.json();
    console.log(`[mercadopago-webhook] Status do Pagamento #${paymentId}: ${paymentData.status}`);

    // GATILHO: Apenas age se o pagamento estiver aprovado ('approved')
    if (paymentData.status === 'approved') {
      const externalRef = paymentData.external_reference || '';
      const payerEmail = paymentData.payer?.email || '';
      const description = paymentData.description || '';
      const amount = paymentData.transaction_amount || 0;
      const paymentMethodId = paymentData.payment_method_id || 'Pix';
      const formaFormatada = paymentMethodId.toLowerCase().includes('pix') ? 'Pix' : 'Cartão de Crédito';

      // 3. Localizar a loja associada ao pagamento
      let targetStore = null;

      try {
        if (externalRef) {
          const resExt = await fetch(`${supabaseUrl}/rest/v1/stores?or=(id.eq.${encodeURIComponent(externalRef)},slug.eq.${encodeURIComponent(externalRef)})&select=*&limit=1`, { headers: reqHeaders });
          if (resExt.ok) {
            const list = await resExt.json();
            if (Array.isArray(list) && list.length > 0) targetStore = list[0];
          }
        }

        if (!targetStore && payerEmail) {
          const resEmail = await fetch(`${supabaseUrl}/rest/v1/stores?or=(client_email.eq.${encodeURIComponent(payerEmail)},owner_email.eq.${encodeURIComponent(payerEmail)})&select=*&limit=1`, { headers: reqHeaders });
          if (resEmail.ok) {
            const list = await resEmail.json();
            if (Array.isArray(list) && list.length > 0) targetStore = list[0];
          }
        }
      } catch (stErr) {
        console.warn('[mercadopago-webhook] Erro ao buscar loja para o pagamento:', stErr);
      }

      // 4. AÇÃO: Atualizar a validade da loja na tabela 'stores' (+30 dias)
      let renewedDateStr = '30 dias';
      if (targetStore?.id) {
        try {
          const now = Date.now();
          const currentExp = targetStore.expires_at ? new Date(targetStore.expires_at).getTime() : now;
          const baseTime = currentExp > now ? currentExp : now;
          const newExpiresAt = new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString();
          renewedDateStr = new Date(newExpiresAt).toLocaleDateString('pt-BR');

          await fetch(`${supabaseUrl}/rest/v1/stores?id=eq.${targetStore.id}`, {
            method: 'PATCH',
            headers: reqHeaders,
            body: JSON.stringify({
              expires_at: newExpiresAt,
              subscription_status: 'active',
              updated_at: new Date().toISOString()
            })
          });
          console.log(`[mercadopago-webhook] ✅ Loja ${targetStore.name} renovada até ${renewedDateStr}`);
        } catch (updErr) {
          console.error('[mercadopago-webhook] Erro ao atualizar validade em stores:', updErr);
        }
      }

      // 5. DISPARAR NOTIFICAÇÃO FORMATADA NO TELEGRAM
      if (telegramToken && telegramChatId) {
        try {
          const rawPhone = targetStore?.whatsapp_number || targetStore?.owner_phone || targetStore?.whatsapp;
          const phoneInfo = formatLojistaWhatsApp(rawPhone);
          const storeName = escapeTgMarkdown(targetStore?.store_name || targetStore?.name || description.slice(0, 30) || 'Loja AJPSTORE');
          const clientName = escapeTgMarkdown(targetStore?.client_name || targetStore?.owner_name || paymentData.payer?.first_name || 'Lojista');
          const valorFormatado = Number(amount).toFixed(2).replace('.', ',');

          const telegramMessage = 
            `💰 *PAGAMENTO CONFIRMADO!*\n` +
            `• Loja: ${storeName}\n` +
            `• Cliente: ${clientName}\n` +
            `• WhatsApp: ${phoneInfo.display} (${phoneInfo.waLink})\n` +
            `• Valor: R$ ${valorFormatado}\n` +
            `• Forma: ${formaFormatada}\n` +
            `• Nova Validade: ${renewedDateStr}`;

          await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: telegramMessage,
              parse_mode: 'Markdown',
              disable_web_page_preview: true
            })
          });

          console.log('[mercadopago-webhook] 🚀 Notificação de pagamento aprovado enviada ao Telegram!');
        } catch (tgErr) {
          console.error('[mercadopago-webhook] Erro ao enviar mensagem para Telegram:', tgErr);
        }
      }
    }

    return res.status(200).json({ received: true, status: paymentData.status });
  } catch (err: any) {
    console.error('[mercadopago-webhook] ❌ Erro inesperado no webhook:', err);
    // Sempre retorna 200 para o Mercado Pago não reenviar spam em caso de erro interno
    return res.status(200).json({ received: true, error: err.message });
  }
}
