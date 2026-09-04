import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configura CORS
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
      customer_name = 'Cliente',
      customer_email,
      product_name = 'Produto Digital',
      delivery_url = '#',
      order_number = '790',
      order_date = new Date().toLocaleDateString('pt-BR'),
      items = [],
    } = req.body || {};

    if (!customer_email) {
      return res.status(400).json({ success: false, error: 'O e-mail do cliente (customer_email) é obrigatório.' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('[api/send-delivery-email] ⚠️ RESEND_API_KEY não configurada na Vercel.');
      return res.status(200).json({
        success: true,
        warning: 'RESEND_API_KEY ausente. Configure na Vercel para envio real.',
      });
    }

    const resend = new Resend(apiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Soumbolinho <onboarding@resend.dev>';
    const subject = 'Seu pedido da Soumbolinho | Produtos Digitais está a caminho!';

    // Monta as linhas de download para cada produto adquirido
    const downloadRowsHtml = Array.isArray(items) && items.length > 0
      ? items.map((item: any) => {
          const itemUrl = item.delivery_url || item.deliveryUrl || delivery_url;
          const itemName = item.name || product_name;
          return `
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 14px 0; font-size: 14px;">
                <a href="${itemUrl}" style="color: #48bb78; text-decoration: none; font-weight: 600;">
                  ${itemName}
                </a>
              </td>
              <td style="padding: 14px 0; font-size: 14px; color: #4b5563;">
                Nunca
              </td>
              <td align="right" style="padding: 14px 0; font-size: 14px;">
                <a href="${itemUrl}" target="_blank" style="color: #48bb78; text-decoration: underline; font-weight: 600;">
                  Baixar ${itemName}
                </a>
              </td>
            </tr>`;
        }).join('\n')
      : `
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 14px 0; font-size: 14px;">
                <a href="${delivery_url}" style="color: #48bb78; text-decoration: none; font-weight: 600;">
                  ${product_name}
                </a>
              </td>
              <td style="padding: 14px 0; font-size: 14px; color: #4b5563;">
                Nunca
              </td>
              <td align="right" style="padding: 14px 0; font-size: 14px;">
                <a href="${delivery_url}" target="_blank" style="color: #48bb78; text-decoration: underline; font-weight: 600;">
                  Baixar ${product_name}
                </a>
              </td>
            </tr>`;

    // Renderiza o HTML exato com as variáveis substituídas
    const htmlBody = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seu pedido está a caminho!</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333333;">

  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 32px;">
    <tr>
      <td>
        <!-- Logotipo / Cabeçalho -->
        <div style="margin-bottom: 24px;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #111827;">
            🛍️ Soum<span style="color: #48bb78;">bolinho</span>
          </h2>
        </div>

        <!-- Título Principal -->
        <h1 style="font-size: 24px; font-weight: 800; color: #111827; margin: 0 0 16px 0;">
          Boas coisas estão a caminho!
        </h1>

        <!-- Saudação e Texto de Entrada -->
        <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px 0;">
          Olá, <strong>${customer_name}</strong>,
        </p>
        <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px 0;">
          Acabamos de processar o seu pedido.
        </p>
        <p style="font-size: 15px; color: #4b5563; margin: 0 0 24px 0;">
          Aqui está um lembrete do que você pediu:
        </p>

        <!-- Seção de Downloads -->
        <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 16px 0;">
          Downloads
        </h3>

        <!-- Tabela de Arquivos para Baixar -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 28px;">
          <thead>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <th align="left" style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #111827;">Produto</th>
              <th align="left" style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #111827;">Expira em</th>
              <th align="right" style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #111827;">Download</th>
            </tr>
          </thead>
          <tbody>
${downloadRowsHtml}
          </tbody>
        </table>

        <!-- Resumo do Pedido -->
        <h3 style="font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 6px 0;">
          Resumo do pedido
        </h3>
        <p style="font-size: 14px; color: #6b7280; margin: 0;">
          Pedido #${order_number} (${order_date})
        </p>

      </td>
    </tr>
  </table>

</body>
</html>`;

    console.log(`[Resend] 🚀 Enviando e-mail para ${customer_email}...`);

    const result = await resend.emails.send({
      from: fromEmail,
      to: [customer_email],
      subject: subject,
      html: htmlBody,
    });

    if (result.error) {
      console.error('[Resend] ❌ Erro ao enviar e-mail:', result.error);
      return res.status(400).json({ success: false, error: result.error });
    }

    console.log('[Resend] ✅ E-mail enviado com sucesso. ID:', result.data?.id);
    return res.status(200).json({ success: true, data: result.data });
  } catch (error: any) {
    console.error('[Resend] ❌ Exceção:', error);
    return res.status(500).json({ success: false, error: error.message || 'Erro interno no servidor' });
  }
}
