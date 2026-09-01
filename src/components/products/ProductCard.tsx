import React from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelectProduct }) => {
  const { addToCart } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.isCustomizable) {
      onSelectProduct(product);
    } else {
      addToCart(product, 1);
    }
  };

  const unitSuffix = product.unitSuffix || '/Un';

  return (
    <div
      onClick={() => onSelectProduct(product)}
      className="group flex flex-col justify-between cursor-pointer transition-transform duration-200 hover:-translate-y-1"
    >
      <div>
        {/* Compact Rounded Container with Shopping Cart 'Sem imagem' placeholder */}
        <div className="relative w-full aspect-square bg-white rounded-2xl overflow-hidden shadow-xs border border-[#FFA6DF]/40">
          <ProductImagePlaceholder 
            iconClassName="w-7 h-7 sm:w-8 sm:h-8" 
            showText={true} 
          />
        </div>

        {/* Product Title in #2B3A8C */}
        <h3 className="font-sans font-bold text-xs sm:text-[13px] text-[#2B3A8C] leading-snug line-clamp-2 mt-2.5 group-hover:text-[#FF1493] transition-colors">
          {product.name}
        </h3>

        {/* Price in #FF1493 and Unit in #2B3A8C */}
        <div className="flex items-baseline gap-1 mt-1.5">
          <span className="text-sm sm:text-base font-extrabold text-[#FF1493]">
            {formatCurrency(product.price)}
          </span>
          <span className="text-[11px] sm:text-xs font-semibold text-[#2B3A8C]">
            {unitSuffix}
          </span>
        </div>
      </div>

      {/* Solid Black 'Adicionar ao carrinho' Button */}
      <button
        onClick={handleAdd}
        className="w-full mt-2.5 py-2 px-3 bg-black hover:bg-slate-800 text-white rounded-full text-xs font-bold text-center transition-all shadow-xs active:scale-95 border border-black flex items-center justify-center"
      >
        Adicionar ao carrinho
      </button>
    </div>
  );
};
