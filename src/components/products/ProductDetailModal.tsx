import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, Sparkles } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');

  if (!product) return null;

  const handleAdd = () => {
    addToCart(product, quantity, observations);
    onClose();
  };

  const badgeColor = {
    'Mais Vendido': 'bg-[#F8A4D8] text-slate-900',
    'Lançamento': 'bg-[#D8B4F8] text-slate-900',
    'Personalizado': 'bg-black text-white',
    'Destaque': 'bg-rose-500 text-white',
    'Pronta Entrega': 'bg-emerald-500 text-white',
  }[product.badge || ''] || 'bg-slate-800 text-white';

  const unitSuffix = product.unitSuffix || '/Un';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-black shadow-md flex items-center justify-center backdrop-blur-md transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Product Placeholder */}
        <div className="md:w-1/2 bg-[#FFEBF6]/60 relative flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-[#FFA6DF]/30">
          <div className="relative aspect-square w-full max-w-[260px] rounded-3xl overflow-hidden shadow-xs border border-[#FFA6DF]/40 bg-white">
            <ProductImagePlaceholder 
              iconClassName="w-12 h-12 sm:w-14 sm:h-14" 
              showText={true} 
            />
            {product.badge && (
              <span className={`absolute top-4 left-4 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md border border-white/60 ${badgeColor}`}>
                {product.badge}
              </span>
            )}
          </div>
        </div>

        {/* Right: Product Details & Form */}
        <div className="md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            
            {/* Header info */}
            <div>
              {product.subcategory && (
                <span className="text-xs font-bold uppercase tracking-wider text-[#B886E8]">
                  {product.subcategory}
                </span>
              )}
              <h2 className="font-festive text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                {product.name}
              </h2>
            </div>

            {/* Price section */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {formatCurrency(product.price * quantity)}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {unitSuffix} {quantity > 1 ? `(${formatCurrency(product.price)} cada)` : ''}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-slate-400 line-through ml-2">
                  {formatCurrency(product.originalPrice * quantity)}
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                {product.description}
              </div>
            )}

            {/* Customization Input */}
            {product.isCustomizable && (
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#FF1493]" />
                  Personalização (Nome do aniversariante, idade ou tema):
                </label>
                <textarea
                  rows={2}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder={product.customizationPlaceholder || 'Ex: Nome: Alice, Idade: 3 anos, Tema: Jardim Encantado'}
                  className="w-full text-xs p-3 bg-white border border-[#FFA6DF] rounded-2xl focus:ring-2 focus:ring-[#FF1493] outline-none resize-none transition-all placeholder:text-slate-400 shadow-inner"
                />
                <p className="text-[11px] text-slate-400">
                  🎀 Enviaremos a prévia da arte para aprovação no WhatsApp antes de produzir!
                </p>
              </div>
            )}

          </div>

          {/* Bottom Actions: Quantity Selector & Add Button */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
            {/* Quantity control */}
            <div className="flex items-center border border-slate-200 rounded-2xl bg-slate-50 p-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-xs"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center font-bold text-sm text-slate-900">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Black Add to Cart Button */}
            <button
              onClick={handleAdd}
              className="flex-1 py-3.5 px-4 bg-black hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all border border-black"
            >
              <ShoppingBag className="w-4 h-4 text-[#FF1493]" />
              <span>Adicionar ao carrinho</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
