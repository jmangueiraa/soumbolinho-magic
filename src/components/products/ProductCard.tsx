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

  // Leitura com fallback seguro de todos os possíveis campos de imagem
  const rawImg = 
    product.image || 
    product.image_url || 
    product.imageUrl || 
    product.photo_url || 
    (Array.isArray((product as any).images) && (product as any).images[0]) || 
    (Array.isArray(product.galleryImages) && product.galleryImages[0]) || 
    '';

  const imgUrl = typeof rawImg === 'string' ? rawImg.trim() : '';
  const hasValidImage = Boolean(imgUrl && !imageError);

  return (
    <div
      onClick={() => onSelectProduct(product)}
      className="group bg-white rounded-md sm:rounded-lg border border-slate-200 p-2.5 sm:p-3.5 flex flex-col justify-between h-full shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      {/* 1. Imagem de Destaque no Topo do Card */}
      <div className="relative w-full aspect-square bg-slate-50 rounded-sm overflow-hidden mb-2.5 sm:mb-3 flex items-center justify-center">
        {hasValidImage ? (
          <img
            src={imgUrl}
            alt={product.name}
            onError={() => {
              console.warn(`[ProductCard] Erro ao carregar imagem para ${product.name}:`, imgUrl);
              setImageError(true);
            }}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <ProductImagePlaceholder 
            iconClassName="w-8 h-8 text-slate-300" 
            showText={false} 
          />
        )}

        {/* Badge se houver */}
        {product.badge && (
          <span className="absolute top-1.5 left-1.5 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-sm bg-black text-white shadow-xs">
            {product.badge}
          </span>
        )}
      </div>

      {/* 2. Informações do Produto (Título e Preço Alinhados Centralizados) */}
      <div className="flex-1 flex flex-col justify-between text-center">
        <h3 className="font-sans font-bold text-[11px] sm:text-xs text-slate-800 uppercase tracking-tight leading-snug line-clamp-2 min-h-[30px] sm:min-h-[34px] flex items-center justify-center">
          {product.name}
        </h3>

        <div className="my-2 text-center">
          <span className="text-xs sm:text-sm font-extrabold text-slate-900">
            {formatCurrency(product.price)}
          </span>
        </div>
      </div>

      {/* 3. Botão Verde #65bc45 Retangular com Bordas Levemente Arredondadas */}
      <button
        type="button"
        onClick={handleAdd}
        className="w-full mt-1 py-2 sm:py-2.5 px-2 bg-[#65bc45] hover:bg-[#59a83d] text-white text-[10px] sm:text-xs font-bold rounded-xs text-center transition-all shadow-xs active:scale-98 flex items-center justify-center tracking-normal cursor-pointer"
      >
        Adicionar ao carrinho
      </button>
    </div>
  );
};

export default ProductCard;
