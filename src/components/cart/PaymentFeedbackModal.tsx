import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, XCircle, MessageCircle, ArrowRight, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { createWhatsAppUrl } from '../../utils/whatsapp';

export const PaymentFeedbackModal: React.FC = () => {
  const { clearCart } = useCart();
  const { storeConfig } = useStoreData();
  const [status, setStatus] = useState<'success' | 'pending' | 'failure' | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status') || params.get('collection_status') || params.get('status');
    const payment_id = params.get('payment_id') || params.get('collection_id');

    if (paymentStatus) {
      if (['success', 'approved'].includes(paymentStatus)) {
        setStatus('success');
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
    // Limpar parâmetros da URL sem recarregar a página
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
🆔 *ID da Transação:* ${paymentId || 'Checkout Pro'}
📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}

Poderiam confirmar o recebimento e me enviar as orientações da produção artesanal das peças? Obrigado(a)!`;

    const url = createWhatsAppUrl(storeConfig.whatsappNumber, message);
    window.open(url, '_blank');
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 text-center relative animate-in zoom-in-95">
        
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Pagamento Aprovado • Mercado Pago
              </span>
              <h3 className="font-festive text-2xl font-bold text-slate-900 mt-2">
                Obrigado pelo seu pedido! 🎉
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Seu pagamento foi confirmado pelo Mercado Pago com sucesso. Seu pedido já foi registrado e nossa equipe do ateliê iniciará a confecção!
              </p>
              {paymentId && (
                <p className="text-[11px] font-mono text-slate-400 mt-1">
                  Transação: #{paymentId}
                </p>
              )}
            </div>

            <div className="pt-3 space-y-2">
              <button
                onClick={handleWhatsAppNotify}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>Avisar no WhatsApp da Loja</span>
              </button>

              <button
                onClick={handleClose}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Continuar Navegando no Catálogo
              </button>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div className="space-y-4">
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
                Seu pagamento (Pix ou Boleto) está sendo processado pelo Mercado Pago. Assim que compensado, seu pedido será liberado automaticamente.
              </p>
            </div>

            <div className="pt-3 space-y-2">
              <button
                onClick={handleClose}
                className="w-full py-3 px-4 bg-black hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md transition-all"
              >
                Entendi, Voltar à Loja
              </button>
            </div>
          </div>
        )}

        {status === 'failure' && (
          <div className="space-y-4">
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
                A transação não pôde ser concluída no Mercado Pago. Você pode tentar novamente com outro cartão ou finalizar o pedido diretamente pelo WhatsApp.
              </p>
            </div>

            <div className="pt-3 space-y-2">
              <button
                onClick={handleClose}
                className="w-full py-3 px-4 bg-black hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md transition-all"
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
