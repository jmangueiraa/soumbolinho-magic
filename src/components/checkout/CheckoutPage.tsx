import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ShoppingBag, 
  CreditCard, 
  Tag, 
  Star,
  Check,
  Loader2,
  ShieldCheck,
  Download,
  Lock,
  Mail,
  Phone,
  AlertCircle,
  X,
  Sparkles,
  Zap,
  ExternalLink,
  Truck
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { useTenant } from '../../context/TenantContext';
import { formatCurrency } from '../../utils/formatters';
import { ShippingOption, DeliveryAddress, CartItem } from '../../types';
import { createOrderInSupabase } from '../../services/orderService';
import { createMercadoPagoPreference, isMercadoPagoConfigured } from '../../lib/mercadopago';
import { notifyTelegram } from '../../services/telegramNotificationService';
import { notifyWhatsApp } from '../../services/whatsappNotificationService';
import { validateAndApplyCoupon, incrementCouponUses } from '../../services/couponService';
import { Header } from '../layout/Header';
import { Footer } from '../layout/Footer';
import { Toast } from '../common/Toast';
import { FloatingWhatsApp } from '../layout/FloatingWhatsApp';
import { CartUpsellCard } from '../cart/CartUpsellCard';
import { PaymentFeedbackModal } from '../cart/PaymentFeedbackModal';
import { ShippingCalculator } from '../cart/ShippingCalculator';
import { applyThemeToDocument } from '../../utils/theme';

export const CheckoutPage: React.FC = () => {
  const { currentStore } = useTenant();
  const { items, totalPrice, clearCart } = useCart();
  const { storeConfig } = useStoreData();

  // Aplica a variável global CSS --primary-color e tema da loja dinamicamente
  useEffect(() => {
    try {
      if (storeConfig?.primaryColor) {
        if (typeof applyThemeToDocument === 'function') {
          applyThemeToDocument(storeConfig.colorPalette, storeConfig.primaryColor, storeConfig.themeLayout);
        } else if (typeof window !== 'undefined' && typeof (window as any).applyThemeToDocument === 'function') {
          (window as any).applyThemeToDocument(storeConfig.colorPalette, storeConfig.primaryColor, storeConfig.themeLayout);
        }
      }
    } catch {}
  }, [storeConfig?.primaryColor, storeConfig?.colorPalette, storeConfig?.themeLayout]);

  const [customerInfo, setCustomerInfo] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' 
        ? sessionStorage.getItem('last_checkout_customer') || localStorage.getItem('last_checkout_customer')
        : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          name: parsed.name || '',
          email: parsed.email || '',
          phone: parsed.phone || '',
        };
      }
    } catch (e) {
      // ignora
    }
    return {
      name: '',
      email: '',
      phone: '',
    };
  });

  const [couponCode, setCouponCode] = useState('');
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [couponFeedback, setCouponFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formErrors, setFormErrors] = useState<{ 
    name?: string; 
    email?: string; 
    phone?: string;
  }>({});
  const [mpError, setMpError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Detecção de produto físico no carrinho
  const hasPhysicalProduct = items.some(
    (i) => !i.product.is_digital && !(i.product as any).isDigital
  );

  // Estados de Frete & Entrega (para produtos físicos)
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [shippingAddress, setShippingAddress] = useState<DeliveryAddress | null>(null);
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [shippingFormError, setShippingFormError] = useState<string | null>(null);

  // Formata o endereço completo para envio e persistência
  const getFormattedAddress = () => {
    if (!hasPhysicalProduct || !selectedShipping) return undefined;
    if (selectedShipping.id === 'pickup') {
      return `Retirada no Local - Balcão da Loja (${storeConfig?.shippingConfig?.pickupAddress || 'Endereço da Loja'})`;
    }
    if (!shippingAddress) return undefined;
    const parts = [
      `${shippingAddress.street}, ${addressNumber || 'S/N'}`,
      addressComplement ? `Compl: ${addressComplement}` : '',
      shippingAddress.neighborhood,
      `${shippingAddress.city}/${shippingAddress.state}`,
      `CEP: ${shippingAddress.cep}`,
    ].filter(Boolean);
    return parts.join(' - ');
  };

  // Monta a lista final de itens (adicionando item de frete se aplicável)
  const getFinalOrderItems = () => {
    const list = [...items];
    if (hasPhysicalProduct && selectedShipping && selectedShipping.price > 0) {
      list.push({
        id: `ship_${selectedShipping.id}`,
        product: {
          id: `shipping_${selectedShipping.id}`,
          name: `Frete (${selectedShipping.name})`,
          price: selectedShipping.price,
          category: 'Frete',
          inStock: true,
          is_digital: true,
          images: [],
        } as any,
        quantity: 1,
        customPrice: selectedShipping.price,
      });
    }
    return list;
  };

  const shippingCost = hasPhysicalProduct && selectedShipping ? selectedShipping.price : 0;
  const finalTotal = Math.max(0, totalPrice - discount + shippingCost);

  // Formata o WhatsApp no padrão brasileiro (XX) XXXXX-XXXX
  const formatPhoneNumber = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    if (!clean) return '';
    if (clean.length <= 2) return `(${clean}`;
    if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
  };

  // --- LÓGICA DE CAPTURA DE CARRINHO ABANDONADO & TELEGRAM BOT ---
  const isOrderCompletedRef = useRef(false);
  const hasSentAbandonedRef = useRef(false);
  const abandonTimerRef = useRef<any>(null);
  const leadDataRef = useRef({
    name: customerInfo.name,
    email: customerInfo.email,
    phone: customerInfo.phone,
    items,
    totalAmount: totalPrice,
  });

  // Limpa frete se não houver produto físico
  useEffect(() => {
    if (!hasPhysicalProduct) {
      setSelectedShipping(null);
      setShippingAddress(null);
      setAddressNumber('');
      setAddressComplement('');
      setShippingFormError(null);
    }
  }, [hasPhysicalProduct]);

  // Atualiza leadDataRef sincronizado com as mudanças de carrinho, frete e formulário
  useEffect(() => {
    leadDataRef.current = {
      name: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone,
      items: getFinalOrderItems(),
      totalAmount: finalTotal,
    };
  }, [customerInfo, items, finalTotal, selectedShipping]);

  // Função para despachar alerta de carrinho abandonado para a API
  const sendAbandonedNotification = (source: string) => {
    if (isOrderCompletedRef.current || hasSentAbandonedRef.current) return;

    const currentLead = leadDataRef.current;
    const cleanPhone = (currentLead.phone || '').replace(/\D/g, '');

    // Dispara apenas se o cliente preencheu nome e um WhatsApp de pelo menos 10 dígitos e tem itens no carrinho
    if (!currentLead.name.trim() || cleanPhone.length < 10 || currentLead.items.length === 0) {
      return;
    }

    hasSentAbandonedRef.current = true;
    console.log(`[CheckoutPage] 🚨 Enviando alerta de carrinho abandonado ao Telegram (${source})...`, currentLead);

    notifyTelegram({
      action_type: 'abandoned_cart',
      customer_name: currentLead.name.trim(),
      customer_phone: currentLead.phone.trim(),
      customer_email: currentLead.email.trim(),
      items: currentLead.items,
      total_amount: currentLead.totalAmount,
      shipping_cost: shippingCost,
      shipping_method: selectedShipping?.name,
      shipping_address: getFormattedAddress(),
      telegram_bot_token: storeConfig.telegramBotToken,
      telegram_chat_id: storeConfig.telegramChatId,
      isBeacon: true,
    });

    notifyWhatsApp({
      action_type: 'abandoned_cart',
      customer_name: currentLead.name.trim(),
      customer_phone: currentLead.phone.trim(),
      customer_email: currentLead.email.trim(),
      items: currentLead.items,
      total_amount: currentLead.totalAmount,
      shipping_cost: shippingCost,
      shipping_method: selectedShipping?.name,
      shipping_address: getFormattedAddress(),
      store_name: currentStore?.name || storeConfig.storeName,
      store_id: currentStore?.id || 'suamarcaaqui',
      whatsapp_api_provider: currentStore?.whatsapp_api_provider || currentStore?.theme_settings?.whatsapp_api_provider || storeConfig?.whatsappApiProvider,
      whatsapp_api_url: currentStore?.whatsapp_api_url || currentStore?.theme_settings?.whatsapp_api_url || storeConfig?.whatsappApiUrl,
      whatsapp_api_token: currentStore?.whatsapp_api_token || currentStore?.theme_settings?.whatsapp_api_token || storeConfig?.whatsappApiToken,
      whatsapp_notify_phone: currentStore?.whatsapp_notify_phone || currentStore?.theme_settings?.whatsapp_notify_phone || storeConfig?.whatsappNotifyPhone,
      isBeacon: true,
    }).catch(e => console.warn('Aviso ao notificar WhatsApp:', e));
  };

  // Temporizador de inatividade: se preencheu os dados e ficou 2 minutos parado sem finalizar
  useEffect(() => {
    const cleanPhone = (customerInfo.phone || '').replace(/\D/g, '');
    if (customerInfo.name.trim() && cleanPhone.length >= 10 && !hasSentAbandonedRef.current && !isOrderCompletedRef.current) {
      if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current);
      abandonTimerRef.current = setTimeout(() => {
        sendAbandonedNotification('tempo_inatividade_2min');
      }, 2 * 60 * 1000);
    }

    return () => {
      if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current);
    };
  }, [customerInfo.phone, customerInfo.name]);

  // Listener para saída da página (fechar aba, trocar de aba ou app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendAbandonedNotification('saida_pagina_visibilitychange');
      }
    };

    const handleBeforeUnload = () => {
      sendAbandonedNotification('saida_pagina_beforeunload');
    };

    const handlePageHide = () => {
      sendAbandonedNotification('saida_pagina_pagehide');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  const validateForm = () => {
    const errors: { 
      name?: string; 
      email?: string; 
      phone?: string;
    } = {};

    if (!customerInfo.name.trim()) errors.name = 'Informe o seu nome completo.';

    const cleanPhone = (customerInfo.phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      errors.phone = 'Informe o seu WhatsApp com DDD.';
    } else if (cleanPhone.length < 10) {
      errors.phone = 'Informe um WhatsApp válido com DDD (mínimo 10 dígitos).';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerInfo.email.trim()) {
      errors.email = 'Informe o seu e-mail para recebimento dos arquivos.';
    } else if (!emailRegex.test(customerInfo.email.trim())) {
      errors.email = 'Informe um e-mail válido (ex: seuemail@exemplo.com).';
    }

    // Validação de frete para produtos físicos
    if (hasPhysicalProduct) {
      if (!selectedShipping) {
        setShippingFormError('Por favor, calcule seu CEP e selecione uma opção de frete ou retirada.');
        return false;
      }
      if (selectedShipping.id !== 'pickup' && !addressNumber.trim()) {
        setShippingFormError('Por favor, informe o número do endereço de entrega.');
        return false;
      }
    }
    setShippingFormError(null);

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    const targetStoreId = currentStore?.id || 'suamarcaaqui';
    const result = await validateAndApplyCoupon(couponCode, targetStoreId, totalPrice);

    if (result.valid) {
      setDiscount(result.discountAmount);
      setCouponApplied(true);
      setCouponFeedback({ 
        message: result.successMessage || 'Cupom aplicado com sucesso!', 
        type: 'success' 
      });
    } else {
      setDiscount(0);
      setCouponApplied(false);
      setCouponFeedback({ 
        message: result.error || 'Cupom inválido ou expirado.', 
        type: 'error' 
      });
    }
  };

  // FLUXO PRINCIPAL: Mercado Pago Checkout Pro Único
  const handleFinalizeOrder = async () => {
    if (!validateForm()) return;
    if (items.length === 0) return;

    setIsLoading(true);
    setMpError(null);

    const generatedOrderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanName = customerInfo.name.trim();
    const cleanEmail = customerInfo.email.trim();
    const cleanPhone = customerInfo.phone.trim();
    const targetStoreId = currentStore?.id || 'suamarcaaqui';
    const finalItems = getFinalOrderItems();
    const formattedAddress = getFormattedAddress();

    try {
      // 1. Salvar dados na sessionStorage e localStorage para recuperação no retorno
      const leadData = {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        orderId: generatedOrderId,
      };
      sessionStorage.setItem('last_checkout_customer', JSON.stringify(leadData));
      localStorage.setItem('last_checkout_customer', JSON.stringify(leadData));
      sessionStorage.setItem('last_order_id', generatedOrderId);
      sessionStorage.setItem('last_checkout_items', JSON.stringify(finalItems));
      localStorage.setItem('last_checkout_items', JSON.stringify(finalItems));
      sessionStorage.setItem('last_checkout_total', String(finalTotal));

      // Marca como finalizado para não reenviar notificação de abandono ao mudar de aba
      isOrderCompletedRef.current = true;

      // 2. Salvar obrigatoriamente o pedido no Supabase com status 'pending'
      console.log('[CheckoutPage] 💾 Registrando lead e pedido pendente no Supabase...', generatedOrderId);
      await createOrderInSupabase({
        store_id: targetStoreId,
        orderId: generatedOrderId,
        customerName: cleanName,
        customerEmail: cleanEmail,
        customerPhone: cleanPhone,
        items: finalItems,
        totalAmount: finalTotal,
        shippingCost,
        shippingMethod: selectedShipping?.name,
        deliveryAddress: formattedAddress,
        shippingAddressData: shippingAddress ? {
          cep: shippingAddress.cep,
          street: shippingAddress.street,
          number: addressNumber || 'S/N',
          complement: addressComplement || '',
          neighborhood: shippingAddress.neighborhood,
          city: shippingAddress.city,
          state: shippingAddress.state,
        } : undefined,
        paymentId: generatedOrderId,
        status: 'pending',
      });

      // 3. Notificar Telegram e WhatsApp com os dados capturados
      console.log('[CheckoutPage] 🚨 Notificando lead capturado no Telegram e WhatsApp...');
      await notifyTelegram({
        action_type: 'abandoned_cart',
        customer_name: cleanName,
        customer_phone: cleanPhone,
        customer_email: cleanEmail,
        items: finalItems,
        total_amount: finalTotal,
        shipping_cost: shippingCost,
        shipping_method: selectedShipping?.name,
        shipping_address: formattedAddress,
        telegram_bot_token: storeConfig.telegramBotToken,
        telegram_chat_id: storeConfig.telegramChatId,
      });

      notifyWhatsApp({
        action_type: 'abandoned_cart',
        customer_name: cleanName,
        customer_phone: cleanPhone,
        customer_email: cleanEmail,
        items: finalItems,
        total_amount: finalTotal,
        shipping_cost: shippingCost,
        shipping_method: selectedShipping?.name,
        shipping_address: formattedAddress,
        store_name: currentStore?.name || storeConfig.storeName,
        store_id: currentStore?.id || targetStoreId,
        whatsapp_api_provider: currentStore?.whatsapp_api_provider || currentStore?.theme_settings?.whatsapp_api_provider || storeConfig?.whatsappApiProvider,
        whatsapp_api_url: currentStore?.whatsapp_api_url || currentStore?.theme_settings?.whatsapp_api_url || storeConfig?.whatsappApiUrl,
        whatsapp_api_token: currentStore?.whatsapp_api_token || currentStore?.theme_settings?.whatsapp_api_token || storeConfig?.whatsappApiToken,
        whatsapp_notify_phone: currentStore?.whatsapp_notify_phone || currentStore?.theme_settings?.whatsapp_notify_phone || storeConfig?.whatsappNotifyPhone,
      }).catch(e => console.warn('Aviso ao notificar WhatsApp:', e));

      // 4. Criar preferência do Mercado Pago Checkout Pro
      console.log('[CheckoutPage] 🚀 Criando preferência Checkout Pro no Mercado Pago...');
      const pref = await createMercadoPagoPreference({
        items: finalItems,
        customerInfo: {
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
        },
        orderId: generatedOrderId,
        storeId: targetStoreId,
        storeConfig,
      });

      if (pref.error || !pref.init_point) {
        throw new Error(pref.error || 'Não foi possível gerar o link de pagamento do Mercado Pago.');
      }

      // 5. Incrementa contador de uso do cupom se aplicado
      if (couponApplied && couponCode) {
        incrementCouponUses(couponCode, targetStoreId);
      }

      console.log('[CheckoutPage] ➡️ Redirecionando para Checkout Pro:', pref.init_point);
      // Redirecionamento direto para a tela de pagamento do Mercado Pago
      window.location.href = pref.init_point;
    } catch (err: any) {
      console.error('[CheckoutPage] ❌ Erro ao processar checkout:', err);
      setMpError(err.message || 'Ocorreu um erro ao conectar com o Mercado Pago. Tente novamente.');
      setIsLoading(false);
      isOrderCompletedRef.current = false;
    }
  };

  // Verifica se há status de pagamento na URL (retorno do Mercado Pago)
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const hashQuery = typeof window !== 'undefined' && window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
  const hashParams = new URLSearchParams(hashQuery);
  const hasPaymentReturn = Boolean(
    searchParams?.get('status') ||
    searchParams?.get('payment_status') ||
    searchParams?.get('collection_status') ||
    hashParams.get('status') ||
    hashParams.get('payment_status')
  );

  // Aplicação automática de cupom via parâmetro de URL (?cupom=CODIGO ou ?coupon=CODIGO)
  useEffect(() => {
    const urlCoupon = searchParams?.get('cupom') || searchParams?.get('coupon') || hashParams.get('cupom') || hashParams.get('coupon');
    if (urlCoupon && !couponApplied && totalPrice > 0) {
      const cleanUrlCode = urlCoupon.toUpperCase().trim();
      setCouponCode(cleanUrlCode);
      setIsCouponOpen(true);
      const targetStoreId = currentStore?.id || 'suamarcaaqui';
      validateAndApplyCoupon(cleanUrlCode, targetStoreId, totalPrice).then((res) => {
        if (res.valid) {
          setDiscount(res.discountAmount);
          setCouponApplied(true);
          setCouponFeedback({ 
            message: res.successMessage || 'Cupom aplicado com sucesso!', 
            type: 'success' 
          });
        }
      });
    }
  }, [totalPrice, currentStore?.id]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFBFD] text-slate-800">
      
      {/* 1. Header Oficial */}
      <Header />

      {/* 2. Conteúdo da Página de Finalização de Compra */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        
        {/* Título Principal com Badge de Segurança */}
        <div className="space-y-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Ambiente Seguro • Checkout Criptografado</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-festive">
                Finalização de Compra
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Preencha seus dados para receber o link de download imediato dos seus arquivos.
              </p>
            </div>

            <a
              href="#/"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Continuar comprando</span>
            </a>
          </div>
          
          <div className="relative flex items-center justify-center pt-2">
            <div className="w-full border-t border-dotted border-slate-300" />
            <div className="absolute bg-[#FFFBFD] px-3 text-slate-400">
              <Star className="w-4 h-4 fill-slate-100 text-slate-400" />
            </div>
          </div>
        </div>

        {items.length === 0 && !hasPaymentReturn ? (
          /* Carrinho Vazio */
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4 max-w-md mx-auto animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-theme-light text-theme-primary flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Seu carrinho está vazio</h2>
            <p className="text-xs text-slate-500">
              Adicione produtos ao seu carrinho para poder finalizar o pedido.
            </p>
            <a
              href="#/"
              className="inline-block px-6 py-3 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-md"
            >
              Explorar Catálogo de Arquivos
            </a>
          </div>
        ) : (
          /* FORMULÁRIO DE CHECKOUT UNIFICADO EM 2 COLUNAS */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Coluna Esquerda: Dados Obrigatórios de Contato & Entrega */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-theme-primary text-white text-xs font-black flex items-center justify-center">
                      1
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Dados para Envio & Contato
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Obrigatório
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Nome Completo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Nome Completo <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerInfo.name}
                      onChange={(e) => {
                        setCustomerInfo({ ...customerInfo, name: e.target.value });
                        if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
                      }}
                      placeholder="Ex: Maria da Silva"
                      className="w-full text-xs sm:text-sm px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all placeholder:text-slate-400"
                    />
                    {formErrors.name && (
                      <span className="text-[11px] text-rose-500 mt-1 block font-medium">{formErrors.name}</span>
                    )}
                  </div>

                  {/* WhatsApp com DDD */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>
                        WhatsApp com DDD <span className="text-rose-600">*</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Para suporte e notificações</span>
                    </label>
                    <div className="relative flex items-center">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="tel"
                        required
                        value={customerInfo.phone}
                        onChange={(e) => {
                          setCustomerInfo({ ...customerInfo, phone: formatPhoneNumber(e.target.value) });
                          if (formErrors.phone) setFormErrors({ ...formErrors, phone: undefined });
                        }}
                        placeholder="(21) 99999-9999"
                        className="w-full text-xs sm:text-sm pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all placeholder:text-slate-400 font-medium text-slate-800"
                      />
                    </div>
                    {formErrors.phone && (
                      <span className="text-[11px] text-rose-500 mt-1 block font-medium">{formErrors.phone}</span>
                    )}
                  </div>

                  {/* E-mail para recebimento do link */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>
                        E-mail para Acesso aos Arquivos <span className="text-rose-600">*</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Link enviado na hora</span>
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={customerInfo.email}
                        onChange={(e) => {
                          setCustomerInfo({ ...customerInfo, email: e.target.value });
                          if (formErrors.email) setFormErrors({ ...formErrors, email: undefined });
                        }}
                        placeholder="seuemail@exemplo.com"
                        className="w-full text-xs sm:text-sm pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all placeholder:text-slate-400"
                      />
                    </div>
                    {formErrors.email && (
                      <span className="text-[11px] text-rose-500 mt-1 block font-medium">{formErrors.email}</span>
                    )}
                  </div>
                </div>

                {/* Box de Confiança e Segurança */}
                {hasPhysicalProduct ? (
                  <div className="bg-sky-50/60 border border-sky-200/80 rounded-2xl p-4 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sky-950">
                      <Truck className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>Envio Seguro e Rastreável</span>
                    </div>
                    <p className="text-[11px] text-sky-800 leading-relaxed">
                      Seu produto físico será preparado com carinho e o código de rastreamento ou dados para retirada serão enviados diretamente no seu WhatsApp.
                    </p>
                  </div>
                ) : (
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-950">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Entrega Digital 100% Automática</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Assim que o pagamento for aprovado pelo Mercado Pago, os arquivos serão liberados imediatamente na sua tela e uma cópia será enviada ao seu e-mail.
                    </p>
                  </div>
                )}
              </div>

              {/* CARD DE FRETE & ENTREGA (APENAS PARA PRODUTOS FÍSICOS) */}
              {hasPhysicalProduct && (
                <div className="bg-white p-6 sm:p-7 rounded-3xl border border-sky-200/90 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-black flex items-center justify-center">
                        <Truck className="w-3.5 h-3.5" />
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                        Cálculo de Frete & Entrega
                      </h3>
                    </div>
                    <span className="text-[10px] bg-sky-100 text-sky-800 font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                      Produto Físico
                    </span>
                  </div>

                  <ShippingCalculator
                    cartTotal={totalPrice}
                    storeId={currentStore?.id}
                    selectedOptionId={selectedShipping?.id}
                    hideHeader={true}
                    onShippingSelected={(option, addr) => {
                      setSelectedShipping(option);
                      setShippingAddress(addr);
                      setShippingFormError(null);
                    }}
                  />

                  {/* Campos de número e complemento caso seja entrega residencial */}
                  {selectedShipping && selectedShipping.id !== 'pickup' && shippingAddress && (
                    <div className="pt-2 border-t border-slate-100 space-y-3 animate-in fade-in">
                      <div className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">Endereço de Entrega: </span>
                        <span>{shippingAddress.street}, {shippingAddress.neighborhood} - {shippingAddress.city}/{shippingAddress.state}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Número <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={addressNumber}
                            onChange={(e) => {
                              setAddressNumber(e.target.value);
                              if (shippingFormError) setShippingFormError(null);
                            }}
                            placeholder="Ex: 123 ou S/N"
                            className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Complemento (opcional)
                          </label>
                          <input
                            type="text"
                            value={addressComplement}
                            onChange={(e) => setAddressComplement(e.target.value)}
                            placeholder="Apto, Bloco, etc."
                            className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {shippingFormError && (
                    <span className="text-xs text-rose-500 font-bold block">
                      {shippingFormError}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Coluna Direita: Resumo do Pedido, Cupom e Mercado Pago Checkout Pro */}
            <div className="lg:col-span-6 space-y-5">
              
              {/* Card 1: Resumo do Pedido */}
              <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                      2
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Resumo dos Produtos
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">
                    {items.reduce((acc, it) => acc + it.quantity, 0)} {items.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                {/* Tabela de Produtos */}
                <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {items.map((item) => {
                    const unitPrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
                    return (
                      <div key={item.id} className="flex justify-between py-3 text-slate-700">
                        <div className="pr-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-slate-900">{item.product.name}</span>
                            <span className="text-slate-400 text-xs">× {item.quantity}</span>
                            {item.isUpsell && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black bg-theme-light text-theme-primary border border-theme-primary/30 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                ⚡ Oferta Especial
                              </span>
                            )}
                          </div>
                          {item.customPrice !== undefined && item.customPrice < item.product.price && (
                            <span className="text-[11px] text-slate-400 line-through block mt-0.5">
                              De {formatCurrency(item.product.price * item.quantity)}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-slate-900 shrink-0">
                          {formatCurrency(unitPrice * item.quantity)}
                        </span>
                      </div>
                    );
                  })}

                  {/* Subtotal */}
                  <div className="flex justify-between py-3 font-semibold text-slate-700">
                    <span>Subtotal</span>
                    <span className="text-slate-900">{formatCurrency(totalPrice)}</span>
                  </div>

                  {couponApplied && (
                    <div className="flex justify-between py-2 text-emerald-600 font-semibold text-xs">
                      <span>Desconto de Cupom</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}

                  {/* Frete para Produtos Físicos */}
                  {hasPhysicalProduct && selectedShipping && (
                    <div className="flex justify-between py-2 text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-sky-600" />
                        Frete ({selectedShipping.name})
                      </span>
                      <span className="text-slate-900 font-bold">
                        {selectedShipping.price === 0 ? (
                          <span className="text-emerald-600 font-black uppercase text-[10px]">Grátis</span>
                        ) : (
                          formatCurrency(selectedShipping.price)
                        )}
                      </span>
                    </div>
                  )}

                  {/* Total Final */}
                  <div className="flex justify-between pt-3 text-base font-extrabold text-slate-900 border-t border-slate-200">
                    <span>Total a Pagar</span>
                    <span className="text-xl font-black text-theme-primary">{formatCurrency(finalTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Oferta de Upsell / Compre Junto Direto no Checkout (Order Bump) */}
              <CartUpsellCard />

              {/* Card 2: Cupom de Desconto */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                {!isCouponOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsCouponOpen(true)}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Possui um cupom de desconto?</span>
                    <span className="text-theme-primary font-bold hover:underline">Inserir código</span>
                  </button>
                ) : (
                  <div>
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="CUPOM"
                        className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-theme-primary/20 uppercase font-mono font-bold"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Aplicar
                      </button>
                    </form>
                    {couponFeedback && (
                      <p className={`text-[11px] font-bold mt-2 ${couponFeedback.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {couponFeedback.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Card 3: Pagamento Seguro Mercado Pago Checkout Pro Único */}
              <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-theme-primary/30 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#009ee3] text-white text-xs font-black flex items-center justify-center">
                      3
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Pagamento Seguro
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#009ee3]">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Mercado Pago</span>
                  </div>
                </div>

                {/* Destaque das Formas Aceitas pelo Checkout Pro */}
                <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-950">
                      Você poderá pagar por:
                    </span>
                    <span className="text-[10px] font-black uppercase text-sky-700 bg-white px-2 py-0.5 rounded-md border border-sky-200">
                      Checkout Oficial
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-sky-100 font-semibold text-slate-800">
                      <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Pix Instantâneo</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-sky-100 font-semibold text-slate-800">
                      <CreditCard className="w-4 h-4 text-[#009ee3] shrink-0" />
                      <span>Cartão até 12x</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-sky-800 leading-relaxed pt-1">
                    Ao clicar no botão abaixo, você será direcionado ao ambiente seguro do <strong>Mercado Pago</strong> para concluir seu pagamento com total tranquilidade.
                  </p>
                </div>

                {/* Alerta de Erro */}
                {mpError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Não foi possível prosseguir:</span>
                      <span className="text-[11px] leading-tight block mt-0.5">{mpError}</span>
                    </div>
                  </div>
                )}

                {/* Botão Oficial de Checkout Pro */}
                <button
                  type="button"
                  onClick={handleFinalizeOrder}
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Conectando ao Mercado Pago...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Ir para Pagamento Seguro • {formatCurrency(finalTotal)}</span>
                    </>
                  )}
                </button>

                {/* Selos de Segurança e Garantia */}
                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 pt-1">
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Compra 100% Protegida</span>
                  </div>
                  <span>•</span>
                  <div>SSL 256-Bit</div>
                  <span>•</span>
                  <div>Mercado Pago Oficial</div>
                </div>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* 3. Modal de Retorno de Pagamento (Captura ?status=approved / ?status=failure) */}
      <PaymentFeedbackModal />

      {/* 4. Toast, WhatsApp & Footer */}
      <Toast />
      <FloatingWhatsApp />
      <Footer />

    </div>
  );
};

export default CheckoutPage;
