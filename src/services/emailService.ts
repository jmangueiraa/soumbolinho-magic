import { OrderEmailData, generateOrderConfirmationEmailHtml, DEFAULT_EMAIL_SUBJECT } from '../templates/orderConfirmationEmail';
import { markOrderEmailSentInSupabase } from './orderService';

/**
 * Serviço de envio de e-mails transacionais de pedidos via Vercel Serverless Function (/api/send-delivery-email) & Resend
 */
export async function sendOrderConfirmationEmail(
  data: OrderEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const htmlContent = generateOrderConfirmationEmailHtml(data);
    const emailSubject = DEFAULT_EMAIL_SUBJECT;
    const primaryItem = data.items[0];
    const productNames = data.items.map((i) => i.product.name).join(', ') || 'Produto Digital';
    const primaryDeliveryUrl = data.items
      .map((i) => i.product.delivery_url || i.product.deliveryUrl)
      .filter(Boolean)[0] || primaryItem?.product?.imageUrl || '#';

    console.log('[emailService] 📧 Enviando e-mail de entrega via /api/send-delivery-email...');
    console.log('[emailService] 👤 Para:', data.customerEmail);

    // 1. Salvar histórico local no navegador para backup imediato
    try {
      const sentEmails = JSON.parse(localStorage.getItem('encantando_festa_sent_emails') || '[]');
      sentEmails.unshift({
        id: `email-${Date.now()}`,
        to: data.customerEmail,
        orderId: data.orderId,
        subject: emailSubject,
        date: new Date().toISOString(),
        customerName: data.customerName,
        productName: productNames,
        deliveryUrl: primaryDeliveryUrl,
        total: data.totalAmount,
        html: htmlContent,
      });
      localStorage.setItem('encantando_festa_sent_emails', JSON.stringify(sentEmails.slice(0, 50)));
    } catch (e) {
      console.warn('Falha ao salvar cache local de e-mails:', e);
    }

    // 2. Chamada POST para o endpoint Serverless da Vercel (/api/send-delivery-email)
    try {
      const response = await fetch('/api/send-delivery-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: data.customerName,
          customer_email: data.customerEmail,
          product_name: productNames,
          delivery_url: primaryDeliveryUrl,
          order_number: data.orderId,
          order_date: data.orderDate || new Date().toLocaleDateString('pt-BR'),
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        console.log('[emailService] ✅ Resend disparou com sucesso:', resData);

        // 3. Atualiza o status do pedido no Supabase marcando email_sent = true
        if (data.orderId) {
          await markOrderEmailSentInSupabase(data.orderId);
        }

        return { success: true };
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn('[emailService] ⚠️ Resposta da API:', errJson);
      }
    } catch (fetchErr) {
      console.warn('[emailService] ⚠️ Falha na chamada para /api/send-delivery-email (ambiente local ou sem chave configurada):', fetchErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[emailService] ❌ Erro inesperado ao enviar e-mail:', err);
    return { success: false, error: err.message || 'Falha no envio do e-mail' };
  }
}
