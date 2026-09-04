import React from 'react';
import { Sparkles, Zap, Check, Gift } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { formatCurrency } from '../../utils/formatters';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';

export const CartUpsellCard: React.FC = () => {
  const { items, addToCart, removeFromCart } = useCart();
  const { products } = useStoreData();

  if (!items || items.length === 0) return null;

  // 1. Identificar se já existe um item de upsell adicionado no carrinho
  const upsellCartItem = items.find((i) => i.isUpsell);
  const isAdded = Boolean(upsellCartItem);

  const cartProductIds = new Set(items.map((i) => i.product.id));

  // 2. Determinar o produto e os preços de upsell
  let targetProduct: Product | null = null;
  let promoPrice: number | undefined = undefined;
  let configuredDiscountPercent: number | undefined = undefined;

  if (upsellCartItem) {
    targetProduct = upsellCartItem.product;
    promoPrice = upsellCartItem.customPrice ?? targetProduct.price;
  } else {
    // A) Tentar encontrar upsell configurado nos itens atuais do carrinho
    for (const item of items) {
      const configuredId = item.product.upsell_product_id || (item.product as any).upsellProductId;
      if (configuredId && !cartProductIds.has(configuredId)) {
        const found = products.find((p) => p.id === configuredId && p.inStock);
        if (found) {
          targetProduct = found;
          configuredDiscountPercent = item.product.upsell_discount_percent ?? (item.product as any).upsellDiscountPercent ?? found.upsell_discount_percent;
          promoPrice = item.product.upsell_price ?? found.upsell_price;
          break;
        }
      }
    }

    // B) Fallback automático: seleciona o produto ativo de menor valor que não está no carrinho
    if (!targetProduct) {
      const available = products.filter(
        (p) => !cartProductIds.has(p.id) && p.inStock
      );
      if (available.length > 0) {
        const sorted = [...available].sort((a, b) => Number(a.price) - Number(b.price));
        targetProduct = sorted[0];
        configuredDiscountPercent = targetProduct.upsell_discount_percent;
        promoPrice = targetProduct.upsell_price;
      }
    }
  }

  // Se nenhum produto elegível for encontrado, não renderiza nada
  if (!targetProduct) return null;

  // 3. Cálculo de valores com base na porcentagem de desconto
  const regularPrice = Number(targetProduct.price) || 10;
  let discountPercent = 50;
  let effectivePromoPrice = 0;

  if (configuredDiscountPercent !== undefined && configuredDiscountPercent !== null && configuredDiscountPercent > 0) {
    discountPercent = Math.min(95, Math.max(5, Math.round(configuredDiscountPercent)));
    effectivePromoPrice = Math.max(0.50, Math.round(regularPrice * (1 - discountPercent / 100) * 100) / 100);
  } else if (promoPrice !== undefined && promoPrice !== null && promoPrice > 0) {
    effectivePromoPrice = Number(promoPrice);
    discountPercent = Math.max(5, Math.round(((regularPrice - effectivePromoPrice) / regularPrice) * 100));
  } else {
    discountPercent = 50;
    effectivePromoPrice = Math.max(0.50, Math.round(regularPrice * 0.5 * 100) / 100);
  }

  const effectiveOriginalPrice = targetProduct.originalPrice && targetProduct.originalPrice > effectivePromoPrice
    ? targetProduct.originalPrice
    : regularPrice;

  const imageSrc = (
    targetProduct.image || 
    targetProduct.image_url || 
    targetProduct.imageUrl || 
    targetProduct.photo_url || 
    ''
  ).trim();

  const handleToggleUpsell = () => {
    if (isAdded && upsellCartItem) {
      removeFromCart(upsellCartItem.id);
    } else if (targetProduct) {
      addToCart(targetProduct, 1, 'Oferta Especial Compre Junto', effectivePromoPrice, true);
    }
  };

  return (
    <div className={`p-3.5 sm:p-4 rounded-2xl border-2 border-dashed transition-all duration-200 ${
      isAdded 
        ? 'bg-pink-100/90 border-black shadow-sm' 
        : 'bg-gradient-to-r from-pink-50/90 via-rose-50/50 to-pink-50/90 border-pink-500 hover:border-black shadow-xs'
    }`}>
      
      {/* Top Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          {isAdded ? (
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white bg-black px-2.5 py-1 rounded-lg shadow-xs">
              <Check className="w-3.5 h-3.5 text-pink-400 stroke-[3]" />
              <span>Oferta Adicionada!</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white bg-black px-2.5 py-1 rounded-lg shadow-xs">
              <Zap className="w-3.5 h-3.5 text-pink-400 fill-pink-400 animate-pulse" />
              <span>Oferta Relâmpago • Compre Junto</span>
            </span>
          )}
        </div>

        <span className="text-[10px] font-black text-white bg-pink-600 px-2.5 py-0.5 rounded-full shadow-2xs">
          -{discountPercent}% OFF
        </span>
      </div>

      {/* Product Information Card */}
      <div className="flex items-center gap-3">
        {/* Thumbnail */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white shrink-0 border border-pink-200 shadow-2xs flex items-center justify-center">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={targetProduct.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <ProductImagePlaceholder 
              iconClassName="w-5 h-5 text-pink-300" 
              showText={false} 
              className="p-1"
            />
          )}
        </div>

        {/* Title and Pricing */}
        <div className="flex-1 min-w-0">
          <h4 className="font-sans font-bold text-black text-xs sm:text-sm line-clamp-1 leading-tight">
            {targetProduct.name}
          </h4>
          <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 line-through font-medium">
              De {formatCurrency(effectiveOriginalPrice)}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-800">
              por apenas <span className="text-pink-600 text-sm sm:text-base font-black">{formatCurrency(effectivePromoPrice)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 1-Click Checkbox Button */}
      <div className="mt-3 pt-2.5 border-t border-pink-200/80 flex items-center justify-between">
        <label 
          onClick={handleToggleUpsell}
          className="flex items-center gap-2.5 cursor-pointer select-none w-full"
        >
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
            isAdded
              ? 'bg-black border-black text-pink-400 shadow-2xs'
              : 'bg-white border-black hover:border-pink-600 text-transparent'
          }`}>
            <Check className={`w-3.5 h-3.5 stroke-[3] ${isAdded ? 'text-pink-400' : 'text-transparent'}`} />
          </div>
          <span className={`text-xs font-bold transition-colors ${
            isAdded ? 'text-black font-extrabold' : 'text-slate-900 hover:text-pink-600'
          }`}>
            {isAdded 
              ? '✓ Adicionado à compra com desconto!' 
              : 'Adicionar à compra com 1 clique'
            }
          </span>
        </label>
      </div>

    </div>
  );
};
