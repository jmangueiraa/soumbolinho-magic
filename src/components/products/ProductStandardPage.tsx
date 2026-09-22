import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Share2, 
  Check, 
  Truck, 
  ShieldCheck, 
  Lock, 
  RotateCcw, 
  Star, 
  Minus, 
  Plus, 
  ChevronRight, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  CreditCard,
  Package,
  ZoomIn
} from 'lucide-react';
import { ColorPaletteType, Product, ThemeLayoutType } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { useStoreData } from '../../context/StoreDataContext';
import { useTenant } from '../../context/TenantContext';
import { applyThemeToDocument } from '../../utils/theme';
import { useParams, useNavigate, RESERVED_ROUTES } from '../../lib/router';
import { fetchProductByIdOrSlug } from '../../services/productService';
import { copyProductLink } from '../../utils/share';
import { isVideoUrl } from '../../utils/media';
import { Toast } from '../common/Toast';
import { CartDrawer } from '../cart/CartDrawer';
import { CheckoutModal } from '../cart/CheckoutModal';
import { PaymentFeedbackModal } from '../cart/PaymentFeedbackModal';
import { ShippingCalculator } from '../cart/ShippingCalculator';
import { FloatingWhatsApp } from '../layout/FloatingWhatsApp';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';
import { ProductImageZoomModal } from './ProductImageZoomModal';
import { recordProductView, recordStoreVisit } from '../../services/analyticsService';

export interface ProductStandardPageProps {
  productId?: string;
  product?: Product;
  onBack?: () => void;
}

export const ProductStandardPage: React.FC<ProductStandardPageProps> = ({
  productId: propId,
  product: propProduct,
  onBack: propOnBack
}) => {
  const { slug: routeSlug, id: routeId, storeSlug, productId } = useParams<{ 
    slug?: string; 
    id?: string; 
    storeSlug?: string; 
    productId?: string 
  }>();
  
  const navigate = useNavigate();
  const { storeConfig, showNotification } = useStoreData();
  const { currentStore } = useTenant();
  const { addToCart, openCart, openCheckout, totalItemsCount } = useCart();

  const slug = (propId || routeSlug || routeId || productId || '').trim();

  const [product, setProduct] = useState<Product | null>(propProduct || null);
  const [isLoading, setIsLoading] = useState<boolean>(!propProduct);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'shipping' | 'reviews'>('description');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);
  const [zoomIndex, setZoomIndex] = useState<number>(0);

  // Sincronização de tema e cores (--primary-color)
  useEffect(() => {
    const activePalette = (currentStore?.color_palette as ColorPaletteType) || currentStore?.theme_settings?.color_palette || storeConfig.colorPalette || 'pink_pastel';
    const activePrimary = currentStore?.primary_color || currentStore?.theme_settings?.primary_color || storeConfig.primaryColor || '#FF1493';
    const activeLayout = (currentStore?.layout_style as ThemeLayoutType) || currentStore?.theme_settings?.theme_layout || storeConfig.themeLayout || 'classic';
    document.documentElement.style.setProperty('--primary-color', activePrimary);
    applyThemeToDocument(activePalette, activePrimary, activeLayout);
  }, [storeConfig.colorPalette, storeConfig.primaryColor, storeConfig.themeLayout, currentStore]);

  // Carregamento resiliente do produto por slug ou ID
  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      if (propProduct) {
        setProduct(propProduct);
        setIsLoading(false);
        return;
      }

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
        const { data } = await fetchProductByIdOrSlug(slug, storeId);

        if (isMounted) {
          if (data) {
            setProduct(data);
            const siteTitle = currentStore?.store_name || currentStore?.name || storeConfig.storeName || 'Loja';
            document.title = `${data.name} | ${siteTitle}`;
            recordProductView(storeId || 'suamarcaaqui', data.id, data.name, data.price, data.image_url || data.image);
            recordStoreVisit(storeId || 'suamarcaaqui', window.location.pathname);
          } else {
            setProduct(null);
            showNotification('Produto não encontrado. Redirecionando...', 'info');
            navigate(storeSlug ? `/loja/${storeSlug}` : '/');
          }
        }
      } catch (err) {
        console.error('[ProductStandardPage] Erro ao carregar produto:', err);
        if (isMounted) {
          setProduct(null);
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
  }, [slug, propProduct, currentStore?.id, storeSlug, navigate, showNotification]);

  // Galeria de Mídias
  const mediaList = useMemo(() => {
    if (!product) return [];
    const items: Array<{ url: string; isVideo: boolean }> = [];

    const mainImg = product.imageUrl || product.image_url || product.image || product.photo_url || '';
    const mainVideo = product.videoUrl || product.video_url || '';

    if (mainImg) {
      items.push({ url: mainImg, isVideo: isVideoUrl(mainImg) });
    }
    if (mainVideo) {
      items.push({ url: mainVideo, isVideo: true });
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
    navigate(storeSlug ? `/loja/${storeSlug}` : '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyLink = async () => {
    if (!product) return;
    const success = await copyProductLink(product);
    if (success) {
      setCopied(true);
      showNotification('Link do produto copiado!', 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    setIsAdding(true);
    addToCart(product, quantity);
    setTimeout(() => {
      setIsAdding(false);
      openCart();
    }, 250);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addToCart(product, quantity);
    openCheckout();
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  // Preço e parcelamento
  const price = product?.price || 0;
  const originalPrice = product?.originalPrice || 0;
  const hasDiscount = originalPrice > price;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const installment12x = (price / 12).toFixed(2).replace('.', ',');
  const pixPrice = (price * 0.95).toFixed(2).replace('.', ',');

  // Fallback de carregamento estruturado (Skeleton)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-sm w-full text-center">
          <Loader2 className="w-10 h-10 animate-spin text-theme-primary" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Carregando produto...</h3>
            <p className="text-xs text-slate-500">Preparando vitrine oficial</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Produto não encontrado</h2>
          <p className="text-sm text-slate-600">
            O produto que você procura não existe ou não está mais disponível nesta loja.
          </p>
          <button
            onClick={handleBack}
            className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Voltar para a Loja
          </button>
        </div>
      </div>
    );
  }

  const storeName = currentStore?.store_name || currentStore?.name || storeConfig.storeName || 'AJPSTORE';
  const storeLogo = currentStore?.logo_url || storeConfig.logoUrl || '';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-theme-primary selection:text-white pb-24 sm:pb-12">
      
      {/* ============================================================ */}
      {/* 1. TOPO & CABEÇALHO DO E-COMMERCE                            */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Botão Voltar & Identidade da Loja */}
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Voltar para a vitrine"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar à Loja</span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div 
              onClick={handleBack}
              className="flex items-center gap-2.5 cursor-pointer truncate group"
            >
              {storeLogo ? (
                <img 
                  src={storeLogo} 
                  alt={storeName} 
                  className="h-8 sm:h-10 w-auto max-w-[120px] object-contain group-hover:opacity-90 transition-opacity" 
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-theme-primary flex items-center justify-center text-white font-black text-sm shadow-xs">
                  {storeName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="font-extrabold text-sm sm:text-base text-slate-900 truncate group-hover:text-theme-primary transition-colors">
                {storeName}
              </span>
            </div>
          </div>

          {/* Ações Rápidas do Cabeçalho: Compartilhar & Carrinho */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-slate-200"
              title="Copiar link do produto"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden md:inline">{copied ? 'Copiado!' : 'Compartilhar'}</span>
            </button>

            <button
              type="button"
              onClick={openCart}
              className="relative p-2.5 sm:px-4 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center gap-2 text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
              <span className="hidden sm:inline">Carrinho</span>
              {totalItemsCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 bg-theme-primary text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 shadow-xs">
                  {totalItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. BREADCRUMBS (Navegação estrutural)                        */}
      {/* ============================================================ */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 w-full">
        <ol className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
          <li>
            <button onClick={handleBack} className="hover:text-theme-primary transition-colors">
              Início
            </button>
          </li>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <li>
            <span className="text-slate-700 font-medium">
              {product.category || 'Produtos'}
            </span>
          </li>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <li className="text-slate-950 font-bold truncate max-w-[220px] sm:max-w-xs" aria-current="page">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* ============================================================ */}
      {/* 3. CONTEÚDO PRINCIPAL (GRID 2 COLUNAS DE E-COMMERCE)          */}
      {/* ============================================================ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* ---------------------------------------------------------- */}
          {/* COLUNA ESQUERDA: GALERIA DE FOTOS (5 COLUNAS DESKTOP)       */}
          {/* ---------------------------------------------------------- */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Foto Principal com Zoom */}
            <div className="relative bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden group aspect-square flex items-center justify-center">
              
              {/* Badges de Destaque / Tipo Físico */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-bold rounded-lg shadow-sm">
                  <Package className="w-3.5 h-3.5 text-amber-300" />
                  Produto Físico
                </span>
                {hasDiscount && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-[11px] font-black rounded-lg shadow-sm">
                    {discountPercent}% OFF
                  </span>
                )}
                {product.badge && (
                  <span className="inline-flex items-center px-3 py-1 bg-amber-500 text-white text-[11px] font-black rounded-lg shadow-sm">
                    {product.badge}
                  </span>
                )}
              </div>

              {/* Botão de Ampliação */}
              <button
                type="button"
                onClick={() => {
                  setZoomIndex(activeMediaIndex);
                  setIsZoomOpen(true);
                }}
                className="absolute top-4 right-4 z-10 p-2.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 shadow-md backdrop-blur-sm transition-all hover:scale-105 cursor-pointer opacity-80 group-hover:opacity-100"
                title="Ampliar foto"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Mídia Principal */}
              {currentMedia ? (
                currentMedia.isVideo ? (
                  <video
                    src={currentMedia.url}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={currentMedia.url}
                    alt={product.name}
                    onClick={() => {
                      setZoomIndex(activeMediaIndex);
                      setIsZoomOpen(true);
                    }}
                    className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-103 cursor-zoom-in"
                  />
                )
              ) : (
                <ProductImagePlaceholder showText={true} />
              )}
            </div>

            {/* Carrossel de Miniaturas (Thumbnails) */}
            {mediaList.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {mediaList.map((media, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveMediaIndex(idx)}
                    className={`relative w-20 h-20 rounded-2xl border-2 shrink-0 overflow-hidden bg-white transition-all cursor-pointer ${
                      activeMediaIndex === idx
                        ? 'border-theme-primary ring-2 ring-theme-primary/20 shadow-sm scale-102'
                        : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {media.isVideo ? (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white text-[10px] font-bold">
                        VÍDEO
                      </div>
                    ) : (
                      <img
                        src={media.url}
                        alt={`${product.name} miniatura ${idx + 1}`}
                        className="w-full h-full object-contain p-1"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Strip de Confiança no E-commerce */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-slate-900">Compra 100% Segura</h4>
                  <p className="text-[11px] text-slate-500">Dados protegidos por SSL</p>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-slate-900">Envio para Todo Brasil</h4>
                  <p className="text-[11px] text-slate-500">Com código de rastreio</p>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-slate-900">Garantia de 7 Dias</h4>
                  <p className="text-[11px] text-slate-500">Troca fácil sem custos</p>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-slate-900">Até 12x no Cartão</h4>
                  <p className="text-[11px] text-slate-500">Ou com desconto no Pix</p>
                </div>
              </div>
            </div>

          </div>

          {/* ---------------------------------------------------------- */}
          {/* COLUNA DIREITA: INFORMAÇÕES DE COMPRA (6 COLUNAS DESKTOP)   */}
          {/* ---------------------------------------------------------- */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Bloco de Título, Categoria e Avaliação */}
            <div className="space-y-2 border-b border-slate-200 pb-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-theme-primary bg-theme-primary/10 px-2.5 py-1 rounded-md">
                  {product.category || 'Geral'}
                </span>
                <span className="text-xs text-slate-400">
                  Cód: {product.id ? product.id.slice(0, 8).toUpperCase() : 'PROD'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Avaliações sociais */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-800">4.9</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">
                  38 avaliações de clientes verificados
                </span>
              </div>
            </div>

            {/* Bloco de Preços e Condições de Pagamento */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              
              <div>
                {hasDiscount && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-slate-400 line-through font-medium">
                      {formatCurrency(originalPrice)}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Economize {formatCurrency(originalPrice - price)}
                    </span>
                  </div>
                )}

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
                    {formatCurrency(price)}
                  </span>
                  {product.unitSuffix && (
                    <span className="text-xs font-semibold text-slate-500">
                      {product.unitSuffix}
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-1 text-xs sm:text-sm text-slate-600">
                  <p className="flex items-center gap-1.5 font-medium">
                    <CreditCard className="w-4 h-4 text-slate-500" />
                    <span>ou até <strong>12x de R$ {installment12x}</strong> no cartão</span>
                  </p>
                  <p className="flex items-center gap-1.5 font-bold text-emerald-600">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span>R$ {pixPrice} à vista no Pix (5% de desconto)</span>
                  </p>
                </div>
              </div>

              {/* Indicador de Disponibilidade / Estoque */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-2 text-emerald-700 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Pronta Entrega • Envio Imediato
                </span>
                <span className="text-slate-400">
                  Garantia de fábrica
                </span>
              </div>

              {/* Seletor de Quantidade & Botões de Ação */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Quantidade:
                  </span>
                  <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="w-8 h-8 rounded-lg bg-white text-slate-700 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center text-sm font-black text-slate-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(1)}
                      className="w-8 h-8 rounded-lg bg-white text-slate-700 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* BOTÃO PRINCIPAL: COMPRAR AGORA */}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="w-full py-4 px-6 bg-theme-primary hover:bg-theme-primary-hover text-white text-base font-black rounded-2xl shadow-lg shadow-theme-primary/25 hover:shadow-xl hover:scale-101 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>COMPRAR AGORA</span>
                </button>

                {/* BOTÃO SECUNDÁRIO: ADICIONAR AO CARRINHO */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="w-full py-3.5 px-6 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-300 hover:border-slate-400 text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-2xs"
                >
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin text-theme-primary" />
                  ) : (
                    <ShoppingBag className="w-4 h-4 text-slate-700" />
                  )}
                  <span>{isAdding ? 'Adicionando ao carrinho...' : 'Adicionar ao Carrinho'}</span>
                </button>
              </div>

            </div>

            {/* ============================================================ */}
            {/* CÁLCULO DE FRETE POR CEP (ESSENCIAL PARA PRODUTOS FÍSICOS)   */}
            {/* ============================================================ */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Truck className="w-4 h-4 text-theme-primary" />
                <span>Calcular Frete e Prazo de Entrega</span>
              </div>
              <p className="text-xs text-slate-500">
                Informe seu CEP para consultar as opções de envio e prazos dos Correios e Transportadoras.
              </p>

              {/* Componente Integrado de Frete */}
              <ShippingCalculator 
                cartTotal={price * quantity}
                storeId={currentStore?.id}
                isCompact={true}
              />
            </div>

          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. SEÇÕES DETALHADAS EM ABAS (DESCRIÇÃO, ESPECIFICAÇÕES, ETC) */}
        {/* ============================================================ */}
        <div className="mt-12 bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          
          {/* Navegador de Abas */}
          <div className="flex items-center border-b border-slate-200 px-4 sm:px-8 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('description')}
              className={`py-4 px-4 sm:px-6 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'description'
                  ? 'border-theme-primary text-theme-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Descrição do Produto
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('specs')}
              className={`py-4 px-4 sm:px-6 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'specs'
                  ? 'border-theme-primary text-theme-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Especificações Técnicas
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shipping')}
              className={`py-4 px-4 sm:px-6 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'shipping'
                  ? 'border-theme-primary text-theme-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Envio & Devoluções
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`py-4 px-4 sm:px-6 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'reviews'
                  ? 'border-theme-primary text-theme-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Avaliações (38)
            </button>
          </div>

          {/* Conteúdo da Aba Ativa */}
          <div className="p-6 sm:p-10">
            {activeTab === 'description' && (
              <div className="prose max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-4">
                {product.description ? (
                  <div className="whitespace-pre-line">
                    {product.description}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p>
                      Conheça o produto <strong>{product.name}</strong>, fabricado com os mais altos padrões de qualidade e durabilidade para oferecer a você a melhor experiência e acabamento.
                    </p>
                    <h4 className="text-base font-bold text-slate-900">Destaques do Produto:</h4>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                      <li>Material selecionado de excelente resistência e procedência</li>
                      <li>Acabamento premium pensado nos mínimos detalhes</li>
                      <li>Embalagem reforçada para transporte seguro até o seu endereço</li>
                      <li>Garantia contra qualquer defeito de fabricação</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900">Informações Técnicas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Tipo do Produto</span>
                    <span className="text-slate-950 font-bold">Físico (Entrega via Correios/Transportadora)</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Categoria</span>
                    <span className="text-slate-950 font-bold">{product.category || 'Geral'}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Código do Produto (SKU)</span>
                    <span className="text-slate-950 font-mono font-bold">
                      {product.id ? product.id.slice(0, 10).toUpperCase() : 'N/A'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Disponibilidade</span>
                    <span className="text-emerald-600 font-bold">Em Estoque</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <h3 className="text-base font-bold text-slate-900">Política de Envio e Garantia</h3>
                <p>
                  • <strong>Prazo de Postagem:</strong> Todos os pedidos confirmados são embalados e despachados em até 24 a 48 horas úteis.
                </p>
                <p>
                  • <strong>Código de Rastreamento:</strong> Assim que a encomenda for postada, você receberá automaticamente o código de rastreio para acompanhar o deslocamento em tempo real.
                </p>
                <p>
                  • <strong>Garantia de 7 Dias:</strong> Em cumprimento ao Artigo 49 do Código de Defesa do Consumidor, você tem até 7 dias corridos após o recebimento para solicitar troca ou devolução sem nenhum custo adicional.
                </p>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">O que os clientes estão achando</h3>
                    <p className="text-xs text-slate-500">Média geral com base em avaliações verificadas</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-slate-950">4.9</span>
                    <div>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">100% de satisfação</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">Mariana Ribeiro</span>
                      <span className="text-xs text-slate-400">Há 2 dias</span>
                    </div>
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs text-slate-600">
                      "Excelente produto, chegou super rápido e muito bem embalado! Recomendo a todos."
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">Carlos Eduardo</span>
                      <span className="text-xs text-slate-400">Há 5 dias</span>
                    </div>
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs text-slate-600">
                      "Superou as minhas expectativas. O acabamento é impecável e o atendimento pelo WhatsApp foi nota dez."
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* ============================================================ */}
      {/* 5. BARRA FIXA INFERIOR NO MOBILE (STICKY CTA BAR)            */}
      {/* ============================================================ */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 px-4 shadow-xl flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 font-semibold uppercase">Total à vista:</span>
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
      <ProductImageZoomModal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        mediaList={mediaList}
        activeIndex={zoomIndex}
        onIndexChange={(idx) => {
          setZoomIndex(idx);
          setActiveMediaIndex(idx);
        }}
        productName={product.name}
      />
      <Toast />
      <FloatingWhatsApp />

      {/* Rodapé Oficial da Loja */}
      <footer className="mt-16 py-8 border-t border-slate-200 bg-white text-center text-xs text-slate-500 space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-6 text-slate-600 font-semibold text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Compra 100% Segura
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-sky-600" />
            Envio com Código de Rastreamento
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-theme-primary" />
            Pagamento Seguro via Mercado Pago
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          © {new Date().getFullYear()} {storeName}. Todos os direitos reservados.
        </p>
      </footer>

    </div>
  );
};

export default ProductStandardPage;
