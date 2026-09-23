// @ts-nocheck
type VercelRequest = any;
type VercelResponse = any;

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

  try {
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://mbwxubnwaeywstnmlrqg.supabase.co').trim();
    const supabaseKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1id3h1Ym53YWV5d3N0bm1scnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODAwNDEsImV4cCI6MjEwMzg1NjA0MX0.gGa7ZDgiDuN_NNiNK7i7nHEVtaBQ8nEuOPSz0eIn4D4').trim();

    const reqHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    };

    // 1. Busca configurações globais do Telegram
    let telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';
    let telegramChatId = process.env.TELEGRAM_CHAT_ID || '';

    try {
      const gsRes = await fetch(`${supabaseUrl}/rest/v1/global_settings?select=*&limit=1`, { headers: reqHeaders });
      if (gsRes.ok) {
        const gsData = await gsRes.json();
        if (Array.isArray(gsData) && gsData.length > 0) {
          if (!telegramToken && gsData[0]?.telegram_bot_token) telegramToken = gsData[0].telegram_bot_token.trim();
          if (!telegramChatId && gsData[0]?.telegram_chat_id) telegramChatId = gsData[0].telegram_chat_id.trim();
        }
      }

      if (!telegramToken) {
        const stRes = await fetch(`${supabaseUrl}/rest/v1/stores?or=(is_matriz.eq.true,slug.eq.ajpstore)&select=*&limit=1`, { headers: reqHeaders });
        if (stRes.ok) {
          const stData = await stRes.json();
          if (Array.isArray(stData) && stData.length > 0) {
            if (!telegramToken && stData[0]?.telegram_bot_token) telegramToken = stData[0].telegram_bot_token.trim();
            if (!telegramChatId && stData[0]?.telegram_chat_id) telegramChatId = stData[0].telegram_chat_id.trim();
          }
        }
      }
    } catch (confErr) {
      console.warn('[check-expiring-stores] Aviso ao ler configurações globais:', confErr);
    }

    if (!telegramToken || !telegramChatId) {
      return res.status(200).json({
        success: false,
        warning: 'Telegram Bot Token ou Chat ID não configurados no Super Admin.'
      });
    }

    // 2. Busca lojas ativas da plataforma
    const storesRes = await fetch(`${supabaseUrl}/rest/v1/stores?select=*&is_active=eq.true&is_matriz=neq.true`, {
      headers: reqHeaders
    });

    if (!storesRes.ok) {
      return res.status(500).json({ success: false, error: 'Erro ao consultar lojas no banco.' });
    }

    const stores = await storesRes.json();
    const now = Date.now();
    const alertedList: any[] = [];

    for (const store of stores) {
      if (store.slug === 'ajpstore' || store.id === 'store_ajpstore' || store.slug === 'suamarcaaqui') continue;

      const rawExp = store.expires_at || store.trial_ends_at || store.vence_em;
      if (!rawExp || String(rawExp).startsWith('2099')) continue;

      const expTime = new Date(rawExp).getTime();
      const diffMs = expTime - now;
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Lojas com 5 dias ou menos para expirar
      if (daysRemaining <= 5 && daysRemaining >= -1) {
        const phoneInfo = formatLojistaWhatsApp(store.whatsapp_number || store.owner_phone || store.whatsapp);
        const storeName = escapeTgMarkdown(store.store_name || store.name || 'Loja AJPSTORE');
        const clientName = escapeTgMarkdown(store.client_name || store.owner_name || 'Lojista');
        const diasStr = daysRemaining > 0 ? String(daysRemaining) : '0';
        const dataVencimento = new Date(rawExp).toLocaleDateString('pt-BR');
        const statusAtual = store.subscription_status === 'trial' ? 'Período de Testes (Trial)' : 'Assinatura Ativa';

        const telegramMessage = 
          `⚠️ *PLANO VENCENDO EM BREVE!*\n` +
          `• Loja: ${storeName}\n` +
          `• Cliente: ${clientName}\n` +
          `• WhatsApp: ${phoneInfo.display} (${phoneInfo.waLink})\n` +
          `• Vencimento em: ${diasStr} ${diasStr === '1' ? 'dia' : 'dias'} (${dataVencimento})\n` +
          `• Status atual: ${statusAtual}`;

        try {
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

          alertedList.push({
            store: store.name || store.store_name,
            daysRemaining,
            expires_at: dataVencimento,
            whatsapp: phoneInfo.display
          });
        } catch (tgErr) {
          console.error('[check-expiring-stores] Erro ao enviar Telegram para loja:', store.id, tgErr);
        }
      }
    }

    return res.status(200).json({
      success: true,
      total_scanned: stores.length,
      total_alerted: alertedList.length,
      alerted: alertedList
    });
  } catch (err: any) {
    console.error('[check-expiring-stores] Erro inesperado:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
