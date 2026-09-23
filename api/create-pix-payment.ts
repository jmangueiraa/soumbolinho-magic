// @ts-nocheck
type VercelRequest = any;
type VercelResponse = any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Idempotency-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Use POST.' });
  }

  try {
    const {
      amount,
      transaction_amount,
      description = 'Pedido Soumbolinho',
      customer_name = 'Cliente',
      customer_email,
      customer_cpf,
      cpf,
      access_token: clientAccessToken,
    } = req.body || {};

    const rawToken = clientAccessToken || process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.VITE_MERCADO_PAGO_ACCESS_TOKEN || '';
    let accessToken = rawToken.replace(/['";\s]/g, '').trim();

    if (!accessToken) {
      const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://mbwxubnwaeywstnmlrqg.supabase.co').trim();
      const supabaseKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1id3h1Ym53YWV5d3N0bm1scnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODAwNDEsImV4cCI6MjEwMzg1NjA0MX0.gGa7ZDgiDuN_NNiNK7i7nHEVtaBQ8nEuOPSz0eIn4D4').trim();

      if (supabaseUrl && supabaseKey) {
        try {
          const reqHeaders: any = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          };
          // 1. Tentar ler da tabela global_settings salva pelo Super Admin
          const gsRes = await fetch(`${supabaseUrl}/rest/v1/global_settings?select=*&limit=1`, { headers: reqHeaders });
          if (gsRes.ok) {
            const gsData = await gsRes.json();
            if (Array.isArray(gsData) && gsData[0]?.mp_access_token) {
              accessToken = String(gsData[0].mp_access_token).trim();
            }
          }

          // 2. Se não encontrou, tenta na tabela stores (matriz)
          if (!accessToken) {
            const stRes = await fetch(`${supabaseUrl}/rest/v1/stores?or=(is_matriz.eq.true,slug.eq.ajpstore)&select=*&limit=1`, { headers: reqHeaders });
            if (stRes.ok) {
              const stData = await stRes.json();
              if (Array.isArray(stData) && stData[0]?.mp_access_token) {
                accessToken = String(stData[0].mp_access_token).trim();
              }
            }
          }
        } catch (dbErr) {
          console.warn('[create-pix-payment] Erro ao consultar credenciais globais no Supabase:', dbErr);
        }
      }
    }

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access Token do Mercado Pago não configurado. Por favor, configure no Painel Super Admin (Aba Integrações Globais) ou nas variáveis de ambiente da Vercel.',
      });
    }

    const value = amount !== undefined ? amount : transaction_amount;
    const numericAmount = Number(parseFloat(String(value)).toFixed(2));
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'O valor da transação deve ser maior que zero.',
      });
    }

    if (!customer_email) {
      return res.status(400).json({
        success: false,
        error: 'O e-mail do comprador (customer_email) é obrigatório.',
      });
    }

    function generateValidRandomCpf(): string {
      const rnd = (n: number) => Math.floor(Math.random() * n);
      const digits = Array.from({ length: 9 }, () => rnd(10));
      let sum1 = 0;
      for (let i = 0; i < 9; i++) sum1 += digits[i] * (10 - i);
      let rem1 = sum1 % 11;
      const d10 = rem1 < 2 ? 0 : 11 - rem1;
      digits.push(d10);
      let sum2 = 0;
      for (let i = 0; i < 10; i++) sum2 += digits[i] * (11 - i);
      let rem2 = sum2 % 11;
      const d11 = rem2 < 2 ? 0 : 11 - rem2;
      digits.push(d11);
      return digits.join('');
    }

    const rawCpf = String(customer_cpf || cpf || '').replace(/\D/g, '');
    const cleanCpf = rawCpf.length === 11 ? rawCpf : generateValidRandomCpf();

    const trimmedName = String(customer_name || 'Cliente').trim();
    const firstName = trimmedName.split(' ')[0] || 'Cliente';
    const lastName = trimmedName.split(' ').slice(1).join(' ') || 'Comprador';

    // Payload para o Mercado Pago (com silenciamento de e-mails e binary_mode)
    const payerObj: any = {
      email: 'cobranca@soumbolinho.com.br',
      first_name: firstName,
      last_name: lastName,
      identification: {
        type: 'CPF',
        number: cleanCpf,
      },
    };

    const pixPayload = {
      transaction_amount: Number(parseFloat(String(numericAmount)).toFixed(2)),
      description: 'Pedido Soumbolinho',
      payment_method_id: 'pix',
      binary_mode: true,
      payer: payerObj,
    };

    const idempotencyKey = `${Date.now()}-${Math.random()}`;

    console.log('[Mercado Pago v1/payments] 🚀 Enviando payload com CPF:', JSON.stringify(pixPayload));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(pixPayload),
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('[Mercado Pago v1/payments] ❌ Erro retornado pela API:', data);
      
      let detailedCause = '';
      if (Array.isArray(data.cause) && data.cause.length > 0) {
        detailedCause = data.cause.map((c: any) => `${c.code || ''}: ${c.description || JSON.stringify(c)}`).join('; ');
      } else if (data.cause) {
        detailedCause = typeof data.cause === 'object' ? JSON.stringify(data.cause) : String(data.cause);
      }

      const errorMessage = data.message || 'Erro ao gerar pagamento Pix no Mercado Pago.';
      const fullError = detailedCause ? `${errorMessage} (Detalhes: ${detailedCause})` : errorMessage;

      return res.status(mpResponse.status).json({
        success: false,
        status: mpResponse.status,
        message: data.message,
        cause: data.cause,
        error: fullError,
      });
    }

    // Extração completa do QR Code e Copia e Cola
    const transactionData = data.point_of_interaction?.transaction_data;
    const qrCode = transactionData?.qr_code || '';
    const rawQrCodeBase64 = transactionData?.qr_code_base64 || '';
    const qrCodeImage = rawQrCodeBase64 ? `data:image/png;base64,${rawQrCodeBase64}` : '';

    console.log('[Mercado Pago v1/payments] ✅ Pix gerado com sucesso! ID:', data.id);

    return res.status(200).json({
      success: true,
      id: data.id,
      status: data.status,
      status_detail: data.status_detail,
      qr_code: qrCode,
      qr_code_base64: rawQrCodeBase64,
      qr_code_image: qrCodeImage,
      ticket_url: transactionData?.ticket_url || '',
    });
  } catch (err: any) {
    console.error('[Mercado Pago v1/payments] ❌ Exceção:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro interno ao comunicar com o Mercado Pago.',
    });
  }
}
