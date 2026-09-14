export type TelegramActionType =
  | 'abandoned_cart'
  | 'payment_approved'
  | 'payment_rejected'
  | 'test';

export interface TelegramNotificationPayload {
  action_type: TelegramActionType;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items?: any[];
  total_amount: number;
  order_id?: string;
  payment_id?: string;
  payment_method?: string;
  shipping_cost?: number;
  shipping_method?: string;
  shipping_address?: string;
  error_message?: string;
  status_detail?: string;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  isBeacon?: boolean;
}

/**
 * Despacha notificações em tempo real para o Bot do Telegram através das rotas serverless da aplicação.
 * Suporta os 3 eventos de checkout (Carrinho Abandonado, Pagamento Aprovado, Pagamento Reprovado) e teste.
 */
export async function notifyTelegram(payload: TelegramNotificationPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const { isBeacon, ...bodyData } = payload;

    // Resolução resiliente dos tokens caso não tenham sido passados no payload
    if (!bodyData.telegram_bot_token && typeof window !== 'undefined') {
      const lsToken = (localStorage.getItem('encantando_festa_telegram_bot_token') || '').trim();
      if (lsToken) bodyData.telegram_bot_token = lsToken;
    }
    if (!bodyData.telegram_chat_id && typeof window !== 'undefined') {
      const lsChat = (localStorage.getItem('encantando_festa_telegram_chat_id') || '').trim();
      if (lsChat) bodyData.telegram_chat_id = lsChat;
    }

    const jsonString = JSON.stringify(bodyData);

    // Se for solicitado envio via Beacon (ex: saída da página ou fechamento de aba)
    if (isBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const queued = navigator.sendBeacon('/api/notify-abandoned-cart', blob);
      if (queued) {
        console.log(`[telegramNotificationService] 🚀 Beacon [${bodyData.action_type}] enfileirado com sucesso.`);
        return { success: true };
      }
    }

    // Envio padrão via fetch
    const response = await fetch('/api/notify-abandoned-cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonString,
      keepalive: true,
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      console.log(`[telegramNotificationService] ✅ Notificação [${bodyData.action_type}] enviada ao Telegram com sucesso.`);
      return { success: true };
    }

    console.warn(`[telegramNotificationService] ⚠️ Resposta da API [${bodyData.action_type}]:`, data);

    // Fallback Direto: se o endpoint serverless falhar ou estiver em preview estático (ex: Lovable),
    // envia direto para a API do Telegram caso o token e chat ID estejam configurados
    if (bodyData.telegram_bot_token && bodyData.telegram_chat_id) {
      const directSuccess = await sendDirectTelegramMessage(bodyData);
      if (directSuccess) {
        return { success: true };
      }
    }

    return { success: false, error: data.error || data.warning || 'Erro ao notificar Telegram.' };
  } catch (err: any) {
    console.warn(`[telegramNotificationService] ❌ Erro ao disparar notificação [${payload.action_type}]:`, err);

    if (payload.telegram_bot_token && payload.telegram_chat_id) {
      const directSuccess = await sendDirectTelegramMessage(payload);
      if (directSuccess) {
        return { success: true };
      }
    }

    return { success: false, error: err.message };
  }
}

/**
 * Fallback direto para a API oficial do Telegram (para ambientes estáticos ou offline)
 */
async function sendDirectTelegramMessage(payload: TelegramNotificationPayload): Promise<boolean> {
  try {
    const token = (payload.telegram_bot_token || '').trim();
    const chatId = (payload.telegram_chat_id || '').trim();
    if (!token || !chatId) return false;

    const actionTitle = payload.action_type === 'payment_approved'
      ? '✅ PAGAMENTO APROVADO'
      : payload.action_type === 'payment_rejected'
      ? '❌ PAGAMENTO RECUSADO'
      : payload.action_type === 'test'
      ? '🔔 TESTE TELEGRAM'
      : '🚨 CARRINHO ABANDONADO';

    const itemsSummary = Array.isArray(payload.items) && payload.items.length > 0
      ? payload.items.map((it: any) => `• ${it.quantity || 1}x ${it.product?.name || it.name || 'Produto'}`).join('\n')
      : '• Produto digital';

    const text = `${actionTitle}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 Cliente: ${payload.customer_name || 'Não informado'}\n` +
      `📱 WhatsApp: ${payload.customer_phone || 'Não informado'}\n` +
      `✉️ E-mail: ${payload.customer_email || 'Não informado'}\n` +
      (payload.shipping_method ? `🚚 Frete: ${payload.shipping_method} (R$ ${Number(payload.shipping_cost || 0).toFixed(2).replace('.', ',')})\n` : '') +
      (payload.shipping_address ? `📍 Entrega: ${payload.shipping_address}\n` : '') +
      `💰 Total: R$ ${Number(payload.total_amount || 0).toFixed(2).replace('.', ',')}\n\n` +
      `📦 Itens:\n${itemsSummary}`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });

    const resData = await res.json().catch(() => ({}));
    if (res.ok && resData.ok) {
      console.log(`[telegramNotificationService] 🚀 Notificação enviada via fallback direto ao Telegram.`);
      return true;
    }
    return false;
  } catch (e) {
    console.error('[telegramNotificationService] Erro no fallback direto ao Telegram:', e);
    return false;
  }
}
