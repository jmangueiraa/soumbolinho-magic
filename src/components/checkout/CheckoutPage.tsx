import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ShoppingBag, 
  CreditCard, 
  Tag, 
  ShieldCheck, 
  CheckCircle, 
  Star,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  MessageCircle,
  QrCode
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { formatCurrency } from '../../utils/formatters';
import { buildWhatsAppOrderMessage, createWhatsAppUrl } from '../../utils/whatsapp';
import { createMercadoPagoPreference, isMercadoPagoConfigured } from '../../lib/mercadopago';
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
    paymentMethod: 'pix' as 'pix' | 'cartao',
  });

  const [couponCode, setCouponCode] = useState('');
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [discount, setDiscount] = useState(0);

  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [pixModalData, setPixModalData] = useState<{
    isOpen: boolean;
    pixCode: string;
    qrCodeUrl: string;
  }>({
    isOpen: false,
    pixCode: '',
    qrCodeUrl: '',
  });

  const [copied, setCopied] = useState(false);

  const hasMercadoPago = isMercadoPagoConfigured(storeConfig);
  const finalTotal = Math.max(0, totalPrice - discount);

  const validateForm = () => {
    const errors: { name?: string; email?: string } = {};
    if (!customerInfo.name.trim()) errors.name = 'Informe o seu nome.';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerInfo.email.trim()) {
      errors.email = 'Informe o seu e-mail.';
    } else if (!emailRegex.test(customerInfo.email.trim())) {
      errors.email = 'Informe um e-mail válido.';
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

    // 1. Se for Pix
    if (customerInfo.paymentMethod === 'pix') {
      const pixKey = storeConfig.whatsappNumber || '21974975884';
      const simulatedPixCode = `00020126580014br.gov.bcb.pix0136${pixKey}520400005303986540${finalTotal.toFixed(2)}5802BR5925ENCANTANDO FESTA ATELIE6009RIO DE JANEIRO62070503***6304`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(simulatedPixCode)}&bgcolor=ffffff&color=008080&margin=1`;

      if (hasMercadoPago) {
        try {
          setIsLoading(true);
          const preference = await createMercadoPagoPreference({
            items,
            customerInfo: {
              name: customerInfo.name,
              email: customerInfo.email,
              paymentMethod: 'pix',
            },
            storeConfig,
          });

          if (preference.init_point) {
            window.location.href = preference.init_point;
            return;
          }
        } catch (e) {
          console.warn('Fallback para Pix direto:', e);
        } finally {
          setIsLoading(false);
        }
      }

      // Exibir modal do Pix Copia e Cola / QR Code
      setPixModalData({
        isOpen: true,
        pixCode: simulatedPixCode,
        qrCodeUrl: qrUrl,
      });

      return;
    }

    // 2. Se for Cartão
    if (hasMercadoPago) {
      try {
        setIsLoading(true);
        const preference = await createMercadoPagoPreference({
          items,
          customerInfo: {
            name: customerInfo.name,
            email: customerInfo.email,
            paymentMethod: 'cartao',
          },
          storeConfig,
        });

        if (preference.init_point) {
          window.location.href = preference.init_point;
          return;
        }
      } catch (e) {
        console.warn('Erro ao redirecionar para Mercado Pago:', e);
      } finally {
        setIsLoading(false);
      }
    }

    // 3. Fallback WhatsApp
    const orderMessage = buildWhatsAppOrderMessage(
      items,
      {
        name: customerInfo.name,
        email: customerInfo.email,
        paymentMethod: customerInfo.paymentMethod,
        deliveryType: 'retirada',
      },
      finalTotal,
      storeConfig
    );

    const whatsappUrl = createWhatsAppUrl(storeConfig.whatsappNumber, orderMessage);
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyPix = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pixModalData.pixCode);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = pixModalData.pixCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleNotifyWhatsApp = () => {
    const orderMessage = buildWhatsAppOrderMessage(
      items,
      {
        name: customerInfo.name,
        email: customerInfo.email,
        paymentMethod: 'pix',
        deliveryType: 'retirada',
      },
      finalTotal,
      storeConfig
    );

    const whatsappUrl = createWhatsAppUrl(storeConfig.whatsappNumber, orderMessage);
    window.open(whatsappUrl, '_blank');
    clearCart();
    setPixModalData({ isOpen: false, pixCode: '', qrCodeUrl: '' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800">
      
      {/* 1. Header Oficial */}
      <Header />

      {/* 2. Conteúdo da Página de Finalização de Compra */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
        
        {/* Link Voltar */}
        <div>
          <a
            href="#/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continuar comprando</span>
          </a>
        </div>

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

        {items.length === 0 ? (
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
          /* Grid de Checkout em 2 Colunas */
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

                  {/* E-mail * */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      E-mail <span className="text-rose-600">*</span>
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
                
                {/* Opção Cartão de Crédito */}
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="payment"
                      checked={customerInfo.paymentMethod === 'cartao'}
                      onChange={() => setCustomerInfo({ ...customerInfo, paymentMethod: 'cartao' })}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs sm:text-sm font-semibold text-slate-800">Cartão de crédito</span>
                  </div>
                  <CreditCard className="w-5 h-5 text-slate-400" />
                </label>

                {/* Opção Pix */}
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/20 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="payment"
                        checked={customerInfo.paymentMethod === 'pix'}
                        onChange={() => setCustomerInfo({ ...customerInfo, paymentMethod: 'pix' })}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs sm:text-sm font-bold text-slate-900">Pix</span>
                    </div>
                    <span className="text-teal-600 font-extrabold text-sm">❖</span>
                  </label>

                  {/* Card Informativo Pix do Banco Central */}
                  {customerInfo.paymentMethod === 'pix' && (
                    <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200 text-center space-y-3 animate-in fade-in duration-200">
                      
                      {/* Logo Pix */}
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

                {/* Termos e Política de Privacidade */}
                <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
                  Os seus dados pessoais serão utilizados para processar a sua compra, apoiar a sua experiência em todo este site e para outros fins descritos na nossa <span className="text-emerald-600 font-semibold cursor-pointer hover:underline">política de privacidade</span>.
                </p>

                {/* Botão Finalizar Pedido */}
                <button
                  type="button"
                  onClick={handleFinalizeOrder}
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-[#4CAF50] hover:bg-[#43A047] text-white font-bold text-sm sm:text-base rounded-xl shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Processando Pedido...</span>
                    </>
                  ) : (
                    <span>Finalizar pedido</span>
                  )}
                </button>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* Modal de Pagamento Pix Instantâneo */}
      {pixModalData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setPixModalData({ isOpen: false, pixCode: '', qrCodeUrl: '' })}
          />

          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-7 z-10 space-y-5 animate-in zoom-in-95">
            
            <div className="text-center space-y-1">
              <span className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl inline-flex items-center justify-center font-bold text-xl shadow-xs">
                ❖
              </span>
              <h3 className="text-lg font-bold text-slate-900 font-sans">
                Pague com Pix Instantâneo
              </h3>
              <p className="text-xs text-slate-500">
                Valor Total: <strong className="text-slate-900 font-extrabold">{formatCurrency(finalTotal)}</strong>
              </p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <img
                src={pixModalData.qrCodeUrl}
                alt="QR Code Pix"
                className="w-44 h-44 rounded-xl object-contain shadow-xs bg-white p-2"
              />
              <span className="text-[11px] text-slate-500 mt-2 font-medium flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-teal-600" />
                Aponte a câmera no app do seu banco
              </span>
            </div>

            {/* Código Copia e Cola */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700">
                Código Pix Copia e Cola:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={pixModalData.pixCode}
                  className="flex-1 text-xs font-mono px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                    copied ? 'bg-emerald-600 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Botão Notificar WhatsApp */}
            <button
              type="button"
              onClick={handleNotifyWhatsApp}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Confirmar e Enviar Pedido no WhatsApp</span>
            </button>

          </div>
        </div>
      )}

      {/* 3. Toast, WhatsApp & Footer */}
      <Toast />
      <FloatingWhatsApp />
      <Footer />

    </div>
  );
};
