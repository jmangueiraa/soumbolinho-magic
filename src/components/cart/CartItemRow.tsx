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

  const itemTotal = item.product.price * item.quantity;
  const unitSuffix = item.product.unitSuffix || '/Un';

  const imageSrc = !imageError 
    ? (item.product.image || item.product.image_url || item.product.imageUrl || item.product.photo_url || '').trim() 
    : '';

  return (
    <div className="p-4 bg-white rounded-3xl border border-[#D8B4F8]/40 shadow-xs space-y-3">
      <div className="flex gap-3 items-start">
        {/* Product Thumbnail or Placeholder */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#FFEBF6] shrink-0 border border-[#FFA6DF]/40 flex items-center justify-center">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={item.product.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <ProductImagePlaceholder 
              iconClassName="w-5 h-5" 
              showText={false} 
              className="p-1"
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-festive font-semibold text-slate-900 text-xs sm:text-sm line-clamp-1 leading-snug">
            {item.product.name}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {formatCurrency(item.product.price)} {unitSuffix}
          </p>

          <div className="flex items-center justify-between mt-2">
            {/* Quantity Controls */}
            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors shadow-2xs"
                title="Diminuir"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-7 text-center font-bold text-xs text-slate-900">
                {item.quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors shadow-2xs"
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
          className="p-1 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors"
          title="Remover item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Observations / Customization note section */}
      <div className="pt-2 border-t border-slate-100">
        {isEditingNote ? (
          <div className="space-y-2">
            <textarea
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Nome, idade ou tema para personalização..."
              className="w-full text-xs p-2.5 bg-slate-50 border border-[#FFA6DF] rounded-xl outline-none focus:ring-1 focus:ring-[#FF1493] resize-none"
            />
            <div className="flex justify-end gap-1.5">
              <button
                onClick={() => setIsEditingNote(false)}
                className="px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNote}
                className="px-3 py-1 bg-black text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-2xs"
              >
                <Check className="w-3 h-3" />
                <span>Salvar</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 px-3 py-2 rounded-xl">
            <div className="flex items-center gap-1.5 truncate pr-2">
              <Sparkles className="w-3 h-3 text-[#FF1493] shrink-0" />
              <span className="truncate">
                {item.observations ? (
                  <span className="font-medium text-slate-800">{item.observations}</span>
                ) : (
                  <span className="text-slate-400 italic">Adicionar nome/tema do aniversariante</span>
                )}
              </span>
            </div>
            <button
              onClick={() => setIsEditingNote(true)}
              className="text-[#FF1493] hover:underline font-bold text-[10px] shrink-0 flex items-center gap-0.5"
            >
              <Edit3 className="w-3 h-3" />
              <span>{item.observations ? 'Editar' : 'Adicionar'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
