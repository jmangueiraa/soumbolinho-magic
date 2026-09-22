import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { ProductLandingPage } from './ProductLandingPage';
import { ProductStandardPage } from './ProductStandardPage';
import { useParams, useNavigate, RESERVED_ROUTES } from '../../lib/router';
import { fetchProductByIdOrSlug } from '../../services/productService';
import { useTenant, normalizeStore } from '../../context/TenantContext';
import { useStoreData } from '../../context/StoreDataContext';
import { supabase } from '../../lib/supabase';
import { applyThemeToDocument } from '../../utils/theme';
import { Loader2, AlertCircle } from 'lucide-react';

export interface ProductDetailsProps {
  productId?: string;
  product?: Product;
  onBack?: () => void;
}

/**
 * ProductDetails é o roteador dinâmico de produtos da plataforma AJPSTORE:
 * - Resolve o escopo de loja (multi-tenant) a partir da rota ou do tenant atual.
 * - Aplica as cores, logo e tema da loja dinamicamente.
 * - Busca o produto de forma resiliente por slug ou ID no Supabase.
 * - REGRA DE NEGÓCIO CONDICIONAL:
 *   - Se o produto for DIGITAL (product_type === 'digital' ou is_digital === true):
 *     Renderiza a Landing Page de Alta Conversão (ProductLandingPage).
 *   - Se o produto for FÍSICO (product_type === 'fisico' ou padrão físico):
 *     Renderiza a Página Tradicional de E-commerce (ProductStandardPage), com galeria,
 *     seletor de quantidade, cálculo de frete por CEP, especificações e botões de compra.
 */
export const ProductDetails: React.FC<ProductDetailsProps> = ({
  productId: propProductId,
  product: propProduct,
  onBack: propOnBack
}) => {
  const { slug, id, productId, storeSlug } = useParams<{
    slug?: string;
    id?: string;
    productId?: string;
    storeSlug?: string;
  }>();

  const navigate = useNavigate();
  const { currentStore, switchStore } = useTenant();
  const { storeConfig, showNotification } = useStoreData();

  // 1. Determinação da loja e do identificador do produto a partir da rota
  const effectiveStoreSlug = (storeSlug || (slug && (productId || id) ? slug : '') || '').trim();
  const resolvedProductIdentifier = (propProductId || productId || id || (!effectiveStoreSlug ? slug : '') || '').trim();

  const [product, setProduct] = useState<Product | null>(propProduct || null);
  const [isLoading, setIsLoading] = useState<boolean>(!propProduct);
  const [error, setError] = useState<string | null>(null);

  // 2. Sincronização e Resolução de Loja (se acessado por rota direta com slug de loja)
  useEffect(() => {
    let isCancelled = false;

    async function syncStoreTenant() {
      if (!effectiveStoreSlug || RESERVED_ROUTES.includes(effectiveStoreSlug.toLowerCase())) {
        return;
      }

      // Se a loja atual já é a loja da URL, apenas garante o tema
      if (
        currentStore?.slug?.toLowerCase() === effectiveStoreSlug.toLowerCase() || 
        currentStore?.id?.toLowerCase() === effectiveStoreSlug.toLowerCase()
      ) {
        return;
      }

      try {
        console.log(`[ProductDetails] 🏬 Sincronizando escopo de loja por slug da URL: "${effectiveStoreSlug}"`);
        const { data: storeRow } = await supabase
          .from('stores')
          .select('*')
          .or(`slug.ilike.${effectiveStoreSlug},id.ilike.${effectiveStoreSlug}`)
          .maybeSingle();

        if (storeRow && !isCancelled) {
          const normalized = normalizeStore(storeRow);
          switchStore(normalized);

          // Aplicação imediata de cores da loja
          const activePalette = normalized.color_palette || normalized.theme_settings?.color_palette || 'pink_pastel';
          const activePrimary = normalized.primary_color || normalized.theme_settings?.primary_color || '#FF1493';
          const activeLayout = normalized.layout_style || normalized.theme_settings?.theme_layout || 'classic';
          document.documentElement.style.setProperty('--primary-color', activePrimary);
          applyThemeToDocument(activePalette, activePrimary, activeLayout);
        }
      } catch (err) {
        console.warn('[ProductDetails] Aviso ao sincronizar loja da URL:', err);
      }
    }

    syncStoreTenant();

    return () => {
      isCancelled = true;
    };
  }, [effectiveStoreSlug, currentStore?.slug, currentStore?.id, switchStore]);

  // 3. Consulta do Produto no Supabase
  useEffect(() => {
    let isMounted = true;

    async function loadTargetProduct() {
      if (propProduct) {
        setProduct(propProduct);
        setIsLoading(false);
        return;
      }

      if (!resolvedProductIdentifier || RESERVED_ROUTES.includes(resolvedProductIdentifier.toLowerCase())) {
        if (isMounted) {
          setIsLoading(false);
          setProduct(null);
          navigate(effectiveStoreSlug ? `/loja/${effectiveStoreSlug}` : '/');
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const storeId = currentStore?.id && currentStore.id !== '__resolving_tenant__' ? currentStore.id : '';
        const { data } = await fetchProductByIdOrSlug(resolvedProductIdentifier, storeId);

        if (isMounted) {
          if (data) {
            setProduct(data);
            const siteTitle = currentStore?.store_name || currentStore?.name || storeConfig.storeName || 'Loja';
            document.title = `${data.name} | ${siteTitle}`;
          } else {
            setProduct(null);
            setError('Produto não encontrado.');
            showNotification('Produto não encontrado. Redirecionando para a loja...', 'info');
            navigate(effectiveStoreSlug ? `/loja/${effectiveStoreSlug}` : '/');
          }
        }
      } catch (err: any) {
        console.error('[ProductDetails] Erro ao buscar produto:', err);
        if (isMounted) {
          setProduct(null);
          setError('Erro ao carregar produto.');
          navigate(effectiveStoreSlug ? `/loja/${effectiveStoreSlug}` : '/');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTargetProduct();

    return () => {
      isMounted = false;
    };
  }, [resolvedProductIdentifier, propProduct, currentStore?.id, effectiveStoreSlug, navigate, showNotification, storeConfig.storeName]);

  // 4. Estado de Carregamento (Skeleton / Spinner suave)
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

  // 5. Estado de Produto não encontrado
  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Produto não encontrado</h2>
          <p className="text-sm text-slate-600">
            {error || 'O produto que você procura não está disponível nesta loja.'}
          </p>
          <button
            onClick={() => {
              if (propOnBack) {
                propOnBack();
              } else {
                navigate(effectiveStoreSlug ? `/loja/${effectiveStoreSlug}` : '/');
              }
            }}
            className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Voltar para a Loja
          </button>
        </div>
      </div>
    );
  }

  // 6. CONDICIONAL DE REGRA DE NEGÓCIO:
  // Se for 'digital', exibe a Landing Page de alta conversão.
  // Se for 'fisico', exibe o modelo tradicional de e-commerce com cálculo de frete, especificações e galeria.
  const isDigital = product.product_type === 'digital' || product.is_digital === true;

  if (isDigital) {
    return (
      <ProductLandingPage
        productId={product.id}
        product={product}
        onBack={propOnBack}
      />
    );
  }

  return (
    <ProductStandardPage
      productId={product.id}
      product={product}
      onBack={propOnBack}
    />
  );
};

export default ProductDetails;
