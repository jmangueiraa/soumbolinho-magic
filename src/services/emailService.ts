import { OrderEmailData, generateOrderConfirmationEmailHtml } from '../templates/orderConfirmationEmail';

/**
 * Serviço de envio de e-mails transacionais de pedidos
 */
export async function sendOrderConfirmationEmail(
  data: OrderEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const htmlContent = generateOrderConfirmationEmailHtml(data);
    console.log('[emailService] 📧 Preparando envio do e-mail de confirmação para:', data.customerEmail);

    // 1. Salvar histórico de e-mail localmente para consulta
    try {
      const sentEmails = JSON.parse(localStorage.getItem('encantando_festa_sent_emails') || '[]');
      sentEmails.unshift({
        id: `email-${Date.now()}`,
        to: data.customerEmail,
        orderId: data.orderId,
        date: new Date().toISOString(),
        customerName: data.customerName,
        total: data.totalAmount,
        html: htmlContent,
      });
      localStorage.setItem('encantando_festa_sent_emails', JSON.stringify(sentEmails.slice(0, 50)));
    } catch (e) {
      console.warn('Falha ao salvar cache de e-mails:', e);
    }

    // 2. Se houver endpoint configurado (ex: Resend / Supabase Edge Functions / EmailJS)
    const customEmailEndpoint = (import.meta as any).env?.VITE_EMAIL_API_URL;
    if (customEmailEndpoint) {
      const response = await fetch(customEmailEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: data.customerEmail,
          subject: `Boas coisas estão a caminho! - Pedido #${data.orderId}`,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor de e-mails.');
      }
    }

    console.log('[emailService] ✅ E-mail transacional gerado e processado com sucesso para:', data.customerEmail);
    return { success: true };
  } catch (err: any) {
    console.error('[emailService] ❌ Erro ao enviar e-mail:', err);
    return { success: false, error: err.message || 'Falha no envio do e-mail' };
  }
}
