import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, ShoppingBag, Share2, Copy, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { useParams, useNavigate } from '../../lib/router';
import { fetchProductByIdOrSlug } from '../../services/productService';
import { copyProductLink, getProductShareUrl } from '../../utils/share';
import { getProductMedia } from '../../utils/media';
import { slugify } from '../../utils/slug';
import { Header } from '../layout/Header';
import { Footer } from '../layout/Footer';
import { Toast } from '../common/Toast';
import { CartDrawer } from '../cart/CartDrawer';
import { FloatingWhatsApp } from '../layout/FloatingWhatsApp';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';

interface ProductDetailsProps {
  productId?: string;
  onBack?: () => void;
}

const SYSTEM_ROUTES = ['admin', 'checkout', 'finalizar-compra', 'pagamento-cartao', 'cartao', 'login', 'api'];

export const ProductDetails: React.FC<ProductDetailsProps> = ({ productId: propId, onBack: propOnBack }) => {
  const { slug: routeSlug, id: routeId } = useParams<{ slug?: string; id?: string }>();
  const navigate = useNavigate();
  const { products, showNotification } = useStoreData();
  const { addToCart, openCart } = useCart();

  const targetIdentifier = (propId || routeSlug || routeId || '').trim();
  const isSystemRoute = SYSTEM_ROUTES.includes(targetIdentifier.toLowerCase());

  const [product, setProduct] = useState<Product | null>(() => {
    if (!targetIdentifier || isSystemRoute) return null;
    return (
      products.find(
        (p) =>
          p.slug === targetIdentifier ||
          p.id === targetIdentifier ||
          slugify(p.name) === targetIdentifier ||
          p.name.toLowerCase().trim() === targetIdentifier.toLowerCase().trim()
      ) || null
    );
  });

  const [isLoading, setIsLoading] = useState<boolean>(!product && !isSystemRoute);
  const [quantity, setQuantity] = useState<number>(1);
  const [mediaError, setMediaError] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Consulta o produto no Supabase pelo slug ou ID
  useEffect(() => {
    if (!targetIdentifier || isSystemRoute) {
      setIsLoading(false);
      return;
    }

    // 1. Tenta encontrar nos produtos já carregados
    const inMemory = products.find((p) => {
      const pSlug = p.slug || slugify(p.name);
      return (
        pSlug === targetIdentifier ||
        p.id === targetIdentifier ||
        pSlug === slugify(targetIdentifier) ||
        p.name.toLowerCase().trim() === targetIdentifier.toLowerCase().trim()
      );
    });

    if (inMemory) {
      setProduct(inMemory);
      setIsLoading(false);
    }

    // 2. Consulta diretamente no Supabase por slug / ID
    async function loadProductFromDb() {
      if (!inMemory) setIsLoading(true);
      const { data, error } = await fetchProductByIdOrSlug(targetIdentifier);

      if (data) {
        setProduct(data);
      } else if (!inMemory) {
        console.warn(`[ProductDetails] Produto "${targetIdentifier}" não localizado:`, error);
      }
      setIsLoading(false);
    }

    loadProductFromDb();
  }, [targetIdentifier, products, isSystemRoute]);

  const handleBack = () => {
    if (propOnBack) {
      propOnBack();
      return;
    }
    navigate('/');
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Botão "Copiar Link do Produto" (formato /:slug)
  const handleCopyLink = async () => {
    if (!product) return;
    const success = await copyProductLink(product);
    if (success) {
      setCopied(true);
      showNotification('Link amigável do produto copiado!', 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Ação 1: "Comprar Agora / Pagar com Pix" (Fluxo imediato)
  const handleBuyNowPix = () => {
    if (!product) return;
    addToCart(product, quantity);
    // Redireciona imediatamente para o checkout Pix
    window.location.hash = '#/checkout';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Ação 2: "Adicionar Ao Carrinho"
  const handleAddToCart = () => {
    if (!product) return;
    setIsAdding(true);
    addToCart(product, quantity);
    setTimeout(() => {
      setIsAdding(false);
      openCart();
    }, 350);
  };

  // Descrição do produto formatada
  const renderDescription = () => {
    if (product?.description && product.description.trim().length > 20) {
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
          <p>✅ Modelos completos de {product?.name}</p>
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

  // Estado de Carregamento
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-white text-slate-900">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-black mb-3" />
          <p className="text-sm font-semibold text-slate-600">Carregando detalhes do produto...</p>
        </main>
        <Footer />
      </div>
    );
  }

  // Estado Não Encontrado
  if (!product) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-white text-slate-900">
        <Header />
        <main className="flex-1 max-w-lg mx-auto flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Produto não encontrado</h2>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            O item que você procura pode ter sido alterado ou não está mais disponível no catálogo.
          </p>
          <button
            onClick={handleBack}
            className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
          >
            Voltar para a Loja
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  const { url: mediaUrl, isVideo } = getProductMedia(product);
  const hasValidMedia = Boolean(mediaUrl && !mediaError);
  const shareLink = getProductShareUrl(product);

  return (
    <div className="min-h-screen w-full flex flex-col bg-white text-slate-900">
      {/* 1. Header Oficial da Loja */}
      <Header />

      {/* 2. Conteúdo da Página do Produto */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 select-none">
        
        {/* Barra Superior: Voltar + Botão Copiar Link */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-black transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para todos os produtos</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
              copied
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-black'
            }`}
            title={`Copiar link: ${shareLink}`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Link Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Link</span>
              </>
            )}
          </button>
        </div>

        <div className="space-y-6">
          
          {/* Mídia Principal do Produto em Destaque (Foto ou Vídeo) */}
          <div className="w-full max-w-sm sm:max-w-md mx-auto aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center relative">
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

            {product.badge && (
              <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-black text-white shadow-xs">
                {product.badge}
              </span>
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

          {/* Seletor de Quantidade Quadrado */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <span className="text-xs font-bold text-slate-500">Quantidade:</span>
            <div className="w-20">
              <input
                type="number"
                min="1"
                max="99"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-11 text-center text-sm font-bold border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-black rounded-none shadow-2xs"
              />
            </div>
          </div>

          {/* BOTÕES DE AÇÃO: Comprar Agora com Pix & Adicionar ao Carrinho */}
          <div className="space-y-2.5 pt-2">
            {/* 1. Botão Direto: Comprar Agora / Pagar com Pix */}
            <button
              type="button"
              onClick={handleBuyNowPix}
              className="w-full h-13 bg-[#65bc45] hover:bg-[#5aa83d] text-white font-black text-sm uppercase tracking-wider rounded-none flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
            >
              <span>❖ Comprar Agora / Pagar com Pix</span>
            </button>

            {/* 2. Botão Preto: Adicionar Ao Carrinho */}
            <button
              type="button"
              onClick={handleAddToCart}
              className={`w-full h-11 bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-none flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98 ${
                isAdding ? 'bg-emerald-700' : ''
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isAdding ? 'Adicionado ao Carrinho!' : 'Adicionar Ao Carrinho'}</span>
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

export default ProductDetails;
