import { CartItem, OrderCustomerInfo, StoreConfig } from '../types';
import { formatCurrency, formatDate } from './formatters';

/**
 * Gera o texto formatado do pedido para envio via WhatsApp para a Encantando Festa
 */
export function buildWhatsAppOrderMessage(
  items: CartItem[],
  customerInfo: OrderCustomerInfo,
  totalAmount: number,
  storeConfig: StoreConfig
): string {
  const deliveryText = customerInfo.deliveryType === 'retirada'
    ? '🛍️ *Retirada no Ateliê* (Rio de Janeiro/RJ)'
    : `🚚 *Entrega em Domicílio*\n   Endereço: ${customerInfo.address || 'Não informado'}${
        customerInfo.neighborhood ? ` - Bairro: ${customerInfo.neighborhood}` : ''
      }${customerInfo.city ? ` (${customerInfo.city})` : ''}`;

  const paymentText = {
    pix: '💠 Pix (Aprovação Imediata • Chave / QR Code)',
    cartao: '💳 Cartão de Crédito / Débito',
    dinheiro: '💵 Dinheiro na Retirada'
  }[customerInfo.paymentMethod] || customerInfo.paymentMethod;

  const itemsListText = items.map((item, index) => {
    const itemTotal = item.product.price * item.quantity;
    const unitSuffix = item.product.unitSuffix || '/Un';
    let text = `${index + 1}. *${item.quantity}x ${item.product.name}*\n   Valor: ${formatCurrency(item.product.price)} ${unitSuffix} ➜ *${formatCurrency(itemTotal)}*`;
    
    if (item.observations && item.observations.trim()) {
      text += `\n   ↳ 🎀 _Obs/Personalização: ${item.observations.trim()}_`;
    }
    return text;
  }).join('\n\n');

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const message = `✨ *NOVO PEDIDO - ENCANTANDO FESTA* ✨
*Papelaria Personalizada*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *DADOS DO CLIENTE:*
• *Nome:* ${customerInfo.name || 'Cliente'}
• *WhatsApp:* ${customerInfo.phone || 'Não informado'}
• *Data da Festa/Evento:* ${formatDate(customerInfo.eventDate)}

📍 *FORMA DE RECEBIMENTO:*
• ${deliveryText}

💳 *FORMA DE PAGAMENTO:*
• ${paymentText}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🛒 *ITENS DO PEDIDO (${totalQuantity} itens):*

${itemsListText}
━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *VALOR TOTAL DOS PRODUTOS:* *${formatCurrency(totalAmount)}*
${customerInfo.deliveryType === 'entrega' ? '_(Taxa de entrega/frete a calcular)_\n' : ''}
${customerInfo.generalNotes && customerInfo.generalNotes.trim() ? `📌 *OBSERVAÇÕES GERAIS:*\n"${customerInfo.generalNotes.trim()}"\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` : ''}
Olá! Gostaria de confirmar meu pedido. Aguardo orientações para envio da prévia das artes e dados para pagamento. Muito obrigado(a)! 💕`;

  return message;
}

/**
 * Cria o link wa.me direto com o número da loja e mensagem codificada em URL
 */
export function createWhatsAppUrl(
  phoneNumber: string,
  message: string
): string {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}
