import type { VercelRequest, VercelResponse } from '@vercel/node';

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
      action_type = 'abandoned_cart',
      telegram_bot_token,
      telegram_chat_id,
    } = req.body || {};

    const botToken = (process.env.TELEGRAM_BOT_TOKEN || telegram_bot_token || '').trim();
    const chatId = (process.env.TELEGRAM_CHAT_ID || telegram_chat_id || '').trim();

    if (!botToken || !chatId) {
      console.warn('[notify-abandoned-cart] ⚠️ Token ou Chat ID do Telegram ausentes.');
      return res.status(200).json({
        success: false,
        warning: 'Telegram não configurado. Defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID na Vercel ou no painel admin.',
      });
    }

    const currentDate = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    let message = '';

    if (action_type === 'test') {
      message = `🔔 *TESTE DE INTEGRAÇÃO DO TELEGRAM*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ *Status:* Bot conectado com sucesso!\n` +
        `🏪 *Loja:* Soumbolinho\n` +
        `📅 *Data/Hora:* ${currentDate}\n\n` +
        `Tudo pronto! Seus alertas em tempo real de carrinho abandonado serão entregues aqui instantaneamente.`;
    } else {
      const cleanDigits = customer_phone.replace(/\D/g, '');
      const waNumber = cleanDigits.length >= 10 && !cleanDigits.startsWith('55')
        ? `55${cleanDigits}`
        : cleanDigits;
      const waLink = waNumber ? `https://wa.me/${waNumber}` : '';

      // Formata itens do carrinho
      const itemsList = Array.isArray(items) && items.length > 0
        ? items.map((i: any, idx: number) => {
            const name = i.product?.name || i.name || 'Produto Digital';
            const qty = i.quantity || 1;
            const price = i.customPrice !== undefined ? i.customPrice : (i.product?.price || i.price || 0);
            const formattedPrice = Number(price * qty).toFixed(2).replace('.', ',');
            const bumpTag = i.isUpsell ? ' *(⚡ Compre Junto)*' : '';
            return `${idx + 1}. *${qty}x ${name}*${bumpTag} - R$ ${formattedPrice}`;
          }).join('\n')
        : '• Produtos não informados';

      const formattedTotal = Number(total_amount || 0).toFixed(2).replace('.', ',');

      message = `🚨 *CARRINHO ABANDONADO DETECTADO!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *Cliente:* ${customer_name || 'Não informado'}\n` +
        `📱 *WhatsApp:* ${customer_phone || 'Não informado'}\n` +
        `✉️ *E-mail:* ${customer_email || 'Não informado'}\n` +
        `📅 *Data/Hora:* ${currentDate}\n\n` +
        `🛒 *PRODUTOS NO CARRINHO:*\n${itemsList}\n\n` +
        `💰 *Valor Total:* R$ ${formattedTotal}\n\n` +
        (waLink
          ? `📲 *CLIQUE PARA CHAMAR NO WHATSAPP:*\n${waLink}\n\n` +
            `💬 *Sugestão de mensagem:*\n` +
            `_"Olá ${customer_name ? customer_name.split(' ')[0] : ''}! Vi que você escolheu alguns arquivos no site da Soumbolinho. Posso te ajudar a finalizar seu pedido com um desconto especial? 😊"_`
          : `⚠️ WhatsApp não preenchido ou inválido.`);
    }

    console.log('[notify-abandoned-cart] 📤 Enviando mensagem para o Telegram Chat ID:', chatId);

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

    // Fallback: se o Telegram rejeitar por erro de parse de markdown (ex: caracteres especiais no nome)
    if (!telegramRes.ok && telegramData.description?.includes('can\'t parse entities')) {
      console.warn('[notify-abandoned-cart] ⚠️ Falha no Markdown do Telegram, tentando em texto puro...');
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
      console.error('[notify-abandoned-cart] ❌ Erro na API do Telegram:', telegramData);
      return res.status(500).json({
        success: false,
        error: telegramData.description || 'Erro ao enviar notificação para o Telegram.',
      });
    }

    console.log('[notify-abandoned-cart] ✅ Notificação entregue no Telegram com sucesso:', telegramData.result?.message_id);

    return res.status(200).json({
      success: true,
      message_id: telegramData.result?.message_id,
    });
  } catch (error: any) {
    console.error('[notify-abandoned-cart] ❌ Erro interno:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno ao processar notificação de carrinho abandonado.',
    });
  }
}
