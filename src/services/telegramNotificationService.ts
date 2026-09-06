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
    return { success: false, error: data.error || data.warning || 'Erro ao notificar Telegram.' };
  } catch (err: any) {
    console.warn(`[telegramNotificationService] ❌ Erro ao disparar notificação [${payload.action_type}]:`, err);
    return { success: false, error: err.message };
  }
}
