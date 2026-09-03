import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, ShoppingBag, Copy, AlertCircle, Loader2 } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { useParams, useNavigate, RESERVED_ROUTES } from '../../lib/router';
import { supabase } from '../../lib/supabase';
import { mapSupabaseProduct } from '../../services/productService';
import { copyProductLink, getProductShareUrl } from '../../utils/share';
import { getProductMedia } from '../../utils/media';
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

export const ProductDetails: React.FC<ProductDetailsProps> = ({ productId: propId, onBack: propOnBack }) => {
  const { slug: routeSlug, id: routeId } = useParams<{ slug?: string; id?: string }>();
  const navigate = useNavigate();
  const { showNotification } = useStoreData();
  const { addToCart, openCart } = useCart();

  const slug = (propId || routeSlug || routeId || '').trim();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [quantity, setQuantity] = useState<number>(1);
  const [mediaError, setMediaError] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Consulta segura com controle de montagem e dependência estrita em [slug]
  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      if (!slug || RESERVED_ROUTES.includes(slug.toLowerCase())) {
        if (isMounted) {
          setIsLoading(false);
          setProduct(null);
        }
        return;
      }

      setIsLoading(true);
      try {
        // 1. Busca no Supabase usando .eq('slug', slug)
        const { data: bySlug, error: slugErr } = await supabase
          .from('products')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (isMounted) {
          if (bySlug) {
            setProduct(mapSupabaseProduct(bySlug));
            setIsLoading(false);
            return;
          }

          // 2. Fallback por ID (caso venha de link antigo /produto/prod_id)
          const { data: byId } = await supabase
            .from('products')
            .select('*')
            .eq('id', slug)
            .maybeSingle();

          if (isMounted) {
            if (byId) {
              setProduct(mapSupabaseProduct(byId));
            } else {
              // Produto não localizado; encerra carregamento sem disparar loop de navegação
              setProduct(null);
            }
          }
        }
      } catch (err) {
        console.error('[ProductDetails] Erro ao carregar produto:', err);
        if (isMounted) setProduct(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleBack = () => {
    if (propOnBack) {
      propOnBack();
      return;
    }
    window.location.hash = '';
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Botão "Copiar Link do Produto" (formato /:slug)
  const handleCopyLink = async () => {
    if (!product) return;
    const success = await copyProductLink(product);
    if (success) {
      setCopied(true);
      showNotification('Link do produto copiado!', 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Ação 1: "Comprar Agora / Pagar com Pix" (Fluxo imediato)
  const handleBuyNowPix = () => {
    if (!product) return;
    addToCart(product, quantity);
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

  // 1. Estado de Carregamento
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-white text-slate-900">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[350px]">
          <Loader2 className="w-10 h-10 animate-spin text-black mb-3" />
          <p className="text-sm font-semibold text-slate-600">Carregando detalhes do produto...</p>
        </main>
        <Footer />
      </div>
    );
  }

  // 2. Estado Não Encontrado (Sem redirecionamento automático para evitar loop)
  if (!product) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-white text-slate-900">
        <Header />
        <main className="flex-1 max-w-lg mx-auto flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[350px]">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Produto não encontrado</h2>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            O produto que você procura não está mais disponível ou o link pode ter sido alterado.
          </p>
          <button
            type="button"
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
      {/* Header Oficial */}
      <Header />

      {/* Conteúdo da Página do Produto */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 select-none">
        
        {/* Barra Superior: Voltar + Botão Copiar Link */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <button
            type="button"
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
          
          {/* Mídia Principal (Foto ou Vídeo) */}
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

      {/* Modals e Overlays */}
      <CartDrawer />
      <Toast />
      <FloatingWhatsApp />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ProductDetails;
