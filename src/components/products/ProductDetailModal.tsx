import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { addToCart, openCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);

  if (!product) return null;

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAddedAnimation(true);
    setTimeout(() => {
      setAddedAnimation(false);
      onClose();
      openCart();
    }, 350);
  };

  const renderDescription = () => {
    if (product.description && product.description.trim().length > 20) {
      return (
        <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
          {product.description}
        </div>
      );
    }

    return (
      <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
        <p>
          Uma oportunidade perfeita para quem trabalha com papelaria personalizada e quer vender um dos produtos mais procurados do momento.
        </p>

        <div className="space-y-1 pt-1">
          <p className="font-bold text-slate-900">🎁 VOCÊ VAI RECEBER:</p>
          <p>✅ 100 Modelos de {product.name}</p>
          <p>✅ Temas infantis que estão em alta</p>
          <p>✅ 100% editável no canva</p>
          <p>✅ Ideal para festas, escolas, brindes e lembrancinhas</p>
          <p>✅ Perfeito para quem está começando na papelaria personalizada</p>
        </div>

        <p className="pt-1">
          💡 Muitas pessoas estão vendendo kits com 20, 30 e até 50 unidades de uma só vez, gerando renda extra com um produto simples e de alta procura.
        </p>

        <p className="font-medium text-slate-900">
          👇 Garanta seu acesso agora mesmo antes que a promoção termine!
        </p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 p-5 sm:p-7 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-black rounded-full hover:bg-slate-100 transition-all cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-5 pt-1">
          
          {/* Título com Emojis */}
          <h2 className="font-sans font-bold text-sm sm:text-base text-slate-900 uppercase tracking-tight leading-snug pr-8">
            📚 {product.name} ✨
          </h2>

          {/* Bloco de Descrição Formatada */}
          {renderDescription()}

          {/* Preço em Destaque Centralizado */}
          <div className="text-center pt-2">
            <span className="font-sans font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
              {formatCurrency(product.price)}
            </span>
          </div>

          {/* Formulário: Quantidade Quadrada + Botão Preto "Adicionar Ao Carrinho" */}
          <div className="flex items-center gap-2.5 pt-1">
            {/* Input de Quantidade */}
            <div className="w-16 shrink-0">
              <input
                type="number"
                min="1"
                max="99"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-12 text-center text-sm font-bold border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#ff3399] rounded-none shadow-2xs"
              />
            </div>

            {/* Botão Rosa Chiclete "Adicionar Ao Carrinho" */}
            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex-1 h-12 bg-[#ff3399] hover:bg-[#e61e80] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-none flex items-center justify-center transition-all cursor-pointer shadow-md shadow-pink-500/20 active:scale-98 ${
                addedAnimation ? 'bg-pink-700' : ''
              }`}
            >
              <span>{addedAnimation ? 'Adicionado!' : 'Adicionar Ao Carrinho'}</span>
            </button>
          </div>

          {/* Banner Azul Turquesa "Seu produto com Download imediato!" */}
          <div className="w-full py-3.5 px-4 bg-[#00a8e8] text-white font-bold text-center text-xs sm:text-sm rounded-none shadow-md shadow-turquesa-500/20 mt-3 tracking-tight">
            Seu produto com Download imediato!
          </div>

        </div>

      </div>
    </div>
  );
};

export default ProductDetailModal;
