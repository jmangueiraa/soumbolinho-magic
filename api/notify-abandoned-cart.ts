import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Escapa caracteres especiais do Markdown legado do Telegram (*, _, `, [, ])
 * para prevenir erros de parsing "can't parse entities".
 */
function escapeMd(text: any): string {
  if (!text) return '';
  return String(text).replace(/([_*`\[\]])/g, '\\$1');
}

/**
 * Formata número de telefone brasileiro no padrão visual (XX) XXXXX-XXXX
 */
function formatDisplayPhone(phone: string): string {
  const clean = String(phone || '').replace(/\D/g, '');
  if (!clean) return 'Não informado';
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configura headers para CORS
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
      customer_name = '',
      customer_phone = '',
      customer_email = '',
      items = [],
      total_amount = 0,
      order_id = '',
      payment_id = '',
      payment_method = '',
      error_message = '',
      status_detail = '',
      action_type = 'abandoned_cart',
      telegram_bot_token,
      telegram_chat_id,
    } = req.body || {};

    let botToken = (process.env.TELEGRAM_BOT_TOKEN || telegram_bot_token || '').trim();
    let chatId = (process.env.TELEGRAM_CHAT_ID || telegram_chat_id || '').trim();

    // Se ainda não temos token ou chat_id, busca diretamente da tabela store_config no Supabase
    if (!botToken || !chatId) {
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mbwxubnwaeywstnmlrqg.supabase.co';
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_HuPfQyg25rtcXPQhDN5OHw_NbYRnpvq';
        const resConfig = await fetch(`${supabaseUrl}/rest/v1/store_config?select=telegram_bot_token,telegram_chat_id&limit=1`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        if (resConfig.ok) {
          const configRows = await resConfig.json();
          if (Array.isArray(configRows) && configRows.length > 0) {
            if (!botToken && configRows[0].telegram_bot_token) {
              botToken = String(configRows[0].telegram_bot_token).trim();
            }
            if (!chatId && configRows[0].telegram_chat_id) {
              chatId = String(configRows[0].telegram_chat_id).trim();
            }
          }
        }
      } catch (dbErr) {
        console.warn('[notify-telegram] Aviso ao consultar credenciais no Supabase:', dbErr);
      }
    }

    if (!botToken || !chatId) {
      console.warn('[notify-telegram] ⚠️ Token ou Chat ID do Telegram ausentes.');
      return res.status(200).json({
        success: false,
        warning: 'Telegram não configurado. Defina o Token do Bot e Chat ID no painel /admin ou variáveis de ambiente na Vercel.',
      });
    }

    const currentDate = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    let message = '';

    // Mapeamento e formatação do telefone / link WhatsApp
    const cleanDigits = String(customer_phone || '').replace(/\D/g, '');
    const waNumber = cleanDigits.length >= 10 && !cleanDigits.startsWith('55')
      ? `55${cleanDigits}`
      : cleanDigits;
    const waLink = waNumber ? `https://wa.me/${waNumber}` : '';
    const displayPhone = formatDisplayPhone(customer_phone);

    // Formatação da lista de produtos e total
    const itemsList = Array.isArray(items) && items.length > 0
      ? items.map((i: any, idx: number) => {
          const rawName = i.product?.name || i.name || 'Produto Digital';
          const name = escapeMd(rawName);
          const qty = i.quantity || 1;
          const price = i.customPrice !== undefined ? i.customPrice : (i.product?.price || i.price || 0);
          const formattedPrice = Number(price * qty).toFixed(2).replace('.', ',');
          const bumpTag = i.isUpsell ? ' *(⚡ Compre Junto)*' : '';
          return `${idx + 1}. *${qty}x ${name}*${bumpTag} - R$ ${formattedPrice}`;
        }).join('\n')
      : '• Nenhum item listado';

    const formattedTotal = Number(total_amount || 0).toFixed(2).replace('.', ',');
    const displayOrderId = order_id || payment_id || '';
    const cleanCustomerName = customer_name ? String(customer_name).trim() : 'Não informado';
    const cleanCustomerEmail = customer_email ? String(customer_email).trim() : 'Não informado';

    // --- MONTAGEM DA MENSAGEM CONFORME O EVENTO ---
    if (action_type === 'test') {
      message = `🔔 *TESTE DE INTEGRAÇÃO DO TELEGRAM*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ *Status:* Bot conectado com sucesso!\n` +
        `🏪 *Loja:* Soumbolinho\n` +
        `📅 *Data/Hora:* ${currentDate}\n\n` +
        `Tudo pronto! Seus alertas em tempo real de *Carrinho Abandonado*, *Pagamento Aprovado* e *Pagamento Reprovado* serão entregues aqui instantaneamente.`;
    } else if (action_type === 'payment_approved' || action_type === 'approved') {
      // 1. EVENTO: PAGAMENTO APROVADO
      message = `✅ *PAGAMENTO APROVADO!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 *Status da Transação:* Aprovado\n` +
        `👤 *Nome do Comprador:* ${escapeMd(cleanCustomerName)}\n` +
        `✉️ *E-mail:* ${escapeMd(cleanCustomerEmail)}\n` +
        `📱 *WhatsApp:* ${escapeMd(displayPhone)}\n` +
        (payment_method ? `💳 *Forma de Pagamento:* ${escapeMd(payment_method)}\n` : '') +
        (displayOrderId ? `🆔 *Nº do Pedido:* #${escapeMd(displayOrderId)}\n` : '') +
        `📅 *Data/Hora:* ${currentDate}\n\n` +
        `📦 *PRODUTOS ADQUIRIDOS:*\n${itemsList}\n\n` +
        `💰 *Valor Total:* R$ ${formattedTotal}\n\n` +
        `🚀 *Entrega:* Arquivos digitais liberados e e-mail de confirmação enviado!\n` +
        (waLink ? `📲 *WhatsApp do Comprador:* ${waLink}` : '');
    } else if (action_type === 'payment_rejected' || action_type === 'rejected' || action_type === 'declined') {
      // 2. EVENTO: PAGAMENTO REPROVADO / RECUSADO
      const displayReason = error_message || status_detail || 'Transação não autorizada pelo gateway ou cancelada.';
      message = `❌ *PAGAMENTO REPROVADO / RECUSADO!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 *Status da Transação:* Reprovado / Recusado\n` +
        `👤 *Nome do Comprador:* ${escapeMd(cleanCustomerName)}\n` +
        `✉️ *E-mail:* ${escapeMd(cleanCustomerEmail)}\n` +
        `📱 *WhatsApp:* ${escapeMd(displayPhone)}\n` +
        (payment_method ? `💳 *Forma de Pagamento:* ${escapeMd(payment_method)}\n` : '') +
        (displayOrderId ? `🆔 *Nº do Pedido:* #${escapeMd(displayOrderId)}\n` : '') +
        `⚠️ *Motivo:* ${escapeMd(displayReason)}\n` +
        `📅 *Data/Hora:* ${currentDate}\n\n` +
        `🛒 *PRODUTOS TENTADOS:*\n${itemsList}\n\n` +
        `💰 *Valor Total:* R$ ${formattedTotal}\n\n` +
        (waLink
          ? `📲 *CLIQUE PARA AUXILIAR NO WHATSAPP:*\n${waLink}\n\n` +
            `💬 *Sugestão de recuperação:*\n` +
            `_"Olá ${escapeMd(cleanCustomerName.split(' ')[0])}! Notei que seu pagamento não foi aprovado. Posso te ajudar a gerar um novo Pix ou tentar outro método? 😊"_`
          : `⚠️ WhatsApp não preenchido ou inválido.`);
    } else {
      // 3. EVENTO: CARRINHO ABANDONADO (padrão)
      message = `🚨 *CARRINHO ABANDONADO DETECTADO!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 *Status da Transação:* Carrinho Abandonado\n` +
        `👤 *Nome do Comprador:* ${escapeMd(cleanCustomerName)}\n` +
        `✉️ *E-mail:* ${escapeMd(cleanCustomerEmail)}\n` +
        `📱 *WhatsApp:* ${escapeMd(displayPhone)}\n` +
        `📅 *Data/Hora:* ${currentDate}\n\n` +
        `🛒 *PRODUTOS NO CARRINHO:*\n${itemsList}\n\n` +
        `💰 *Valor Total:* R$ ${formattedTotal}\n\n` +
        (waLink
          ? `📲 *CLIQUE PARA CHAMAR NO WHATSAPP:*\n${waLink}\n\n` +
            `💬 *Sugestão de mensagem:*\n` +
            `_"Olá ${escapeMd(cleanCustomerName.split(' ')[0])}! Vi que você escolheu alguns arquivos no site da Soumbolinho. Posso te ajudar a finalizar seu pedido com um desconto especial? 😊"_`
          : `⚠️ WhatsApp não preenchido ou inválido.`);
    }

    console.log(`[notify-telegram] 📤 Enviando notificação [${action_type}] para o Telegram Chat ID:`, chatId);

    // Envio para a API do Telegram
    let telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    let telegramData = await telegramRes.json();

    // Fallback: se o Telegram rejeitar por erro de parse de markdown (ex: caracteres especiais no nome/motivo)
    if (!telegramRes.ok && telegramData.description?.includes('can\'t parse entities')) {
      console.warn('[notify-telegram] ⚠️ Falha no Markdown do Telegram, tentando em texto puro...');
      telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message.replace(/[*_`]/g, ''),
          disable_web_page_preview: true,
        }),
      });
      telegramData = await telegramRes.json();
    }

    if (!telegramRes.ok) {
      console.error('[notify-telegram] ❌ Erro na API do Telegram:', telegramData);
      return res.status(500).json({
        success: false,
        error: telegramData.description || 'Erro ao enviar notificação para o Telegram.',
      });
    }

    console.log(`[notify-telegram] ✅ Notificação [${action_type}] entregue no Telegram com sucesso:`, telegramData.result?.message_id);

    return res.status(200).json({
      success: true,
      message_id: telegramData.result?.message_id,
      action_type,
    });
  } catch (error: any) {
    console.error('[notify-telegram] ❌ Erro interno:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno ao processar notificação do Telegram.',
    });
  }
}
