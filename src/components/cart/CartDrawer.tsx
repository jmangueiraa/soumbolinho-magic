import React, { useState } from 'react';
import { X, ShoppingBag, ArrowRight, Trash2, MessageCircle, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/formatters';
import { CartItemRow } from './CartItemRow';
import { STORE_CONFIG } from '../../data/storeConfig';
import { createMercadoPagoPreference } from '../../lib/mercadopago';

export const CartDrawer: React.FC = () => {
  const { 
    isCartOpen, 
    closeCart, 
    items, 
    totalItemsCount, 
    totalPrice, 
    clearCart,
    openCheckout 
  } = useCart();

  const [isLoadingMP, setIsLoadingMP] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);

  if (!isCartOpen) return null;

  const handleMercadoPagoCheckout = async () => {
    try {
      setIsLoadingMP(true);
      setMpError(null);

      const preference = await createMercadoPagoPreference({
        items,
        storeConfig: STORE_CONFIG,
      });

      if (preference.init_point) {
        // Redireciona diretamente para o Checkout Pro do Mercado Pago
        window.location.href = preference.init_point;
      } else {
        throw new Error('Link de pagamento não retornado pelo Mercado Pago.');
      }
    } catch (err: any) {
      console.error('[CartDrawer] Erro ao iniciar Mercado Pago:', err);
      setMpError(err.message || 'Não foi possível gerar o link de pagamento. Tente finalizar pelo WhatsApp.');
      setIsLoadingMP(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-300"
        onClick={closeCart}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md bg-pastel-cream h-full shadow-2xl z-10 flex flex-col justify-between animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-[#D8B4F8]/30 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#F8A4D8] to-[#D8B4F8] text-slate-900 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-festive font-bold text-slate-900 text-base">Meu Carrinho</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {totalItemsCount} {totalItemsCount === 1 ? 'item selecionado' : 'itens selecionados'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-slate-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                title="Esvaziar carrinho"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={closeCart}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {items.length > 0 ? (
            items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))
          ) : (
            /* Empty Cart */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
              <div className="w-16 h-16 rounded-full bg-pastel-pink-light text-pastel-pink-dark flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="font-festive font-bold text-slate-900 text-base mb-1">
                Seu carrinho está vazio
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mb-6 leading-relaxed">
                Navegue pelas categorias e adicione kits, centros de mesa ou lembrancinhas!
              </p>
              <button
                onClick={closeCart}
                className="px-5 py-2.5 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-full shadow-md transition-all"
              >
                Ver Catálogo de Produtos
              </button>
            </div>
          )}
        </div>

        {/* Footer Summary & Checkout Action */}
        {items.length > 0 && (
          <div className="bg-white p-5 border-t border-[#D8B4F8]/30 shadow-lg space-y-3.5">
            
            {/* Subtotal & Total */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Subtotal dos produtos</span>
                <span className="font-semibold text-slate-700">{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Taxa de Entrega / Frete</span>
                <span className="text-[#B886E8] font-bold text-[11px]">A combinar no WhatsApp</span>
              </div>
              <div className="flex items-center justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-100">
                <span>Total dos Itens</span>
                <span className="text-xl font-black text-slate-900">{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            {mpError && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span className="leading-tight">{mpError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              {/* 1. Botão Principal: Pagar com Mercado Pago (Pix / Cartão) */}
              <button
                onClick={handleMercadoPagoCheckout}
                disabled={isLoadingMP}
                className="w-full py-3.5 px-4 bg-[#009EE3] hover:bg-[#0082BD] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-[#009EE3]/25 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isLoadingMP ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Gerando Pagamento Seguro...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pagar com Mercado Pago (Pix / Cartão)</span>
                  </>
                )}
              </button>

              {/* 2. Botão Secundário: Finalizar Pedido via WhatsApp */}
              <button
                onClick={openCheckout}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-98 transition-all group"
              >
                <MessageCircle className="w-4 h-4 fill-white group-hover:scale-110 transition-transform" />
                <span>Finalizar Pedido via WhatsApp</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-400">
              🔒 Pagamentos protegidos pelo Mercado Pago com Pix ou Cartão em até 12x.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
