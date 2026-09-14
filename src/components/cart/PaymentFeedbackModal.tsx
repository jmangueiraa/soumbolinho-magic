import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Clock, XCircle, MessageCircle, Download, X, Mail, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { createWhatsAppUrl } from '../../utils/whatsapp';
import { formatCurrency } from '../../utils/formatters';
import { sendOrderConfirmationEmail } from '../../services/emailService';
import { updateOrderStatusInSupabase } from '../../services/orderService';
import { notifyTelegram } from '../../services/telegramNotificationService';
import { notifyWhatsApp } from '../../services/whatsappNotificationService';

export const PaymentFeedbackModal: React.FC = () => {
  const { items, totalPrice, clearCart, openCheckout } = useCart();
  const { storeConfig } = useStoreData();
  const [status, setStatus] = useState<'success' | 'approved' | 'pending' | 'failure' | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [purchasedItems, setPurchasedItems] = useState(items);
  const [orderTotal, setOrderTotal] = useState(totalPrice);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;

    // Analisa parâmetros tanto na query string da URL quanto no hash router
    const searchParams = new URLSearchParams(window.location.search);
    const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const hashParams = new URLSearchParams(hashQuery);

    const paymentStatus =
      searchParams.get('payment_status') ||
      searchParams.get('collection_status') ||
      searchParams.get('status') ||
      hashParams.get('payment_status') ||
      hashParams.get('collection_status') ||
      hashParams.get('status');

    const payment_id =
      searchParams.get('payment_id') ||
      searchParams.get('collection_id') ||
      hashParams.get('payment_id') ||
      hashParams.get('collection_id');

    const rawOrderId =
      searchParams.get('order_id') ||
      searchParams.get('external_reference') ||
      hashParams.get('order_id') ||
      hashParams.get('external_reference');

    if (paymentStatus) {
      hasProcessedRef.current = true;

      // Recupera dados salvos do comprador na sessão
      let customerName = 'Cliente';
      let customerEmail = 'cliente@soumbolinho.com.br';
      let customerPhone = '';
      let savedOrderId = '';
      let savedItems: any[] = [];
      let savedTotal = 0;

      try {
        const saved = sessionStorage.getItem('last_checkout_customer') || localStorage.getItem('last_checkout_customer');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.name) customerName = parsed.name;
          if (parsed.email) customerEmail = parsed.email;
          if (parsed.phone) customerPhone = parsed.phone;
          if (parsed.orderId) savedOrderId = parsed.orderId;
        }
        const rawItems = sessionStorage.getItem('last_checkout_items') || localStorage.getItem('last_checkout_items');
        if (rawItems) {
          savedItems = JSON.parse(rawItems);
        }
        const rawTotal = sessionStorage.getItem('last_checkout_total') || localStorage.getItem('last_checkout_total');
        if (rawTotal) {
          savedTotal = parseFloat(rawTotal);
        }
      } catch (e) {
        console.warn(e);
      }

      const finalOrderId = rawOrderId || savedOrderId || sessionStorage.getItem('last_order_id') || payment_id || `order_${Date.now()}`;
      const activeItems = items.length > 0 ? items : (savedItems.length > 0 ? savedItems : purchasedItems);
      const activeTotal = totalPrice > 0 ? totalPrice : (savedTotal > 0 ? savedTotal : orderTotal);

      if (['success', 'approved'].includes(paymentStatus.toLowerCase())) {
        setStatus('success');
        setPurchasedItems(activeItems);
        setOrderTotal(activeTotal);

        // 1. Atualizar status na tabela 'orders' do Supabase para 'approved'
        if (finalOrderId) {
          console.log('[PaymentFeedbackModal] 📝 Atualizando pedido no Supabase para approved:', finalOrderId);
          updateOrderStatusInSupabase(finalOrderId, 'approved');
        }

        // 2. Disparar notificação de Pagamento Aprovado no Telegram e WhatsApp
        console.log('[PaymentFeedbackModal] 🚨 Notificando aprovação no Telegram e WhatsApp...');
        notifyTelegram({
          action_type: 'payment_approved',
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          items: activeItems,
          total_amount: activeTotal,
          order_id: finalOrderId,
          payment_id: payment_id || finalOrderId,
          payment_method: 'Mercado Pago Checkout Pro',
          telegram_bot_token: storeConfig.telegramBotToken,
          telegram_chat_id: storeConfig.telegramChatId,
        });

        notifyWhatsApp({
          action_type: 'payment_approved',
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          items: activeItems,
          total_amount: activeTotal,
          order_id: finalOrderId,
          payment_id: payment_id || finalOrderId,
          payment_method: 'Mercado Pago Checkout Pro',
          store_name: storeConfig.name,
          store_id: storeConfig.id || 'suamarcaaqui',
          whatsapp_api_provider: storeConfig.whatsappApiProvider,
          whatsapp_api_url: storeConfig.whatsappApiUrl,
          whatsapp_api_token: storeConfig.whatsappApiToken,
          whatsapp_notify_phone: storeConfig.whatsappNotifyPhone,
        }).catch(e => console.warn('Aviso ao notificar WhatsApp:', e));

        // 3. Disparar envio do e-mail de confirmação via Resend (/api/send-delivery-email)
        sendOrderConfirmationEmail({
          customerName,
          customerEmail,
          orderId: payment_id || finalOrderId,
          items: activeItems,
          totalAmount: activeTotal,
          storeConfig,
        });

        clearCart();
      } else if (['pending', 'in_process'].includes(paymentStatus.toLowerCase())) {
        setStatus('pending');
      } else if (['failure', 'rejected', 'cancelled'].includes(paymentStatus.toLowerCase())) {
        setStatus('failure');

        // Atualizar status no Supabase para 'cancelled'
        if (finalOrderId) {
          updateOrderStatusInSupabase(finalOrderId, 'cancelled');
        }

        // Notificar reprovação/cancelamento no Telegram e WhatsApp
        notifyTelegram({
          action_type: 'payment_rejected',
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          items: activeItems,
          total_amount: activeTotal,
          order_id: finalOrderId,
          payment_method: 'Mercado Pago Checkout Pro',
          error_message: 'Pagamento não concluído ou cancelado no Checkout Pro',
          telegram_bot_token: storeConfig.telegramBotToken,
          telegram_chat_id: storeConfig.telegramChatId,
        });

        notifyWhatsApp({
          action_type: 'payment_rejected',
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          items: activeItems,
          total_amount: activeTotal,
          order_id: finalOrderId,
          payment_method: 'Mercado Pago Checkout Pro',
          store_name: storeConfig.name,
          store_id: storeConfig.id || 'suamarcaaqui',
          whatsapp_api_provider: storeConfig.whatsappApiProvider,
          whatsapp_api_url: storeConfig.whatsappApiUrl,
          whatsapp_api_token: storeConfig.whatsappApiToken,
          whatsapp_notify_phone: storeConfig.whatsappNotifyPhone,
        }).catch(e => console.warn('Aviso ao notificar WhatsApp:', e));
      }

      if (payment_id) {
        setPaymentId(payment_id);
      }
    }
  }, [items, totalPrice, storeConfig, clearCart]);

  const handleClose = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('payment_status');
    url.searchParams.delete('collection_status');
    url.searchParams.delete('status');
    url.searchParams.delete('payment_id');
    url.searchParams.delete('collection_id');
    url.searchParams.delete('preference_id');
    url.searchParams.delete('external_reference');
    url.searchParams.delete('order_id');
    url.searchParams.delete('payment_type');
    url.searchParams.delete('merchant_order_id');

    // Limpa também do hash se existir
    if (window.location.hash.includes('?')) {
      window.location.hash = window.location.hash.split('?')[0];
    }
    window.history.replaceState({}, '', url.pathname + url.hash);
    setStatus(null);
  };

  const handleRetry = () => {
    handleClose();
    openCheckout();
  };

  if (!status) return null;

  const handleWhatsAppNotify = () => {
    const message = `🎉 *Olá, equipe ${storeConfig.storeName || 'Soumbolinho'}! Acabei de realizar o pagamento pelo Mercado Pago!*

💳 *Status:* Pagamento Confirmado
🆔 *ID do Pedido:* #${paymentId || '101'}
📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}

Poderiam confirmar o recebimento e me enviar as orientações de download dos arquivos? Obrigado(a)! 💕`;

    const url = createWhatsAppUrl(storeConfig.whatsappNumber, message);
    window.open(url, '_blank');
    handleClose();
  };

  const displayOrderId = paymentId ? paymentId.slice(-6) : 'CONFIRMADO';

  // Coleta links de entrega dos itens adquiridos
  const digitalDeliveries = purchasedItems
    .filter((item) => Boolean(item?.product?.delivery_url || item?.product?.deliveryUrl))
    .map((item) => ({
      name: item?.product?.name || 'Arquivo Digital',
      url: (item?.product?.delivery_url || item?.product?.deliveryUrl || '').trim(),
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in zoom-in-95 border border-slate-200/80 max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {status === 'success' && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>

            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Pagamento Aprovado
              </span>
              <h3 className="font-festive text-2xl font-black text-slate-900 mt-2">
                Obrigado pela sua compra!
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Seu pagamento foi confirmado pelo Mercado Pago com sucesso.
              </p>
            </div>

            {/* Links Imediatos de Download */}
            {digitalDeliveries.length > 0 && (
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 text-left space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Acesso aos Arquivos Digitais:</span>
                </div>
                <div className="space-y-2">
                  {digitalDeliveries.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-300/80 text-xs font-bold text-emerald-800 hover:bg-emerald-100/50 transition-all shadow-2xs group"
                    >
                      <span className="truncate max-w-[240px]">{item.name}</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 group-hover:translate-x-0.5 transition-transform shrink-0">
                        <Download className="w-3.5 h-3.5" />
                        <span>Acessar</span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Recibo e Itens */}
            <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200/80 space-y-2.5">
              <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                <span>Pedido #{displayOrderId}</span>
                <span>{new Date().toLocaleDateString('pt-BR')}</span>
              </div>

              <div className="border-t border-slate-200 divide-y divide-slate-100 text-xs">
                {purchasedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 text-slate-600">
                    <span className="truncate max-w-[240px]">{item.product.name} × {item.quantity}</span>
                    <span className="font-semibold text-slate-800 shrink-0">
                      {formatCurrency((item.product.price || 0) * item.quantity)}
                    </span>
                  </div>
                ))}
                
                <div className="flex justify-between py-2.5 font-black text-sm text-slate-900 border-t border-slate-200">
                  <span>Total Pago</span>
                  <span className="text-base font-black text-emerald-600">
                    {formatCurrency(orderTotal || totalPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Aviso de Envio de E-mail */}
            <div className="bg-sky-50 rounded-2xl p-3 border border-sky-200 text-xs text-sky-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Enviamos também uma cópia completa com os links de acesso para o seu e-mail cadastrado!</span>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleWhatsAppNotify}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Confirmar Recebimento no WhatsApp</span>
              </button>

              <button
                onClick={handleClose}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Voltar à Loja
              </button>
            </div>

          </div>
        )}

        {status === 'pending' && (
          <div className="space-y-4 text-center py-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-10 h-10 animate-pulse" />
            </div>

            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Pagamento em Análise / Pendente
              </span>
              <h3 className="font-festive text-2xl font-bold text-slate-900 mt-2">
                Aguardando Compensação
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Assim que o Mercado Pago confirmar a liquidação (normalmente instantâneo no Pix ou poucos minutos no cartão), os links de download serão liberados automaticamente.
              </p>
            </div>

            <div className="pt-3 space-y-2">
              <button
                onClick={handleWhatsAppNotify}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Avisar a Loja pelo WhatsApp</span>
              </button>
              <button
                onClick={handleClose}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Entendi, Voltar à Loja
              </button>
            </div>
          </div>
        )}

        {status === 'failure' && (
          <div className="space-y-4 text-center py-6">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                Pagamento Não Concluído
              </span>
              <h3 className="font-festive text-2xl font-bold text-slate-900 mt-2">
                Houve um problema no pagamento
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                A transação não pôde ser concluída no Mercado Pago. Você pode tentar novamente ou falar com o suporte no WhatsApp.
              </p>
            </div>

            <div className="pt-3 space-y-2">
              <button
                onClick={handleRetry}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer"
              >
                Tentar Novamente (Mercado Pago)
              </button>
              <button
                onClick={handleClose}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Voltar à Loja
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PaymentFeedbackModal;
