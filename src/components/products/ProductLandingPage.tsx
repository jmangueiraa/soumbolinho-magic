import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, 
  Check, 
  ShoppingBag, 
  Copy, 
  AlertCircle, 
  Loader2, 
  Star, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  Download, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Lock, 
  Gift, 
  FileText, 
  Layers, 
  Flame, 
  Share2,
  CheckCircle2,
  HelpCircle,
  Award,
  Smartphone
} from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { useTenant } from '../../context/TenantContext';
import { applyThemeToDocument } from '../../utils/theme';
import { useParams, useNavigate, RESERVED_ROUTES } from '../../lib/router';
import { fetchProductByIdOrSlug } from '../../services/productService';
import { copyProductLink, getProductShareUrl } from '../../utils/share';
import { getProductMedia, isVideoUrl } from '../../utils/media';
import { Toast } from '../common/Toast';
import { CartDrawer } from '../cart/CartDrawer';
import { CheckoutModal } from '../cart/CheckoutModal';
import { PaymentFeedbackModal } from '../cart/PaymentFeedbackModal';
import { FloatingWhatsApp } from '../layout/FloatingWhatsApp';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';
import { ScarcityCountdownBanner } from '../common/ScarcityCountdownBanner';
import { DEFAULT_TESTIMONIALS } from '../../data/defaultTestimonials';
import { DEFAULT_BONUSES, ProductBonusItem } from '../../data/defaultBonuses';
import { getAutomaticPackageItems, getAutomaticProductDescription, getAutomaticPlanDetails, getAutomaticTestimonials } from '../../utils/automaticProductContent';

interface ProductLandingPageProps {
  productId?: string;
  onBack?: () => void;
}

export const ProductLandingPage: React.FC<ProductLandingPageProps> = ({ 
  productId: propId, 
  onBack: propOnBack 
}) => {
  const { slug: routeSlug, id: routeId, storeSlug, productId } = useParams<{ slug?: string; id?: string; storeSlug?: string; productId?: string }>();
  const navigate = useNavigate();
  const { storeConfig, showNotification } = useStoreData();
  const { currentStore } = useTenant();
  const { addToCart, openCart, openCheckout, clearCart } = useCart();

  const slug = (propId || routeSlug || routeId || productId || '').trim();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [quantity, setQuantity] = useState<number>(1);
  const [mediaError, setMediaError] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);


  // Injeção de variáveis CSS de tema (--primary-color)
  useEffect(() => {
    const activePalette = storeConfig.colorPalette || currentStore?.theme_settings?.color_palette || 'pink_pastel';
    const activePrimary = storeConfig.primaryColor || currentStore?.theme_settings?.primary_color || '#FF1493';
    const activeLayout = storeConfig.themeLayout || currentStore?.theme_settings?.theme_layout || 'classic';
    document.documentElement.style.setProperty('--primary-color', activePrimary);
    applyThemeToDocument(activePalette, activePrimary, activeLayout);
  }, [storeConfig.colorPalette, storeConfig.primaryColor, storeConfig.themeLayout, currentStore]);

  // Carregamento resiliente do produto por slug ou ID com fallback automático
  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      // Se não há slug ou é uma rota reservada do sistema, redireciona imediatamente para a home
      if (!slug || RESERVED_ROUTES.includes(slug.toLowerCase())) {
        if (isMounted) {
          setIsLoading(false);
          setProduct(null);
          navigate(storeSlug ? `/loja/${storeSlug}` : '/');
        }
        return;
      }

      setIsLoading(true);

      try {
        const storeId = currentStore?.id && currentStore.id !== '__resolving_tenant__' ? currentStore.id : '';
        const { data, error } = await fetchProductByIdOrSlug(slug, storeId);

        if (isMounted) {
          if (data) {
            setProduct(data);
          } else {
            setProduct(null);
            showNotification('Produto não encontrado. Redirecionando para a loja...', 'warning');
            navigate(storeSlug ? `/loja/${storeSlug}` : '/');
          }
        }
      } catch (err) {
        console.error('[ProductLandingPage] Erro ao carregar produto:', err);
        if (isMounted) {
          setProduct(null);
          showNotification('Erro ao carregar produto. Redirecionando...', 'error');
          navigate(storeSlug ? `/loja/${storeSlug}` : '/');
        }
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
  }, [slug, currentStore?.id, storeSlug, navigate, showNotification]);

  // Monta a galeria completa de mídias (foto principal + fotos adicionais)
  const mediaList = useMemo(() => {
    if (!product) return [];
    const items: Array<{ url: string; isVideo: boolean }> = [];

    const mainImg = product.imageUrl || product.image_url || product.image || product.photo_url || '';
    const mainVideo = product.videoUrl || product.video_url || '';

    if (mainVideo) {
      items.push({ url: mainVideo, isVideo: true });
    }

    if (mainImg) {
      items.push({ url: mainImg, isVideo: isVideoUrl(mainImg) });
    }

    const extraGallery = product.galleryImages || product.gallery_images || [];
    extraGallery.forEach((url) => {
      const cleanUrl = String(url || '').trim();
      if (cleanUrl && !items.some((it) => it.url === cleanUrl)) {
        items.push({ url: cleanUrl, isVideo: isVideoUrl(cleanUrl) });
      }
    });

    return items;
  }, [product]);

  const currentMedia = mediaList[activeMediaIndex] || mediaList[0] || null;

  const handleBack = () => {
    if (propOnBack) {
      propOnBack();
      return;
    }
    window.location.hash = '';
    navigate(storeSlug ? `/loja/${storeSlug}` : '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyLink = async () => {
    if (!product) return;
    const success = await copyProductLink(product);
    if (success) {
      setCopied(true);
      showNotification('Link do produto copiado com sucesso!', 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Detalhes dos planos de acesso (Plano Básico vs Plano Completo - Mais Popular)
  const planDetails = useMemo(() => {
    return getAutomaticPlanDetails(product);
  }, [product]);

  // Ação de seleção de plano ("Quero o Plano Básico" / "Quero o Pacote Completo")
  const handleSelectPlan = (plan: 'basic' | 'complete') => {
    if (!product) return;

    // Fluxo Nativo Unificado da Loja: limpa carrinho anterior, coloca o plano selecionado e abre checkout direto
    clearCart();
    if (plan === 'complete') {
      addToCart(
        product,
        1,
        productBonuses.length > 0
          ? 'Plano Completo (Acesso Imediato + Todos os Bônus)'
          : 'Plano Completo (Acesso Imediato e Vitalício)',
        planDetails.complete.price,
        true
      );
    } else {
      addToCart(
        product,
        1,
        'Plano Básico (Acesso Imediato)',
        planDetails.basic.price,
        false
      );
    }
    openCheckout();
  };

  // AÇÃO PRINCIPAL: COMPRA / CHECKOUT DE ALTA CONVERSÃO
  const handleBuyNow = () => {
    if (!product) return;

    // Rola suavemente até a seção de escolha de planos de acesso ("Garanta seu acesso hoje")
    const planosEl = document.getElementById('planos-acesso');
    if (planosEl) {
      planosEl.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Fallback: coloca no carrinho e abre o checkout integrado imediato da loja
    addToCart(product, quantity);
    openCheckout();
  };

  const handleAddToCart = () => {
    if (!product) return;
    setIsAdding(true);
    addToCart(product, quantity);
    setTimeout(() => {
      setIsAdding(false);
      openCart();
    }, 300);
  };

  // Benefícios automáticos e dinâmicos baseados no produto ("O que você vai encontrar neste pacote")
  const productBenefits = useMemo(() => {
    return getAutomaticPackageItems(product);
  }, [product]);

  // Descrição automática e persuasiva caso não tenha sido preenchida manualmente
  const productDescription = useMemo(() => {
    return getAutomaticProductDescription(product);
  }, [product]);

  // Bônus exclusivos (configurados no produto pelo lojista ou os 3 bônus poderosos padrão)
  const productBonuses = useMemo(() => {
    let raw = product?.bonuses;

    // Se o produto ainda não retornou a coluna do Supabase, verifica o backup no localStorage
    if ((!raw || (Array.isArray(raw) && raw.length === 0)) && typeof window !== 'undefined' && window.localStorage && product?.id) {
      try {
        const cached = localStorage.getItem(`soumbolinho_bonuses_${product.id}`);
        if (cached) {
          const parsedCached = JSON.parse(cached);
          if (Array.isArray(parsedCached) && parsedCached.length > 0) {
            raw = parsedCached;
          }
        }
      } catch {}
    }

    if (raw) {
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((b: any, idx: number) => ({
          title: b.title || `Bônus #${idx + 1}`,
          description: b.description || 'Acesso exclusivo incluso gratuitamente neste pacote.',
          originalPrice: b.originalPrice !== undefined ? Number(b.originalPrice) : (40 + idx * 10),
          imageUrl: b.imageUrl || '',
          badge: b.badge || `BÔNUS #${idx + 1}`,
        }));
      }
      if (typeof raw === 'string' && raw.trim()) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((b: any, idx: number) => ({
              title: b.title || `Bônus #${idx + 1}`,
              description: b.description || 'Acesso exclusivo incluso gratuitamente neste pacote.',
              originalPrice: b.originalPrice !== undefined ? Number(b.originalPrice) : (40 + idx * 10),
              imageUrl: b.imageUrl || '',
              badge: b.badge || `BÔNUS #${idx + 1}`,
            }));
          }
        } catch {
          const lines = raw.split('\n').map((s) => s.trim()).filter(Boolean);
          if (lines.length > 0) {
            return lines.map((line, idx) => {
              const parts = line.split('|').map((p) => p.trim());
              return {
                title: parts[0] || `Bônus #${idx + 1}`,
                description: parts[1] || 'Acesso exclusivo incluso gratuitamente neste pacote.',
                originalPrice: parts[2] ? parseFloat(parts[2].replace(/[^0-9.,]/g, '').replace(',', '.')) : (40 + idx * 10),
                imageUrl: parts[3] || '',
                badge: `BÔNUS #${idx + 1}`,
              };
            });
          }
        }
      }
    }
    return [];
  }, [product]);

  // Depoimentos estruturados (garante SEMPRE exatamente 6 cards de prova social)
  const productTestimonials = useMemo(() => {
    return getAutomaticTestimonials(product);
  }, [product]);

  // FAQ estruturado (perguntas e respostas de alta conversão)
  const productFaq = useMemo(() => {
    if (product?.faq && Array.isArray(product.faq) && product.faq.length > 0) {
      return product.faq;
    }

    return [
      {
        question: 'Como vou receber o meu acesso após a compra?',
        answer: 'O envio é imediato e 100% automático! Assim que o pagamento via Pix ou Cartão for aprovado, o link de acesso aos arquivos será enviado diretamente para o seu WhatsApp e para o seu E-mail cadastrado.'
      },
      {
        question: 'Preciso ter a conta Canva Pro para editar?',
        answer: 'Não! Todos os arquivos foram criados pensando na máxima acessibilidade. Você consegue abrir, editar nomes, cores e elementos na versão 100% GRATUITA do Canva.'
      },
      {
        question: 'Posso editar pelo celular ou preciso de computador?',
        answer: 'Você pode editar tanto pelo celular (através do aplicativo oficial do Canva) quanto pelo computador ou tablet, com total facilidade.'
      },
      {
        question: 'O acesso tem prazo de validade?',
        answer: 'Não! O seu acesso é vitalício. Você pode baixar e reutilizar quantas vezes quiser, para quantos clientes e festas precisar.'
      },
      {
        question: 'E se eu tiver alguma dúvida ou dificuldade?',
        answer: 'Nosso suporte está disponível via WhatsApp para te auxiliar em qualquer dúvida referente ao acesso ou utilização dos arquivos.'
      }
    ];
  }, [product]);

  // Cálculo de desconto e preços
  const price = product?.price || 0;
  const originalPrice = product?.originalPrice || (price > 0 ? Math.round(price * 1.7) : 0);
  const discountPercent = originalPrice > price 
    ? Math.round(((originalPrice - price) / originalPrice) * 100) 
    : 35;

  const guaranteeDays = product?.guarantee_days || 7;

  // Estado de Carregamento
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-slate-50 text-slate-900">
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
          <Loader2 className="w-12 h-12 animate-spin text-theme-primary mb-4" />
          <p className="text-base font-bold text-slate-700">Carregando página do produto...</p>
          <p className="text-xs text-slate-400 mt-1">Preparando a melhor oferta para você</p>
        </main>
      </div>
    );
  }

  // Estado Não Encontrado com Redirecionamento Automático
  if (!product) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-slate-50 text-slate-900">
        <main className="flex-1 max-w-md mx-auto flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[400px]">
          <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-2 shadow-inner">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Produto não encontrado</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            O endereço informado é inválido ou o produto não foi encontrado. Redirecionando para a loja...
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="w-full py-3.5 px-6 bg-slate-950 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a Página Inicial</span>
          </button>
        </main>
      </div>
    );
  }

  const shareLink = getProductShareUrl(product);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#FAF9F6] text-slate-900 font-sans selection:bg-theme-primary selection:text-white pb-20 sm:pb-0">
      
      {/* 1. Barra de Aviso de Escassez com Cronômetro Regressivo no Topo Absoluto */}
      <ScarcityCountdownBanner />

      {/* 2. Container Principal da Landing Page (Sem Topo do Site Principal) */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-10 sm:space-y-14">
        
        {/* Barra de Navegação & Ações Rápidas */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-slate-950 transition-colors cursor-pointer py-1 px-2 -ml-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao catálogo</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-xs ${
              copied
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Link Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Compartilhar Produto</span>
              </>
            )}
          </button>
        </div>

        {/* ============================================================ */}
        {/* HERO SECTION: Galeria + Caixa de Compra / Preço               */}
        {/* ============================================================ */}
        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* COLUNA ESQUERDA: Galeria de Mídia (Foto Principal + Miniaturas) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Moldura da Mídia Ativa */}
              <div className="relative w-full aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center group">
                {currentMedia ? (
                  currentMedia.isVideo ? (
                    <video
                      src={currentMedia.url}
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
                      src={currentMedia.url}
                      alt={product.name}
                      onError={() => setMediaError(true)}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                      loading="eager"
                    />
                  )
                ) : (
                  <ProductImagePlaceholder iconClassName="w-16 h-16 text-slate-300" showText={false} />
                )}

                {/* Badges Flutuantes */}
                <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 z-10">
                  <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    {product.badge || 'Mais Vendido'}
                  </span>

                  <span className="inline-flex items-center gap-1 bg-slate-950/85 backdrop-blur-xs text-white font-bold text-[10px] uppercase tracking-wide px-2.5 py-0.5 rounded-md shadow-xs">
                    <Download className="w-3 h-3 text-cyan-400" />
                    Download Imediato
                  </span>
                </div>

                {/* Selo de Garantia no canto inferior */}
                <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs border border-slate-200 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Garantia de {guaranteeDays} dias</span>
                </div>
              </div>

              {/* Grade de Miniaturas / Thumbnails da Galeria */}
              {mediaList.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                  {mediaList.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveMediaIndex(idx)}
                      className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-slate-50 ${
                        activeMediaIndex === idx
                          ? 'border-theme-primary shadow-md scale-102 ring-2 ring-theme-primary/20'
                          : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {item.isVideo ? (
                        <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                          Vídeo
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Prova Social de Avaliação */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <span className="font-bold text-slate-800">4.9 / 5.0</span>
                </div>
                <span className="text-slate-500 font-medium">Mais de 140 clientes satisfeitas</span>
              </div>
            </div>

            {/* COLUNA DIREITA: Informações do Produto & Oferta de Compra */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Título do Produto */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight">
                  {product.name}
                </h1>
              </div>

              {/* Descrição Curta de Apresentação */}
              {product.description && (
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Box de Preço & Oferta */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-slate-100/70 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-xs sm:text-sm text-slate-400 line-through font-semibold">
                    {formatCurrency(originalPrice)}
                  </span>
                  <span className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
                    {formatCurrency(price)}
                  </span>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {discountPercent}% OFF
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 font-medium">
                  <p className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <Zap className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                    Acesso imediato no Pix ou em até 12x no cartão
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Acesso 100% vitalício • Sem mensalidades ou cobranças futuras
                  </p>
                </div>
              </div>

              {/* Seletor de Quantidade */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">Quantidade:</span>
                <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-sm text-slate-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO: CTA DE ALTA CONVERSÃO */}
              <div className="space-y-3 pt-1">
                {/* 1. Botão Principal "QUERO COMPRAR AGORA" (Pulsante e Destacado) */}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="w-full py-4 px-6 bg-theme-primary hover:bg-theme-primary-hover text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-theme-primary/25 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer relative overflow-hidden group"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                    <span>QUERO COMPRAR AGORA</span>
                  </div>
                  <span className="text-[10px] font-normal tracking-normal text-white/90">
                    Receber arquivos no WhatsApp e E-mail imediatamente
                  </span>
                </button>

                {/* 2. Botão Secundário "Adicionar ao Carrinho" */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-slate-600" />
                  <span>{isAdding ? 'Adicionado ao Carrinho!' : 'Adicionar ao Carrinho'}</span>
                </button>
              </div>

              {/* Selos de Confiança e Segurança */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[10px] text-slate-500 font-medium">
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 border border-slate-200/50">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>Compra Segura</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 border border-slate-200/50">
                  <Download className="w-4 h-4 text-cyan-600" />
                  <span>Envio Imediato</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 border border-slate-200/50">
                  <ShieldCheck className="w-4 h-4 text-theme-primary" />
                  <span>Garantia Total</span>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ============================================================ */}
        {/* SEÇÃO 2: O QUE VOCÊ VAI ENCONTRAR NESTE PACOTE (AUTOMÁTICO)  */}
        {/* ============================================================ */}
        <section className="space-y-6 py-2">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="flex items-center justify-center gap-2.5">
              <span className="text-3xl sm:text-4xl select-none" role="img" aria-label="Foguete">
                🚀
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-festive">
                O que você vai encontrar neste pacote
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Tudo organizado para facilitar sua produção do dia a dia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4.5 max-w-4xl mx-auto">
            {productBenefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white px-5 sm:px-6 py-4 sm:py-4.5 rounded-[26px] border border-pink-100/90 shadow-xs hover:shadow-md transition-all flex items-center gap-3.5 group"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#f43f5e] via-[#fb7185] to-[#ec4899] text-white flex items-center justify-center shrink-0 shadow-sm shadow-pink-500/20 group-hover:scale-105 transition-transform">
                  <Check className="w-5 h-5 stroke-[3] text-white" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                  {benefit}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* SEÇÃO 3: DESCRIÇÃO DETALHADA                                 */}
        {/* ============================================================ */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 space-y-6 shadow-xs max-w-4xl mx-auto">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <FileText className="w-6 h-6 text-theme-primary" />
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              Detalhes e Descrição do Produto
            </h3>
          </div>

          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal space-y-4">
            {productDescription.split(/\n\s*\n/).map((paragraph, pIdx) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;
              const lines = trimmed.split('\n');
              return (
                <p key={pIdx} className="space-y-1">
                  {lines.map((line, lIdx) => {
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <span key={lIdx} className="block">
                        {parts.map((part, partIdx) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return (
                              <strong key={partIdx} className="font-bold text-slate-900">
                                {part.slice(2, -2)}
                              </strong>
                            );
                          }
                          return part;
                        })}
                      </span>
                    );
                  })}
                </p>
              );
            })}
          </div>
        </section>

        {/* ============================================================ */}
        {/* SEÇÃO DE BÔNUS EXCLUSIVOS ("Além disso você leva X bônus")   */}
        {/* ============================================================ */}
        {productBonuses.length > 0 && (
          <section className="space-y-8 py-6">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              {/* Tag Superior idêntica à imagem */}
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-pink-50 text-pink-600 border border-pink-200/80 shadow-2xs">
                <Gift className="w-4 h-4 text-pink-600" />
                <span>BÔNUS EXCLUSIVOS</span>
              </div>

              {/* Título Principal idêntico à imagem */}
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight font-festive">
                Além disso você leva {productBonuses.length} {productBonuses.length === 1 ? 'bônus poderoso' : 'bônus poderosos'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Materiais complementares liberados imediatamente junto com seu pedido.
              </p>
            </div>

            {/* Grid dos Cards de Bônus (Responsivo conforme quantidade: 1, 2 ou 3+ bônus) */}
            <div className={`grid gap-6 mx-auto ${
              productBonuses.length === 1
                ? 'grid-cols-1 max-w-md'
                : productBonuses.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-5xl'
            }`}>
              {productBonuses.map((bonus, index) => (
                <div
                  key={index}
                  className="bg-white rounded-3xl border border-pink-100/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden flex flex-col justify-between group"
                >
                  <div className="p-5 sm:p-6 space-y-4">
                    {/* Header do Card de Bônus */}
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs">
                        {bonus.badge || `BÔNUS #${index + 1}`}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                        100% Grátis
                      </span>
                    </div>

                    {/* Imagem ou Mockup do Bônus */}
                    {bonus.imageUrl ? (
                      <div className="w-full h-44 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/60 relative group-hover:scale-[1.02] transition-transform">
                        <img
                          src={bonus.imageUrl}
                          alt={bonus.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-36 rounded-2xl bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 border border-pink-100 flex items-center justify-center text-pink-500">
                        <Gift className="w-12 h-12 stroke-[1.5] animate-pulse" />
                      </div>
                    )}

                    {/* Conteúdo textual */}
                    <div className="space-y-2">
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug group-hover:text-pink-600 transition-colors">
                        {bonus.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {bonus.description}
                      </p>
                    </div>
                  </div>

                  {/* Barra de Valor e Confirmação no Rodapé do Card */}
                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      {bonus.originalPrice && bonus.originalPrice > 0 ? (
                        <span className="text-[11px] text-slate-400 line-through block">
                          De {formatCurrency(bonus.originalPrice)}
                        </span>
                      ) : null}
                      <span className="text-sm font-black text-emerald-600">
                        Por R$ 0,00
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      <span>Incluso Hoje</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Chamada para Ação abaixo dos Bônus */}
            <div className="text-center pt-2 max-w-md mx-auto">
              <button
                type="button"
                onClick={handleBuyNow}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>QUERO O PRODUTO + TODOS OS BÔNUS</span>
              </button>
              <p className="text-[10px] text-slate-400 font-medium mt-2">
                🔒 Acesso vitalício e liberação instantânea de todos os bônus após a confirmação
              </p>
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* SEÇÃO 4: DEPOIMENTOS / PROVA SOCIAL                          */}
        {/* ============================================================ */}
        <section className="space-y-8 py-4 sm:py-6">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            {/* Tag Superior */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-pink-50 text-pink-700 border border-pink-200/80 shadow-2xs">
              <span className="text-xs">💬</span>
              <span>PROVAS REAIS</span>
            </div>

            {/* Título em destaque centralizado */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Clientas que quiseram deixar sua opinião sobre o material!
            </h2>
          </div>

          {/* Grid de Cards Responsivo (3 colunas no desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {productTestimonials.map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-pink-100/70 shadow-lg shadow-pink-500/5 p-6 sm:p-7 flex flex-col items-center text-center transition-all hover:shadow-xl hover:-translate-y-1 group"
              >
                {/* 1. Foto de perfil redonda da cliente no topo */}
                <div className="relative mb-3.5">
                  {testimonial.avatar ? (
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-20 h-20 sm:w-22 sm:h-22 rounded-full object-cover shadow-md border-2 border-white ring-4 ring-pink-50 group-hover:ring-pink-100 transition-all"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-pink-400 to-rose-500 text-white font-black flex items-center justify-center text-lg shadow-md border-2 border-white ring-4 ring-pink-50">
                      {testimonial.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* 2. Nome Completo */}
                <h3 className="font-bold text-slate-900 text-base sm:text-lg mb-1">
                  {testimonial.name}
                </h3>

                {/* 3. Avaliação de 5 Estrelas Douradas */}
                <div className="flex items-center justify-center gap-1 text-amber-400 mb-3">
                  {[...Array(testimonial.rating || 5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* 4. Texto de Depoimento em Destaque */}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal text-center">
                  “{testimonial.text}”
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* SEÇÃO: GARANTA SEU ACESSO HOJE (TABELA DE PREÇOS / OFERTA)   */}
        {/* ============================================================ */}
        <section id="planos-acesso" className="py-6 sm:py-10 space-y-8 scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="flex items-center justify-center gap-2.5">
              <span className="text-3xl sm:text-4xl select-none" role="img" aria-label="Saco de dinheiro">
                💰
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Garanta seu acesso hoje
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Acesso imediato após confirmar o pagamento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto items-stretch">
            
            {/* 1. CARD PLANO BÁSICO */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-100 p-6 sm:p-9 flex flex-col justify-between hover:shadow-2xl transition-all">
              <div>
                {/* Header do Card */}
                <div className="text-center space-y-2 pb-6 border-b border-slate-100">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-900">
                    {planDetails.basic.name}
                  </h3>
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight">
                    {formatCurrency(planDetails.basic.price)}
                  </div>
                  <p className="text-xs text-slate-400 font-semibold">
                    Pagamento único
                  </p>
                </div>

                {/* Lista de Recursos com Ícone Scalloped Rosa */}
                <ul className="py-7 space-y-3.5">
                  {planDetails.basic.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                      <svg className="w-5 h-5 text-[#f43f5e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                      </svg>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Botão de Ação Básico */}
              <button
                type="button"
                onClick={() => handleSelectPlan('basic')}
                className="w-full py-4 px-6 bg-gradient-to-r from-[#ec4899] via-[#f43f5e] to-[#fb7185] hover:opacity-95 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all group"
              >
                <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                <span>{planDetails.basic.buttonText}</span>
              </button>
            </div>

            {/* 2. CARD PLANO COMPLETO (MAIS POPULAR) */}
            <div className="relative bg-white rounded-[32px] border-2 border-[#f43f5e] shadow-2xl shadow-pink-500/15 p-6 sm:p-9 flex flex-col justify-between hover:shadow-pink-500/25 transition-all">
              
              {/* Badge Superior "MAIS POPULAR" */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-[#ec4899] via-[#f43f5e] to-[#fb7185] text-white shadow-md select-none">
                {planDetails.complete.badge}
              </div>

              <div>
                {/* Header do Card */}
                <div className="text-center space-y-2 pb-6 border-b border-slate-100 pt-1 sm:pt-0">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-900">
                    {planDetails.complete.name}
                  </h3>
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#f43f5e] tracking-tight">
                    {formatCurrency(planDetails.complete.price)}
                  </div>
                  <p className="text-xs text-slate-400 font-semibold">
                    Pagamento único
                  </p>
                </div>

                {/* Lista de Recursos Completa com Ícone Scalloped Rosa */}
                <ul className="py-7 space-y-3.5">
                  {planDetails.complete.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                      <svg className="w-5 h-5 text-[#f43f5e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                      </svg>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Botão de Ação Completo */}
              <button
                type="button"
                onClick={() => handleSelectPlan('complete')}
                className="w-full py-4 px-6 bg-gradient-to-r from-[#ec4899] via-[#f43f5e] to-[#fb7185] hover:opacity-95 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all group"
              >
                <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                <span>{planDetails.complete.buttonText}</span>
              </button>
            </div>

          </div>
        </section>

        {/* ============================================================ */}
        {/* SEÇÃO 5: GARANTIA INCONDICIONAL (Risco Zero)                 */}
        {/* ============================================================ */}
        <section className="bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center mx-auto shadow-md">
              <Award className="w-8 h-8" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Garantia Incondicional de {guaranteeDays} Dias
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              O seu risco é absolutamente zero! Se dentro do prazo de {guaranteeDays} dias você achar que este material não atendeu suas expectativas, basta nos enviar uma mensagem no WhatsApp ou E-mail que devolveremos 100% do seu dinheiro, sem burocracia.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleBuyNow}
                className="inline-flex items-center gap-2 py-3.5 px-8 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer hover:scale-103"
              >
                <span>Garantir com Risco Zero</span>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SEÇÃO 6: PERGUNTAS FREQUENTES (FAQ)                          */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-theme-primary">
              TIRE SUAS DÚVIDAS
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Perguntas Frequentes
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Respostas rápidas para as principais dúvidas sobre este produto.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {productFaq.map((faqItem, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-4 sm:p-5 text-left font-bold text-slate-900 text-xs sm:text-sm flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70"
                  >
                    <span className="flex items-center gap-2.5">
                      <HelpCircle className="w-4 h-4 text-theme-primary flex-shrink-0" />
                      {faqItem.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                      {faqItem.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ============================================================ */}
        {/* SEÇÃO 7: CTA FINAL DE FECHAMENTO                             */}
        {/* ============================================================ */}
        <section className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-5 shadow-sm max-w-2xl mx-auto">
          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Pronta para transformar suas encomendas?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
              Garanta agora o seu acesso a <strong>{product.name}</strong> por apenas{' '}
              <span className="font-bold text-slate-950">{formatCurrency(price)}</span> e comece a produzir e vender hoje mesmo!
            </p>
          </div>

          <button
            type="button"
            onClick={handleBuyNow}
            className="w-full sm:w-auto py-4 px-10 bg-theme-primary hover:bg-theme-primary-hover text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-theme-primary/25 hover:shadow-2xl hover:scale-102 active:scale-98 transition-all cursor-pointer"
          >
            ❖ LIBERAR MEU ACESSO IMEDIATO
          </button>
        </section>

      </main>

      {/* ============================================================ */}
      {/* 4. BARRA FIXA INFERIOR NO MOBILE (STICKY CTA BAR)            */}
      {/* ============================================================ */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 px-4 shadow-xl flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 font-semibold uppercase">Preço especial:</span>
          <span className="text-lg font-black text-slate-950 tracking-tight leading-none">
            {formatCurrency(price)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleBuyNow}
          className="flex-1 py-3 px-4 bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>COMPRAR AGORA</span>
        </button>
      </div>

      {/* Overlays e Modais */}
      <CartDrawer />
      <CheckoutModal />
      <PaymentFeedbackModal />
      <Toast />
      <FloatingWhatsApp />

      {/* Rodapé Exclusivo da Landing Page (Sem o Rodapé do Site Principal) */}
      <footer className="mt-16 py-8 border-t border-slate-200 bg-white/80 text-center text-xs text-slate-500 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-6 text-slate-600 font-semibold text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Compra 100% Segura
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Acesso Imediato aos Arquivos
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-theme-primary" />
            Pagamento Seguro via Mercado Pago
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          © {new Date().getFullYear()} {storeConfig.name || currentStore?.name || 'Editáveis do Canva'}. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
};

export default ProductLandingPage;
