import { supabase } from '../lib/supabase';
import { fetchGlobalSettings } from './globalSettingsService';

export interface TelegramNewStorePayload {
  store_name: string;
  client_name?: string | null;
  whatsapp_number?: string | null;
  client_email?: string | null;
  slug: string;
  status?: string | null;
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
 * Escapa caracteres especiais de Markdown para evitar erros de parsing na API do Telegram.
 */
function escapeTgMarkdown(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text).replace(/([_*`\[\]])/g, '\\$1');
}

/**
 * Envia uma mensagem formatada para o Bot do Telegram configurado no Super Admin.
 * Protegido com try/catch para que falhas de rede NUNCA travem operações da aplicação.
 */
export async function sendTelegramAdminNotification(messageText: string): Promise<{ success: boolean; error?: string }> {
  try {
    const globalSettings = await fetchGlobalSettings();
    const token = (globalSettings.telegram_bot_token || '').trim();
    const chatId = (globalSettings.telegram_chat_id || '').trim();

    if (!token || !chatId) {
      console.warn('[adminTelegramNotification] ⚠️ Token ou Chat ID do Telegram não configurados no Super Admin.');
      return { success: false, error: 'Credenciais do Telegram não configuradas no Super Admin.' };
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.ok) {
      console.log('[adminTelegramNotification] ✅ Alerta entregue com sucesso no Telegram!');
      return { success: true };
    }

    console.warn('[adminTelegramNotification] ⚠️ Resposta do Telegram:', data);
    return { success: false, error: data.description || 'Falha ao enviar mensagem.' };
  } catch (err: any) {
    console.error('[adminTelegramNotification] ❌ Exceção ao enviar notificação:', err);
    return { success: false, error: err.message || 'Erro de conexão' };
  }
}

/**
 * EVENTO 1: Nova Loja Criada (Onboarding)
 * Gatilho: Imediatamente após a inserção bem-sucedida na tabela 'stores'.
 */
export async function notifyNewStoreCreated(data: TelegramNewStorePayload): Promise<{ success: boolean; error?: string }> {
  try {
    const phone = formatLojistaWhatsApp(data.whatsapp_number);
    const storeName = escapeTgMarkdown(data.store_name);
    const clientName = escapeTgMarkdown(data.client_name || 'Lojista');
    const clientEmail = escapeTgMarkdown(data.client_email || 'Não informado');
    const slug = data.slug.toLowerCase().trim();
    const status = escapeTgMarkdown(data.status || 'Período de Testes (Trial)');

    const message = 
      `🚀 *NOVA LOJA CRIADA!*\n` +
      `• Loja: ${storeName}\n` +
      `• Cliente: ${clientName}\n` +
      `• WhatsApp: ${phone.display} (${phone.waLink})\n` +
      `• E-mail: ${clientEmail}\n` +
      `• Domínio/Link: ${slug}.ajpstore.com.br\n` +
      `• Status: ${status}`;

    return await sendTelegramAdminNotification(message);
  } catch (err: any) {
    console.warn('[adminTelegramNotification] Erro ao disparar Nova Loja Criada:', err);
    return { success: false, error: err.message };
  }
}

/**
 * EVENTO 2: Pagamento Efetuado / Mensalidade Aprovada
 * Gatilho: Quando o pagamento é aprovado via Mercado Pago (Webhook ou polling de confirmação).
 */
export async function notifyPaymentApproved(data: TelegramPaymentApprovedPayload): Promise<{ success: boolean; error?: string }> {
  try {
    // Se whatsapp_number ou store_name não foram passados diretamente, busca no Supabase
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
    const finalStoreName = escapeTgMarkdown(storeName || 'Loja AJPSTORE');
    const finalClientName = escapeTgMarkdown(clientName || 'Lojista');

    const valorFormatted = typeof data.valor === 'number'
      ? data.valor.toFixed(2).replace('.', ',')
      : String(data.valor).replace('.', ',');

    const forma = escapeTgMarkdown(data.forma || 'Pix');
    const dataRenovada = escapeTgMarkdown(data.data_renovada || '30 dias');

    const message = 
      `💰 *PAGAMENTO CONFIRMADO!*\n` +
      `• Loja: ${finalStoreName}\n` +
      `• Cliente: ${finalClientName}\n` +
      `• WhatsApp: ${phone.display} (${phone.waLink})\n` +
      `• Valor: R$ ${valorFormatted}\n` +
      `• Forma: ${forma}\n` +
      `• Nova Validade: ${dataRenovada}`;

    return await sendTelegramAdminNotification(message);
  } catch (err: any) {
    console.warn('[adminTelegramNotification] Erro ao disparar Pagamento Confirmado:', err);
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
    const storeName = escapeTgMarkdown(data.store_name);
    const clientName = escapeTgMarkdown(data.client_name || 'Lojista');
    const diasRestantes = data.dias_restantes;
    const dataVencimento = escapeTgMarkdown(data.data_vencimento || 'Em breve');
    const status = escapeTgMarkdown(data.status || 'Trial Ativo');

    const message = 
      `⚠️ *PLANO VENCENDO EM BREVE!*\n` +
      `• Loja: ${storeName}\n` +
      `• Cliente: ${clientName}\n` +
      `• WhatsApp: ${phone.display} (${phone.waLink})\n` +
      `• Vencimento em: ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'} (${dataVencimento})\n` +
      `• Status atual: ${status}`;

    return await sendTelegramAdminNotification(message);
  } catch (err: any) {
    console.warn('[adminTelegramNotification] Erro ao disparar Plano Vencendo:', err);
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
