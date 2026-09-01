import React, { useState } from 'react';
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
  const [imageError, setImageError] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.isCustomizable) {
      onSelectProduct(product);
    } else {
      addToCart(product, 1);
    }
  };

  const unitSuffix = product.unitSuffix || '/Un';
  
  // Leitura com fallback seguro de todos os possíveis formatos de imagem
  const rawImg = 
    product.image || 
    product.image_url || 
    product.imageUrl || 
    product.photo_url || 
    (Array.isArray((product as any).images) && (product as any).images[0]) || 
    (Array.isArray(product.galleryImages) && product.galleryImages[0]) || 
    '';

  const imgUrl = typeof rawImg === 'string' ? rawImg.trim() : '';
  const shouldShowImage = Boolean(imgUrl && !imageError);

  return (
    <div
      onClick={() => onSelectProduct(product)}
      className="group flex flex-col justify-between cursor-pointer transition-transform duration-200 hover:-translate-y-1"
    >
      <div>
        {/* Container com Imagem ou Fallback "SEM IMAGEM" */}
        <div className="relative w-full aspect-square bg-white rounded-2xl overflow-hidden shadow-xs border border-[#FFA6DF]/40 flex items-center justify-center">
          {shouldShowImage ? (
            <img
              src={imgUrl}
              alt={product.name}
              onError={(e) => {
                console.error('[ProductCard] Falha ao carregar imagem:', imgUrl, e);
                setImageError(true);
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <ProductImagePlaceholder 
              iconClassName="w-7 h-7 sm:w-8 sm:h-8" 
              showText={true} 
            />
          )}

          {/* Badge de Destaque se houver */}
          {product.badge && (
            <span className="absolute top-2 left-2 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#FF1493] text-white shadow-xs">
              {product.badge}
            </span>
          )}
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
        className="w-full mt-2.5 py-2 px-3 bg-black hover:bg-slate-800 text-white rounded-full text-xs font-bold text-center transition-all shadow-xs active:scale-95 border border-black flex items-center justify-center cursor-pointer"
      >
        Adicionar ao carrinho
      </button>
    </div>
  );
};
