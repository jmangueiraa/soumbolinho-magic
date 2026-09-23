// @ts-nocheck
type VercelRequest = any;
type VercelResponse = any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configura headers para CORS irrestrito
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Utilize POST.' });
  }

  try {
    const {
      message = '',
      event_type = 'general',
      telegram_bot_token = '',
      telegram_chat_id = '',
      store_data = null,
    } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Corpo da mensagem (message) é obrigatório.' });
    }

    console.log(`[notify-admin-telegram] 📨 Requisição recebida para evento [${event_type}]`);

    let botToken = (telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || '').trim();
    let chatId = (telegram_chat_id || process.env.TELEGRAM_CHAT_ID || '').trim();

    // Se as credenciais não foram passadas ou estiverem incompletas, busca no Supabase
    if (!botToken || !chatId) {
      try {
        const supabaseUrl = (
          process.env.SUPABASE_URL || 
          process.env.VITE_SUPABASE_URL || 
          'https://mbwxubnwaeywstnmlrqg.supabase.co'
        ).trim();

        const supabaseKey = (
          process.env.SUPABASE_ANON_KEY || 
          process.env.VITE_SUPABASE_ANON_KEY || 
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1id3h1Ym53YWV5d3N0bm1scnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODAwNDEsImV4cCI6MjEwMzg1NjA0MX0.gGa7ZDgiDuN_NNiNK7i7nHEVtaBQ8nEuOPSz0eIn4D4'
        ).trim();

        const reqHeaders: Record<string, string> = {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        };

        // 1. Tenta ler da tabela global_settings configurada pelo Super Admin
        try {
          const gsRes = await fetch(`${supabaseUrl}/rest/v1/global_settings?select=*&limit=1`, { headers: reqHeaders });
          if (gsRes.ok) {
            const gsRows = await gsRes.json();
            if (Array.isArray(gsRows) && gsRows.length > 0) {
              if (!botToken && gsRows[0]?.telegram_bot_token) {
                botToken = String(gsRows[0].telegram_bot_token).trim();
              }
              if (!chatId && gsRows[0]?.telegram_chat_id) {
                chatId = String(gsRows[0].telegram_chat_id).trim();
              }
            }
          }
        } catch (e) {
          console.warn('[notify-admin-telegram] Tabela global_settings inacessível:', e);
        }

        // 2. Tenta ler da tabela stores (verificando loja Matriz e varrendo todas as lojas)
        if (!botToken || !chatId) {
          try {
            const storesRes = await fetch(`${supabaseUrl}/rest/v1/stores?select=*&limit=30`, { headers: reqHeaders });
            if (storesRes.ok) {
              const storeRows = await storesRes.json();
              if (Array.isArray(storeRows) && storeRows.length > 0) {
                // Procura primeiro por lojas matriz
                const matrizStore = storeRows.find((s: any) => 
                  Boolean(s.is_matriz) || s.slug === 'ajpstore' || s.id === 'store_ajpstore'
                );

                if (matrizStore) {
                  const mToken = matrizStore.telegram_bot_token || matrizStore.theme_settings?.telegram_bot_token;
                  const mChat = matrizStore.telegram_chat_id || matrizStore.theme_settings?.telegram_chat_id;
                  if (!botToken && mToken) botToken = String(mToken).trim();
                  if (!chatId && mChat) chatId = String(mChat).trim();
                }

                // Se ainda faltar, varre qualquer loja com credenciais cadastradas
                if (!botToken || !chatId) {
                  for (const s of storeRows) {
                    const rowToken = s.telegram_bot_token || s.theme_settings?.telegram_bot_token;
                    const rowChat = s.telegram_chat_id || s.theme_settings?.telegram_chat_id;
                    if (!botToken && rowToken) botToken = String(rowToken).trim();
                    if (!chatId && rowChat) chatId = String(rowChat).trim();
                    if (botToken && chatId) break;
                  }
                }
              }
            }
          } catch (e) {
            console.warn('[notify-admin-telegram] Falha ao consultar stores:', e);
          }
        }

        // 3. Tenta ler da tabela store_config
        if (!botToken || !chatId) {
          try {
            const cfgRes = await fetch(`${supabaseUrl}/rest/v1/store_config?select=*&limit=20`, { headers: reqHeaders });
            if (cfgRes.ok) {
              const cfgRows = await cfgRes.json();
              if (Array.isArray(cfgRows) && cfgRows.length > 0) {
                for (const c of cfgRows) {
                  if (!botToken && c.telegram_bot_token) botToken = String(c.telegram_bot_token).trim();
                  if (!chatId && c.telegram_chat_id) chatId = String(c.telegram_chat_id).trim();
                  if (botToken && chatId) break;
                }
              }
            }
          } catch (e) {
            console.warn('[notify-admin-telegram] Falha ao consultar store_config:', e);
          }
        }
      } catch (dbErr) {
        console.warn('[notify-admin-telegram] Erro geral ao buscar credenciais no banco:', dbErr);
      }
    }

    if (!botToken || !chatId) {
      console.warn('[notify-admin-telegram] ⚠️ Token ou Chat ID do Telegram não configurados.');
      return res.status(200).json({
        success: false,
        warning: 'Telegram Bot Token ou Chat ID não configurados no Super Admin ou nas variáveis de ambiente.',
        botConfigured: Boolean(botToken),
        chatConfigured: Boolean(chatId)
      });
    }

    console.log(`[notify-admin-telegram] 🚀 Despachando mensagem para Chat ID: ${chatId.slice(0, 4)}****`);

    // 1. Primeira tentativa: com parse_mode: 'Markdown'
    let tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    });

    let tgData = await tgRes.json().catch(() => ({}));

    // 2. Se falhar por erro de parsing do Markdown (ex: caracteres especiais), reenvia como texto puro
    if (!tgRes.ok && (tgData?.description?.includes("can't parse") || tgData?.description?.includes("entity"))) {
      console.warn('[notify-admin-telegram] ⚠️ Erro de parsing Markdown no Telegram. Reenviando em texto plano...', tgData?.description);
      const plainText = message.replace(/[*_`]/g, '');
      tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: plainText,
          disable_web_page_preview: true
        })
      });
      tgData = await tgRes.json().catch(() => ({}));
    }

    if (tgRes.ok && tgData.ok) {
      console.log('[notify-admin-telegram] ✅ Mensagem entregue com sucesso no Telegram!');
      return res.status(200).json({
        success: true,
        messageId: tgData?.result?.message_id,
        event_type
      });
    }

    console.warn('[notify-admin-telegram] ❌ Telegram recusou envio:', tgData);
    return res.status(200).json({
      success: false,
      error: tgData?.description || 'Falha ao entregar mensagem no Telegram.',
      details: tgData
    });

  } catch (error: any) {
    console.error('[notify-admin-telegram] ❌ Erro interno:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erro interno ao processar notificação.'
    });
  }
}
