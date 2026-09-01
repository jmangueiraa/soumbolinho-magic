import React, { useState } from 'react';
import { Plus, Minus, Trash2, Edit3, Check, Sparkles } from 'lucide-react';
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

  const handleSaveNote = () => {
    updateObservations(item.id, noteText);
    setIsEditingNote(false);
  };

  const itemTotal = item.product.price * item.quantity;
  const unitSuffix = item.product.unitSuffix || '/Un';

  return (
    <div className="p-4 bg-white rounded-3xl border border-[#D8B4F8]/40 shadow-xs space-y-3">
      <div className="flex gap-3 items-start">
        {/* Product Thumbnail Placeholder */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#FFEBF6] shrink-0 border border-[#FFA6DF]/40 flex items-center justify-center">
          <ProductImagePlaceholder 
            iconClassName="w-5 h-5" 
            showText={false} 
            className="p-1"
          />
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

            {/* Total Price */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs sm:text-sm font-black text-slate-900">
                {formatCurrency(itemTotal)}
              </span>
              <button
                onClick={() => removeFromCart(item.id)}
                className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors"
                title="Remover"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Observation / Personalization Area */}
      <div className="pt-2 border-t border-slate-100">
        {!isEditingNote ? (
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-start gap-1.5 text-slate-600 truncate">
              <Sparkles className="w-3.5 h-3.5 text-[#F8A4D8] shrink-0 mt-0.5" />
              <span className="truncate italic text-[11px]">
                {item.observations ? `Obs: ${item.observations}` : 'Sem observação de personalização'}
              </span>
            </div>
            <button
              onClick={() => setIsEditingNote(true)}
              className="text-[11px] font-bold text-[#B886E8] hover:text-slate-900 shrink-0 flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              {item.observations ? 'Alterar' : 'Personalizar'}
            </button>
          </div>
        ) : (
          <div className="space-y-2 animate-in fade-in">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Ex: Nome da criança, idade ou tema"
              className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-[#F8A4D8] rounded-xl outline-none focus:ring-1 focus:ring-[#F8A4D8]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setNoteText(item.observations || '');
                  setIsEditingNote(false);
                }}
                className="text-[11px] px-2 py-1 text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNote}
                className="text-[11px] px-2.5 py-1 bg-black text-white font-bold rounded-xl flex items-center gap-1 hover:bg-slate-800"
              >
                <Check className="w-3 h-3 text-[#F8A4D8]" />
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
