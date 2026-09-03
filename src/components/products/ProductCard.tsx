import React, { useState } from 'react';
import { ShoppingBag, Play, Copy, Check, Link2 } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';
import { getProductMedia } from '../../utils/media';
import { copyProductLink, getProductShareUrl } from '../../utils/share';
import { useNavigate } from '../../lib/router';

interface ProductCardProps {
  product: Product;
  onSelectProduct?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelectProduct }) => {
  const navigate = useNavigate();
  const { addToCart, openCart } = useCart();
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  // Navega para a rota individual do produto: /produto/:id
  const handleCardClick = () => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
    navigate(`/produto/${product.id}`);
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(true);
    addToCart(product, 1);
    setTimeout(() => {
      setIsAdding(false);
      openCart();
    }, 300);
  };

  // Copiar link direto absoluto do produto
  const handleCopyLinkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyProductLink(product.id);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { url: mediaUrl, isVideo } = getProductMedia(product);
  const hasValidMedia = Boolean(mediaUrl && !imageError);
  const shareUrl = getProductShareUrl(product.id);

  return (
    <div
      onClick={handleCardClick}
      className="group bg-white rounded-md sm:rounded-lg border border-slate-200 p-2.5 sm:p-3.5 flex flex-col justify-between h-full shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer relative"
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

        {/* Botão de Copiar Link do Produto (Canto Superior Direito) */}
        <button
          type="button"
          onClick={handleCopyLinkClick}
          className={`absolute top-1.5 right-1.5 p-1.5 rounded-full transition-all duration-200 z-10 shadow-xs cursor-pointer ${
            copied
              ? 'bg-emerald-600 text-white scale-110'
              : 'bg-white/90 hover:bg-white text-slate-700 hover:text-black opacity-80 hover:opacity-100'
          }`}
          title={copied ? 'Link copiado!' : `Copiar link do produto: ${shareUrl}`}
          aria-label="Copiar Link do Produto"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-white" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>

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

      {/* 3. Ações: Adicionar ao Carrinho + Copiar Link */}
      <div className="mt-3 w-full space-y-1.5">
        <button
          type="button"
          onClick={handleAddToCartClick}
          className="w-full py-2 sm:py-2.5 px-2 bg-[#65bc45] hover:bg-[#5aa83d] text-white font-bold text-[11px] sm:text-xs rounded-sm transition-all duration-150 flex items-center justify-center gap-1.5 shadow-xs active:scale-97 cursor-pointer"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{isAdding ? 'Adicionado!' : 'Adicionar ao carrinho'}</span>
        </button>

        {/* Botão de texto discreto para copiar link */}
        <button
          type="button"
          onClick={handleCopyLinkClick}
          className="w-full py-1 text-[10px] font-semibold text-slate-400 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" />
              <span className="text-emerald-600 font-bold">Link Copiado!</span>
            </>
          ) : (
            <>
              <Link2 className="w-3 h-3" />
              <span>Copiar Link do Produto</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
