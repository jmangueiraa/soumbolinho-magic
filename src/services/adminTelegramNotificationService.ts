import { supabase } from '../lib/supabase';
import { fetchGlobalSettings } from './globalSettingsService';

export interface TelegramNewStorePayload {
  store_name: string;
  client_name?: string | null;
  whatsapp_number?: string | null;
  client_email?: string | null;
  slug: string;
  status?: string | null;
  telegram_bot_token?: string | null;
  telegram_chat_id?: string | null;
}

export interface TelegramPaymentApprovedPayload {
  store_name?: string;
  client_name?: string | null;
  whatsapp_number?: string | null;
  valor: number | string;
  forma?: string | null; // e.g. 'Pix', 'Cartão'
  data_renovada?: string | null; // e.g. '23/10/2026'
  store_id?: string;
  slug?: string;
}

export interface TelegramPlanExpiringPayload {
  store_name: string;
  client_name?: string | null;
  whatsapp_number?: string | null;
  dias_restantes: number;
  data_vencimento?: string | null; // e.g. '28/09/2026'
  status?: string | null;
  store_id?: string;
}

/**
 * Trata o número de WhatsApp do lojista (campo 'whatsapp_number' da tabela 'stores')
 * removendo caracteres especiais e montando a URL direta wa.me com DDI 55.
 */
export function formatLojistaWhatsApp(rawPhone?: string | null): {
  display: string;
  cleanDigits: string;
  waLink: string;
} {
  const fallback = '19981356505';
  let digits = String(rawPhone || '').replace(/\D/g, '');

  if (!digits) {
    digits = fallback;
  }

  // Se já tiver 55 no início e contiver 12 ou 13 dígitos
  let localNumber = digits;
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    localNumber = digits.slice(2);
  }

  // Monta a formatação visual (XX) XXXXX-XXXX
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

  const cleanDigits = localNumber;
  const waLink = `https://wa.me/55${cleanDigits}`;

  return {
    display,
    cleanDigits,
    waLink
  };
}

/**
 * Escapa caracteres reservados para uso seguro com parse_mode: 'HTML' no Telegram.
 * Apenas &, < e > precisam ser escapados. Caracteres como _, *, ., - permanecem inalterados.
 */
export function escapeTgHtml(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escapa caracteres especiais de Markdown para fallback caso necessário.
 */
function escapeTgMarkdown(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text).replace(/([_*`\[\]])/g, '\\$1');
}

/**
 * Envia uma mensagem formatada para o Bot do Telegram do Super Admin.
 * Suporta tanto envio direto via navegador quanto a rota serverless /api/notify-admin-telegram.
 * Fornece logs detalhados do status da resposta e corpo retornado.
 */
export async function sendTelegramAdminNotification(
  messageHtml: string,
  eventType: string = 'general',
  explicitCredentials?: { token?: string; chatId?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[adminTelegramNotification] 🚀 Disparo de notificação iniciado para o evento [${eventType}]...`);

    // 1. Tenta usar credenciais explícitas ou recupera do cliente/localStorage/banco
    let token = (explicitCredentials?.token || '').trim();
    let chatId = (explicitCredentials?.chatId || '').trim();

    if (!token || !chatId) {
      const globalSettings = await fetchGlobalSettings().catch(() => ({} as any));
      if (!token) token = (globalSettings?.telegram_bot_token || '').trim();
      if (!chatId) chatId = (globalSettings?.telegram_chat_id || '').trim();
    }

    // Se ainda estiver vazio, busca em chaves locais adicionais
    if (typeof window !== 'undefined') {
      if (!token) {
        token = (
          localStorage.getItem('global_telegram_bot_token') ||
          localStorage.getItem('telegram_bot_token') ||
          localStorage.getItem('encantando_festa_telegram_bot_token') ||
          ''
        ).trim();
      }
      if (!chatId) {
        chatId = (
          localStorage.getItem('global_telegram_chat_id') ||
          localStorage.getItem('telegram_chat_id') ||
          localStorage.getItem('encantando_festa_telegram_chat_id') ||
          ''
        ).trim();
      }
    }

    // Diagnóstico claro se bot token ou chat_id estiverem vazios/nulos
    if (!token || !chatId) {
      console.warn('[adminTelegramNotification] ⚠️ Token ou Chat ID do Telegram estão vazios/nulos no cliente:', {
        botTokenConfigured: Boolean(token),
        chatIdConfigured: Boolean(chatId),
        tokenLength: token ? token.length : 0,
        chatId: chatId || 'NÃO CONFIGURADO'
      });
    } else {
      console.log('[adminTelegramNotification] 🔑 Credenciais identificadas:', {
        botToken: `${token.slice(0, 6)}...${token.slice(-4)}`,
        chatId: chatId
      });
    }

    let lastError = '';

    // 2. Método 1: Envio DIRETO para a API do Telegram (parse_mode: 'HTML')
    // Exibe logs detalhados (status e json) diretamente no console do navegador
    if (token && chatId) {
      try {
        const directUrl = `https://api.telegram.org/bot${token}/sendMessage`;
        const directPayload = {
          chat_id: chatId,
          text: messageHtml,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        };

        console.log('[adminTelegramNotification] 📤 [Fetch Direto] Enviando payload para Telegram:', {
          url: `https://api.telegram.org/bot${token.slice(0, 6)}.../sendMessage`,
          parse_mode: 'HTML',
          payload: directPayload
        });

        const response = await fetch(directUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(directPayload),
          keepalive: true
        });

        const status = response.status;
        const responseData = await response.json().catch(() => ({}));

        console.log('[adminTelegramNotification] 📥 [Fetch Direto] Status da resposta:', status);
        console.log('[adminTelegramNotification] 📥 [Fetch Direto] Corpo do retorno:', responseData);

        if (response.ok && responseData.ok) {
          console.log('[adminTelegramNotification] ✅ [Fetch Direto] Mensagem entregue com sucesso! Message ID:', responseData.result?.message_id);
          return { success: true };
        }

        console.error('[adminTelegramNotification] ❌ [Fetch Direto] Telegram recusou o envio:', {
          status,
          error_code: responseData?.error_code,
          description: responseData?.description,
          body: responseData
        });

        // Se falhar por erro de parsing do HTML, tenta reenviar em texto simples puro
        if (responseData?.description?.toLowerCase().includes("can't parse") || responseData?.description?.toLowerCase().includes("entity")) {
          console.warn('[adminTelegramNotification] ⚠️ Erro de parsing HTML. Tentando reenviar em texto simples (sem tags)...');
          const plainText = messageHtml.replace(/<[^>]*>/g, '');
          const retryRes = await fetch(directUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: plainText,
              disable_web_page_preview: true
            }),
            keepalive: true
          });
          const retryStatus = retryRes.status;
          const retryData = await retryRes.json().catch(() => ({}));
          console.log('[adminTelegramNotification] 📥 [Reenvio Texto Simples] Status:', retryStatus);
          console.log('[adminTelegramNotification] 📥 [Reenvio Texto Simples] Corpo:', retryData);
          if (retryRes.ok && retryData.ok) {
            console.log('[adminTelegramNotification] ✅ [Reenvio Texto Simples] Mensagem entregue com sucesso!');
            return { success: true };
          }
        }

        lastError = responseData?.description || `Erro HTTP ${status} no Telegram`;
      } catch (directErr: any) {
        console.warn('[adminTelegramNotification] ⚠️ Falha na conexão direta com Telegram (possível ad-blocker ou CORS):', directErr);
        lastError = directErr?.message || 'Falha de conexão com a API do Telegram';
      }
    }

    // 3. Método 2: Rota Serverless /api/notify-admin-telegram
    // Útil caso o fetch direto seja bloqueado por adblocker ou credenciais estejam apenas no servidor
    try {
      console.log('[adminTelegramNotification] 🔄 Tentando envio via rota serverless /api/notify-admin-telegram...');
      const serverRes = await fetch('/api/notify-admin-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageHtml,
          parse_mode: 'HTML',
          event_type: eventType,
          telegram_bot_token: token || undefined,
          telegram_chat_id: chatId || undefined
        }),
        keepalive: true
      });

      const serverStatus = serverRes.status;
      const serverData = await serverRes.json().catch(() => ({}));

      console.log('[adminTelegramNotification] 📥 [Rota Serverless] Status da resposta:', serverStatus);
      console.log('[adminTelegramNotification] 📥 [Rota Serverless] Corpo do retorno:', serverData);

      if (serverRes.ok && serverData.success) {
        console.log('[adminTelegramNotification] ✅ [Rota Serverless] Notificação entregue com sucesso via backend!');
        return { success: true };
      }

      if (serverData?.error) {
        lastError = serverData.error;
      }
    } catch (apiErr: any) {
      console.warn('[adminTelegramNotification] ⚠️ Rota serverless /api/notify-admin-telegram inacessível:', apiErr);
    }

    if (!token || !chatId) {
      return {
        success: false,
        error: 'Token ou Chat ID do Telegram não configurados no Painel Super Admin (Aba Integrações / APIs).'
      };
    }

    return { success: false, error: lastError || 'Falha ao entregar notificação no Telegram.' };
  } catch (err: any) {
    console.error('[adminTelegramNotification] ❌ Exceção ao enviar notificação:', err);
    return { success: false, error: err.message || 'Erro de conexão' };
  }
}

/**
 * EVENTO 1: Nova Loja Criada (Onboarding)
 * Gatilho: Imediatamente após a inserção bem-sucedida na tabela 'stores'.
 * Payload formatado em HTML para suportar qualquer caractere sem erros de parse.
 */
export async function notifyNewStoreCreated(data: TelegramNewStorePayload): Promise<{ success: boolean; error?: string }> {
  try {
    const phone = formatLojistaWhatsApp(data.whatsapp_number);
    const storeName = escapeTgHtml(data.store_name);
    const clientName = escapeTgHtml(data.client_name || 'Lojista');
    const clientEmail = escapeTgHtml(data.client_email || 'Não informado');
    const slug = (data.slug || '').toLowerCase().trim();
    const cleanDigits = phone.cleanDigits;
    const whatsappDisplay = escapeTgHtml(phone.display);

    const message = 
      `🚀 <b>NOVA LOJA CRIADA!</b>\n` +
      `• <b>Loja:</b> ${storeName}\n` +
      `• <b>Cliente:</b> ${clientName}\n` +
      `• <b>WhatsApp:</b> ${whatsappDisplay} (https://wa.me/55${cleanDigits})\n` +
      `• <b>E-mail:</b> ${clientEmail}\n` +
      `• <b>Link:</b> https://${slug}.ajpstore.com.br`;

    console.log('[adminTelegramNotification] 📦 Payload formatado para Nova Loja Criada:\n', message);

    return await sendTelegramAdminNotification(
      message, 
      'new_store',
      (data.telegram_bot_token && data.telegram_chat_id)
        ? { token: data.telegram_bot_token, chatId: data.telegram_chat_id }
        : undefined
    );
  } catch (err: any) {
    console.error('[adminTelegramNotification] ❌ Erro ao disparar Nova Loja Criada:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Permite reenviar a notificação de Nova Loja Criada para uma loja existente no Supabase.
 */
export async function notifyStoreCreatedById(storeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .maybeSingle();

    if (error || !store) {
      return { success: false, error: error?.message || 'Loja não encontrada no banco de dados.' };
    }

    return await notifyNewStoreCreated({
      store_name: store.store_name || store.name,
      client_name: store.client_name || store.owner_name,
      whatsapp_number: store.whatsapp_number || store.owner_phone || store.whatsapp,
      client_email: store.client_email || store.owner_email,
      slug: store.slug,
      status: store.subscription_status === 'trial' ? 'Período de Testes (Trial)' : (store.subscription_status || 'Ativo')
    });
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * EVENTO 2: Pagamento Efetuado / Mensalidade Aprovada
 * Gatilho: Quando o pagamento é aprovado via Mercado Pago (Webhook ou polling de confirmação).
 */
export async function notifyPaymentApproved(data: TelegramPaymentApprovedPayload): Promise<{ success: boolean; error?: string }> {
  try {
    let storeName = data.store_name;
    let clientName = data.client_name;
    let rawPhone = data.whatsapp_number;

    if ((!rawPhone || !storeName) && (data.store_id || data.slug)) {
      try {
        let query = supabase
          .from('stores')
          .select('store_name, name, client_name, owner_name, whatsapp_number, owner_phone, whatsapp, client_email, owner_email, slug');

        if (data.store_id) {
          query = query.eq('id', data.store_id);
        } else if (data.slug) {
          query = query.eq('slug', data.slug);
        }

        const { data: storeRow } = await query.maybeSingle();
        if (storeRow) {
          storeName = storeName || storeRow.store_name || storeRow.name;
          clientName = clientName || storeRow.client_name || storeRow.owner_name;
          rawPhone = rawPhone || storeRow.whatsapp_number || storeRow.owner_phone || storeRow.whatsapp;
        }
      } catch (dbErr) {
        console.warn('[adminTelegramNotification] Aviso ao consultar dados da loja para pagamento:', dbErr);
      }
    }

    const phone = formatLojistaWhatsApp(rawPhone);
    const finalStoreName = escapeTgHtml(storeName || 'Loja AJPSTORE');
    const finalClientName = escapeTgHtml(clientName || 'Lojista');
    const whatsappDisplay = escapeTgHtml(phone.display);

    const valorFormatted = typeof data.valor === 'number'
      ? data.valor.toFixed(2).replace('.', ',')
      : String(data.valor).replace('.', ',');

    const forma = escapeTgHtml(data.forma || 'Pix');
    const dataRenovada = escapeTgHtml(data.data_renovada || '30 dias');

    const message = 
      `💰 <b>PAGAMENTO CONFIRMADO!</b>\n` +
      `• <b>Loja:</b> ${finalStoreName}\n` +
      `• <b>Cliente:</b> ${finalClientName}\n` +
      `• <b>WhatsApp:</b> ${whatsappDisplay} (https://wa.me/55${phone.cleanDigits})\n` +
      `• <b>Valor:</b> R$ ${valorFormatted}\n` +
      `• <b>Forma:</b> ${forma}\n` +
      `• <b>Nova Validade:</b> ${dataRenovada}`;

    return await sendTelegramAdminNotification(message, 'payment');
  } catch (err: any) {
    console.error('[adminTelegramNotification] ❌ Erro ao disparar Pagamento Confirmado:', err);
    return { success: false, error: err.message };
  }
}

/**
 * EVENTO 3: Plano Vencendo (Alerta Preventivo)
 * Gatilho: Rotina para lojas com 5 dias ou menos para expirar.
 */
export async function notifyPlanExpiring(data: TelegramPlanExpiringPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const phone = formatLojistaWhatsApp(data.whatsapp_number);
    const storeName = escapeTgHtml(data.store_name);
    const clientName = escapeTgHtml(data.client_name || 'Lojista');
    const whatsappDisplay = escapeTgHtml(phone.display);
    const diasRestantes = data.dias_restantes;
    const dataVencimento = escapeTgHtml(data.data_vencimento || 'Em breve');
    const status = escapeTgHtml(data.status || 'Trial Ativo');

    const message = 
      `⚠️ <b>PLANO VENCENDO EM BREVE!</b>\n` +
      `• <b>Loja:</b> ${storeName}\n` +
      `• <b>Cliente:</b> ${clientName}\n` +
      `• <b>WhatsApp:</b> ${whatsappDisplay} (https://wa.me/55${phone.cleanDigits})\n` +
      `• <b>Vencimento em:</b> ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'} (${dataVencimento})\n` +
      `• <b>Status atual:</b> ${status}`;

    return await sendTelegramAdminNotification(message, 'expiring');
  } catch (err: any) {
    console.error('[adminTelegramNotification] ❌ Erro ao disparar Plano Vencendo:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Rotina de Verificação Preventiva de Lojas Vencendo em 5 dias ou menos.
 * Pode ser executada pelo Painel Super Admin ou chamada periodicamente.
 */
export async function checkAndNotifyExpiringStores(): Promise<{
  scanned: number;
  alerted: number;
  storesAlerted: string[];
}> {
  try {
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name, store_name, client_name, owner_name, whatsapp_number, owner_phone, whatsapp, client_email, owner_email, slug, expires_at, trial_ends_at, vence_em, subscription_status, is_active, is_matriz')
      .eq('is_active', true)
      .neq('is_matriz', true);

    if (error || !Array.isArray(stores)) {
      console.warn('[adminTelegramNotification] Erro ao listar lojas para verificação de expiração:', error);
      return { scanned: 0, alerted: 0, storesAlerted: [] };
    }

    const now = Date.now();
    const alertedStores: string[] = [];
    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    for (const store of stores) {
      if (store.slug === 'ajpstore' || store.id === 'store_ajpstore' || store.slug === 'suamarcaaqui') continue;

      const rawExp = store.expires_at || store.trial_ends_at || store.vence_em;
      if (!rawExp || String(rawExp).startsWith('2099')) continue;

      const expTime = new Date(rawExp).getTime();
      const diffMs = expTime - now;
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Lojas com 5 dias ou menos para expirar (e que não venceram há mais de 1 dia)
      if (daysRemaining <= 5 && daysRemaining >= -1) {
        const alertCacheKey = `tg_exp_alert_${store.id}_${todayKey}`;
        if (typeof window !== 'undefined' && localStorage.getItem(alertCacheKey)) {
          // Já notificado hoje, evita notificações duplicadas
          continue;
        }

        const dateFormatted = new Date(rawExp).toLocaleDateString('pt-BR');
        const statusText = store.subscription_status === 'trial' ? 'Período de Testes (Trial)' : 'Assinatura Ativa';

        await notifyPlanExpiring({
          store_name: store.store_name || store.name || 'Loja sem nome',
          client_name: store.client_name || store.owner_name || 'Lojista',
          whatsapp_number: store.whatsapp_number || store.owner_phone || store.whatsapp,
          dias_restantes: daysRemaining > 0 ? daysRemaining : 0,
          data_vencimento: dateFormatted,
          status: statusText,
          store_id: store.id
        });

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(alertCacheKey, 'sent');
          } catch {}
        }
        alertedStores.push(store.store_name || store.name || store.id);
      }
    }

    return {
      scanned: stores.length,
      alerted: alertedStores.length,
      storesAlerted: alertedStores
    };
  } catch (err) {
    console.error('[adminTelegramNotification] Erro geral na checagem de lojas vencendo:', err);
    return { scanned: 0, alerted: 0, storesAlerted: [] };
  }
}
