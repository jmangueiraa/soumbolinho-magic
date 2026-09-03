import React, { useState } from 'react';
import { ArrowLeft, Check, Sparkles, ShoppingBag } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { Header } from '../layout/Header';
import { Footer } from '../layout/Footer';
import { Toast } from '../common/Toast';
import { CartDrawer } from '../cart/CartDrawer';
import { FloatingWhatsApp } from '../layout/FloatingWhatsApp';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';
import { getProductMedia } from '../../utils/media';

interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ product, onBack }) => {
  const { addToCart, openCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAddedAnimation(true);
    setTimeout(() => {
      setAddedAnimation(false);
      openCart();
    }, 400);
  };

  // Identificação inteligente de Foto ou Vídeo
  const { url: mediaUrl, isVideo } = getProductMedia(product);
  const hasValidMedia = Boolean(mediaUrl && !mediaError);

  // Formata ou gera a descrição completa conforme o padrão da referência
  const renderDescription = () => {
    if (product.description && product.description.trim().length > 20) {
      return (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
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
          <p>✅ Modelos de {product.name}</p>
          <p>✅ Temas infantis e comemorativos em alta</p>
          <p>✅ 100% editável no Canva</p>
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
    <div className="min-h-screen w-full flex flex-col bg-white text-slate-900">
      {/* 1. Header Oficial da Loja */}
      <Header />

      {/* 2. Conteúdo da Página do Produto */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 select-none">
        
        {/* Botão Voltar Discreto */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-black transition-colors mb-5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para todos os produtos</span>
        </button>

        <div className="space-y-6">
          
          {/* Mídia Principal do Produto em Destaque (Foto ou Vídeo) */}
          <div className="w-full max-w-sm sm:max-w-md mx-auto aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center">
            {hasValidMedia ? (
              isVideo ? (
                <video
                  src={mediaUrl}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  onError={() => setMediaError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={product.name}
                  onError={() => setMediaError(true)}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              )
            ) : (
              <ProductImagePlaceholder 
                iconClassName="w-12 h-12 text-slate-300" 
                showText={false} 
              />
            )}
          </div>

          {/* Título com Emojis */}
          <h1 className="font-sans font-bold text-base sm:text-lg text-slate-900 uppercase tracking-tight leading-snug">
            📚 {product.name} ✨
          </h1>

          {/* Bloco de Descrição com Checklist */}
          {renderDescription()}

          {/* Preço em Destaque Centralizado */}
          <div className="text-center pt-2">
            <span className="font-sans font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
              {formatCurrency(product.price)}
            </span>
          </div>

          {/* Formulário: Quantidade + Botão Preto "Adicionar Ao Carrinho" */}
          <div className="flex items-center gap-3 pt-1">
            {/* Input de Quantidade Quadrado */}
            <div className="w-16 sm:w-20 shrink-0">
              <input
                type="number"
                min="1"
                max="99"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-12 text-center text-sm font-bold border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-black rounded-none shadow-2xs"
              />
            </div>

            {/* Botão Preto Retangular Preenchido */}
            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex-1 h-12 bg-black hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-none flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-98 ${
                addedAnimation ? 'bg-emerald-600' : ''
              }`}
            >
              <span>{addedAnimation ? 'Adicionado!' : 'Adicionar Ao Carrinho'}</span>
            </button>
          </div>

          {/* Banner Verde "Seu produto com Download imediato!" */}
          <div className="w-full py-3.5 sm:py-4 px-4 bg-[#65bc45] text-white font-bold text-center text-sm sm:text-base rounded-none shadow-xs mt-4 tracking-tight">
            Seu produto com Download imediato!
          </div>

        </div>

      </main>

      {/* 3. Gaveta do Carrinho, Toast e WhatsApp */}
      <CartDrawer />
      <Toast />
      <FloatingWhatsApp />

      {/* 4. Footer */}
      <Footer />
    </div>
  );
};

export default ProductDetailPage;
