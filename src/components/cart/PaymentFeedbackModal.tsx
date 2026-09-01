import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, XCircle, MessageCircle, Download, X, Mail, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { createWhatsAppUrl } from '../../utils/whatsapp';
import { formatCurrency } from '../../utils/formatters';
import { sendOrderConfirmationEmail } from '../../services/emailService';

export const PaymentFeedbackModal: React.FC = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { storeConfig } = useStoreData();
  const [status, setStatus] = useState<'success' | 'approved' | 'pending' | 'failure' | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [purchasedItems, setPurchasedItems] = useState(items);
  const [orderTotal, setOrderTotal] = useState(totalPrice);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status') || params.get('collection_status') || params.get('status');
    const payment_id = params.get('payment_id') || params.get('collection_id');

    if (paymentStatus) {
      if (['success', 'approved'].includes(paymentStatus)) {
        setStatus('success');
        
        // Guardar itens comprados para o recibo antes de esvaziar
        if (items.length > 0) {
          setPurchasedItems(items);
          setOrderTotal(totalPrice);

          // Disparar envio do e-mail de confirmação
          sendOrderConfirmationEmail({
            customerName: 'Cliente',
            customerEmail: 'cliente@encantandofesta.com',
            orderId: payment_id || String(Math.floor(100 + Math.random() * 900)),
            items: items,
            totalAmount: totalPrice,
            storeConfig,
          });
        }

        clearCart();
      } else if (['pending', 'in_process'].includes(paymentStatus)) {
        setStatus('pending');
      } else if (['failure', 'rejected', 'cancelled'].includes(paymentStatus)) {
        setStatus('failure');
      }

      if (payment_id) {
        setPaymentId(payment_id);
      }
    }
  }, []);

  const handleClose = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('payment_status');
    url.searchParams.delete('collection_status');
    url.searchParams.delete('status');
    url.searchParams.delete('payment_id');
    url.searchParams.delete('collection_id');
    url.searchParams.delete('preference_id');
    url.searchParams.delete('external_reference');
    url.searchParams.delete('payment_type');
    url.searchParams.delete('merchant_order_id');
    window.history.replaceState({}, '', url.pathname + url.hash);
    setStatus(null);
  };

  if (!status) return null;

  const handleWhatsAppNotify = () => {
    const message = `🎉 *Olá, equipe ${storeConfig.storeName}! Acabei de realizar o pagamento pelo Mercado Pago!*

💳 *Status:* Pagamento Confirmado
🆔 *ID do Pedido:* #${paymentId || '789'}
📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}

Poderiam confirmar o recebimento e me enviar as orientações de download/produção? Obrigado(a)! 💕`;

    const url = createWhatsAppUrl(storeConfig.whatsappNumber, message);
    window.open(url, '_blank');
    handleClose();
  };

  const displayOrderId = paymentId ? paymentId.slice(-4) : '789';
  const displayDate = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 text-left relative animate-in zoom-in-95 my-auto max-h-[90vh] flex flex-col">
        
        {/* Botão Fechar */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {status === 'success' && (
          <div className="space-y-6 overflow-y-auto pr-1">
            
            {/* Header com Logo */}
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-900">🛍️ {storeConfig.storeName}</span>
            </div>

            {/* Título Principal */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Boas coisas estão a caminho!
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Olá,
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Acabamos de processar o seu pedido.
              </p>
              <p className="text-sm text-slate-600 mt-1 font-medium">
                Aqui está um lembrete do que você pediu:
              </p>
            </div>

            {/* Seção Downloads */}
            <div className="space-y-3 pt-2">
              <h3 className="text-base font-extrabold text-slate-900">
                Downloads
              </h3>

              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                <div className="grid grid-cols-12 bg-slate-50 px-3.5 py-2 font-bold text-slate-500">
                  <span className="col-span-6">Produto</span>
                  <span className="col-span-3">Expira em</span>
                  <span className="col-span-3 text-right">Download</span>
                </div>

                {purchasedItems.length > 0 ? (
                  purchasedItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 px-3.5 py-3 items-center text-slate-700">
                      <span className="col-span-6 font-semibold text-emerald-700 truncate pr-2">
                        {item.product.name}
                      </span>
                      <span className="col-span-3 text-slate-400">Nunca</span>
                      <div className="col-span-3 text-right">
                        <a
                          href={item.product.imageUrl || item.product.image || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="grid grid-cols-12 px-3.5 py-3 items-center text-slate-700">
                    <span className="col-span-6 font-semibold text-emerald-700">Pack Digital Completo</span>
                    <span className="col-span-3 text-slate-400">Nunca</span>
                    <div className="col-span-3 text-right">
                      <button className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seção Resumo do Pedido */}
            <div className="space-y-3 pt-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Resumo do pedido
                </h3>
                <p className="text-xs font-semibold text-slate-400">
                  Pedido #{displayOrderId} ({displayDate})
                </p>
              </div>

              <div className="border-t border-slate-200 divide-y divide-slate-100 text-xs">
                {purchasedItems.map((item) => (
                  <div key={item.id} className="flex justify-between py-2 text-slate-600">
                    <span>{item.product.name} × {item.quantity}</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
                
                <div className="flex justify-between py-2.5 font-black text-sm text-slate-900 border-t border-slate-200">
                  <span>Total</span>
                  <span className="text-base font-black text-emerald-600">
                    {formatCurrency(orderTotal || 10)}
                  </span>
                </div>
              </div>
            </div>

            {/* Aviso de Envio de E-mail */}
            <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Enviamos uma cópia completa deste recibo com os links de download para o seu e-mail!</span>
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
                Seu pagamento (Pix ou Boleto) está sendo processado. Assim que compensado, seu e-mail com os links de download será enviado automaticamente.
              </p>
            </div>

            <div className="pt-3">
              <button
                onClick={handleClose}
                className="w-full py-3 px-4 bg-black hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer"
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
                A transação não pôde ser concluída. Você pode tentar novamente pelo checkout ou finalizar pelo WhatsApp.
              </p>
            </div>

            <div className="pt-3">
              <button
                onClick={handleClose}
                className="w-full py-3 px-4 bg-black hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
