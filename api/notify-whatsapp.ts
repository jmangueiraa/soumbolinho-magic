import type { VercelRequest, VercelResponse } from '@vercel/node';

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

/**
 * Normaliza número para envio internacional (DDI 55 caso falte)
 */
function cleanPhoneNumber(phone: string): string {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length >= 10 && !digits.startsWith('55')) {
    digits = `55${digits}`;
  }
  return digits;
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
      action_type = 'test',
      customer_name = '',
      customer_phone = '',
      customer_email = '',
      items = [],
      total_amount = 0,
      order_id = '',
      payment_method = '',
      shipping_address = '',
      store_name = 'Minha Loja',
      store_id = '',
      // Configurações passadas diretamente ou resolvidas no banco:
      whatsapp_api_provider = 'evolution',
      whatsapp_api_url = '',
      whatsapp_api_token = '',
      whatsapp_notify_phone = '',
    } = req.body || {};

    let provider = String(whatsapp_api_provider || 'evolution').toLowerCase().trim();
    let apiUrl = String(whatsapp_api_url || '').trim();
    let apiToken = String(whatsapp_api_token || '').trim();
    let notifyPhone = String(whatsapp_notify_phone || '').trim();

    // Se as credenciais não vieram no body, busca no Supabase (stores ou store_config)
    if ((!apiUrl && provider !== 'callmebot') || !notifyPhone) {
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mbwxubnwaeywstnmlrqg.supabase.co';
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1id3h1Ym53YWV5d3N0bm1scnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODAwNDEsImV4cCI6MjEwMzg1NjA0MX0.gGa7ZDgiDuN_NNiNK7i7nHEVtaBQ8nEuOPSz0eIn4D4';
        
        const reqHeaders: Record<string, string> = { 'apikey': supabaseKey };
        if (!supabaseKey.startsWith('sb_publishable_') && !supabaseKey.startsWith('sb_secret_')) {
          reqHeaders['Authorization'] = `Bearer ${supabaseKey}`;
        }

        const storeFilter = store_id ? `id=eq.${store_id}` : 'select=*&limit=5';
        const resStore = await fetch(`${supabaseUrl}/rest/v1/stores?${storeFilter}`, { headers: reqHeaders });
        if (resStore.ok) {
          const storeRows = await resStore.json();
          if (Array.isArray(storeRows) && storeRows.length > 0) {
            const row = storeRows[0];
            const ts = row.theme_settings || {};
            if (!apiUrl) apiUrl = row.whatsapp_api_url || ts.whatsapp_api_url || '';
            if (!apiToken) apiToken = row.whatsapp_api_token || ts.whatsapp_api_token || '';
            if (!notifyPhone) notifyPhone = row.whatsapp_notify_phone || ts.whatsapp_notify_phone || row.whatsapp_number || '';
            if (!provider || provider === 'evolution') {
              provider = row.whatsapp_api_provider || ts.whatsapp_api_provider || provider;
            }
          }
        }
      } catch (dbErr) {
        console.warn('[notify-whatsapp] Aviso ao consultar credenciais no Supabase:', dbErr);
      }
    }

    const cleanNotifyTarget = cleanPhoneNumber(notifyPhone);

    if (!cleanNotifyTarget) {
      return res.status(200).json({
        success: false,
        warning: 'Número de WhatsApp de notificação não informado. Defina o número com DDD nas configurações da loja.',
      });
    }

    // Monta o texto da mensagem formatada para o WhatsApp
    const displayPhone = formatDisplayPhone(customer_phone);
    const cleanCustomerDigits = String(customer_phone || '').replace(/\D/g, '');
    const waCustomerLink = cleanCustomerDigits ? `https://wa.me/${cleanCustomerDigits.startsWith('55') ? cleanCustomerDigits : '55' + cleanCustomerDigits}` : '';
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    let messageText = '';

    if (action_type === 'test') {
      messageText = 
        `🧪 *TESTE DE INTEGRAÇÃO - WHATSAPP API* 🚀\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ *Parabéns!* A integração com a API de WhatsApp da sua loja *${store_name}* está funcionando com sucesso!\n\n` +
        `📅 *Data/Hora do Teste:* ${now}\n` +
        `📱 *Destino:* ${formatDisplayPhone(cleanNotifyTarget)}\n\n` +
        `Você receberá notificações automáticas em tempo real sempre que um cliente:\n` +
        `• 🛒 Iniciar o checkout e salvar dados de contato (recuperação de lead)\n` +
        `• 🎉 Confirmar e aprovar um pagamento via Pix ou Cartão\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `_Sistema AJPSTORE / Soumbolinho Multi-Tenant_`;
    } else if (action_type === 'payment_approved') {
      let itemsList = '';
      if (Array.isArray(items) && items.length > 0) {
        itemsList = items.map((i: any) => {
          const rawName = i.product?.name || i.name || 'Produto Digital';
          const qty = i.quantity || 1;
          const val = Number(i.customPrice || i.price || i.product?.price || 0);
          return `• ${qty}x *${rawName}* (R$ ${val.toFixed(2).replace('.', ',')})`;
        }).join('\n');
      }

      messageText = 
        `🎉 *PAGAMENTO APROVADO!* 💎\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🛍️ *Loja:* ${store_name}\n` +
        `💰 *Valor Total Pago:* *R$ ${Number(total_amount || 0).toFixed(2).replace('.', ',')}*\n` +
        `💳 *Forma de Pagamento:* ${payment_method || 'Pix / Mercado Pago'}\n` +
        (order_id ? `🆔 *Código do Pedido:* #${order_id}\n` : '') +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *DADOS DO COMPRADOR:*\n` +
        `• *Nome:* ${customer_name || 'Cliente'}\n` +
        `• *WhatsApp:* ${displayPhone}\n` +
        `• *E-mail:* ${customer_email || 'Não informado'}\n` +
        (itemsList ? `\n📦 *ITENS ADQUIRIDOS:*\n${itemsList}\n` : '') +
        (shipping_address ? `\n🚚 *Endereço de Entrega:* ${shipping_address}\n` : '') +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ *Acesso:* Arquivos digitais liberados na vitrine do cliente!\n` +
        `📅 ${now}`;
    } else if (action_type === 'abandoned_cart') {
      let itemsList = '';
      if (Array.isArray(items) && items.length > 0) {
        itemsList = items.map((i: any) => {
          const rawName = i.product?.name || i.name || 'Produto Digital';
          const qty = i.quantity || 1;
          return `• ${qty}x ${rawName}`;
        }).join('\n');
      }

      messageText = 
        `🛒 *CARRINHO CAPTURADO / LEAD NOVO!* ⚠️\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Um cliente iniciou a compra na loja *${store_name}* e preencheu o formulário de contato:\n\n` +
        `👤 *Nome:* ${customer_name || 'Cliente'}\n` +
        `📱 *WhatsApp:* ${displayPhone}\n` +
        `📧 *E-mail:* ${customer_email || 'Não informado'}\n` +
        `💰 *Total do Carrinho:* *R$ ${Number(total_amount || 0).toFixed(2).replace('.', ',')}*\n` +
        (itemsList ? `\n📦 *Produtos Selecionados:*\n${itemsList}\n` : '') +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        (waCustomerLink ? `👉 *Clique para chamar o cliente agora:*\n${waCustomerLink}\n\n` : '') +
        `📅 ${now}`;
    } else {
      messageText = `🔔 *Notificação da Loja ${store_name}:* ${customer_name} - R$ ${Number(total_amount || 0).toFixed(2).replace('.', ',')}`;
    }

    console.log(`[notify-whatsapp] 📤 Disparando [${action_type}] via provedor "${provider}" para ${cleanNotifyTarget}...`);

    let dispatchResult: any = null;

    // 1. Provedor: CallMeBot (Gratuito e direto sem servidor)
    if (provider === 'callmebot') {
      const callmebotKey = apiToken || '123456';
      const encodedText = encodeURIComponent(messageText);
      const callmebotUrl = `https://api.callmebot.com/whatsapp.php?phone=${cleanNotifyTarget}&text=${encodedText}&apikey=${callmebotKey}`;
      
      const cmbRes = await fetch(callmebotUrl);
      const cmbBody = await cmbRes.text();
      
      if (!cmbRes.ok || cmbBody.toLowerCase().includes('error')) {
        throw new Error(`CallMeBot erro: ${cmbBody || cmbRes.statusText}`);
      }
      dispatchResult = { provider: 'callmebot', response: cmbBody };
    } 
    // 2. Provedor: Meta WhatsApp Cloud API Oficial
    else if (provider === 'meta') {
      const metaUrl = apiUrl.startsWith('http') 
        ? apiUrl 
        : `https://graph.facebook.com/v20.0/${apiUrl}/messages`;

      const metaRes = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanNotifyTarget,
          type: 'text',
          text: { body: messageText },
        }),
      });

      const metaData = await metaRes.json().catch(() => ({}));
      if (!metaRes.ok) {
        throw new Error(metaData?.error?.message || `Erro Meta WhatsApp API (HTTP ${metaRes.status})`);
      }
      dispatchResult = { provider: 'meta', response: metaData };
    }
    // 3. Provedores padrão: Evolution API / Z-API / Gateway Personalizado / Webhook
    else {
      if (!apiUrl) {
        return res.status(200).json({
          success: false,
          warning: 'URL da API do WhatsApp não configurada no painel /admin > API e Domínio.',
        });
      }

      // Prepara cabeçalhos de autenticação universais
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiToken) {
        headers['apikey'] = apiToken;
        headers['Client-Token'] = apiToken;
        headers['Authorization'] = `Bearer ${apiToken}`;
      }

      // Payload universal compatível com Evolution API, Z-API e Webhooks (n8n, Zapier, Make)
      const payload = {
        number: cleanNotifyTarget,
        phone: cleanNotifyTarget,
        text: messageText,
        message: messageText,
        action_type,
        customer_name,
        customer_phone,
        total_amount,
        order_id,
      };

      const resApi = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const dataApi = await resApi.json().catch(() => ({}));
      if (!resApi.ok) {
        throw new Error(dataApi?.message || dataApi?.error || `Erro da API do WhatsApp (HTTP ${resApi.status})`);
      }
      dispatchResult = { provider, response: dataApi };
    }

    console.log(`[notify-whatsapp] ✅ Notificação enviada com sucesso ao WhatsApp (${cleanNotifyTarget})!`);
    return res.status(200).json({
      success: true,
      action_type,
      recipient: cleanNotifyTarget,
      data: dispatchResult,
    });
  } catch (err: any) {
    console.error('[notify-whatsapp] ❌ Falha ao enviar notificação WhatsApp:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro inesperado ao conectar à API do WhatsApp.',
    });
  }
}
