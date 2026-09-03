import React, { useState } from 'react';
import { ShoppingBag, Play } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';
import { getProductMedia } from '../../utils/media';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelectProduct }) => {
  const { addToCart, openCart } = useCart();
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(true);
    addToCart(product, 1);
    setTimeout(() => {
      setIsAdding(false);
      openCart();
    }, 300);
  };

  const { url: mediaUrl, isVideo } = getProductMedia(product);
  const hasValidMedia = Boolean(mediaUrl && !imageError);

  return (
    <div
      onClick={() => onSelectProduct(product)}
      className="group bg-white rounded-md sm:rounded-lg border border-slate-200 p-2.5 sm:p-3.5 flex flex-col justify-between h-full shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      {/* 1. Mídia de Destaque no Topo do Card (Foto ou Vídeo) */}
      <div className="relative w-full aspect-square bg-slate-50 rounded-sm overflow-hidden mb-2.5 sm:mb-3 flex items-center justify-center">
        {hasValidMedia ? (
          isVideo ? (
            <video
              src={mediaUrl}
              muted
              autoPlay
              loop
              playsInline
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            />
          ) : (
            <img
              src={mediaUrl}
              alt={product.name}
              onError={() => {
                console.warn(`[ProductCard] Erro ao carregar mídia para ${product.name}:`, mediaUrl);
                setImageError(true);
              }}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
              loading="lazy"
            />
          )
        ) : (
          <ProductImagePlaceholder 
            iconClassName="w-8 h-8 text-slate-300" 
            showText={false} 
          />
        )}

        {/* Badge de Vídeo se for vídeo */}
        {isVideo && hasValidMedia && (
          <span className="absolute bottom-1.5 right-1.5 text-[8.5px] font-bold px-1.5 py-0.5 rounded-sm bg-black/75 backdrop-blur-xs text-white flex items-center gap-1 shadow-xs">
            <Play className="w-2.5 h-2.5 fill-white" />
            <span>Vídeo</span>
          </span>
        )}

        {/* Badge do Produto */}
        {product.badge && (
          <span className="absolute top-1.5 left-1.5 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-sm bg-black text-white shadow-xs">
            {product.badge}
          </span>
        )}
      </div>

      {/* 2. Informações e Preço */}
      <div className="flex flex-col items-center text-center flex-1 justify-between gap-1.5">
        <h3 className="font-sans font-bold text-[11.5px] sm:text-xs text-slate-900 leading-snug line-clamp-2 uppercase">
          {product.name}
        </h3>

        <div className="mt-1">
          <span className="font-sans font-black text-sm sm:text-base text-slate-900">
            {formatCurrency(product.price)}
          </span>
        </div>
      </div>

      {/* 3. Botão Adicionar ao Carrinho Verde */}
      <div className="mt-3 w-full">
        <button
          type="button"
          onClick={handleAddToCartClick}
          className="w-full py-2 sm:py-2.5 px-2 bg-[#65bc45] hover:bg-[#5aa83d] text-white font-bold text-[11px] sm:text-xs rounded-sm transition-all duration-150 flex items-center justify-center gap-1.5 shadow-xs active:scale-97 cursor-pointer"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{isAdding ? 'Adicionado!' : 'Adicionar ao carrinho'}</span>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
