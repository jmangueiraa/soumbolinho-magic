import React, { useState } from 'react';
import { 
  X, 
  MessageCircle, 
  User, 
  Mail, 
  Phone,
  ShieldCheck, 
  ArrowLeft,
  Loader2,
  Zap,
  CreditCard,
  Lock,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { OrderCustomerInfo } from '../../types';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { useTenant } from '../../context/TenantContext';
import { formatCurrency } from '../../utils/formatters';
import { buildWhatsAppOrderMessage, createWhatsAppUrl } from '../../utils/whatsapp';
import { createMercadoPagoPreference, isMercadoPagoConfigured } from '../../lib/mercadopago';
import { createOrderInSupabase } from '../../services/orderService';
import { notifyTelegram } from '../../services/telegramNotificationService';
import { CartUpsellCard } from './CartUpsellCard';

export const CheckoutModal: React.FC = () => {
  const { storeConfig } = useStoreData();
  const { currentStore } = useTenant();
  const { 
    isCheckoutOpen, 
    closeCheckout, 
    items, 
    totalPrice, 
    clearCart, 
    openCart 
  } = useCart();

  const [customerInfo, setCustomerInfo] = useState<OrderCustomerInfo>(() => {
    try {
      const saved = sessionStorage.getItem('last_checkout_customer') || localStorage.getItem('last_checkout_customer');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          name: parsed.name || '',
          email: parsed.email || '',
          phone: parsed.phone || '',
          deliveryType: 'retirada',
          address: '',
          neighborhood: '',
          city: '',
          paymentMethod: 'mercadopago',
          generalNotes: '',
        };
      }
    } catch {}
    return {
      name: '',
      email: '',
      phone: '',
      deliveryType: 'retirada',
      address: '',
      neighborhood: '',
      city: '',
      paymentMethod: 'mercadopago',
      generalNotes: '',
    };
  });

  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [isLoadingMP, setIsLoadingMP] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Formata o WhatsApp no padrão brasileiro (XX) XXXXX-XXXX
  const formatPhoneNumber = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    if (!clean) return '';
    if (clean.length <= 2) return `(${clean}`;
    if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
  };

  if (!isCheckoutOpen) return null;

  const validateForm = () => {
    const errors: { name?: string; email?: string; phone?: string } = {};
    if (!customerInfo.name.trim()) {
      errors.name = 'Por favor, informe seu nome completo.';
    }

    const cleanPhone = (customerInfo.phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      errors.phone = 'Por favor, informe seu WhatsApp com DDD.';
    } else if (cleanPhone.length < 10) {
      errors.phone = 'Informe um WhatsApp válido com DDD (mínimo 10 dígitos).';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerInfo.email.trim()) {
      errors.email = 'Por favor, informe seu e-mail.';
    } else if (!emailRegex.test(customerInfo.email.trim())) {
      errors.email = 'Informe um e-mail válido (ex: seuemail@exemplo.com).';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // FLUXO PRINCIPAL: Mercado Pago Checkout Pro com Captura Prévia
  const handlePayWithMercadoPago = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;
    if (items.length === 0) return;

    setIsLoadingMP(true);
    setErrorMessage(null);

    const generatedOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanName = customerInfo.name.trim();
    const cleanEmail = customerInfo.email.trim();
    const cleanPhone = customerInfo.phone.trim();
    const targetStoreId = currentStore?.id || 'suamarcaaqui';

    try {
      // 1. Salvar dados na sessionStorage e localStorage para recuperação
      const leadData = {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        orderId: generatedOrderId,
      };
      sessionStorage.setItem('last_checkout_customer', JSON.stringify(leadData));
      localStorage.setItem('last_checkout_customer', JSON.stringify(leadData));
      sessionStorage.setItem('last_order_id', generatedOrderId);
      sessionStorage.setItem('last_checkout_items', JSON.stringify(items));
      localStorage.setItem('last_checkout_items', JSON.stringify(items));
      sessionStorage.setItem('last_checkout_total', String(totalPrice));

      // 2. Salvar obrigatoriamente o pedido no Supabase com status 'pending'
      console.log('[CheckoutModal] 💾 Registrando lead e pedido pendente no Supabase...', generatedOrderId);
      await createOrderInSupabase({
        store_id: targetStoreId,
        orderId: generatedOrderId,
        customerName: cleanName,
        customerEmail: cleanEmail,
        customerPhone: cleanPhone,
        items: [...items],
        totalAmount: totalPrice,
        paymentId: generatedOrderId,
        status: 'pending',
      });

      // 3. Disparar notificação de lead / carrinho no Telegram
      console.log('[CheckoutModal] 🚨 Disparando notificação de carrinho para o Telegram...');
      await notifyTelegram({
        action_type: 'abandoned_cart',
        customer_name: cleanName,
        customer_email: cleanEmail,
        customer_phone: cleanPhone,
        items: [...items],
        total_amount: totalPrice,
        order_id: generatedOrderId,
        telegram_bot_token: storeConfig.telegramBotToken,
        telegram_chat_id: storeConfig.telegramChatId,
      });

      // 4. Criar preferência do Mercado Pago Checkout Pro
      console.log('[CheckoutModal] 💳 Gerando link Checkout Pro no Mercado Pago...');
      const pref = await createMercadoPagoPreference({
        items: [...items],
        customerInfo: {
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
        },
        orderId: generatedOrderId,
        storeId: targetStoreId,
        storeConfig,
      });

      if (pref.init_point) {
        console.log('[CheckoutModal] 🚀 Redirecionando para Mercado Pago Checkout Pro:', pref.init_point);
        window.location.href = pref.init_point;
      } else {
        throw new Error(pref.error || 'Não foi possível gerar a preferência no Mercado Pago.');
      }
    } catch (err: any) {
      console.error('[CheckoutModal] ❌ Erro ao processar checkout:', err);
      setErrorMessage(err.message || 'Erro ao comunicar com o Mercado Pago. Tente novamente.');
      setIsLoadingMP(false);
    }
  };

  // Envio alternativo via WhatsApp
  const handleSendToWhatsApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    const formattedMessage = buildWhatsAppOrderMessage(
      items,
      customerInfo,
      totalPrice,
      storeConfig
    );
    const whatsappUrl = createWhatsAppUrl(storeConfig.whatsappNumber, formattedMessage);
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={closeCheckout}
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                closeCheckout();
                openCart();
              }}
              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Voltar ao carrinho"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="font-sans font-bold text-base sm:text-lg flex items-center gap-2">
                <span>Finalizar Pedido Seguro</span>
                <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Mercado Pago
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Preencha seus dados para receber o link de acesso imediato
              </p>
            </div>
          </div>

          <button
            onClick={closeCheckout}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Mensagem de Erro */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Aviso de Pagamento:</p>
                <p className="text-[11px] text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Resumo Rápido dos Itens */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Itens no Pedido ({items.reduce((acc, i) => acc + i.quantity, 0)})</span>
              <button
                type="button"
                onClick={() => {
                  closeCheckout();
                  openCart();
                }}
                className="text-theme-primary hover:underline text-[11px] font-semibold cursor-pointer"
              >
                Editar carrinho
              </button>
            </div>
            
            <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 text-xs">
              {items.map((item, idx) => (
                <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                  <span className="truncate text-slate-800 font-medium max-w-[240px]">
                    {item.quantity}x {item.product.name}
                  </span>
                  <span className="font-bold text-slate-900 shrink-0">
                    {formatCurrency((item.product.price || 0) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total a Pagar:</span>
              <span className="text-xl font-black text-slate-950">{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          {/* Formulário de Coleta de Dados Obrigatórios */}
          <form onSubmit={handlePayWithMercadoPago} className="space-y-3.5">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-theme-primary" />
                Dados para Envio do Produto Digital
              </h4>

              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={customerInfo.name}
                  onChange={(e) => {
                    setCustomerInfo({ ...customerInfo, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
                  }}
                  placeholder="Ex: Maria Clara da Silva"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black transition-all"
                />
                {formErrors.name && (
                  <span className="text-[11px] text-rose-500 mt-1 block font-medium">{formErrors.name}</span>
                )}
              </div>

              {/* WhatsApp com DDD */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp com DDD (para envio automático) *</span>
                </label>
                <input
                  type="tel"
                  required
                  value={customerInfo.phone || ''}
                  onChange={(e) => {
                    setCustomerInfo({ ...customerInfo, phone: formatPhoneNumber(e.target.value) });
                    if (formErrors.phone) setFormErrors({ ...formErrors, phone: undefined });
                  }}
                  placeholder="(11) 99999-9999"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black transition-all font-medium"
                />
                {formErrors.phone && (
                  <span className="text-[11px] text-rose-500 mt-1 block font-medium">{formErrors.phone}</span>
                )}
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Seu E-mail Principal *</span>
                </label>
                <input
                  type="email"
                  required
                  value={customerInfo.email}
                  onChange={(e) => {
                    setCustomerInfo({ ...customerInfo, email: e.target.value });
                    if (formErrors.email) setFormErrors({ ...formErrors, email: undefined });
                  }}
                  placeholder="seuemail@exemplo.com"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black transition-all"
                />
                {formErrors.email && (
                  <span className="text-[11px] text-rose-500 mt-1 block font-medium">{formErrors.email}</span>
                )}
              </div>
            </div>

            {/* Badges de Formas de Pagamento Aceitas */}
            <div className="p-3 bg-gradient-to-r from-emerald-50/50 via-sky-50/50 to-slate-50 rounded-2xl border border-slate-200 text-slate-700 space-y-2">
              <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Formas de Pagamento Disponíveis no Mercado Pago:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="bg-white p-2 rounded-xl border border-slate-200/80 flex items-center gap-1.5 font-bold text-slate-900 shadow-2xs">
                  <Zap className="w-3.5 h-3.5 text-teal-600 fill-teal-600" />
                  <span>Pix Imediato</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200/80 flex items-center gap-1.5 font-bold text-slate-900 shadow-2xs">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cartão até 12x</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200/80 flex items-center gap-1.5 font-bold text-slate-900 shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Saldo / Débito</span>
                </div>
              </div>
            </div>

            {/* Upsell opcional */}
            <CartUpsellCard />

            {/* Ação Principal de Pagamento */}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={isLoadingMP}
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2.5 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoadingMP ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>Conectando ao Mercado Pago...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pagar com Mercado Pago ({formatCurrency(totalPrice)})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSendToWhatsApp}
                className="w-full py-2.5 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dúvidas antes de pagar? Finalizar pedido com suporte no WhatsApp</span>
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ambiente seguro criptografado com liberação imediata do acesso.</span>
            </p>
          </form>

        </div>

      </div>
    </div>
  );
};

export default CheckoutModal;
