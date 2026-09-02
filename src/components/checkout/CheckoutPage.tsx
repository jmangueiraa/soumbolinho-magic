import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ShoppingBag, 
  CreditCard, 
  Tag, 
  Star,
  Copy,
  Check,
  Loader2,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Download,
  ExternalLink,
  Mail,
  AlertCircle
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { formatCurrency } from '../../utils/formatters';
import { buildWhatsAppOrderMessage, createWhatsAppUrl } from '../../utils/whatsapp';
import { sendOrderConfirmationEmail } from '../../services/emailService';
import { createOrderInSupabase, updateOrderStatusInSupabase } from '../../services/orderService';
import { createMercadoPagoPixPayment, isMercadoPagoConfigured, checkMercadoPagoPaymentStatus } from '../../lib/mercadopago';
import { Header } from '../layout/Header';
import { Footer } from '../layout/Footer';
import { Toast } from '../common/Toast';
import { FloatingWhatsApp } from '../layout/FloatingWhatsApp';

export const CheckoutPage: React.FC = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { storeConfig } = useStoreData();

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    cpf: '',
    paymentMethod: 'pix' as 'pix' | 'cartao',
  });

  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    cardholderName: '',
    expirationDate: '',
    securityCode: '',
    installments: '1',
  });

  const [couponCode, setCouponCode] = useState('');
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [discount, setDiscount] = useState(0);

  const [formErrors, setFormErrors] = useState<{ 
    name?: string; 
    email?: string; 
    cpf?: string;
    cardNumber?: string;
    cardholderName?: string;
    expirationDate?: string;
    securityCode?: string;
  }>({});
  const [mpError, setMpError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPaymentApproved, setIsPaymentApproved] = useState(false);

  // Formata o CPF no padrão 000.000.000-00
  const formatCPF = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
    if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  };

  // Formata o Número do Cartão com espaços a cada 4 dígitos
  const formatCardNumber = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 16);
    return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  // Formata a Validade no padrão MM/AA
  const formatExpirationDate = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length <= 2) return clean;
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  };

  // Alterna o método de pagamento e navega para a página dedicada se for cartão
  const handleSelectPaymentMethod = (method: 'pix' | 'cartao') => {
    if (method === 'cartao') {
      window.location.hash = '/checkout/cartao';
      return;
    }
    setCustomerInfo({ ...customerInfo, paymentMethod: 'pix' });
    setOrderReceived(null);
    setMpError(null);
    setIsPaymentApproved(false);
    setFormErrors({});
  };

  // Estado da tela de Pedido Recebido na Mesma Página (Order Received)
  const [orderReceived, setOrderReceived] = useState<{
    orderId: string;
    orderDate: string;
    totalAmount: number;
    paymentMethod: string;
    customerName: string;
    customerEmail: string;
    items: typeof items;
    pixCode: string;
    qrCodeUrl: string;
  } | null>(null);

  // Polling automático a cada 5s para detectar confirmação do Pix
  React.useEffect(() => {
    if (!orderReceived?.orderId || isPaymentApproved) return;

    const paymentId = orderReceived.orderId;
    if (!/^\d+$/.test(paymentId)) return;

    console.log(`[Polling Pix] ⏳ Iniciando verificação automática a cada 5s para o pagamento #${paymentId}...`);

    const intervalId = setInterval(async () => {
      try {
        const result = await checkMercadoPagoPaymentStatus(paymentId, storeConfig);
        if (result.success && result.status === 'approved') {
          console.log(`[Polling Pix] 🎉 Pagamento #${paymentId} APROVADO!`);
          clearInterval(intervalId);
          setIsPaymentApproved(true);

          // 1. Atualizar status na tabela 'orders' do Supabase
          await updateOrderStatusInSupabase(paymentId, 'approved');

          // 2. Disparar e-mail de entrega com o link do produto
          await sendOrderConfirmationEmail({
            customerName: orderReceived.customerName,
            customerEmail: orderReceived.customerEmail,
            orderId: paymentId,
            orderDate: orderReceived.orderDate,
            items: orderReceived.items,
            totalAmount: orderReceived.totalAmount,
            storeConfig,
          });
        }
      } catch (err) {
        console.warn('[Polling Pix] Erro ao consultar status:', err);
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [orderReceived, isPaymentApproved, storeConfig]);

  const hasMercadoPago = isMercadoPagoConfigured(storeConfig);
  const finalTotal = Math.max(0, totalPrice - discount);

  const validateForm = () => {
    const errors: { 
      name?: string; 
      email?: string; 
      cpf?: string;
      cardNumber?: string;
      cardholderName?: string;
      expirationDate?: string;
      securityCode?: string;
    } = {};

    if (!customerInfo.name.trim()) errors.name = 'Informe o seu nome.';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerInfo.email.trim()) {
      errors.email = 'Informe o seu e-mail para recebimento do link.';
    } else if (!emailRegex.test(customerInfo.email.trim())) {
      errors.email = 'Informe um e-mail válido.';
    }

    if (customerInfo.paymentMethod === 'pix') {
      const cleanCpf = customerInfo.cpf.replace(/\D/g, '');
      if (!cleanCpf) {
        errors.cpf = 'Informe o seu CPF (obrigatório para emissão do Pix).';
      } else if (cleanCpf.length !== 11) {
        errors.cpf = 'CPF incompleto. Digite os 11 dígitos.';
      }
    } else if (customerInfo.paymentMethod === 'cartao') {
      const cleanCard = cardInfo.cardNumber.replace(/\D/g, '');
      if (!cleanCard) {
        errors.cardNumber = 'Informe o número do cartão.';
      } else if (cleanCard.length < 13 || cleanCard.length > 19) {
        errors.cardNumber = 'Número de cartão inválido.';
      }

      if (!cardInfo.cardholderName.trim()) {
        errors.cardholderName = 'Informe o nome impresso no cartão.';
      }

      const cleanExp = cardInfo.expirationDate.replace(/\D/g, '');
      if (!cleanExp || cleanExp.length !== 4) {
        errors.expirationDate = 'Informe a validade (MM/AA).';
      }

      const cleanCvv = cardInfo.securityCode.replace(/\D/g, '');
      if (!cleanCvv || cleanCvv.length < 3) {
        errors.securityCode = 'Informe o CVV (3 ou 4 dígitos).';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    if (couponCode.trim().toUpperCase() === 'FESTA10' || couponCode.trim().toUpperCase() === 'PRIMEIRACOMPRA') {
      const disc = totalPrice * 0.1;
      setDiscount(disc);
      setCouponApplied(true);
    } else {
      alert('Cupom inválido ou expirado.');
    }
  };

  const handleFinalizeOrder = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setMpError(null);

    const generatedOrderId = String(Math.floor(700 + Math.random() * 200));
    const currentDate = new Date().toLocaleDateString('pt-BR');

    // FLUXO 1: CARTÃO DE CRÉDITO
    if (customerInfo.paymentMethod === 'cartao') {
      const orderData = {
        orderId: generatedOrderId,
        orderDate: currentDate,
        totalAmount: finalTotal,
        paymentMethod: 'Cartão de crédito',
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        items: [...items],
        pixCode: '',
        qrCodeUrl: '',
      };

      try {
        sessionStorage.setItem('last_checkout_customer', JSON.stringify({
          name: customerInfo.name,
          email: customerInfo.email
        }));
      } catch (e) {
        console.warn(e);
      }

      // 1. Salvar no Supabase como aprovado
      await createOrderInSupabase({
        orderId: generatedOrderId,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        items: [...items],
        totalAmount: finalTotal,
        paymentId: generatedOrderId,
        status: 'approved',
      });

      // 2. Disparar e-mail com os links de entrega
      await sendOrderConfirmationEmail({
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        orderId: generatedOrderId,
        orderDate: currentDate,
        items: [...items],
        totalAmount: finalTotal,
        storeConfig,
      });

      setIsPaymentApproved(true);
      setOrderReceived(orderData);
      clearCart();
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // FLUXO 2: PIX
    const pixKey = storeConfig.whatsappNumber || '21974975884';
    let finalPixCode = `00020126580014br.gov.bcb.pix0136${pixKey}520400005303986540${finalTotal.toFixed(2)}5802BR5911SOUMBOLINHO6009RIO DE JANEIRO62070503***6304`;
    let finalQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(finalPixCode)}&bgcolor=ffffff&color=008080&margin=1`;
    let finalPaymentId = generatedOrderId;

    try {
      const pixResponse = await createMercadoPagoPixPayment({
        amount: finalTotal,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerCpf: customerInfo.cpf,
        description: 'Pedido Soumbolinho',
        storeConfig,
      });

      if (pixResponse.success && pixResponse.qrCode) {
        finalPixCode = pixResponse.qrCode;
        finalQrUrl = pixResponse.qrCodeImage || (pixResponse.qrCodeBase64
          ? `data:image/png;base64,${pixResponse.qrCodeBase64}`
          : `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(pixResponse.qrCode)}&bgcolor=ffffff&color=008080&margin=1`);
        if (pixResponse.paymentId) finalPaymentId = pixResponse.paymentId;
      } else {
        throw new Error('A API do Mercado Pago não retornou o código Pix.');
      }
    } catch (mpErr: any) {
      console.error('[CheckoutPage] ❌ Erro detalhado do Mercado Pago Pix:', mpErr);
      setMpError(mpErr.message || 'Erro ao comunicar com o Mercado Pago.');
      setIsLoading(false);
      return;
    }

    const orderData = {
      orderId: finalPaymentId,
      orderDate: currentDate,
      totalAmount: finalTotal,
      paymentMethod: 'Pix',
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      items: [...items],
      pixCode: finalPixCode,
      qrCodeUrl: finalQrUrl,
    };

    try {
      sessionStorage.setItem('last_checkout_customer', JSON.stringify({
        name: customerInfo.name,
        email: customerInfo.email
      }));
    } catch (e) {
      console.warn(e);
    }

    // Salvar pedido no Supabase
    await createOrderInSupabase({
      orderId: finalPaymentId,
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      items: [...items],
      totalAmount: finalTotal,
      paymentId: finalPaymentId,
      status: 'pending',
    });

    // Manter na mesma página exibindo o Pix
    setOrderReceived(orderData);
    clearCart();
    setIsLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyPix = () => {
    if (!orderReceived) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(orderReceived.pixCode);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = orderReceived.pixCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleNotifyWhatsApp = () => {
    if (!orderReceived) return;

    const orderMessage = buildWhatsAppOrderMessage(
      orderReceived.items,
      {
        name: orderReceived.customerName,
        email: orderReceived.customerEmail,
        paymentMethod: 'pix',
        deliveryType: 'retirada',
      },
      orderReceived.totalAmount,
      storeConfig
    );

    const whatsappUrl = createWhatsAppUrl(storeConfig.whatsappNumber, orderMessage);
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800">
      
      {/* 1. Header Oficial */}
      <Header />

      {/* 2. Conteúdo da Página de Finalização de Compra */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
        
        {/* Título Principal com Linha Pontilhada */}
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
            Finalização de Compra
          </h1>
          
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-dotted border-slate-300" />
            <div className="absolute bg-white px-3 text-slate-400">
              <Star className="w-4 h-4 fill-slate-100 text-slate-400" />
            </div>
          </div>
        </div>

        {/* TELA 1: PEDIDO RECEBIDO NA MESMA PÁGINA (PAGAMENTO COM PIX) */}
        {orderReceived ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Mensagem e Barra de Dados do Pedido */}
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-700 font-medium">
                {isPaymentApproved ? '🎉 Parabéns! Seu pagamento foi confirmado com sucesso.' : 'Obrigado. Seu pedido foi recebido.'}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 sm:p-5 bg-slate-50/90 rounded-2xl border border-slate-200 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    NÚMERO DO PEDIDO:
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {orderReceived.orderId}
                  </span>
                </div>

                <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    DATA:
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {orderReceived.orderDate}
                  </span>
                </div>

                <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    TOTAL:
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {formatCurrency(orderReceived.totalAmount)}
                  </span>
                </div>

                <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    STATUS:
                  </span>
                  <span className={`font-extrabold text-sm flex items-center gap-1 ${isPaymentApproved ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isPaymentApproved ? '✓ Pago / Aprovado' : 'Aguardando Pix'}
                  </span>
                </div>
              </div>
            </div>

            {/* SE O PAGAMENTO ESTIVER APROVADO: MOSTRA SUCESSO E DOWNLOADS */}
            {isPaymentApproved || orderReceived.paymentMethod === 'Cartão de crédito' ? (
              <div className="bg-gradient-to-b from-emerald-500/10 via-emerald-50/50 to-white p-6 sm:p-8 rounded-3xl border-2 border-emerald-500 shadow-lg space-y-6 text-center animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md animate-bounce">
                  <Check className="w-9 h-9 stroke-[3]" />
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Pagamento Aprovado com Sucesso!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-lg mx-auto leading-relaxed">
                    {orderReceived.paymentMethod === 'Cartão de crédito'
                      ? `Seu pagamento com Cartão de Crédito foi aprovado. Os links de download foram liberados abaixo e enviados para ${orderReceived.customerEmail}.`
                      : `Identificamos o seu pagamento Pix no Mercado Pago. O link de download também foi enviado para ${orderReceived.customerEmail}.`}
                  </p>
                </div>

                {/* Card de Downloads com Botão Verde */}
                <div className="space-y-3 pt-2 text-left max-w-2xl mx-auto">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Seus Arquivos para Download:</span>
                  </h3>

                  <div className="space-y-2">
                    {orderReceived.items.map((item) => {
                      const downloadUrl = item.product.delivery_url || item.product.deliveryUrl || item.product.imageUrl || '#';
                      return (
                        <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white rounded-2xl border border-emerald-200 shadow-sm gap-3">
                          <div>
                            <span className="text-xs sm:text-sm font-bold text-slate-900 block">{item.product.name}</span>
                            <span className="text-[10px] text-emerald-700 font-semibold">✓ Acesso vitalício imediato</span>
                          </div>

                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95 shrink-0"
                          >
                            <Download className="w-4 h-4" />
                            <span>Acessar seu Produto / Fazer Download</span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              /* SE O PAGAMENTO AINDA NÃO FOI APROVADO E FOR PIX: MOSTRA QR CODE E POLLING */
              <>
                {/* Banner de Polling Ativo */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center flex items-center justify-center gap-2 text-xs text-amber-800 animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="font-semibold">Aguardando pagamento... A tela atualizará automaticamente assim que você pagar no app do banco.</span>
                </div>

                {/* Título de Pagamento Pix */}
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Agora é só pagar com o Pix para finalizar sua compra
                </h2>

                {/* Card Principal do Pix em 2 Colunas */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Coluna Esquerda: Instruções Pix */}
                  <div className="lg:col-span-6 space-y-6">
                    
                    {/* Logo Pix Banco Central */}
                    <div className="flex items-center gap-2.5">
                      <svg className="w-10 h-10 text-[#32BCAD]" viewBox="0 0 512 512" fill="currentColor">
                        <path d="M112.5 131.3L234.7 9.1c11.7-11.7 30.8-11.7 42.5 0l122.2 122.2c11.7 11.7 11.7 30.8 0 42.5L277.2 296c-11.7 11.7-30.8 11.7-42.5 0L112.5 173.8c-11.7-11.7-11.7-30.8 0-42.5zM399.5 380.7L277.3 502.9c-11.7 11.7-30.8 11.7-42.5 0L112.5 380.7c-11.7-11.7-11.7-30.8 0-42.5L234.8 216c11.7-11.7 30.8-11.7 42.5 0l122.2 122.2c11.7 11.7 11.7 30.8 0 42.5z"/>
                      </svg>
                      <div>
                        <span className="text-2xl font-black tracking-tight text-slate-800 leading-none block">pix</span>
                        <span className="text-[10px] text-slate-400 font-medium">powered by Banco Central</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-900">
                        Como pagar com Pix:
                      </h3>

                      <ol className="space-y-3 text-xs text-slate-600">
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                            1
                          </span>
                          <span className="pt-0.5">Acesse o app ou site do seu banco</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                            2
                          </span>
                          <span className="pt-0.5">Busque a opção de pagar com Pix</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                            3
                          </span>
                          <span className="pt-0.5">Leia o QR code ou código Pix</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                            4
                          </span>
                          <span className="pt-0.5">Pronto! Você verá a confirmação do pagamento</span>
                        </li>
                      </ol>
                    </div>

                  </div>

                  {/* Coluna Direita: QR Code e Código Copia e Cola */}
                  <div className="lg:col-span-6 space-y-4 text-center lg:text-left">
                    
                    <div>
                      <span className="text-xs text-slate-500">Valor a pagar:</span>
                      <span className="text-lg font-black text-slate-900 ml-1">
                        {formatCurrency(orderReceived.totalAmount)}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-800">
                      Escaneie o QR code:
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center lg:items-start justify-center">
                      <div className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-xs inline-block">
                        <img
                          src={orderReceived.qrCodeUrl}
                          alt="QR Code Pix"
                          className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 mt-2">
                        Código válido por 30 minutos
                      </span>
                    </div>

                    {/* Código Copia e Cola */}
                    <div className="space-y-2 pt-2 text-left">
                      <p className="text-[11px] text-slate-500">
                        Se preferir, você pode pagar copiando e colando o seguinte código:
                      </p>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={orderReceived.pixCode}
                          className="flex-1 text-xs font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 outline-none select-all truncate"
                        />

                        <button
                          type="button"
                          onClick={handleCopyPix}
                          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 ${
                            copied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                          }`}
                        >
                          {copied ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copiar código Pix</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              </>
            )}

            {/* Link para voltar ao início */}
            <div className="text-center pt-4">
              <a
                href="#/"
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 underline"
              >
                Voltar à página inicial do catálogo
              </a>
            </div>

          </div>
        ) : items.length === 0 ? (
          /* Carrinho Vazio */
          <div className="bg-slate-50 rounded-3xl p-12 text-center border border-slate-200 space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-pastel-pink-light text-pastel-pink-dark flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Seu carrinho está vazio</h2>
            <p className="text-xs text-slate-500">
              Adicione produtos ao seu carrinho para poder finalizar o pedido.
            </p>
            <a
              href="#/"
              className="inline-block px-6 py-3 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-full transition-all"
            >
              Ver Catálogo de Produtos
            </a>
          </div>
        ) : (
          /* TELA 2: FORMULÁRIO DE CHECKOUT EM 2 COLUNAS */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Coluna Esquerda: Dados do Contato */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Dados do Contato
                </h3>

                <div className="space-y-4">
                  {/* Nome * */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Nome <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                      placeholder="Nome"
                      className="w-full text-xs sm:text-sm px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all placeholder:text-slate-400"
                    />
                    {formErrors.name && (
                      <span className="text-[11px] text-rose-500 mt-1 block font-medium">{formErrors.name}</span>
                    )}
                  </div>

                  {/* E-mail para recebimento do link * */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      E-mail para recebimento do link <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      placeholder="Email Address"
                      className="w-full text-xs sm:text-sm px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all placeholder:text-slate-400"
                    />
                    {formErrors.email && (
                      <span className="text-[11px] text-rose-500 mt-1 block font-medium">{formErrors.email}</span>
                    )}
                  </div>

                  {/* CPF * (EXIBIDO SOMENTE QUANDO PIX ESTIVER SELECIONADO) */}
                  {customerInfo.paymentMethod === 'pix' && (
                    <div className="animate-in fade-in duration-200">
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        CPF (obrigatório para emissão do Pix) <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={14}
                        value={customerInfo.cpf}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, cpf: formatCPF(e.target.value) })}
                        placeholder="000.000.000-00"
                        className="w-full text-xs sm:text-sm px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all placeholder:text-slate-400 font-mono tracking-wider"
                      />
                      {formErrors.cpf && (
                        <span className="text-[11px] text-rose-500 mt-1 block font-medium">{formErrors.cpf}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Direita: Resumo do Pedido, Cupom e Pagamento */}
            <div className="lg:col-span-6 space-y-5">
              
              {/* Card 1: Pedido */}
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Pedido
                </h3>

                {/* Tabela de Produtos */}
                <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                  <div className="flex justify-between py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <span>Produto</span>
                    <span>Subtotal</span>
                  </div>

                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between py-3 text-slate-700">
                      <span className="font-medium pr-4">
                        {item.product.name} <span className="text-slate-400">× {item.quantity}</span>
                      </span>
                      <span className="font-semibold text-slate-900 shrink-0">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}

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

                  {/* Total */}
                  <div className="flex justify-between pt-3 text-base font-extrabold text-slate-900">
                    <span>Total</span>
                    <span className="text-lg font-black text-slate-900">{formatCurrency(finalTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Cupom de Desconto */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                {!isCouponOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsCouponOpen(true)}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Você tem um cupom?</span>
                    <span className="text-emerald-600 font-bold hover:underline">Coloque o código</span>
                  </button>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Código do cupom"
                      className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 uppercase"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Aplicar
                    </button>
                  </form>
                )}
              </div>

              {/* Card 3: Formas de Pagamento */}
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Formas de Pagamento
                </h3>

                {/* Opção Pix */}
                <div className="space-y-3">
                  <label 
                    onClick={() => handleSelectPaymentMethod('pix')}
                    className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      customerInfo.paymentMethod === 'pix' 
                        ? 'border-emerald-500 bg-emerald-50/20 shadow-xs' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="payment"
                        checked={customerInfo.paymentMethod === 'pix'}
                        onChange={() => handleSelectPaymentMethod('pix')}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs sm:text-sm font-bold text-slate-900">Pix</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        Aprovação Imediata
                      </span>
                      <span className="text-teal-600 font-extrabold text-sm">❖</span>
                    </div>
                  </label>

                  {/* Card Informativo Pix do Banco Central (SOMENTE NO PIX) */}
                  {customerInfo.paymentMethod === 'pix' && (
                    <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200 text-center space-y-3 animate-in fade-in duration-200">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-2">
                          <svg className="w-8 h-8 text-[#32BCAD]" viewBox="0 0 512 512" fill="currentColor">
                            <path d="M112.5 131.3L234.7 9.1c11.7-11.7 30.8-11.7 42.5 0l122.2 122.2c11.7 11.7 11.7 30.8 0 42.5L277.2 296c-11.7 11.7-30.8 11.7-42.5 0L112.5 173.8c-11.7-11.7-11.7-30.8 0-42.5zM399.5 380.7L277.3 502.9c-11.7 11.7-30.8 11.7-42.5 0L112.5 380.7c-11.7-11.7-11.7-30.8 0-42.5L234.8 216c11.7-11.7 30.8-11.7 42.5 0l122.2 122.2c11.7 11.7 11.7 30.8 0 42.5z"/>
                          </svg>
                          <span className="text-2xl font-black tracking-tight text-slate-800">pix</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">powered by Banco Central</span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                        Pague de forma segura e instantânea
                      </h4>

                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                        Ao confirmar a compra, nós vamos te mostrar o código para fazer o pagamento.
                      </p>

                      <p className="text-[10px] text-slate-400 pt-1">
                        Ao continuar, você concorda com nossos <span className="text-emerald-600 font-semibold cursor-pointer hover:underline">Termos e condições</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Opção Cartão de Crédito (Página Dedicada) */}
                <div className="space-y-3">
                  <a 
                    href="#/checkout/cartao"
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-5 h-5 text-slate-500" />
                      <div>
                        <span className="text-xs sm:text-sm font-bold text-slate-800 block">Pagar com Cartão de crédito</span>
                        <span className="text-[10px] text-slate-400">Clique para abrir a página de pagamento com cartão</span>
                      </div>
                    </div>
                    <span className="text-xs text-emerald-700 font-bold">Abrir &rarr;</span>
                  </a>
                </div>

                {/* Termos e Política de Privacidade */}
                <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
                  Os seus dados pessoais serão utilizados para processar a sua compra, apoiar a sua experiência em todo este site e para outros fins descritos na nossa <span className="text-emerald-600 font-semibold cursor-pointer hover:underline">política de privacidade</span>.
                </p>

                {/* Alerta de Erro */}
                {mpError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Erro no processamento:</span>
                      <span className="text-[11px] leading-tight block mt-0.5">{mpError}</span>
                    </div>
                  </div>
                )}

                {/* Botão Finalizar Pedido Pix */}
                <button
                  type="button"
                  onClick={handleFinalizeOrder}
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-[#4CAF50] hover:bg-[#43A047] text-white font-bold text-sm sm:text-base rounded-xl shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Gerando Pix...</span>
                    </>
                  ) : (
                    <span>Finalizar e Pagar com Pix</span>
                  )}
                </button>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* 3. Toast, WhatsApp & Footer */}
      <Toast />
      <FloatingWhatsApp />
      <Footer />

    </div>
  );
};
