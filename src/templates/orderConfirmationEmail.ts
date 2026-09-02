import { CartItem, StoreConfig } from '../types';

export const DEFAULT_EMAIL_SUBJECT = 'Seu pedido da Soumbolinho | Produtos Digitais está a caminho!';

export interface OrderEmailData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  orderDate?: string;
  items: CartItem[];
  totalAmount?: number;
  storeConfig?: Partial<StoreConfig>;
}

/**
 * Gera o HTML exato do e-mail de confirmação de compra e entrega de downloads
 * substituindo:
 * 1. {{customer_name}}
 * 2. {{product_name}}
 * 3. {{delivery_url}}
 * 4. {{order_number}}
 * 5. {{order_date}}
 */
export function generateOrderConfirmationEmailHtml(data: OrderEmailData): string {
  const customer_name = data.customerName.trim() || 'Cliente';
  const order_number = data.orderId || '790';
  const order_date = data.orderDate || new Date().toLocaleDateString('pt-BR');

  // Monta as linhas de download para cada produto adquirido
  const downloadRowsHtml = data.items.map((item) => {
    const delivery_url = item.product.delivery_url || item.product.deliveryUrl || item.product.imageUrl || item.product.image || '#';
    const product_name = item.product.name;

    return `
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
  }).join('\n');

  return `<!DOCTYPE html>
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
}
