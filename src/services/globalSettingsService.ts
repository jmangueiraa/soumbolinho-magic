import { supabase } from '../lib/supabase';

export interface GlobalApiSettings {
  mp_access_token: string;
  mp_public_key: string;
  telegram_bot_token: string;
  telegram_chat_id: string;
  updated_at?: string;
}

const DEFAULT_SETTINGS: GlobalApiSettings = {
  mp_access_token: '',
  mp_public_key: '',
  telegram_bot_token: '',
  telegram_chat_id: '',
};

/**
 * Busca as configurações globais de APIs no Supabase (tabela global_settings)
 * com fallback inteligente para a loja matriz na tabela stores e localStorage.
 */
export async function fetchGlobalSettings(): Promise<GlobalApiSettings> {
  const result: GlobalApiSettings = { ...DEFAULT_SETTINGS };

  // 1. Tentar ler da tabela global_settings no Supabase
  try {
    const { data: gsData, error: gsError } = await supabase
      .from('global_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!gsError && gsData) {
      if (gsData.mp_access_token) result.mp_access_token = String(gsData.mp_access_token).trim();
      if (gsData.mp_public_key) result.mp_public_key = String(gsData.mp_public_key).trim();
      if (gsData.telegram_bot_token) result.telegram_bot_token = String(gsData.telegram_bot_token).trim();
      if (gsData.telegram_chat_id) result.telegram_chat_id = String(gsData.telegram_chat_id).trim();
      if (gsData.updated_at) result.updated_at = gsData.updated_at;
    }
  } catch (err) {
    console.warn('[globalSettingsService] Tabela global_settings ainda não consultável:', err);
  }

  // 2. Se algum campo estiver vazio, tenta ler da loja Matriz (stores)
  if (!result.mp_access_token || !result.telegram_bot_token) {
    try {
      const { data: matrizData } = await supabase
        .from('stores')
        .select('*')
        .or('is_matriz.eq.true,slug.eq.ajpstore,id.eq.store_ajpstore')
        .limit(1)
        .maybeSingle();

      if (matrizData) {
        if (!result.mp_access_token && matrizData.mp_access_token) {
          result.mp_access_token = String(matrizData.mp_access_token).trim();
        }
        if (!result.telegram_bot_token && matrizData.telegram_bot_token) {
          result.telegram_bot_token = String(matrizData.telegram_bot_token).trim();
        }
        if (!result.telegram_chat_id && matrizData.telegram_chat_id) {
          result.telegram_chat_id = String(matrizData.telegram_chat_id).trim();
        }
      }
    } catch (storeErr) {
      console.warn('[globalSettingsService] Aviso ao consultar matriz em stores:', storeErr);
    }
  }

  // 3. Fallback de localStorage se algum valor continuar em branco
  if (typeof window !== 'undefined') {
    try {
      if (!result.mp_access_token) {
        result.mp_access_token = (
          localStorage.getItem('global_mp_access_token') || 
          localStorage.getItem('mp_access_token') || 
          import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN || 
          ''
        ).trim();
      }
      if (!result.mp_public_key) {
        result.mp_public_key = (
          localStorage.getItem('global_mp_public_key') || 
          import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || 
          ''
        ).trim();
      }
      if (!result.telegram_bot_token) {
        result.telegram_bot_token = (
          localStorage.getItem('global_telegram_bot_token') || 
          localStorage.getItem('telegram_bot_token') || 
          ''
        ).trim();
      }
      if (!result.telegram_chat_id) {
        result.telegram_chat_id = (
          localStorage.getItem('global_telegram_chat_id') || 
          localStorage.getItem('telegram_chat_id') || 
          ''
        ).trim();
      }
    } catch {}
  }

  return result;
}

/**
 * Salva as configurações globais de forma resiliente:
 * 1. Tabela global_settings (com upsert)
 * 2. Espelhamento na tabela stores da loja Matriz
 * 3. Cache local no navegador (localStorage)
 */
export async function saveGlobalSettings(
  settings: Partial<GlobalApiSettings>
): Promise<{ success: boolean; error?: string }> {
  const cleanSettings = {
    mp_access_token: (settings.mp_access_token ?? '').trim(),
    mp_public_key: (settings.mp_public_key ?? '').trim(),
    telegram_bot_token: (settings.telegram_bot_token ?? '').trim(),
    telegram_chat_id: (settings.telegram_chat_id ?? '').trim(),
    updated_at: new Date().toISOString()
  };

  let savedInDb = false;
  let lastErrorMessage = '';

  // 1. Tentar gravar na tabela global_settings
  try {
    const { error: gsErr } = await supabase
      .from('global_settings')
      .upsert(
        {
          id: 'default',
          ...cleanSettings
        },
        { onConflict: 'id' }
      );

    if (!gsErr) {
      savedInDb = true;
      console.log('[globalSettingsService] ✅ Configurações gravadas em global_settings');
    } else {
      lastErrorMessage = gsErr.message;
      console.warn('[globalSettingsService] Aviso ao gravar em global_settings (tentando fallback):', gsErr.message);
    }
  } catch (err: any) {
    lastErrorMessage = err?.message || 'Erro de conexão';
    console.warn('[globalSettingsService] Exceção em global_settings:', err);
  }

  // 2. Espelhar na loja Matriz (tabela stores) para compatibilidade imediata com rotinas existentes
  try {
    const updateStorePayload: any = {
      updated_at: cleanSettings.updated_at
    };
    if (cleanSettings.mp_access_token) updateStorePayload.mp_access_token = cleanSettings.mp_access_token;
    if (cleanSettings.telegram_bot_token) updateStorePayload.telegram_bot_token = cleanSettings.telegram_bot_token;
    if (cleanSettings.telegram_chat_id) updateStorePayload.telegram_chat_id = cleanSettings.telegram_chat_id;

    const { error: storeErr } = await supabase
      .from('stores')
      .update(updateStorePayload)
      .or('is_matriz.eq.true,slug.eq.ajpstore,id.eq.store_ajpstore');

    if (!storeErr) {
      savedInDb = true;
      console.log('[globalSettingsService] ✅ Configurações espelhadas na loja Matriz (stores)');
    }
  } catch (errStore) {
    console.warn('[globalSettingsService] Aviso ao espelhar em stores:', errStore);
  }

  // 3. Gravar em cache local no navegador
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('global_mp_access_token', cleanSettings.mp_access_token);
      localStorage.setItem('global_mp_public_key', cleanSettings.mp_public_key);
      localStorage.setItem('global_telegram_bot_token', cleanSettings.telegram_bot_token);
      localStorage.setItem('global_telegram_chat_id', cleanSettings.telegram_chat_id);

      // Sincroniza também com as chaves gerais caso usadas pelo checkout
      if (cleanSettings.mp_access_token) localStorage.setItem('mp_access_token', cleanSettings.mp_access_token);
    } catch (lsErr) {
      console.warn('[globalSettingsService] Erro ao gravar localStorage:', lsErr);
    }
  }

  if (savedInDb) {
    return { success: true };
  }

  return { 
    success: true, 
    error: lastErrorMessage ? `Salvo localmente. Aviso do banco: ${lastErrorMessage}` : undefined 
  };
}

/**
 * Valida o Access Token fornecido diretamente com a API do Mercado Pago
 */
export async function testMercadoPagoToken(
  token: string
): Promise<{ success: boolean; message: string; details?: any }> {
  const clean = (token || '').trim();
  if (!clean) {
    return { success: false, message: 'Informe o Access Token do Mercado Pago antes de testar.' };
  }

  if (!clean.startsWith('APP_USR-') && !clean.startsWith('TEST-')) {
    return {
      success: false,
      message: 'O token parece não seguir o formato padrão do Mercado Pago (deve começar com APP_USR- ou TEST-).'
    };
  }

  try {
    const res = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${clean}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const methodsCount = Array.isArray(data) ? data.length : 0;
      return {
        success: true,
        message: `Token validado com sucesso! Autenticação aprovada no Mercado Pago (${methodsCount} métodos de pagamento disponíveis).`
      };
    } else {
      const errData = await res.json().catch(() => ({}));
      const reason = errData?.message || `HTTP ${res.status}: Credencial não autorizada.`;
      return {
        success: false,
        message: `Falha na autenticação do Mercado Pago: ${reason}`
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Erro de conexão ao testar Mercado Pago: ${err?.message || 'Verifique sua internet ou tente novamente.'}`
    };
  }
}

/**
 * Dispara uma notificação de teste imediata para o Telegram via Bot API
 */
export async function testTelegramNotification(
  token: string, 
  chatId: string
): Promise<{ success: boolean; message: string }> {
  const cleanToken = (token || '').trim();
  const cleanChatId = (chatId || '').trim();

  if (!cleanToken) {
    return { success: false, message: 'Informe o Token do Bot do Telegram antes de testar.' };
  }
  if (!cleanChatId) {
    return { success: false, message: 'Informe o Chat ID antes de testar.' };
  }

  const nowFormatted = new Date().toLocaleString('pt-BR');
  const messageText = 
    `🔔 *Teste de Notificação Global - AJPSTORE*\n\n` +
    `✅ *Sucesso:* Suas credenciais do Telegram foram configuradas e validadas com sucesso no Painel Super Admin!\n\n` +
    `🕒 *Data/Hora:* ${nowFormatted}\n` +
    `💬 *Chat ID:* \`${cleanChatId}\`\n\n` +
    `_A partir de agora, este canal receberá alertas automáticos da plataforma!_`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: messageText,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();

    if (response.ok && data.ok) {
      return {
        success: true,
        message: 'Mensagem de teste entregue com sucesso no seu Telegram!'
      };
    }

    if (data.description?.includes('chat not found')) {
      return {
        success: false,
        message: 'Chat não encontrado. Certifique-se de ter iniciado uma conversa com o bot enviando "/start" no Telegram antes de testar.'
      };
    }

    if (data.description?.includes('Unauthorized')) {
      return {
        success: false,
        message: 'Token do Bot inválido ou não autorizado pelo Telegram. Verifique no @BotFather.'
      };
    }

    return {
      success: false,
      message: `Erro retornado pelo Telegram: ${data.description || 'Falha no envio.'}`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro de conexão ao enviar para o Telegram: ${err?.message || 'Falha de rede.'}`
    };
  }
}
