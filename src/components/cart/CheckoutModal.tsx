import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  Copy,
  Check,
  Download,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle2,
  QrCode,
  Truck
} from 'lucide-react';
import { OrderCustomerInfo, CartItem, ShippingOption, DeliveryAddress } from '../../types';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { useTenant } from '../../context/TenantContext';
import { formatCurrency, generateValidRandomCpf } from '../../utils/formatters';
import { buildWhatsAppOrderMessage, createWhatsAppUrl } from '../../utils/whatsapp';
import { 
  createMercadoPagoPreference, 
  createMercadoPagoPixPayment, 
  createMercadoPagoCardPayment, 
  checkMercadoPagoPaymentStatus 
} from '../../lib/mercadopago';
import { createOrderInSupabase, updateOrderStatusInSupabase } from '../../services/orderService';
import { notifyTelegram } from '../../services/telegramNotificationService';
import { notifyWhatsApp } from '../../services/whatsappNotificationService';
import { sendOrderConfirmationEmail } from '../../services/emailService';
import { CartUpsellCard } from './CartUpsellCard';
import { ShippingCalculator } from './ShippingCalculator';

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

  // Etapa do fluxo: 'form' (dados e pagamento) | 'pix' (QR Code na tela) | 'success' (aprovado e entrega imediata)
  const [step, setStep] = useState<'form' | 'pix' | 'success'>('form');

  // Forma de pagamento selecionada na mesma tela
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'mercadopago_pro'>('pix');

  // Dados do Comprador
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
          paymentMethod: 'pix',
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
      paymentMethod: 'pix',
      generalNotes: '',
    };
  });

  const [customerCpf, setCustomerCpf] = useState<string>(() => {
    try {
      return sessionStorage.getItem('last_checkout_cpf') || localStorage.getItem('last_checkout_cpf') || '';
    } catch {
      return '';
    }
  });

  // Dados do Cartão de Crédito
  const [cardData, setCardData] = useState({
    number: '',
    holderName: '',
    expiry: '',
    cvv: '',
    installments: 1,
  });

  // Dados do Pix gerado
  const [pixData, setPixData] = useState<{
    qrCode: string;
    qrCodeBase64?: string;
    qrCodeImage?: string;
    paymentId?: string;
    ticketUrl?: string;
  } | null>(null);

  // Estados de controle e mensagens
  const [currentOrderId, setCurrentOrderId] = useState<string>('');
  const [purchasedItems, setPurchasedItems] = useState<CartItem[]>([]);
  const [finalPaidTotal, setFinalPaidTotal] = useState<number>(0);
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string; phone?: string; cpf?: string }>({});
  const [cardErrors, setCardErrors] = useState<{ number?: string; holderName?: string; expiry?: string; cvv?: string }>({});
  
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

  // Cálculo de frete e valor final
  const shippingCost = hasPhysicalProduct && selectedShipping ? selectedShipping.price : 0;
  const grandTotal = totalPrice + shippingCost;

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

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingPix, setIsCheckingPix] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Formatação de telefone brasileiro
  const formatPhoneNumber = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    if (!clean) return '';
    if (clean.length <= 2) return `(${clean}`;
    if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
  };

  // Formatação de CPF
  const formatCpf = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
    if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  };

  // Formatação de Cartão
  const formatCardNumber = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 16);
    return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length <= 2) return clean;
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
  };

  // Detecção da bandeira do cartão
  const getCardBrand = (cardNumber: string) => {
    const clean = cardNumber.replace(/\D/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'Mastercard';
    if (/^(4011|4312|4389|4514|4576|5041|5066|5067|5090|6277|6362|6363|650|6516|6550)/.test(clean)) return 'Elo';
    if (/^3[47]/.test(clean)) return 'Amex';
    if (/^6062/.test(clean)) return 'Hipercard';
    return null;
  };

  // Opções de parcelas calculadas
  const getInstallmentOptions = (total: number) => {
    const options = [];
    const maxInstallments = total >= 120 ? 12 : (total >= 50 ? 6 : (total >= 20 ? 3 : 1));
    for (let i = 1; i <= Math.min(12, Math.max(1, maxInstallments)); i++) {
      const val = (total / i).toFixed(2).replace('.', ',');
      options.push({
        count: i,
        label: `${i}x de R$ ${val} sem juros`,
      });
    }
    return options;
  };

  // Sincroniza itens e valor para tela de sucesso
  useEffect(() => {
    if (items.length > 0) {
      setPurchasedItems(getFinalOrderItems());
      setFinalPaidTotal(grandTotal);
    }
  }, [items, grandTotal, selectedShipping]);

  // Limpa dados de frete caso o carrinho não tenha produtos físicos
  useEffect(() => {
    if (!hasPhysicalProduct) {
      setSelectedShipping(null);
      setShippingAddress(null);
      setAddressNumber('');
      setAddressComplement('');
      setShippingFormError(null);
    }
  }, [hasPhysicalProduct]);

  // Reset de estado quando o modal fecha/abre
  useEffect(() => {
    if (!isCheckoutOpen) {
      setStep('form');
      setPixData(null);
      setErrorMessage(null);
      setIsLoading(false);
    }
  }, [isCheckoutOpen]);

  // Polling automático para detecção do pagamento Pix
  useEffect(() => {
    if (step !== 'pix' || !pixData?.paymentId) return;

    const interval = setInterval(async () => {
      try {
        const check = await checkMercadoPagoPaymentStatus(pixData.paymentId!, storeConfig);
        if (check.success && check.status === 'approved') {
          handlePaymentApproved(pixData.paymentId!);
        }
      } catch (err) {
        console.warn('[Pix Polling Error]:', err);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [step, pixData?.paymentId, storeConfig]);

  if (!isCheckoutOpen) return null;

  // Validação dos dados do comprador
  const validateForm = () => {
    const errors: { name?: string; email?: string; phone?: string; cpf?: string } = {};
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

  // Validação dos dados do cartão
  const validateCardForm = () => {
    const errors: { number?: string; holderName?: string; expiry?: string; cvv?: string } = {};
    const cleanNum = cardData.number.replace(/\D/g, '');
    if (!cleanNum || cleanNum.length < 13) {
      errors.number = 'Informe os 16 dígitos do cartão de crédito.';
    }

    if (!cardData.holderName.trim()) {
      errors.holderName = 'Informe o nome impresso no cartão.';
    }

    const [monthStr, yearStr] = cardData.expiry.split('/');
    const month = parseInt(monthStr || '', 10);
    const year = parseInt(yearStr || '', 10);
    if (!month || month < 1 || month > 12 || !year) {
      errors.expiry = 'Validade inválida (MM/AA).';
    }

    const cleanCvv = cardData.cvv.replace(/\D/g, '');
    if (!cleanCvv || cleanCvv.length < 3) {
      errors.cvv = 'CVV inválido (3 ou 4 dígitos).';
    }

    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Ação quando o pagamento é Aprovado (seja Pix ou Cartão)
  const handlePaymentApproved = async (paymentId: string) => {
    const orderIdToUse = currentOrderId || `order_${Date.now()}`;
    console.log('[CheckoutModal] 🚀 Pagamento APROVADO!', { paymentId, orderIdToUse });

    const finalItems = getFinalOrderItems();
    const formattedAddress = getFormattedAddress();

    setStep('success');
    setIsLoading(false);

    // 1. Atualiza status na tabela 'orders' do Supabase para 'approved'
    await updateOrderStatusInSupabase(orderIdToUse, 'approved');

    // 2. Dispara notificação de Pagamento Aprovado no WhatsApp e Telegram
    notifyWhatsApp({
      action_type: 'payment_approved',
      customer_name: customerInfo.name.trim(),
      customer_email: customerInfo.email.trim(),
      customer_phone: (customerInfo.phone || '').trim(),
      items: finalItems,
      total_amount: grandTotal,
      order_id: orderIdToUse,
      payment_method: paymentMethod === 'pix' ? 'Pix' : 'Cartão de Crédito',
      shipping_cost: shippingCost,
      shipping_method: selectedShipping?.name,
      shipping_address: formattedAddress,
      store_name: currentStore?.name || storeConfig.storeName,
      store_id: currentStore?.id,
      whatsapp_api_provider: currentStore?.whatsapp_api_provider || currentStore?.theme_settings?.whatsapp_api_provider || storeConfig?.whatsappApiProvider,
      whatsapp_api_url: currentStore?.whatsapp_api_url || currentStore?.theme_settings?.whatsapp_api_url || storeConfig?.whatsappApiUrl,
      whatsapp_api_token: currentStore?.whatsapp_api_token || currentStore?.theme_settings?.whatsapp_api_token || storeConfig?.whatsappApiToken,
      whatsapp_notify_phone: currentStore?.whatsapp_notify_phone || currentStore?.theme_settings?.whatsapp_notify_phone || storeConfig?.whatsappNotifyPhone,
    }).catch(e => console.warn('Aviso ao notificar WhatsApp:', e));

    await notifyTelegram({
      action_type: 'payment_approved',
      customer_name: customerInfo.name.trim(),
      customer_email: customerInfo.email.trim(),
      customer_phone: (customerInfo.phone || '').trim(),
      items: finalItems,
      total_amount: grandTotal,
      order_id: orderIdToUse,
      shipping_cost: shippingCost,
      shipping_method: selectedShipping?.name,
      shipping_address: formattedAddress,
      telegram_bot_token: storeConfig.telegramBotToken,
      telegram_chat_id: storeConfig.telegramChatId,
    });

    // 3. Envia e-mail de entrega dos arquivos digitais
    await sendOrderConfirmationEmail({
      customerName: customerInfo.name.trim(),
      customerEmail: customerInfo.email.trim(),
      orderId: orderIdToUse,
      orderDate: new Date().toLocaleDateString('pt-BR'),
      items: finalItems,
      totalAmount: grandTotal,
    });

    // 4. Salva dados na sessão
    sessionStorage.setItem('last_completed_order', JSON.stringify({
      orderId: orderIdToUse,
      items: finalItems,
      total: grandTotal,
      shippingCost,
      shippingMethod: selectedShipping?.name,
      deliveryAddress: formattedAddress,
      customer: customerInfo,
    }));

    // 5. Limpa carrinho
    clearCart();
  };

  // 1. GERAR PIX DIRETO NA MESMA TELA
  const handleGeneratePix = async () => {
    if (!validateForm()) return;
    if (items.length === 0) return;

    setIsLoading(true);
    setErrorMessage(null);

    const generatedOrderId = `ord_pix_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setCurrentOrderId(generatedOrderId);

    const cleanName = customerInfo.name.trim();
    const cleanEmail = customerInfo.email.trim();
    const cleanPhone = (customerInfo.phone || '').trim();
    const cleanCpf = generateValidRandomCpf();
    const targetStoreId = currentStore?.id || 'suamarcaaqui';
    const finalItems = getFinalOrderItems();
    const formattedAddress = getFormattedAddress();

    try {
      // Salva dados no cache local
      const leadData = { name: cleanName, email: cleanEmail, phone: cleanPhone, orderId: generatedOrderId, cpf: cleanCpf };
      sessionStorage.setItem('last_checkout_customer', JSON.stringify(leadData));
      localStorage.setItem('last_checkout_customer', JSON.stringify(leadData));
      sessionStorage.setItem('last_checkout_cpf', cleanCpf);
      localStorage.setItem('last_checkout_cpf', cleanCpf);

      // Salva pedido pendente no Supabase
      console.log('[CheckoutModal] 💾 Salvando pedido pendente no Supabase...', generatedOrderId);
      await createOrderInSupabase({
        store_id: targetStoreId,
        orderId: generatedOrderId,
        customerName: cleanName,
        customerEmail: cleanEmail,
        customerPhone: cleanPhone,
        customerDocument: cleanCpf,
        items: finalItems,
        totalAmount: grandTotal,
        shippingCost,
        shippingMethod: selectedShipping?.name,
        deliveryAddress: formattedAddress,
        paymentId: generatedOrderId,
        status: 'pending',
      });

      // Dispara lead no WhatsApp e Telegram
      notifyWhatsApp({
        action_type: 'abandoned_cart',
        customer_name: cleanName,
        customer_email: cleanEmail,
        customer_phone: cleanPhone,
        items: finalItems,
        total_amount: grandTotal,
        order_id: generatedOrderId,
        shipping_cost: shippingCost,
        shipping_method: selectedShipping?.name,
        shipping_address: formattedAddress,
        store_name: currentStore?.name || storeConfig.storeName,
        store_id: currentStore?.id,
        whatsapp_api_provider: currentStore?.whatsapp_api_provider || currentStore?.theme_settings?.whatsapp_api_provider || storeConfig?.whatsappApiProvider,
        whatsapp_api_url: currentStore?.whatsapp_api_url || currentStore?.theme_settings?.whatsapp_api_url || storeConfig?.whatsappApiUrl,
        whatsapp_api_token: currentStore?.whatsapp_api_token || currentStore?.theme_settings?.whatsapp_api_token || storeConfig?.whatsappApiToken,
        whatsapp_notify_phone: currentStore?.whatsapp_notify_phone || currentStore?.theme_settings?.whatsapp_notify_phone || storeConfig?.whatsappNotifyPhone,
      }).catch(e => console.warn('Aviso ao notificar WhatsApp:', e));

      await notifyTelegram({
        action_type: 'abandoned_cart',
        customer_name: cleanName,
        customer_email: cleanEmail,
        customer_phone: cleanPhone,
        items: finalItems,
        total_amount: grandTotal,
        order_id: generatedOrderId,
        shipping_cost: shippingCost,
        shipping_method: selectedShipping?.name,
        shipping_address: formattedAddress,
        telegram_bot_token: storeConfig.telegramBotToken,
        telegram_chat_id: storeConfig.telegramChatId,
      });

      // Chamada para gerar o Pix via Mercado Pago API
      console.log('[CheckoutModal] ⚡ Solicitando geração de QR Code Pix...', { amount: grandTotal, cleanCpf });
      const pixResponse = await createMercadoPagoPixPayment({
        amount: grandTotal,
        customerName: cleanName,
        customerEmail: cleanEmail,
        customerCpf: cleanCpf,
        description: `Pedido ${generatedOrderId} - Soumbolinho`,
        storeConfig,
      });

      if (pixResponse && pixResponse.qrCode) {
        console.log('[CheckoutModal] ✅ Pix gerado com sucesso!', pixResponse);
        setPixData(pixResponse);
        setStep('pix');
      } else {
        throw new Error(pixResponse?.error || 'Não foi possível gerar o QR Code Pix. Tente novamente.');
      }
    } catch (err: any) {
      console.error('[CheckoutModal] ❌ Erro ao gerar Pix:', err);
      setErrorMessage(err.message || 'Erro ao gerar Pix no Mercado Pago. Verifique o CPF e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. PROCESSAR CARTÃO DE CRÉDITO NA MESMA TELA
  const handlePayWithCard = async () => {
    if (!validateForm()) return;
    if (!validateCardForm()) return;
    if (items.length === 0) return;

    setIsLoading(true);
    setErrorMessage(null);

    const generatedOrderId = `ord_card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setCurrentOrderId(generatedOrderId);

    const cleanName = customerInfo.name.trim();
    const cleanEmail = customerInfo.email.trim();
    const cleanPhone = (customerInfo.phone || '').trim();
    const cleanCpf = generateValidRandomCpf();
    const targetStoreId = currentStore?.id || 'suamarcaaqui';
    const finalItems = getFinalOrderItems();
    const formattedAddress = getFormattedAddress();

    try {
      // Salva dados no cache local
      const leadData = { name: cleanName, email: cleanEmail, phone: cleanPhone, orderId: generatedOrderId, cpf: cleanCpf };
      sessionStorage.setItem('last_checkout_customer', JSON.stringify(leadData));
      localStorage.setItem('last_checkout_customer', JSON.stringify(leadData));
      sessionStorage.setItem('last_checkout_cpf', cleanCpf);
      localStorage.setItem('last_checkout_cpf', cleanCpf);

      // Salva pedido pendente no Supabase
      console.log('[CheckoutModal] 💾 Salvando pedido pendente no Supabase...', generatedOrderId);
      await createOrderInSupabase({
        store_id: targetStoreId,
        orderId: generatedOrderId,
        customerName: cleanName,
        customerEmail: cleanEmail,
        customerPhone: cleanPhone,
        customerDocument: cleanCpf,
        items: finalItems,
        totalAmount: grandTotal,
        shippingCost,
        shippingMethod: selectedShipping?.name,
        deliveryAddress: formattedAddress,
        paymentId: generatedOrderId,
        status: 'pending',
      });

      // Dispara cobrança do cartão via Mercado Pago
      console.log('[CheckoutModal] 💳 Processando cartão de crédito...');
      const [expMonth, expYear] = cardData.expiry.split('/');
      const cardResponse = await createMercadoPagoCardPayment({
        amount: grandTotal,
        cardNumber: cardData.number,
        cardholderName: cardData.holderName,
        expirationMonth: expMonth.trim(),
        expirationYear: expYear.trim(),
        securityCode: cardData.cvv,
        installments: cardData.installments,
        customerCpf: cleanCpf,
        customerName: cleanName,
        customerEmail: cleanEmail,
        customerPhone: cleanPhone,
        description: `Pedido ${generatedOrderId} - Soumbolinho`,
        orderId: generatedOrderId,
        storeConfig,
      });

      if (cardResponse.success && cardResponse.status === 'approved') {
        await handlePaymentApproved(cardResponse.paymentId || generatedOrderId);
      } else if (cardResponse.status === 'in_process') {
        // Pagamento em análise pela operadora
        await handlePaymentApproved(cardResponse.paymentId || generatedOrderId);
      } else {
        throw new Error(cardResponse.friendlyMessage || cardResponse.error || 'Cartão não autorizado. Verifique os dados ou pague via Pix.');
      }
    } catch (err: any) {
      console.error('[CheckoutModal] ❌ Erro ao processar cartão:', err);
      setErrorMessage(err.message || 'Erro ao processar cobrança no cartão. Tente via Pix para liberação imediata.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. MERCADO PAGO CHECKOUT PRO (REDIRECT EXTERNO SE DESEJADO)
  const handlePayWithMercadoPagoPro = async () => {
    if (!validateForm()) return;
    if (items.length === 0) return;

    setIsLoading(true);
    setErrorMessage(null);

    const generatedOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanName = customerInfo.name.trim();
    const cleanEmail = customerInfo.email.trim();
    const cleanPhone = (customerInfo.phone || '').trim();
    const targetStoreId = currentStore?.id || 'suamarcaaqui';
    const finalItems = getFinalOrderItems();
    const formattedAddress = getFormattedAddress();

    try {
      await createOrderInSupabase({
        store_id: targetStoreId,
        orderId: generatedOrderId,
        customerName: cleanName,
        customerEmail: cleanEmail,
        customerPhone: cleanPhone,
        customerDocument: (typeof window !== 'undefined' ? localStorage.getItem('last_checkout_cpf') || sessionStorage.getItem('last_checkout_cpf') : null) || undefined,
        items: finalItems,
        totalAmount: grandTotal,
        shippingCost,
        shippingMethod: selectedShipping?.name,
        deliveryAddress: formattedAddress,
        paymentId: generatedOrderId,
        status: 'pending',
      });

      const pref = await createMercadoPagoPreference({
        items: finalItems,
        customerInfo: { name: cleanName, email: cleanEmail, phone: cleanPhone },
        orderId: generatedOrderId,
        storeId: targetStoreId,
        storeConfig,
      });

      if (pref.init_point) {
        window.location.href = pref.init_point;
      } else {
        throw new Error(pref.error || 'Não foi possível gerar o link do Mercado Pago.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao conectar ao Mercado Pago.');
      setIsLoading(false);
    }
  };

  // Submissão unificada do formulário
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'pix') {
      handleGeneratePix();
    } else if (paymentMethod === 'credit_card') {
      handlePayWithCard();
    } else {
      handlePayWithMercadoPagoPro();
    }
  };

  // Copiar código Pix Copia e Cola
  const handleCopyPix = () => {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  // Checagem manual de status do Pix
  const handleManualCheckPix = async () => {
    if (!pixData?.paymentId) return;
    setIsCheckingPix(true);
    try {
      const check = await checkMercadoPagoPaymentStatus(pixData.paymentId, storeConfig);
      if (check.success && check.status === 'approved') {
        handlePaymentApproved(pixData.paymentId);
      } else {
        alert('Pagamento ainda não identificado. Conclua o Pix no seu banco e aguarde alguns segundos.');
      }
    } catch {
      alert('Aguardando compensação do banco. Tente novamente em alguns instantes.');
    } finally {
      setIsCheckingPix(false);
    }
  };

  // Envio alternativo via WhatsApp
  const handleSendToWhatsApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    const finalItems = getFinalOrderItems();
    const formattedMessage = buildWhatsAppOrderMessage(
      finalItems,
      customerInfo,
      grandTotal,
      storeConfig
    );
    const whatsappUrl = createWhatsAppUrl(storeConfig.whatsappNumber, formattedMessage);
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={closeCheckout}
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200 border border-slate-100">
        
        {/* Header Dinâmico */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {step !== 'form' && (
              <button 
                onClick={() => setStep('form')}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            {step === 'form' && (
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
            )}

            <div>
              <h3 className="font-sans font-black text-base sm:text-lg flex items-center gap-2">
                <span>
                  {step === 'form' && 'Finalizar Pedido Seguro'}
                  {step === 'pix' && 'Pagar com Pix Imediato'}
                  {step === 'success' && 'Pedido Aprovado!'}
                </span>
                <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Mercado Pago
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                {step === 'form' && 'Preencha seus dados para receber o link de acesso imediato'}
                {step === 'pix' && 'Aponte a câmera do banco ou use o Copia e Cola'}
                {step === 'success' && 'Acesso liberado aos seus arquivos digitais'}
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
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5 shadow-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Aviso de Pagamento:</p>
                <p className="text-[11px] text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ETAPA 1: FORMULÁRIO DE DADOS & ESCOLHA DE FORMA DE PAGAMENTO */}
          {/* ============================================================ */}
          {step === 'form' && (
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              
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
                    className="text-pink-600 hover:underline text-[11px] font-semibold cursor-pointer"
                  >
                    Editar carrinho
                  </button>
                </div>
                
                <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 text-xs">
                  {items.map((item, idx) => {
                    const itemPrice = item.customPrice !== undefined ? item.customPrice : (item.product?.price || 0);
                    return (
                      <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                        <span className="truncate text-slate-800 font-medium max-w-[240px]">
                          {item.quantity}x {item.product.name}
                          {item.observations ? ` (${item.observations})` : ''}
                        </span>
                        <span className="font-bold text-slate-900 shrink-0">
                          {formatCurrency(itemPrice * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                  {/* Linha de Frete se houver produto físico e opção selecionada */}
                  {hasPhysicalProduct && selectedShipping && (
                    <div className="pt-1.5 flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-600 flex items-center gap-1 font-medium">
                        <Truck className="w-3.5 h-3.5 text-sky-600" />
                        Frete ({selectedShipping.name})
                      </span>
                      <span className="font-bold text-slate-900 shrink-0">
                        {selectedShipping.price === 0 ? (
                          <span className="text-emerald-600 font-extrabold uppercase text-[10px]">Grátis</span>
                        ) : (
                          formatCurrency(selectedShipping.price)
                        )}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total a Pagar:</span>
                    <span className="text-xl font-black text-slate-950">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                {/* DADOS DO COMPRADOR */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-pink-600" />
                    {hasPhysicalProduct ? 'Dados do Comprador' : 'Dados para Envio do Produto Digital'}
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

                {/* DADOS DE FRETE & ENTREGA (APENAS PARA PRODUTOS FÍSICOS) */}
                {hasPhysicalProduct && (
                  <div className="p-4 bg-white rounded-2xl border border-sky-200/90 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-sky-600" />
                        Cálculo de Frete & Entrega
                      </h4>
                      <span className="text-[10px] bg-sky-100 text-sky-800 font-extrabold px-2 py-0.5 rounded-full uppercase">
                        Produto Físico
                      </span>
                    </div>

                    <ShippingCalculator
                      cartTotal={totalPrice}
                      storeId={currentStore?.id}
                      selectedOptionId={selectedShipping?.id}
                      isCompact={true}
                      hideHeader={true}
                      onShippingSelected={(option, addr) => {
                        setSelectedShipping(option);
                        setShippingAddress(addr);
                        setShippingFormError(null);
                      }}
                    />

                    {/* Campos de número e complemento caso seja entrega residencial */}
                    {selectedShipping && selectedShipping.id !== 'pickup' && shippingAddress && (
                      <div className="pt-2 border-t border-slate-100 space-y-2.5 animate-in fade-in">
                        <div className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">Endereço de Entrega: </span>
                          <span>{shippingAddress.street}, {shippingAddress.neighborhood} - {shippingAddress.city}/{shippingAddress.state}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Número *
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
                              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Complemento (opcional)
                            </label>
                            <input
                              type="text"
                              value={addressComplement}
                              onChange={(e) => setAddressComplement(e.target.value)}
                              placeholder="Apto, Bloco, etc."
                              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {shippingFormError && (
                      <span className="text-[11px] text-rose-500 font-medium block">
                        {shippingFormError}
                      </span>
                    )}
                  </div>
                )}

              {/* SELEÇÃO INTERATIVA DA FORMA DE PAGAMENTO (NESTA MESMA TELA!) */}
              <div className="p-4 bg-gradient-to-r from-emerald-50/60 via-sky-50/50 to-slate-50 rounded-2xl border border-slate-200 text-slate-700 space-y-3">
                <div className="text-[11px] font-black text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Escolha Como Deseja Pagar:
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 font-extrabold px-2 py-0.5 rounded-full">
                    Na mesma tela
                  </span>
                </div>

                {/* Opções Clicáveis: Pix Imediato | Cartão até 12x | Saldo/Outros */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  
                  {/* Opção 1: Pix Imediato */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('pix');
                      setErrorMessage(null);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'pix'
                        ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white/80 border-slate-200 hover:border-emerald-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                        <Zap className="w-4 h-4 fill-teal-600 text-teal-600" />
                      </div>
                      {paymentMethod === 'pix' && (
                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="font-extrabold text-slate-900 text-xs block">Pix Imediato</span>
                      <span className="text-[10px] text-emerald-600 font-bold block">Liberação Instantânea</span>
                    </div>
                  </button>

                  {/* Opção 2: Cartão de Crédito */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('credit_card');
                      setErrorMessage(null);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'credit_card'
                        ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-white/80 border-slate-200 hover:border-blue-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                      </div>
                      {paymentMethod === 'credit_card' && (
                        <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="font-extrabold text-slate-900 text-xs block">Cartão até 12x</span>
                      <span className="text-[10px] text-blue-600 font-bold block">Crédito Seguro</span>
                    </div>
                  </button>

                  {/* Opção 3: Mercado Pago Pro (Boleto/Saldo) */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('mercadopago_pro');
                      setErrorMessage(null);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between col-span-2 sm:col-span-1 ${
                      paymentMethod === 'mercadopago_pro'
                        ? 'bg-white border-slate-800 shadow-md ring-2 ring-slate-800/20'
                        : 'bg-white/80 border-slate-200 hover:border-slate-400 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                        <Lock className="w-4 h-4" />
                      </div>
                      {paymentMethod === 'mercadopago_pro' && (
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="font-extrabold text-slate-900 text-xs block">Saldo / Débito</span>
                      <span className="text-[10px] text-slate-500 font-medium block">Checkout Mercado Pago</span>
                    </div>
                  </button>

                </div>

                {/* FORMULÁRIO DO CARTÃO DE CRÉDITO (QUANDO SELECIONADO CARTÃO) */}
                {paymentMethod === 'credit_card' && (
                  <div className="pt-2 border-t border-slate-200 space-y-3 animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Preencha os dados do cartão:</span>
                      {getCardBrand(cardData.number) && (
                        <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 uppercase">
                          {getCardBrand(cardData.number)}
                        </span>
                      )}
                    </div>

                    {/* Número do Cartão */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Número do Cartão *
                      </label>
                      <input
                        type="tel"
                        required
                        value={cardData.number}
                        onChange={(e) => {
                          setCardData({ ...cardData, number: formatCardNumber(e.target.value) });
                          if (cardErrors.number) setCardErrors({ ...cardErrors, number: undefined });
                        }}
                        placeholder="0000 0000 0000 0000"
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider"
                      />
                      {cardErrors.number && (
                        <span className="text-[11px] text-rose-500 mt-1 block font-medium">{cardErrors.number}</span>
                      )}
                    </div>

                    {/* Nome Impresso no Cartão */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nome no Cartão (como impresso) *
                      </label>
                      <input
                        type="text"
                        required
                        value={cardData.holderName}
                        onChange={(e) => {
                          setCardData({ ...cardData, holderName: e.target.value.toUpperCase() });
                          if (cardErrors.holderName) setCardErrors({ ...cardErrors, holderName: undefined });
                        }}
                        placeholder="NOME COMPLETO"
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 uppercase font-semibold"
                      />
                      {cardErrors.holderName && (
                        <span className="text-[11px] text-rose-500 mt-1 block font-medium">{cardErrors.holderName}</span>
                      )}
                    </div>

                    {/* Validade + CVV */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Validade (MM/AA) *
                        </label>
                        <input
                          type="tel"
                          required
                          value={cardData.expiry}
                          onChange={(e) => {
                            setCardData({ ...cardData, expiry: formatExpiry(e.target.value) });
                            if (cardErrors.expiry) setCardErrors({ ...cardErrors, expiry: undefined });
                          }}
                          placeholder="MM/AA"
                          className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center font-bold"
                        />
                        {cardErrors.expiry && (
                          <span className="text-[11px] text-rose-500 mt-1 block font-medium">{cardErrors.expiry}</span>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Código CVV *
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={4}
                          value={cardData.cvv}
                          onChange={(e) => {
                            setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) });
                            if (cardErrors.cvv) setCardErrors({ ...cardErrors, cvv: undefined });
                          }}
                          placeholder="123"
                          className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center font-bold"
                        />
                        {cardErrors.cvv && (
                          <span className="text-[11px] text-rose-500 mt-1 block font-medium">{cardErrors.cvv}</span>
                        )}
                      </div>
                    </div>

                    {/* Seletor de Parcelamento */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Opções de Parcelamento
                      </label>
                      <select
                        value={cardData.installments}
                        onChange={(e) => setCardData({ ...cardData, installments: parseInt(e.target.value, 10) })}
                        className="w-full text-xs px-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
                      >
                        {getInstallmentOptions(grandTotal).map((opt) => (
                          <option key={opt.count} value={opt.count}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}



              </div>

              {/* Upsell opcional */}
              <CartUpsellCard />

              {/* BOTÃO PRINCIPAL DE AÇÃO */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-4 px-6 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl flex items-center justify-center gap-2.5 active:scale-98 transition-all cursor-pointer disabled:opacity-60 ${
                    paymentMethod === 'pix'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                      : paymentMethod === 'credit_card'
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
                        : 'bg-slate-900 hover:bg-black shadow-slate-900/25'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Processando no Mercado Pago...</span>
                    </>
                  ) : (
                    <>
                      {paymentMethod === 'pix' && (
                        <>
                          <Zap className="w-5 h-5 fill-white text-white" />
                          <span>Gerar QR Code Pix ({formatCurrency(grandTotal)})</span>
                        </>
                      )}
                      {paymentMethod === 'credit_card' && (
                        <>
                          <CreditCard className="w-5 h-5 text-white" />
                          <span>Pagar {formatCurrency(grandTotal)} com Cartão</span>
                        </>
                      )}
                      {paymentMethod === 'mercadopago_pro' && (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Pagar com Mercado Pago ({formatCurrency(grandTotal)})</span>
                        </>
                      )}
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
                <span>Ambiente 100% seguro criptografado pelo Mercado Pago.</span>
              </p>
            </form>
          )}

          {/* ============================================================ */}
          {/* ETAPA 2: EXIBIÇÃO DIRETA DO QR CODE PIX NA MESMA TELA        */}
          {/* ============================================================ */}
          {step === 'pix' && pixData && (
            <div className="space-y-4 animate-in fade-in-50 zoom-in-98 duration-200">
              
              {/* Box de Status e Valor */}
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-extrabold uppercase text-teal-700 tracking-wider block">
                    Pagamento via Pix
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-teal-200 text-teal-800 text-xs font-bold shadow-2xs">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                  </span>
                  <span>Aguardando banco...</span>
                </div>
              </div>

              {/* QR Code Imagem Renderizada */}
              <div className="p-6 bg-white border-2 border-dashed border-teal-300 rounded-3xl flex flex-col items-center justify-center text-center space-y-3 shadow-sm">
                <div className="w-56 h-56 bg-white p-3 rounded-2xl border border-slate-200 shadow-md flex items-center justify-center">
                  <img
                    src={
                      pixData.qrCodeBase64
                        ? (pixData.qrCodeBase64.startsWith('data:') ? pixData.qrCodeBase64 : `data:image/png;base64,${pixData.qrCodeBase64}`)
                        : (pixData.qrCodeImage || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixData.qrCode)}`)
                    }
                    alt="QR Code Pix Mercado Pago"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-xs font-bold text-slate-700 max-w-xs">
                  Abra o app do seu banco e aponte a câmera para escanear o QR Code acima.
                </p>
              </div>

              {/* Código Pix Copia e Cola */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Ou use o Pix Copia e Cola:</span>
                  {copiedPix && (
                    <span className="text-emerald-600 text-[11px] font-extrabold flex items-center gap-1 animate-in fade-in">
                      <Check className="w-3.5 h-3.5" /> Copiado com sucesso!
                    </span>
                  )}
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixData.qrCode}
                    className="flex-1 text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-slate-600 truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                      copiedPix
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 hover:bg-black text-white'
                    }`}
                  >
                    {copiedPix ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Código</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Verificação em Tempo Real & Ações */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleManualCheckPix}
                  disabled={isCheckingPix}
                  className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-60"
                >
                  {isCheckingPix ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Consultando no Mercado Pago...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Já paguei no banco! Liberar Acesso Agora</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="w-full py-2 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  ← Escolher outra forma de pagamento
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Identificação automática em tempo real. Assim que o banco confirmar, a tela atualiza sozinha!</span>
              </div>

            </div>
          )}

          {/* ============================================================ */}
          {/* ETAPA 3: PAGAMENTO APROVADO & ENTREGA IMEDIATA DOS ARQUIVOS  */}
          {/* ============================================================ */}
          {step === 'success' && (
            <div className="text-center space-y-4 py-2 animate-in fade-in zoom-in-95 duration-200">
              
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">
                  🎉 Pagamento Confirmado com Sucesso!
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Seu pedido foi registrado e confirmado pelo Mercado Pago com total segurança:
                </p>
              </div>

              {/* Aviso para Produtos Físicos se houver */}
              {hasPhysicalProduct && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-left text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in">
                  <Truck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Produto Físico em Preparação!</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      {selectedShipping?.id === 'pickup' 
                        ? `Seu pedido estará pronto para retirada no balcão da loja conforme as instruções de funcionamento.`
                        : `O lojista recebeu seus dados e o código de rastreio será atualizado e enviado para seu WhatsApp assim que postado.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Lista dos Produtos Comprados com Link de Download se houver produtos digitais */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-3">
                <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider block">
                  Itens do Seu Pedido:
                </span>

                <div className="space-y-2">
                  {purchasedItems.map((item, idx) => {
                    const isItemPhysical = !item.product.is_digital && !(item.product as any).isDigital;
                    const dlUrl = 
                      item.product.delivery_url || 
                      (item.product as any).deliveryUrl || 
                      (item.product as any).canva_link || 
                      (item.product as any).canvaLink || 
                      '#';

                    return (
                      <div 
                        key={idx}
                        className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3"
                      >
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {item.product.name}
                          </p>
                          <span className={`text-[10px] font-semibold block ${isItemPhysical ? 'text-sky-600' : 'text-emerald-600'}`}>
                            {isItemPhysical ? '📦 Produto Físico (Em Separação)' : '⚡ Arquivo Digital (Acesso Liberado)'}
                          </span>
                        </div>

                        {!isItemPhysical && dlUrl !== '#' && (
                          <a
                            href={dlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Baixar Arquivo</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notificação de envio por e-mail e WhatsApp */}
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-left text-xs text-sky-900 flex items-start gap-2">
                <Mail className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Cópia Enviada para você!</p>
                  <p className="text-[11px] text-sky-800 mt-0.5">
                    Os links e o comprovante também foram enviados para <strong>{customerInfo.email || 'seu e-mail'}</strong> e WhatsApp.
                  </p>
                </div>
              </div>

              {/* Botão de Fechar */}
              <button
                type="button"
                onClick={closeCheckout}
                className="w-full py-3 px-6 bg-slate-900 hover:bg-black text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-md"
              >
                Concluir e Voltar para a Loja
              </button>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default CheckoutModal;
