import React from 'react';
import { X, ShoppingBag, Trash2, MessageCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/formatters';
import { CartItemRow } from './CartItemRow';
import { CartUpsellCard } from './CartUpsellCard';

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

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-300"
        onClick={closeCart}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-slate-200">
        
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-sans font-extrabold text-slate-900 text-base">Meu Carrinho</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {totalItemsCount} {totalItemsCount === 1 ? 'item selecionado' : 'itens selecionados'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Esvaziar carrinho"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={closeCart}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50">
          {items.length > 0 ? (
            items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))
          ) : (
            /* Empty Cart */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
              <div className="w-16 h-16 rounded-2xl bg-slate-200 text-slate-400 flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="font-sans font-bold text-slate-900 text-base mb-1">
                Seu carrinho está vazio
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mb-6 leading-relaxed">
                Navegue pelo catálogo e adicione moldes ou arquivos digitais ao carrinho!
              </p>
              <button
                onClick={closeCart}
                className="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
              >
                Ver Catálogo de Produtos
              </button>
            </div>
          )}
        </div>

        {/* Footer Summary & Checkout Action */}
        {items.length > 0 && (
          <div className="bg-white p-4 sm:p-5 border-t border-slate-200 shadow-lg space-y-3.5">
            
            {/* Oferta de Upsell / Compre Junto (Order Bump) */}
            <CartUpsellCard />

            {/* Subtotal & Total */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Subtotal dos produtos</span>
                <span className="font-semibold text-slate-700">{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-100">
                <span>Total a Pagar</span>
                <span className="text-xl font-black text-slate-900">{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {/* Botão Pix */}
              <button
                type="button"
                onClick={() => {
                  closeCart();
                  window.location.hash = '#/checkout';
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full py-3.5 px-4 bg-[#65bc45] hover:bg-[#5aa83d] text-white font-bold text-xs sm:text-sm rounded-lg shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                <span>❖ Pagar com Pix (Aprovação Imediata)</span>
              </button>

              {/* Botão Cartão de Crédito */}
              <button
                type="button"
                onClick={() => {
                  closeCart();
                  window.location.hash = '#/checkout/cartao';
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full py-3 px-4 bg-black hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                <span>💳 Pagar com Cartão de Crédito (Até 12x)</span>
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-400">
              🔒 Pagamento 100% seguro com link de download liberado imediatamente.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default CartDrawer;
