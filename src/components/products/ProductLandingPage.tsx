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
import { Header } from '../layout/Header';
import { Footer } from '../layout/Footer';
import { Toast } from '../common/Toast';
import { CartDrawer } from '../cart/CartDrawer';
import { CheckoutModal } from '../cart/CheckoutModal';
import { PaymentFeedbackModal } from '../cart/PaymentFeedbackModal';
import { FloatingWhatsApp } from '../layout/FloatingWhatsApp';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';
import { ScarcityCountdownBanner } from '../common/ScarcityCountdownBanner';
import { DEFAULT_TESTIMONIALS } from '../../data/defaultTestimonials';

interface ProductLandingPageProps {
  productId?: string;
  onBack?: () => void;
}

export const ProductLandingPage: React.FC<ProductLandingPageProps> = ({ 
  productId: propId, 
  onBack: propOnBack 
}) => {
  const { slug: routeSlug, id: routeId, storeSlug } = useParams<{ slug?: string; id?: string; storeSlug?: string }>();
  const navigate = useNavigate();
  const { storeConfig, showNotification } = useStoreData();
  const { currentStore } = useTenant();
  const { addToCart, openCart, openCheckout } = useCart();

  const slug = (propId || routeSlug || routeId || '').trim();

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

  // Carregamento resiliente do produto por slug ou ID
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
      if (!currentStore?.id || currentStore.id === '__resolving_tenant__') {
        return;
      }

      try {
        const storeId = currentStore.id;
        const { data, error } = await fetchProductByIdOrSlug(slug, storeId);

        if (isMounted) {
          if (data) {
            setProduct(data);
          } else {
            setProduct(null);
          }
        }
      } catch (err) {
        console.error('[ProductLandingPage] Erro ao carregar produto:', err);
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
  }, [slug, currentStore?.id]);

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

  // AÇÃO PRINCIPAL: COMPRA / CHECKOUT DE ALTA CONVERSÃO
  const handleBuyNow = () => {
    if (!product) return;

    // 1. Se houver link de checkout próprio especificado pelo lojista (Kiwify, Hotmart, etc.)
    const customCheckout = (product.checkout_url || product.checkoutUrl || '').trim();
    if (customCheckout) {
      try {
        const targetUrl = customCheckout.startsWith('http') ? customCheckout : `https://${customCheckout}`;
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return;
      } catch (e) {
        console.warn('Erro ao abrir link de checkout próprio:', e);
      }
    }

    // 2. Fluxo Nativo Unificado: coloca no carrinho e abre o checkout integrado imediato
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

  // Benefícios estruturados (vindos do banco ou lista inteligente de alta conversão)
  const productBenefits = useMemo(() => {
    if (product?.benefits) {
      if (Array.isArray(product.benefits) && product.benefits.length > 0) {
        return product.benefits;
      }
      if (typeof product.benefits === 'string' && product.benefits.trim()) {
        return product.benefits.split('\n').map((s) => s.trim()).filter(Boolean);
      }
    }

    return [
      `Acesso 100% vitalício e imediato aos arquivos de ${product?.name || 'alta resolução'}`,
      'Modelos totalmente editáveis no Canva (gratuito ou pro)',
      'Prontos para impressão em alta definição (300 DPI)',
      'Economize horas de trabalho na criação e comece a vender hoje mesmo',
      'Suporte humanizado e envio automático no seu WhatsApp e E-mail'
    ];
  }, [product]);

  // Depoimentos estruturados (vindos do banco ou depoimentos de prova social padrão)
  const productTestimonials = useMemo(() => {
    if (product?.testimonials && Array.isArray(product.testimonials) && product.testimonials.length > 0) {
      return product.testimonials;
    }
    return DEFAULT_TESTIMONIALS;
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
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
          <Loader2 className="w-12 h-12 animate-spin text-theme-primary mb-4" />
          <p className="text-base font-bold text-slate-700">Carregando página do produto...</p>
          <p className="text-xs text-slate-400 mt-1">Preparando a melhor oferta para você</p>
        </main>
        <Footer />
      </div>
    );
  }

  // Estado Não Encontrado
  if (!product) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-slate-50 text-slate-900">
        <Header />
        <main className="flex-1 max-w-md mx-auto flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[400px]">
          <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-2 shadow-inner">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Produto não encontrado</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            O link do produto pode ter expirado ou o produto foi removido do catálogo.
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="w-full py-3.5 px-6 bg-slate-950 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg transition-all cursor-pointer"
          >
            Voltar para a Página Inicial
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  const shareLink = getProductShareUrl(product);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#FAF9F6] text-slate-900 font-sans selection:bg-theme-primary selection:text-white pb-20 sm:pb-0">
      
      {/* 1. Barra de Aviso de Escassez com Cronômetro Regressivo no Topo Absoluto */}
      <ScarcityCountdownBanner />

      {/* 2. Header Oficial da Loja */}
      <Header isSticky={false} />

      {/* 3. Container Principal da Landing Page */}
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
              
              {/* Categoria / Tags */}
              <div className="space-y-1.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-theme-primary">
                  {product.category || 'Arquivos Digitais & Papelaria'}
                </span>
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
        {/* SEÇÃO 2: O QUE VOCÊ VAI RECEBER (Benefícios & Destaques)      */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-theme-primary">
              TUDO INCLUSO
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              O que você vai receber neste produto:
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Arquivos profissionais prontos para uso e com direito a personalização total.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productBenefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-start gap-3.5"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{benefit}</h4>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* SEÇÃO 3: DESCRIÇÃO DETALHADA                                 */}
        {/* ============================================================ */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 space-y-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <FileText className="w-6 h-6 text-theme-primary" />
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              Detalhes e Descrição do Produto
            </h3>
          </div>

          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line space-y-4">
            {product.detailed_description || product.detailedDescription || product.description || (
              <>
                <p>
                  Projetado especialmente para atender artesãs, designers de festas e apaixonadas por papelaria personalizada que buscam encantar seus clientes com artes exclusivas e de altíssima qualidade visual.
                </p>
                <p>
                  Com este modelo, você não precisa começar do zero. O arquivo já vem estruturado no Canva com camadas organizadas, facilitando a troca de nomes, datas, cores e fotos de forma simples e rápida.
                </p>
                <p>
                  Ideal para criação de kits de lembrancinhas, festas temáticas infantis, eventos e decorações que vendem o ano todo com excelente margem de lucro.
                </p>
              </>
            )}
          </div>
        </section>

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

      {/* Footer Oficial */}
      <Footer />
    </div>
  );
};

export default ProductLandingPage;
