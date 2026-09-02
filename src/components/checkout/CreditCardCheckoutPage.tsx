import React, { useState } from 'react';
import { 
  CreditCard, 
  Lock, 
  ShieldCheck, 
  Check, 
  Download, 
  ShoppingBag, 
  Star, 
  Loader2,
  X
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { formatCurrency } from '../../utils/formatters';
import { sendOrderConfirmationEmail } from '../../services/emailService';
import { createOrderInSupabase } from '../../services/orderService';
import { Header } from '../layout/Header';
import { Footer } from '../layout/Footer';
import { Toast } from '../common/Toast';
import { FloatingWhatsApp } from '../layout/FloatingWhatsApp';

export const CreditCardCheckoutPage: React.FC = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { storeConfig } = useStoreData();

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
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
    cardNumber?: string;
    cardholderName?: string;
    expirationDate?: string;
    securityCode?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderId: string;
    orderDate: string;
    totalAmount: number;
    customerName: string;
    customerEmail: string;
    items: typeof items;
  } | null>(null);

  // Limpa o estado e retorna para a página inicial
  const handleFinishAndExit = () => {
    clearCart();
    setOrderSuccess(null);
    window.location.hash = '#/';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Formata o Número do Cartão (0000 0000 0000 0000)
  const formatCardNumber = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 16);
    return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  // Formata a Validade (MM/AA)
  const formatExpirationDate = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length <= 2) return clean;
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  };

  const finalTotal = Math.max(0, totalPrice - discount);

  const validateForm = () => {
    const errors: {
      name?: string;
      email?: string;
      cardNumber?: string;
      cardholderName?: string;
      expirationDate?: string;
      securityCode?: string;
    } = {};

    if (!customerInfo.name.trim()) errors.name = 'Informe o seu nome completo.';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerInfo.email.trim()) {
      errors.email = 'Informe o seu e-mail para recebimento dos arquivos.';
    } else if (!emailRegex.test(customerInfo.email.trim())) {
      errors.email = 'Informe um e-mail válido.';
    }

    const cleanCard = cardInfo.cardNumber.replace(/\D/g, '');
    if (!cleanCard) {
      errors.cardNumber = 'Informe o número do cartão.';
    } else if (cleanCard.length < 13 || cleanCard.length > 19) {
      errors.cardNumber = 'Número de cartão inválido.';
    }

    if (!cardInfo.cardholderName.trim()) {
      errors.cardholderName = 'Informe o nome como impresso no cartão.';
    }

    const cleanExp = cardInfo.expirationDate.replace(/\D/g, '');
    if (!cleanExp || cleanExp.length !== 4) {
      errors.expirationDate = 'Informe a validade (MM/AA).';
    }

    const cleanCvv = cardInfo.securityCode.replace(/\D/g, '');
    if (!cleanCvv || cleanCvv.length < 3) {
      errors.securityCode = 'Informe o código CVV.';
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

  const handleProcessPayment = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    const generatedOrderId = String(Math.floor(700 + Math.random() * 200));
    const currentDate = new Date().toLocaleDateString('pt-BR');

    const successData = {
      orderId: generatedOrderId,
      orderDate: currentDate,
      totalAmount: finalTotal,
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      items: [...items],
    };

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

    // 2. Disparar e-mail de entrega imediata
    await sendOrderConfirmationEmail({
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      orderId: generatedOrderId,
      orderDate: currentDate,
      items: [...items],
      totalAmount: finalTotal,
      storeConfig,
    });

    setOrderSuccess(successData);
    clearCart();
    setIsLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800">
      {/* Header */}
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
        
        {/* Título Principal */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans flex items-center gap-2">
              <CreditCard className="w-7 h-7 text-emerald-600" />
              <span>Finalização de Compra • Cartão de Crédito</span>
            </h1>

            {/* Alternar para Pix */}
            <a
              href="#/checkout"
              className="text-xs font-bold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-3.5 py-2 rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
            >
              <span>❖ Pagar com Pix</span>
            </a>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-dotted border-slate-300" />
            <div className="absolute bg-white px-3 text-slate-400">
              <Star className="w-4 h-4 fill-slate-100 text-slate-400" />
            </div>
          </div>
        </div>

        {/* TELA DE SUCESSO DO CARTÃO */}
        {orderSuccess ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Barra de Resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">NÚMERO DO PEDIDO:</span>
                <span className="font-extrabold text-slate-900 text-sm">#{orderSuccess.orderId}</span>
              </div>
              <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">DATA:</span>
                <span className="font-extrabold text-slate-900 text-sm">{orderSuccess.orderDate}</span>
              </div>
              <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">TOTAL:</span>
                <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(orderSuccess.totalAmount)}</span>
              </div>
              <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">MÉTODO:</span>
                <span className="font-extrabold text-emerald-600 text-sm">Cartão de Crédito</span>
              </div>
            </div>

            {/* Card Celebratório e Links de Download */}
            <div className="relative bg-gradient-to-b from-emerald-500/10 via-emerald-50/50 to-white p-6 sm:p-8 rounded-3xl border-2 border-emerald-500 shadow-lg space-y-6 text-center animate-in zoom-in-95 duration-300">
              
              {/* Botão Fechar 'X' no Canto Superior Direito */}
              <button
                type="button"
                onClick={handleFinishAndExit}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                title="Fechar e Voltar ao Início"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md animate-bounce">
                <Check className="w-9 h-9 stroke-[3]" />
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Pagamento Aprovado com Sucesso!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-lg mx-auto leading-relaxed">
                  Seu pagamento com Cartão de Crédito foi processado e aprovado. Seus arquivos digitais foram liberados e enviados para <strong>{orderSuccess.customerEmail}</strong>.
                </p>
              </div>

              {/* Card de Downloads com Botão Verde */}
              <div className="space-y-3 pt-2 text-left max-w-2xl mx-auto">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Seus Arquivos para Download:</span>
                </h3>

                <div className="space-y-2">
                  {orderSuccess.items.map((item) => {
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
                          className="px-5 py-3.5 bg-[#4CAF50] hover:bg-[#43A047] text-white text-xs sm:text-sm font-extrabold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all active:scale-95 shrink-0 cursor-pointer"
                        >
                          <Download className="w-4 h-4 stroke-[2.5]" />
                          <span>Baixar Arquivo Agora</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botão Inferior: Fechar e Voltar ao Início */}
              <div className="pt-4 border-t border-emerald-200/60 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={handleFinishAndExit}
                  className="w-full py-3.5 px-6 bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Fechar e Voltar ao Início</span>
                </button>
              </div>

            </div>

            <div className="text-center pt-4">
              <a href="#/" className="text-xs font-semibold text-slate-500 hover:text-slate-900 underline">
                Voltar à página inicial do catálogo
              </a>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-slate-50 rounded-3xl p-12 text-center border border-slate-200 space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-pastel-pink-light text-pastel-pink-dark flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Seu carrinho está vazio</h2>
            <p className="text-xs text-slate-500">Adicione produtos ao seu carrinho para finalizar o pedido.</p>
            <a href="#/" className="inline-block px-6 py-3 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-full transition-all">
              Ver Catálogo de Produtos
            </a>
          </div>
        ) : (
          /* FORMULÁRIO EXCLUSIVO DO CARTÃO */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Coluna Esquerda: Dados de Entrega */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Dados para Entrega dos Arquivos</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Nome Completo <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                      placeholder="Seu nome completo"
                      className="w-full text-xs sm:text-sm px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400 transition-all"
                    />
                    {formErrors.name && (
                      <span className="text-[11px] text-rose-500 mt-1 block font-medium">{formErrors.name}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      E-mail para receber os Downloads <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      placeholder="seuemail@exemplo.com"
                      className="w-full text-xs sm:text-sm px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400 transition-all"
                    />
                    {formErrors.email && (
                      <span className="text-[11px] text-rose-500 mt-1 block font-medium">{formErrors.email}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Garantia e Segurança */}
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center gap-3 text-emerald-900 text-xs">
                <Lock className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Ambiente 100% Criptografado e Seguro com processamento instantâneo.</span>
              </div>
            </div>

            {/* Coluna Direita: Dados do Cartão e Resumo */}
            <div className="lg:col-span-6 space-y-5">
              
              {/* Card Resumo */}
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Resumo do Pedido
                </h3>

                <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between py-2.5 text-slate-700">
                      <span className="font-medium pr-4">{item.product.name} × {item.quantity}</span>
                      <span className="font-semibold text-slate-900 shrink-0">{formatCurrency(item.product.price * item.quantity)}</span>
                    </div>
                  ))}

                  {couponApplied && (
                    <div className="flex justify-between py-2 text-emerald-600 font-semibold text-xs">
                      <span>Desconto de Cupom</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-3 text-base font-extrabold text-slate-900">
                    <span>Total a pagar</span>
                    <span className="text-lg font-black text-slate-900">{formatCurrency(finalTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Card Cupom */}
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
                      className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none uppercase"
                    />
                    <button type="submit" className="px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer">
                      Aplicar
                    </button>
                  </form>
                )}
              </div>

              {/* Card do Cartão de Crédito */}
              <div className="bg-white p-6 sm:p-7 rounded-2xl border-2 border-emerald-500 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                    <span>Dados do Cartão de Crédito</span>
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <Lock className="w-3 h-3" />
                    <span>Pagamento Seguro</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Número do Cartão */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Número do Cartão <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={19}
                      value={cardInfo.cardNumber}
                      onChange={(e) => setCardInfo({ ...cardInfo, cardNumber: formatCardNumber(e.target.value) })}
                      placeholder="0000 0000 0000 0000"
                      className="w-full text-xs sm:text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400 font-mono tracking-wider"
                    />
                    {formErrors.cardNumber && (
                      <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.cardNumber}</span>
                    )}
                  </div>

                  {/* Nome impresso no Cartão */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome impresso no Cartão <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={cardInfo.cardholderName}
                      onChange={(e) => setCardInfo({ ...cardInfo, cardholderName: e.target.value.toUpperCase() })}
                      placeholder="NOME COMO NO CARTÃO"
                      className="w-full text-xs sm:text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400 uppercase"
                    />
                    {formErrors.cardholderName && (
                      <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.cardholderName}</span>
                    )}
                  </div>

                  {/* Validade e CVV */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Validade (MM/AA) <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        value={cardInfo.expirationDate}
                        onChange={(e) => setCardInfo({ ...cardInfo, expirationDate: formatExpirationDate(e.target.value) })}
                        placeholder="MM/AA"
                        className="w-full text-xs sm:text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400 font-mono text-center"
                      />
                      {formErrors.expirationDate && (
                        <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.expirationDate}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Código CVV <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={cardInfo.securityCode}
                        onChange={(e) => setCardInfo({ ...cardInfo, securityCode: e.target.value.replace(/\D/g, '') })}
                        placeholder="123"
                        className="w-full text-xs sm:text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400 font-mono text-center"
                      />
                      {formErrors.securityCode && (
                        <span className="text-[10px] text-rose-500 mt-1 block">{formErrors.securityCode}</span>
                      )}
                    </div>
                  </div>

                  {/* Parcelamento */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Opções de Parcelamento
                    </label>
                    <select
                      value={cardInfo.installments}
                      onChange={(e) => setCardInfo({ ...cardInfo, installments: e.target.value })}
                      className="w-full text-xs sm:text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400"
                    >
                      <option value="1">1x de {formatCurrency(finalTotal)} (Sem juros)</option>
                      <option value="2">2x de {formatCurrency(finalTotal / 2)} (Sem juros)</option>
                      <option value="3">3x de {formatCurrency(finalTotal / 3)} (Sem juros)</option>
                      <option value="4">4x de {formatCurrency(finalTotal / 4)}</option>
                      <option value="6">6x de {formatCurrency(finalTotal / 6)}</option>
                      <option value="12">12x de {formatCurrency(finalTotal / 12)}</option>
                    </select>
                  </div>
                </div>

                {/* Botão Pagar com Cartão */}
                <button
                  type="button"
                  onClick={handleProcessPayment}
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-[#4CAF50] hover:bg-[#43A047] text-white font-bold text-sm sm:text-base rounded-xl shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Processando Pagamento...</span>
                    </>
                  ) : (
                    <span>Pagar com Cartão de Crédito</span>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}
      </main>

      <Toast />
      <FloatingWhatsApp />
      <Footer />
    </div>
  );
};
