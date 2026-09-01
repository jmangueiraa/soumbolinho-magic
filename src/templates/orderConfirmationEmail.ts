import { CartItem, StoreConfig } from '../types';
import { formatCurrency } from '../utils/formatters';

export interface OrderEmailData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  orderDate?: string;
  items: CartItem[];
  totalAmount: number;
  storeConfig?: Partial<StoreConfig>;
}

/**
 * Gera o HTML do e-mail de confirmação de pagamento com links de download,
 * exatamente no formato da imagem de referência.
 */
export function generateOrderConfirmationEmailHtml(data: OrderEmailData): string {
  const { customerName, orderId, orderDate = new Date().toLocaleDateString('pt-BR'), items, totalAmount, storeConfig } = data;
  const firstName = customerName.trim().split(' ')[0] || 'Cliente';
  const storeName = storeConfig?.storeName || 'Encantando Festa';

  const downloadRows = items.map((item) => {
    const downloadUrl = item.product.delivery_url || item.product.deliveryUrl || item.product.imageUrl || item.product.image || '#';
    return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 8px; font-size: 14px; color: #16a34a; font-weight: 600;">
          <a href="${downloadUrl}" target="_blank" style="color: #65a30d; text-decoration: underline;">
            ${item.product.name}
          </a>
        </td>
        <td style="padding: 12px 8px; font-size: 14px; color: #64748b;">
          Nunca
        </td>
        <td style="padding: 12px 8px; font-size: 14px; text-align: right;">
          <a href="${downloadUrl}" target="_blank" style="color: #65a30d; font-weight: 600; text-decoration: underline;">
            Baixar ${item.product.name}
          </a>
        </td>
      </tr>
    `;
  }).join('');

  const summaryRows = items.map((item) => {
    return `
      <tr style="border-bottom: 1px solid #f8fafc;">
        <td style="padding: 10px 8px; font-size: 14px; color: #334155;">
          ${item.product.name} × ${item.quantity}
        </td>
        <td style="padding: 10px 8px; font-size: 14px; font-weight: 600; color: #0f172a; text-align: right;">
          ${formatCurrency(item.product.price * item.quantity)}
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmação do Pedido #${orderId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        
        <!-- Container Principal -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          
          <!-- Cabeçalho com Logo -->
          <tr>
            <td style="padding: 32px 36px 20px 36px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
                      🛍️ <span style="color: #0f172a;">${storeName}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Título Principal -->
          <tr>
            <td style="padding: 0 36px;">
              <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                Boas coisas estão a caminho!
              </h1>
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                Olá, <strong>${firstName}</strong>,
              </p>
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                Acabamos de processar o seu pedido.
              </p>
              <p style="margin: 0 0 28px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                Aqui está um lembrete do que você pediu:
              </p>
            </td>
          </tr>

          <!-- Seção Downloads -->
          <tr>
            <td style="padding: 0 36px 24px 36px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
                Downloads
              </h2>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0;">
                    <th align="left" style="padding: 8px; font-size: 13px; font-weight: 700; color: #334155;">Produto</th>
                    <th align="left" style="padding: 8px; font-size: 13px; font-weight: 700; color: #334155;">Expira em</th>
                    <th align="right" style="padding: 8px; font-size: 13px; font-weight: 700; color: #334155;">Download</th>
                  </tr>
                </thead>
                <tbody>
                  ${downloadRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Divisor -->
          <tr>
            <td style="padding: 0 36px;">
              <div style="border-top: 1px solid #e2e8f0; margin: 10px 0 24px 0;"></div>
            </td>
          </tr>

          <!-- Seção Resumo do Pedido -->
          <tr>
            <td style="padding: 0 36px 36px 36px;">
              <h2 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
                Resumo do pedido
              </h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b; font-weight: 600;">
                Pedido #${orderId} (${orderDate})
              </p>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-bottom: 16px;">
                <tbody>
                  ${summaryRows}
                  <tr style="border-top: 2px solid #e2e8f0;">
                    <td style="padding: 12px 8px; font-size: 15px; font-weight: 800; color: #0f172a;">
                      Total
                    </td>
                    <td style="padding: 12px 8px; font-size: 16px; font-weight: 900; color: #0f172a; text-align: right;">
                      ${formatCurrency(totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <!-- Mensagem de Apoio -->
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; font-size: 13px; color: #475569; text-align: center;">
                Dúvidas sobre seus arquivos ou confecção? Fale conosco no WhatsApp: <strong>${storeConfig?.whatsappDisplay || '(21) 97497-5884'}</strong>
              </div>
            </td>
          </tr>

          <!-- Rodapé do E-mail -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 36px; text-align: center; font-size: 12px; color: #64748b;">
              © ${new Date().getFullYear()} ${storeName}. Todos os direitos reservados.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}
