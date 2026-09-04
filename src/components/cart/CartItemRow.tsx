import React, { useState } from 'react';
import { Plus, Minus, Trash2, Edit3, Check, X, Sparkles } from 'lucide-react';
import { CartItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';

interface CartItemRowProps {
  item: CartItem;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({ item }) => {
  const { updateQuantity, updateObservations, removeFromCart } = useCart();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(item.observations || '');
  const [imageError, setImageError] = useState(false);

  const handleSaveNote = () => {
    updateObservations(item.id, noteText);
    setIsEditingNote(false);
  };

  const unitPrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
  const itemTotal = unitPrice * item.quantity;
  const isDiscounted = item.customPrice !== undefined && item.customPrice < item.product.price;
  const unitSuffix = item.product.unitSuffix || '/Un';

  const imageSrc = !imageError 
    ? (item.product.image || item.product.image_url || item.product.imageUrl || item.product.photo_url || '').trim() 
    : '';

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
      <div className="flex gap-3 items-start">
        {/* Product Thumbnail or Placeholder */}
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 shrink-0 border border-slate-200 flex items-center justify-center">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={item.product.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <ProductImagePlaceholder 
              iconClassName="w-5 h-5 text-slate-300" 
              showText={false} 
              className="p-1"
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-sans font-bold text-slate-900 text-xs sm:text-sm line-clamp-1 leading-snug">
              {item.product.name}
            </h4>
            {item.isUpsell && (
              <span className="inline-flex items-center text-[10px] font-extrabold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300">
                ⚡ Compre Junto
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
            {isDiscounted && (
              <span className="line-through text-slate-400">
                {formatCurrency(item.product.price)}
              </span>
            )}
            <span className={isDiscounted ? "font-bold text-emerald-600" : ""}>
              {formatCurrency(unitPrice)}
            </span>
            <span>{unitSuffix}</span>
          </p>

          <div className="flex items-center justify-between mt-2">
            {/* Quantity Controls */}
            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-0.5">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="w-6 h-6 rounded-md bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                title="Diminuir"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-7 text-center font-bold text-xs text-slate-900">
                {item.quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="w-6 h-6 rounded-md bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                title="Aumentar"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Total price for this row */}
            <span className="font-extrabold text-xs text-slate-900">
              {formatCurrency(itemTotal)}
            </span>
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={() => removeFromCart(item.id)}
          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
          title="Remover item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Observations note section */}
      {item.observations && (
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
            <div className="flex items-center gap-1.5 truncate pr-2">
              <span className="font-medium text-slate-800">{item.observations}</span>
            </div>
            <button
              onClick={() => setIsEditingNote(true)}
              className="text-slate-600 hover:text-black font-bold text-[10px] shrink-0 flex items-center gap-0.5 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>Editar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartItemRow;
