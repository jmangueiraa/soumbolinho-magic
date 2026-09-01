import React, { useState } from 'react';
import { 
  X, 
  MessageCircle, 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  CreditCard, 
  FileText, 
  CheckCircle, 
  ArrowLeft,
  Eye,
  Store,
  Truck
} from 'lucide-react';
import { OrderCustomerInfo } from '../../types';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { formatCurrency, formatPhone } from '../../utils/formatters';
import { buildWhatsAppOrderMessage, createWhatsAppUrl } from '../../utils/whatsapp';

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
    phone: '',
    eventDate: '',
    deliveryType: 'retirada',
    address: '',
    neighborhood: '',
    city: 'Rio de Janeiro',
    paymentMethod: 'pix',
    generalNotes: ''
  });

  const [showPreview, setShowPreview] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; address?: string }>({});
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isCheckoutOpen) return null;

  const validateForm = () => {
    const errors: { name?: string; phone?: string; address?: string } = {};
    if (!customerInfo.name.trim()) {
      errors.name = 'Por favor, informe seu nome.';
    }
    if (!customerInfo.phone.trim() || customerInfo.phone.replace(/\D/g, '').length < 10) {
      errors.phone = 'Informe um telefone/WhatsApp com DDD.';
    }
    if (customerInfo.deliveryType === 'entrega' && !customerInfo.address?.trim()) {
      errors.address = 'Informe o endereço completo para a entrega.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePhoneChange = (value: string) => {
    setCustomerInfo((prev) => ({
      ...prev,
      phone: formatPhone(value)
    }));
  };

  const formattedMessage = buildWhatsAppOrderMessage(
    items,
    customerInfo,
    totalPrice,
    storeConfig
  );

  const handleSendToWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const whatsappUrl = createWhatsAppUrl(storeConfig.whatsappNumber, formattedMessage);
    
    // Abrir o WhatsApp
    window.open(whatsappUrl, '_blank');

    setIsSuccess(true);
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

      {/* Modal Box */}
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header with Pink/Lilac gradient */}
        <div className="px-6 py-4 bg-gradient-to-r from-pastel-pink-light via-pastel-lilac-light to-pastel-pink-light border-b border-[#D8B4F8]/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                closeCheckout();
                openCart();
              }}
              className="p-1.5 rounded-full hover:bg-white text-slate-700 transition-colors"
              title="Voltar ao carrinho"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="font-festive font-bold text-slate-900 text-lg">
                Finalizar Pedido no WhatsApp
              </h3>
              <p className="text-xs text-slate-500">
                Encantando Festa • Atendimento pelo WhatsApp (21) 97497-5884
              </p>
            </div>
          </div>

          <button
            onClick={closeCheckout}
            className="p-1.5 rounded-full hover:bg-white text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {isSuccess ? (
            /* Success Screen */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="font-festive text-2xl font-bold text-slate-900">
                Pedido Enviado com Sucesso!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Sua mensagem formatada foi encaminhada para nosso WhatsApp. Em breve nossa equipe enviará as prévias das artes para sua aprovação!
              </p>
              <div className="pt-4">
                <button
                  onClick={handleFinishAndReset}
                  className="px-6 py-3 bg-black hover:bg-slate-800 text-white text-sm font-bold rounded-2xl shadow-md transition-all"
                >
                  Concluir e Voltar ao Catálogo
                </button>
              </div>
            </div>
          ) : (
            /* Main Form */
            <form onSubmit={handleSendToWhatsApp} className="space-y-6">
              
              {/* 1. Dados Pessoais */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#B886E8]" />
                  Dados do Cliente
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Seu Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                      placeholder="Ex: Maria Clara Silva"
                      className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#F8A4D8] transition-all ${
                        formErrors.name ? 'border-rose-500' : 'border-slate-200'
                      }`}
                    />
                    {formErrors.name && (
                      <span className="text-[11px] text-rose-500 mt-0.5 block">{formErrors.name}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      WhatsApp com DDD *
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={15}
                      value={customerInfo.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="(21) 99999-9999"
                      className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#F8A4D8] transition-all ${
                        formErrors.phone ? 'border-rose-500' : 'border-slate-200'
                      }`}
                    />
                    {formErrors.phone && (
                      <span className="text-[11px] text-rose-500 mt-0.5 block">{formErrors.phone}</span>
                    )}
                  </div>
                </div>

                {/* Event Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#B886E8]" />
                    Data da Comemoração / Festa
                  </label>
                  <input
                    type="date"
                    value={customerInfo.eventDate}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, eventDate: e.target.value })}
                    className="w-full sm:w-1/2 text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#F8A4D8]"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Garante o agendamento prévio na nossa linha de produção artesanal.
                  </p>
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
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
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
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
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

              {/* 3. Forma de Pagamento */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#B886E8]" />
                  Forma de Pagamento Preferida
                </h4>

                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { id: 'pix', label: '💠 Pix', desc: 'Chave / QR Code' },
                    { id: 'cartao', label: '💳 Cartão', desc: 'Crédito / Débito' },
                    { id: 'dinheiro', label: '💵 Dinheiro', desc: 'Na retirada' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setCustomerInfo({ ...customerInfo, paymentMethod: method.id as any })}
                      className={`p-2.5 rounded-2xl border transition-all ${
                        customerInfo.paymentMethod === method.id
                          ? 'border-black bg-pastel-pink-light/50 text-slate-900 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold">{method.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{method.desc}</div>
                    </button>
                  ))}
                </div>
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
                  className="text-xs text-[#B886E8] hover:text-black font-bold flex items-center gap-1"
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

              {/* Submit CTA */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="text-xs uppercase tracking-wider text-slate-500">Total do Pedido:</span>
                  <span className="text-2xl font-black text-slate-900">{formatCurrency(totalPrice)}</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3 active:scale-98 transition-all group"
                >
                  <MessageCircle className="w-6 h-6 fill-white group-hover:scale-110 transition-transform" />
                  <span>Enviar Pedido para WhatsApp (21) 97497-5884</span>
                </button>

                <p className="text-[11px] text-center text-slate-400">
                  Ao clicar, o WhatsApp será aberto com todos os itens, quantidades e valores calculados.
                </p>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
