import React, { useState } from 'react';
import { 
  X, 
  MessageCircle, 
  User, 
  Mail,
  Calendar, 
  CreditCard, 
  FileText, 
  CheckCircle, 
  ArrowLeft,
  Eye,
  Store,
  Truck,
  Loader2,
  Zap,
  Banknote
} from 'lucide-react';
import { OrderCustomerInfo } from '../../types';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { formatCurrency, formatPhone } from '../../utils/formatters';
import { buildWhatsAppOrderMessage, createWhatsAppUrl } from '../../utils/whatsapp';
import { createMercadoPagoPreference, isMercadoPagoConfigured } from '../../lib/mercadopago';
import { PixPaymentBox } from './PixPaymentBox';

export const CheckoutModal: React.FC = () => {
  const { storeConfig } = useStoreData();
  const { 
    isCheckoutOpen, 
    closeCheckout, 
    items, 
    totalPrice, 
    clearCart, 
    openCart 
  } = useCart();

  const [customerInfo, setCustomerInfo] = useState<OrderCustomerInfo>({
    name: '',
    email: '',
    deliveryType: 'retirada',
    address: '',
    neighborhood: '',
    city: 'Rio de Janeiro',
    paymentMethod: 'pix',
    generalNotes: ''
  });

  const [showPreview, setShowPreview] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string; address?: string }>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoadingMP, setIsLoadingMP] = useState(false);

  if (!isCheckoutOpen) return null;

  const hasMercadoPago = isMercadoPagoConfigured(storeConfig);

  const validateForm = () => {
    const errors: { name?: string; email?: string; address?: string } = {};
    if (!customerInfo.name.trim()) errors.name = 'Por favor, informe seu nome completo.';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerInfo.email.trim()) {
      errors.email = 'Por favor, informe seu e-mail.';
    } else if (!emailRegex.test(customerInfo.email.trim())) {
      errors.email = 'Informe um e-mail válido (ex: seuemail@exemplo.com).';
    }

    if (customerInfo.deliveryType === 'entrega' && !customerInfo.address?.trim()) {
      errors.address = 'Informe o endereço para entrega.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const formattedMessage = buildWhatsAppOrderMessage(
    items,
    customerInfo,
    totalPrice,
    storeConfig
  );

  const handleSendToWhatsApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    const whatsappUrl = createWhatsAppUrl(storeConfig.whatsappNumber, formattedMessage);
    window.open(whatsappUrl, '_blank');
    setIsSuccess(true);
  };

  const handlePayWithMercadoPago = async () => {
    if (!validateForm()) return;

    if (!hasMercadoPago) {
      handleSendToWhatsApp();
      return;
    }

    try {
      setIsLoadingMP(true);

      const preference = await createMercadoPagoPreference({
        items,
        customerInfo,
        storeConfig,
      });

      if (preference.init_point) {
        window.location.href = preference.init_point;
      } else {
        handleSendToWhatsApp();
      }
    } catch (err: any) {
      console.warn('[CheckoutModal] Redirecionando para WhatsApp:', err);
      handleSendToWhatsApp();
    } finally {
      setIsLoadingMP(false);
    }
  };

  const handleFinishAndReset = () => {
    clearCart();
    setIsSuccess(false);
    closeCheckout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={closeCheckout}
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-50 via-[#FFEBF6] to-sky-50 border-b border-[#FFA6DF]/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                closeCheckout();
                openCart();
              }}
              className="p-1.5 rounded-full hover:bg-white text-slate-600 transition-colors"
              title="Voltar ao carrinho"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="font-festive font-bold text-slate-900 text-lg">
                {isSuccess ? 'Pedido Enviado!' : 'Finalizar Pedido'}
              </h3>
              <p className="text-xs text-slate-500">
                {isSuccess ? 'Obrigado por escolher a Encantando Festa' : 'Escolha a forma de pagamento e entrega'}
              </p>
            </div>
          </div>

          <button
            onClick={closeCheckout}
            className="p-1.5 rounded-full hover:bg-white text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {isSuccess ? (
            /* Success Screen */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h4 className="font-festive font-extrabold text-2xl text-slate-900">
                Pedido Pronto para Confirmação!
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Sua comanda foi formatada com sucesso! Caso a janela do WhatsApp não tenha aberto automaticamente, clique no botão abaixo para conversar conosco.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleSendToWhatsApp}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Reenviar no WhatsApp</span>
                </button>
                <button
                  onClick={handleFinishAndReset}
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-2xl"
                >
                  Novo Pedido / Limpar Carrinho
                </button>
              </div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSendToWhatsApp} className="space-y-5">
              
              {/* 1. Dados do Contato (Apenas Nome e E-mail) */}
              <div className="p-4 sm:p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3.5">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <User className="w-4 h-4 text-[#B886E8]" />
                  Dados do Contato
                </h4>

                <div className="space-y-3">
                  {/* Nome * */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                      placeholder="Nome"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#F8A4D8] transition-all"
                    />
                    {formErrors.name && (
                      <span className="text-[11px] text-rose-500 mt-1 block font-medium">{formErrors.name}</span>
                    )}
                  </div>

                  {/* E-mail * */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      placeholder="Email Address"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#F8A4D8] transition-all"
                    />
                    {formErrors.email && (
                      <span className="text-[11px] text-rose-500 mt-1 block font-medium">{formErrors.email}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Forma de Recebimento */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#B886E8]" />
                  Forma de Recebimento
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCustomerInfo({ ...customerInfo, deliveryType: 'retirada' })}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      customerInfo.deliveryType === 'retirada'
                        ? 'border-black bg-pastel-pink-light/40 ring-2 ring-black/10'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <Store className={`w-4 h-4 mt-0.5 shrink-0 ${customerInfo.deliveryType === 'retirada' ? 'text-black' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Retirada no Ateliê</div>
                      <div className="text-[11px] text-slate-500">Rio de Janeiro / RJ</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomerInfo({ ...customerInfo, deliveryType: 'entrega' })}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      customerInfo.deliveryType === 'entrega'
                        ? 'border-black bg-pastel-pink-light/40 ring-2 ring-black/10'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <Truck className={`w-4 h-4 mt-0.5 shrink-0 ${customerInfo.deliveryType === 'entrega' ? 'text-black' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Entrega em Domicílio</div>
                      <div className="text-[11px] text-slate-500">Frete calculado à parte</div>
                    </div>
                  </button>
                </div>

                {/* Delivery Address fields */}
                {customerInfo.deliveryType === 'entrega' && (
                  <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Endereço Completo com Número e Complemento *
                      </label>
                      <input
                        type="text"
                        value={customerInfo.address}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                        placeholder="Rua / Avenida, Número, Apto/Bloco"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#F8A4D8]"
                      />
                      {formErrors.address && (
                        <span className="text-[11px] text-rose-500 mt-0.5 block">{formErrors.address}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Bairro
                        </label>
                        <input
                          type="text"
                          value={customerInfo.neighborhood}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, neighborhood: e.target.value })}
                          placeholder="Ex: Copacabana / Barra"
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#F8A4D8]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Cidade / UF
                        </label>
                        <input
                          type="text"
                          value={customerInfo.city}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })}
                          placeholder="Rio de Janeiro - RJ"
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#F8A4D8]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Forma de Pagamento (PRIORIDADE PIX) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#B886E8]" />
                    Forma de Pagamento
                  </h4>
                  <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-teal-600 fill-current" />
                    Pix Recomendado
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Botão Pix (Destaque Principal) */}
                  <button
                    type="button"
                    onClick={() => setCustomerInfo({ ...customerInfo, paymentMethod: 'pix' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      customerInfo.paymentMethod === 'pix'
                        ? 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base font-black text-teal-600">💠 Pix</span>
                      <span className="bg-teal-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">
                        Imediato
                      </span>
                    </div>
                    <div className="text-[11px] text-teal-900 font-semibold">Chave / QR Code</div>
                  </button>

                  {/* Botão Cartão */}
                  <button
                    type="button"
                    onClick={() => setCustomerInfo({ ...customerInfo, paymentMethod: 'cartao' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      customerInfo.paymentMethod === 'cartao'
                        ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-800">💳 Cartão</span>
                      <span className="text-[9px] text-slate-500 font-semibold">Até 12x</span>
                    </div>
                    <div className="text-[11px] text-slate-500">Crédito ou Débito</div>
                  </button>

                  {/* Botão Dinheiro */}
                  <button
                    type="button"
                    onClick={() => setCustomerInfo({ ...customerInfo, paymentMethod: 'dinheiro' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      customerInfo.paymentMethod === 'dinheiro'
                        ? 'border-slate-800 bg-slate-100 ring-2 ring-slate-800/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-800">💵 Dinheiro</span>
                    </div>
                    <div className="text-[11px] text-slate-500">Na retirada</div>
                  </button>
                </div>

                {/* Visualizador Pix Copia e Cola & QR Code Quando Pix Selecionado */}
                {customerInfo.paymentMethod === 'pix' && (
                  <div className="pt-2 animate-in fade-in duration-200">
                    <PixPaymentBox totalAmount={totalPrice} pixKey={storeConfig.whatsappNumber} />
                  </div>
                )}
              </div>

              {/* 4. Observações gerais */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#B886E8]" />
                  Observações Gerais do Pedido:
                </label>
                <textarea
                  rows={2}
                  value={customerInfo.generalNotes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, generalNotes: e.target.value })}
                  placeholder="Ex: Nome do aniversariante, idade ou tema se não especificado nos itens."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#F8A4D8] resize-none"
                />
              </div>

              {/* Message Live Preview Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-[#B886E8] hover:text-black font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showPreview ? 'Ocultar prévia da mensagem' : 'Ver prévia da mensagem gerada para o WhatsApp'}
                </button>

                {showPreview && (
                  <pre className="mt-2 p-3.5 bg-slate-900 text-emerald-400 text-[11px] font-mono rounded-2xl overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner border border-slate-800 animate-in fade-in">
                    {formattedMessage}
                  </pre>
                )}
              </div>

              {/* Submit CTAs */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="text-xs uppercase tracking-wider text-slate-500">Total do Pedido:</span>
                  <span className="text-2xl font-black text-slate-900">{formatCurrency(totalPrice)}</span>
                </div>

                {/* Opção Principal Conforme Configuração do Admin */}
                {hasMercadoPago ? (
                  <>
                    <button
                      type="button"
                      onClick={handlePayWithMercadoPago}
                      disabled={isLoadingMP}
                      className={`w-full py-4 px-6 text-white font-bold text-sm sm:text-base rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-98 transition-all cursor-pointer disabled:opacity-60 ${
                        customerInfo.paymentMethod === 'pix'
                          ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/25'
                          : 'bg-[#009EE3] hover:bg-[#0082BD] shadow-[#009EE3]/25'
                      }`}
                    >
                      {isLoadingMP ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-white" />
                          <span>Gerando Checkout Seguro...</span>
                        </>
                      ) : customerInfo.paymentMethod === 'pix' ? (
                        <>
                          <span className="text-lg">💠</span>
                          <span>Pagar com Pix via Mercado Pago (Aprovação Imediata)</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          <span>Pagar com Cartão em até 12x (Mercado Pago)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="submit"
                      className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-2.5 active:scale-98 transition-all cursor-pointer group"
                    >
                      <MessageCircle className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
                      <span>
                        {customerInfo.paymentMethod === 'pix' 
                          ? 'Ou Enviar Pedido no WhatsApp (Pagamento Pix)' 
                          : `Ou Enviar Pedido no WhatsApp (${storeConfig.whatsappDisplay || '(21) 97497-5884'})`}
                      </span>
                    </button>
                  </>
                ) : (
                  /* Quando Mercado Pago não estiver configurado pelo Admin, botão direto para o WhatsApp */
                  <button
                    type="submit"
                    className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-3 active:scale-98 transition-all cursor-pointer group"
                  >
                    <MessageCircle className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
                    <span>
                      {customerInfo.paymentMethod === 'pix' 
                        ? 'Confirmar e Enviar Pedido no WhatsApp (Pagamento via Pix)' 
                        : `Finalizar Pedido no WhatsApp (${storeConfig.whatsappDisplay || '(21) 97497-5884'})`}
                    </span>
                  </button>
                )}

                <p className="text-[10px] text-center text-slate-400">
                  🔒 Pedidos confirmados e acompanhados diretamente com a nossa equipe no WhatsApp.
                </p>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
