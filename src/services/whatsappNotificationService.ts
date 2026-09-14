export type WhatsAppActionType =
  | 'abandoned_cart'
  | 'payment_approved'
  | 'payment_rejected'
  | 'test';

export interface WhatsAppNotificationPayload {
  action_type: WhatsAppActionType;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  items?: any[];
  total_amount: number;
  order_id?: string;
  payment_id?: string;
  payment_method?: string;
  shipping_cost?: number;
  shipping_method?: string;
  shipping_address?: string;
  store_name?: string;
  store_id?: string;
  // Credenciais opcionais específicas:
  whatsapp_api_provider?: string;
  whatsapp_api_url?: string;
  whatsapp_api_token?: string;
  whatsapp_notify_phone?: string;
  isBeacon?: boolean;
}

/**
 * Despacha notificações em tempo real para o WhatsApp do lojista via endpoint serverless (/api/notify-whatsapp).
 * Suporta os eventos: Carrinho Abandonado (Lead), Pagamento Aprovado, Pagamento Reprovado e Teste de Conexão.
 */
export async function notifyWhatsApp(payload: WhatsAppNotificationPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const { isBeacon, ...bodyData } = payload;

    // Resolução resiliente caso as credenciais não tenham sido passadas no payload
    if (typeof window !== 'undefined') {
      const storeKey = bodyData.store_id || 'suamarcaaqui';
      if (!bodyData.whatsapp_api_url) {
        bodyData.whatsapp_api_url = (localStorage.getItem(`store_${storeKey}_whatsapp_api_url`) || localStorage.getItem('encantando_festa_whatsapp_api_url') || '').trim();
      }
      if (!bodyData.whatsapp_api_token) {
        bodyData.whatsapp_api_token = (localStorage.getItem(`store_${storeKey}_whatsapp_api_token`) || localStorage.getItem('encantando_festa_whatsapp_api_token') || '').trim();
      }
      if (!bodyData.whatsapp_notify_phone) {
        bodyData.whatsapp_notify_phone = (localStorage.getItem(`store_${storeKey}_whatsapp_notify_phone`) || localStorage.getItem('encantando_festa_whatsapp_notify_phone') || '').trim();
      }
      if (!bodyData.whatsapp_api_provider) {
        bodyData.whatsapp_api_provider = (localStorage.getItem(`store_${storeKey}_whatsapp_api_provider`) || 'evolution').trim();
      }
    }

    const jsonString = JSON.stringify(bodyData);

    // Se solicitado via Beacon (ex: fechamento de aba ou abandono)
    if (isBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const queued = navigator.sendBeacon('/api/notify-whatsapp', blob);
      if (queued) {
        console.log(`[whatsappNotificationService] 🚀 Beacon WhatsApp [${bodyData.action_type}] enfileirado.`);
        return { success: true };
      }
    }

    // Envio padrão via fetch
    const response = await fetch('/api/notify-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonString,
      keepalive: true,
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      console.log(`[whatsappNotificationService] ✅ Notificação [${bodyData.action_type}] enviada ao WhatsApp com sucesso!`);
      return { success: true };
    }

    // Se o backend avisou que o WhatsApp não está configurado, não é erro crítico
    if (data.warning) {
      console.log(`[whatsappNotificationService] ℹ️ ${data.warning}`);
      return { success: false, error: data.warning };
    }

    console.warn(`[whatsappNotificationService] ⚠️ Resposta da API WhatsApp:`, data);
    return { success: false, error: data.error || 'Erro ao notificar WhatsApp.' };
  } catch (err: any) {
    console.warn(`[whatsappNotificationService] ❌ Erro ao disparar notificação WhatsApp [${payload.action_type}]:`, err);
    return { success: false, error: err.message || 'Falha ao conectar com o servidor.' };
  }
}

/**
 * Função utilitária para testar a notificação no WhatsApp a partir do painel administrativo
 */
export async function testWhatsAppNotification(params: {
  storeId?: string;
  storeName?: string;
  provider: string;
  apiUrl: string;
  apiToken: string;
  notifyPhone: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const cleanPhone = (params.notifyPhone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        message: 'Por favor, informe um número de WhatsApp válido com DDD (ex: 11 99999-9999) para receber a notificação de teste.',
      };
    }

    if (params.provider !== 'callmebot' && !params.apiUrl.trim()) {
      return {
        success: false,
        message: 'Por favor, informe a URL da API do WhatsApp (ex: Evolution API ou Z-API).',
      };
    }

    const payload: WhatsAppNotificationPayload = {
      action_type: 'test',
      customer_name: 'Super Administrador',
      customer_phone: cleanPhone,
      customer_email: 'admin@loja.com.br',
      total_amount: 97.00,
      store_name: params.storeName || 'Minha Loja',
      store_id: params.storeId,
      whatsapp_api_provider: params.provider,
      whatsapp_api_url: params.apiUrl.trim(),
      whatsapp_api_token: params.apiToken.trim(),
      whatsapp_notify_phone: cleanPhone,
    };

    const res = await notifyWhatsApp(payload);
    if (res.success) {
      return {
        success: true,
        message: '✅ Mensagem de teste enviada com sucesso para o seu WhatsApp! Verifique seu celular.',
      };
    } else {
      return {
        success: false,
        message: res.error || 'Não foi possível enviar a mensagem. Verifique a URL e o Token da sua API.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Erro inesperado ao testar notificação no WhatsApp.',
    };
  }
}
