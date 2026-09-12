import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Sparkles, Image as ImageIcon, Video as VideoIcon, Loader2, AlertCircle, Link2, Play, Download, Package, ExternalLink, ShieldCheck, CheckCircle2, FileText, MessageSquare, Gift } from 'lucide-react';
import { Product } from '../../types';
import { useStoreData } from '../../context/StoreDataContext';
import { useTenant } from '../../context/TenantContext';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';
import { uploadProductImage } from '../../lib/storage';
import { isVideoUrl } from '../../utils/media';
import { slugify, generateSlug, generateUniqueSlug } from '../../utils/slug';
import { supabase } from '../../lib/supabase';
import { DEFAULT_TESTIMONIALS } from '../../data/defaultTestimonials';
import { getAutomaticTestimonials } from '../../utils/automaticProductContent';

interface ProductFormModalProps {
  isOpen: boolean;
  product?: Product | null;
  productToEdit?: Product | null;
  onClose: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  product: productProp,
  productToEdit,
  onClose,
}) => {
  const { products, categories, addProduct, updateProduct, showNotification } = useStoreData();
  const { currentStore } = useTenant();
  const currentStoreId = currentStore?.id || '';
  const isBaseStore = currentStoreId === 'suamarcaaqui' || currentStoreId === 'store_default' || !currentStoreId;
  const product = productProp || productToEdit || null;

  const [activeTab, setActiveTab] = useState<'geral' | 'landing_page'>('geral');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: '',
    subcategory: '',
    price: '',
    unitSuffix: '/Un',
    description: '',
    detailed_description: '',
    gallery_images: '',
    benefits: '',
    testimonials: '',
    bonuses: '',
    checkout_url: '',
    guarantee_days: 7,
    is_digital: false,
    delivery_url: '',
    image: '',
    video_url: '',
    active: true,
    upsell_product_id: '',
    upsell_discount_percent: '',
    upsell_price: '',
  });

  const [isSlugManual, setIsSlugManual] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; price?: string; category?: string; slug?: string }>({});

  useEffect(() => {
    setActiveTab('geral');
    if (product) {
      const existingImg = product.image || product.image_url || product.imageUrl || '';
      const existingVideo = product.videoUrl || product.video_url || '';
      const isVideo = product.mediaType === 'video' || isVideoUrl(existingVideo) || isVideoUrl(existingImg);
      const isDigital = Boolean(
        (product as any).is_digital ?? 
        (product as any).isDigital ?? 
        Boolean(product.delivery_url || (product as any).deliveryUrl)
      );

      const rawGallery = product.galleryImages || product.gallery_images || [];
      const galleryStr = Array.isArray(rawGallery) ? rawGallery.join('\n') : String(rawGallery || '');
      const rawBenefits = product.benefits;
      const benefitsStr = Array.isArray(rawBenefits) ? rawBenefits.join('\n') : String(rawBenefits || '');
      const rawTestimonials = (product as any).testimonials || (product as any).depoimentos;
      let testimonialsStr = '';
      if (Array.isArray(rawTestimonials)) {
        testimonialsStr = rawTestimonials
          .map((t: any) => `${t.name || ''} | ${t.text || ''}${t.avatar ? ' | ' + t.avatar : ''}`)
          .join('\n');
      } else if (typeof rawTestimonials === 'string') {
        testimonialsStr = rawTestimonials;
      }

      const rawBonuses = (product as any).bonuses || (product as any).bonus;
      let bonusesStr = '';
      if (Array.isArray(rawBonuses)) {
        bonusesStr = rawBonuses
          .map((b: any) => `${b.title || ''} | ${b.description || ''}${b.originalPrice !== undefined ? ' | ' + b.originalPrice : ''}${b.imageUrl ? ' | ' + b.imageUrl : ''}`)
          .join('\n');
      } else if (typeof rawBonuses === 'string') {
        bonusesStr = rawBonuses;
      }

      setMediaType(isVideo ? 'video' : 'image');
      setFormData({
        name: product.name || '',
        slug: product.slug || slugify(product.name) || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        price: product.price ? String(product.price) : '',
        unitSuffix: product.unitSuffix || '/Un',
        description: product.description || '',
        detailed_description: product.detailed_description || product.detailedDescription || product.description || '',
        gallery_images: galleryStr,
        benefits: benefitsStr,
        testimonials: testimonialsStr,
        bonuses: bonusesStr,
        checkout_url: product.checkout_url || product.checkoutUrl || '',
        guarantee_days: product.guarantee_days || 7,
        is_digital: isDigital,
        delivery_url: product.delivery_url || product.deliveryUrl || '',
        image: existingImg,
        video_url: existingVideo,
        active: (product as any).active ?? product.inStock ?? true,
        upsell_product_id: product.upsell_product_id || (product as any).upsellProductId || '',
        upsell_discount_percent: product.upsell_discount_percent !== undefined && product.upsell_discount_percent !== null
          ? String(product.upsell_discount_percent)
          : ((product as any).upsellDiscountPercent !== undefined && (product as any).upsellDiscountPercent !== null
            ? String((product as any).upsellDiscountPercent)
            : ''),
        upsell_price: product.upsell_price !== undefined && product.upsell_price !== null
          ? String(product.upsell_price)
          : ((product as any).upsellPrice !== undefined && (product as any).upsellPrice !== null ? String((product as any).upsellPrice) : ''),
      });
      setMediaPreview(isVideo ? (existingVideo || existingImg) : existingImg);
      setIsSlugManual(Boolean(product.slug));
    } else {
      setMediaType('image');
      setFormData({
        name: '',
        slug: '',
        category: '',
        subcategory: '',
        price: '',
        unitSuffix: '/Un',
        description: '',
        detailed_description: '',
        gallery_images: '',
        benefits: '',
        testimonials: '',
        bonuses: '',
        checkout_url: '',
        guarantee_days: 7,
        is_digital: false,
        delivery_url: '',
        image: '',
        video_url: '',
        active: true,
        upsell_product_id: '',
        upsell_discount_percent: '',
        upsell_price: '',
      });
      setMediaPreview('');
      setIsSlugManual(false);
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const currentCategory = categories.find((c) => c.id === formData.category);
  const isCurrentMediaVideo = mediaType === 'video' || isVideoUrl(mediaPreview);

  // Manipular seleção e upload no Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[ProductFormModal] 📁 Arquivo de mídia selecionado:', file.name, `(${file.size} bytes, tipo: ${file.type})`);
    setSelectedFile(file);
    setUploadError(null);

    const isFileVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|m4v)$/i);
    if (isFileVideo) {
      setMediaType('video');
    }

    // Preview local imediato
    const localPreviewUrl = URL.createObjectURL(file);
    setMediaPreview(localPreviewUrl);

    // Upload no Supabase Storage
    setIsUploading(true);
    const { url, error } = await uploadProductImage(file);
    setIsUploading(false);

    if (url) {
      console.log('[ProductFormModal] ✅ Mídia enviada para o Supabase com URL:', url);
      setMediaPreview(url);
      if (isFileVideo || mediaType === 'video') {
        setFormData((prev) => ({ ...prev, video_url: url, image: url }));
      } else {
        setFormData((prev) => ({ ...prev, image: url }));
      }
    } else {
      console.error('[ProductFormModal] ❌ Erro de upload no Supabase:', error);
      setUploadError(`Erro no Supabase: ${error || 'Não foi possível salvar no bucket.'}`);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setMediaPreview(base64String);
        if (isFileVideo || mediaType === 'video') {
          setFormData((prev) => ({ ...prev, video_url: base64String, image: base64String }));
        } else {
          setFormData((prev) => ({ ...prev, image: base64String }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (url: string) => {
    setSelectedFile(null);
    setUploadError(null);
    const isUrlVideo = isVideoUrl(url) || mediaType === 'video';
    if (isUrlVideo) {
      setFormData((prev) => ({ ...prev, video_url: url, image: url }));
    } else {
      setFormData((prev) => ({ ...prev, image: url }));
    }
    setMediaPreview(url);
  };

  const validate = () => {
    const newErrors: { name?: string; price?: string; category?: string } = {};
    if (!formData.name.trim()) newErrors.name = 'Informe o nome do produto.';
    
    const parsedPrice = parseFloat(formData.price.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      newErrors.price = 'Informe um preço válido maior que 0.';
    }

    // Se a categoria estiver vazia mas houver categorias disponíveis, seleciona a primeira automaticamente
    if (!formData.category.trim()) {
      if (categories && categories.length > 0) {
        setFormData((prev) => ({ ...prev, category: categories[0].id }));
      }
    }

    setErrors(newErrors);
    if (newErrors.name || newErrors.price) {
      setActiveTab('geral');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!currentStoreId || currentStoreId === '__resolving_tenant__') {
      showNotification('Loja ainda em carregamento. Aguarde...', 'error');
      return;
    }

    setSubmitError(null);
    try {
      setIsSubmitting(true);
      const cleanName = String(formData.name).trim();
      const currentProductId = product?.id || '';

      // Validação de Nome Duplicado (Frontend + Supabase) com isolamento estrito por loja
      let checkQuery = supabase
        .from('products')
        .select('id, name')
        .ilike('name', cleanName)
        .neq('id', currentProductId || '');

      if (currentStoreId === 'matriz' || currentStoreId === 'store_editaveisdocanva' || currentStoreId === 'editaveisdocanva') {
        checkQuery = checkQuery.or('store_id.eq.matriz,store_id.eq.store_editaveisdocanva');
      } else if (currentStoreId === 'suamarcaaqui' || currentStoreId === 'store_default') {
        checkQuery = checkQuery.or('store_id.eq.suamarcaaqui,store_id.eq.store_default');
      } else {
        checkQuery = checkQuery.eq('store_id', currentStoreId);
      }

      const { data: existing, error: checkError } = await checkQuery.maybeSingle();

      if (existing) {
        setErrors((prev) => ({ ...prev, name: 'Já existe um produto cadastrado com este nome nesta loja.' }));
        showNotification('Já existe um produto cadastrado com este nome nesta loja.', 'error');
        setIsSubmitting(false);
        return;
      }

      let finalMediaUrl = (mediaType === 'video' ? formData.video_url || formData.image : formData.image).trim();

      // Se houver arquivo selecionado e upload pendente
      if (selectedFile && (!finalMediaUrl || finalMediaUrl.startsWith('blob:'))) {
        console.log('[ProductFormModal] ⏳ Aguardando conclusão do upload para o Supabase Storage...');
        setIsUploading(true);
        const { url, error: uploadErr } = await uploadProductImage(selectedFile);
        setIsUploading(false);

        if (url) {
          finalMediaUrl = url;
          console.log('[ProductFormModal] ✅ Mídia salva no bucket "products":', url);
        } else if (uploadErr) {
          console.warn('[ProductFormModal] Aviso de upload:', uploadErr);
        }
      }

      // Conversão numérica
      const rawPrice = String(formData.price).replace(',', '.');
      const numericPrice = Number(parseFloat(rawPrice)) || 0;

      // Garante que o slug do produto está definido antes do envio
      const finalSlug = formData.slug ? formData.slug.toLowerCase().replace(/\s+/g, '-') : generateSlug(cleanName);

      // Verificação explícita do tipo de mídia (aba 'Foto' ou 'Vídeo')
      const isVideo = mediaType === 'video';
      const mediaTypeResult: 'video' | 'image' = isVideo ? 'video' : 'image';

      // Categoria garantida (se lista estiver vazia, usa 'geral')
      const finalCategory = formData.category.trim() || (categories && categories.length > 0 ? categories[0].id : 'geral');

      const isDigital = Boolean(formData.is_digital);
      const deliveryUrlClean = isDigital ? (formData.delivery_url || '').trim() : '';

      // Processamento de imagens adicionais da galeria
      const parsedGallery = formData.gallery_images
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5);

      // Processamento de benefícios
      const parsedBenefits = formData.benefits
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 2);

      // Processamento de depoimentos personalizados
      const parsedTestimonials = (formData.testimonials || '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 5)
        .map((line) => {
          const parts = line.split('|').map((p) => p.trim());
          return {
            name: parts[0] || 'Cliente Satisfeita',
            text: parts[1] || parts[0],
            avatar: parts[2] || '',
            rating: 5,
          };
        });

      // Processamento de bônus exclusivos
      const parsedBonuses = (formData.bonuses || '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 3)
        .map((line) => {
          const parts = line.split('|').map((p) => p.trim());
          return {
            title: parts[0] || 'Bônus Especial',
            description: parts[1] || 'Incluso gratuitamente',
            originalPrice: parts[2] ? parseFloat(parts[2].replace(/[^0-9.,]/g, '').replace(',', '.')) : 29.9,
            imageUrl: parts[3] || '',
          };
        });

      const payload: any = {
        store_id: currentStoreId,
        name: cleanName,
        slug: finalSlug,
        category: finalCategory,
        category_id: finalCategory,
        subcategory: formData.subcategory ? String(formData.subcategory).trim() : undefined,
        price: numericPrice,
        unitSuffix: formData.unitSuffix ? String(formData.unitSuffix).trim() : '/Un',
        mediaType: mediaTypeResult,
        media_type: mediaTypeResult,
        imageUrl: finalMediaUrl,
        image: finalMediaUrl,
        image_url: finalMediaUrl,
        photo_url: finalMediaUrl,
        videoUrl: isVideo ? finalMediaUrl : undefined,
        video_url: isVideo ? finalMediaUrl : undefined,
        is_digital: isDigital,
        isDigital: isDigital,
        delivery_url: deliveryUrlClean || undefined,
        deliveryUrl: deliveryUrlClean || undefined,
        description: formData.description ? String(formData.description).trim() : undefined,
        detailed_description: formData.detailed_description.trim() || undefined,
        detailedDescription: formData.detailed_description.trim() || undefined,
        gallery_images: parsedGallery.length > 0 ? parsedGallery : undefined,
        galleryImages: parsedGallery.length > 0 ? parsedGallery : undefined,
        benefits: parsedBenefits.length > 0 ? parsedBenefits : undefined,
        testimonials: parsedTestimonials.length > 0 ? parsedTestimonials : undefined,
        bonuses: parsedBonuses.length > 0 ? parsedBonuses : undefined,
        checkout_url: formData.checkout_url.trim() || undefined,
        checkoutUrl: formData.checkout_url.trim() || undefined,
        guarantee_days: Number(formData.guarantee_days) || 7,
        inStock: Boolean(formData.active),
        isCustomizable: true,
        upsell_product_id: (formData.upsell_product_id || '').trim() || null,
        upsell_discount_percent: formData.upsell_discount_percent && !isNaN(Number(formData.upsell_discount_percent.replace(',', '.')))
          ? Number(formData.upsell_discount_percent.replace(',', '.'))
          : null,
        upsell_price: formData.upsell_price && !isNaN(Number(formData.upsell_price.replace(',', '.')))
          ? Number(formData.upsell_price.replace(',', '.'))
          : null,
      };

      console.log('[ProductFormModal] 🚀 Enviando produto para o Supabase:', payload);

      if (product) {
        await updateProduct(product.id, payload);
      } else {
        await addProduct(payload);
      }

      // Limpa os campos após cadastro bem-sucedido
      setFormData({
        name: '',
        slug: '',
        category: '',
        subcategory: '',
        price: '',
        unitSuffix: '/Un',
        description: '',
        detailed_description: '',
        gallery_images: '',
        benefits: '',
        checkout_url: '',
        guarantee_days: 7,
        is_digital: false,
        delivery_url: '',
        image: '',
        video_url: '',
        active: true,
        upsell_product_id: '',
        upsell_discount_percent: '',
        upsell_price: '',
      });
      setIsSlugManual(false);
      setSelectedFile(null);
      setMediaPreview('');
      setSubmitError(null);
      setIsSubmitting(false);
      onClose();
    } catch (error: any) {
      console.error('[ProductFormModal] ❌ Erro detalhado ao salvar produto no Supabase:', error);
      const rawMsg = error?.message || (typeof error === 'string' ? error : 'Falha ao salvar produto no Supabase.');
      
      const isDuplicate = 
        error?.code === '23505' || 
        rawMsg.includes('23505') || 
        rawMsg.toLowerCase().includes('duplicate key') || 
        rawMsg.toLowerCase().includes('unique constraint') ||
        rawMsg.toLowerCase().includes('already exists') ||
        rawMsg.includes('Já existe um produto');

      if (isDuplicate) {
        setErrors((prev) => ({ ...prev, name: 'Já existe um produto cadastrado com este nome.' }));
        const friendlyMsg = 'Já existe um produto cadastrado com este nome ou URL amigável.';
        setSubmitError(friendlyMsg);
        showNotification(friendlyMsg, 'error');
      } else {
        setSubmitError(rawMsg);
        showNotification(`Erro: ${rawMsg}`, 'error');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-black text-white border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="font-sans font-bold text-base sm:text-lg">
              {product ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h3>
            <p className="text-xs text-zinc-400">
              Preencha os dados, foto ou vídeo e link de entrega do item
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegação por Abas do Modal */}
        <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-6 pt-2.5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'geral'
                ? 'border-black text-black bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/70 rounded-t-xl'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Dados do Produto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('landing_page')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'landing_page'
                ? 'border-theme-primary text-theme-primary bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/70 rounded-t-xl'
            }`}
          >
            <Sparkles className="w-4 h-4 text-theme-primary" />
            <span>Landing Page</span>
            <span className="text-[10px] bg-theme-primary text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              Página de Vendas
            </span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Alerta Visual de Erro do Supabase */}
          {submitError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-bold text-rose-900">Erro ao salvar no Supabase:</p>
                <p className="font-mono text-[11px] text-rose-700 break-all">{submitError}</p>
                <p className="text-[10px] text-rose-600 pt-0.5">
                  Execute o script SQL no painel do Supabase se a coluna 'slug' for requerida.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ABA 1: DADOS GERAIS DO PRODUTO                               */}
          {/* ============================================================ */}
          {activeTab === 'geral' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Nome do Produto */}
              <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nome do Produto *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => {
                const newName = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  name: newName,
                  slug: isSlugManual ? prev.slug : slugify(newName),
                }));
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              placeholder="Ex: Caixa Milk Personalizada com Laço"
              className={`w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black transition-all ${
                errors.name ? 'border-rose-500' : 'border-slate-200'
              }`}
            />
            {errors.name && <span className="text-[11px] text-rose-500 font-medium mt-1 block">{errors.name}</span>}
          </div>

          {/* Slug / URL Amigável (Editável e estritamente sem sufixo numérico) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-800">
                Slug / URL Amigável
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                /{formData.slug || slugify(formData.name) || 'link-do-produto'}
              </span>
            </div>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => {
                const val = e.target.value;
                if (!val.trim()) {
                  setIsSlugManual(false);
                  setFormData((prev) => ({ ...prev, slug: '' }));
                } else {
                  setIsSlugManual(true);
                  setFormData((prev) => ({ ...prev, slug: slugify(val) }));
                }
                if (errors.slug) {
                  setErrors((prev) => ({ ...prev, slug: undefined }));
                }
              }}
              placeholder="ex: caixa-milk-personalizada-com-laco"
              className={`w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black font-mono text-slate-700 transition-all ${
                errors.slug ? 'border-rose-500' : 'border-slate-200'
              }`}
            />
            {errors.slug && <span className="text-[11px] text-rose-500 font-medium mt-1 block">{errors.slug}</span>}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500 mt-1.5">
              <span>
                Link da Landing Page: <strong className="text-slate-800 font-mono">/produto/{formData.slug || slugify(formData.name) || 'seu-produto'}</strong>
              </span>
              {(formData.slug || formData.name) && (
                <a
                  href={`/produto/${formData.slug || slugify(formData.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-theme-primary font-bold hover:underline"
                  title="Testar Landing Page em nova aba"
                >
                  <span>Testar link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Categoria e Subcategoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Categoria *
              </label>
              <select
                value={formData.category}
                onChange={(e) => {
                  const newCat = e.target.value;
                  const catObj = categories.find((c) => c.id === newCat);
                  setFormData({
                    ...formData,
                    category: newCat,
                    subcategory: catObj?.subcategories[0] || ''
                  });
                }}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black cursor-pointer"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.category && <span className="text-[11px] text-rose-500 mt-0.5 block">{errors.category}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Subcategoria (opcional)
              </label>
              {currentCategory && currentCategory.subcategories.length > 0 ? (
                <select
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black cursor-pointer"
                >
                  <option value="">Nenhuma / Geral</option>
                  {currentCategory.subcategories.map((subcat) => (
                    <option key={subcat} value={subcat}>
                      {subcat}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  placeholder="Nome da subcategoria"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black"
                />
              )}
            </div>
          </div>

          {/* Preço e Unidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Preço Unitário (R$) *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-xs font-bold text-slate-500">R$</span>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className={`w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black font-bold ${
                    errors.price ? 'border-rose-500' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.price && <span className="text-[11px] text-rose-500 mt-0.5 block">{errors.price}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Sufixo de Unidade
              </label>
              <input
                type="text"
                value={formData.unitSuffix}
                onChange={(e) => setFormData({ ...formData, unitSuffix: e.target.value })}
                placeholder="Ex: /Un, /Kit, /Pct 30un"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Mídia do Produto: FOTO OU VÍDEO */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                {isCurrentMediaVideo ? (
                  <VideoIcon className="w-4 h-4 text-theme-primary" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-theme-primary" />
                )}
                <span>Mídia do Produto (Foto ou Vídeo)</span>
              </label>

              {/* Botões de Alternância Foto / Vídeo */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setMediaType('image')}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    mediaType === 'image'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  📷 Foto
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType('video')}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    mediaType === 'video'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  🎥 Vídeo
                </button>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              {/* Preview Thumbnail (Foto ou Vídeo) */}
              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0 flex items-center justify-center relative shadow-xs">
                {mediaPreview ? (
                  isCurrentMediaVideo ? (
                    <video
                      src={mediaPreview}
                      controls
                      muted
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-300">
                    {mediaType === 'video' ? (
                      <VideoIcon className="w-7 h-7" />
                    ) : (
                      <ImageIcon className="w-7 h-7" />
                    )}
                    <span className="text-[9px] font-bold text-slate-400 mt-1">
                      {mediaType === 'video' ? 'Sem vídeo' : 'Sem foto'}
                    </span>
                  </div>
                )}

                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload or Link Input */}
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={mediaType === 'video' ? (formData.video_url || formData.image) : formData.image}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder={
                    mediaType === 'video'
                      ? 'Cole o link direto do vídeo (.mp4, .mov, etc.) ou faça upload...'
                      : 'Cole o link direto da imagem (URL) ou faça upload...'
                  }
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-black"
                />

                <label className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-xs ${
                  isUploading 
                    ? 'bg-slate-100 text-slate-600 cursor-wait border border-slate-300' 
                    : 'bg-zinc-900 hover:bg-black text-white'
                }`}>
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando mídia para o Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-theme-primary" />
                      <span>
                        {mediaType === 'video' ? 'Fazer upload de Vídeo (MP4, MOV, WebM)' : 'Fazer upload de Foto (PNG, JPG, WebP)'}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    disabled={isUploading}
                    accept={
                      mediaType === 'video'
                        ? 'video/mp4,video/webm,video/quicktime,video/mov'
                        : 'image/png,image/jpeg,image/jpg,image/webp,image/gif'
                    }
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {uploadError && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Flag / Alternador: Produto Digital */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition-colors">
              <label 
                htmlFor="is-digital-toggle" 
                className="flex items-center gap-3 cursor-pointer flex-1 select-none pr-3"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                  formData.is_digital 
                    ? 'bg-emerald-500 text-white shadow-xs' 
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      É um Produto Digital?
                    </span>
                    {formData.is_digital && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                        Download Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Marque esta opção se o produto for um arquivo ou molde digital para download (Canva, Google Drive, PDF, etc.).
                  </p>
                </div>
              </label>

              <label 
                htmlFor="is-digital-toggle" 
                className="relative inline-flex items-center cursor-pointer shrink-0"
              >
                <input
                  id="is-digital-toggle"
                  type="checkbox"
                  checked={formData.is_digital}
                  onChange={(e) => setFormData({ ...formData, is_digital: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Caixa Condicional: Link de Entrega Digital / Download (Google Drive, Canva, etc.) */}
          {formData.is_digital && (
            <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-950">
                    <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                    Link de Entrega Digital / Download (Google Drive, Canva, etc.)
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    Opcional
                  </span>
                </label>
                <input
                  type="url"
                  value={formData.delivery_url}
                  onChange={(e) => setFormData({ ...formData, delivery_url: e.target.value })}
                  placeholder="https://drive.google.com/... ou https://canva.com/..."
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400 text-slate-900"
                />
                <p className="text-[11px] text-emerald-800/80">
                  Este link será liberado na tela de pagamento aprovado e enviado por e-mail ao comprador.
                </p>
              </div>
            </div>
          )}

          {/* Descrição */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Descrição / Resumo do Produto
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Arquivo 100% editável no Canva, temas prontos para impressão."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black resize-none"
            />
          </div>

          {/* Oferta de Upsell / Compre Junto no Carrinho (Order Bump) */}
          <div className="pt-3 border-t border-slate-200 bg-theme-light/40 p-4 rounded-2xl border border-theme-primary/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-black flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-theme-primary" />
                <span>Oferta de Upsell / Compre Junto no Carrinho (Opcional)</span>
              </label>
              <span className="text-[10px] bg-black text-theme-primary px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                Order Bump
              </span>
            </div>
            <p className="text-[11px] text-slate-700">
              Ofereça um produto complementar diretamente no carrinho antes do pagamento com valor promocional exclusivo.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">
                  Produto de Upsell Sugerido
                </label>
                <select
                  value={formData.upsell_product_id}
                  onChange={(e) => setFormData({ ...formData, upsell_product_id: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-theme-primary/30 rounded-xl outline-none focus:ring-2 focus:ring-black cursor-pointer text-slate-800"
                >
                  <option value="">Nenhum / Automático (menor valor)</option>
                  {products
                    .filter((p) => !product || p.id !== product.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (R$ {Number(p.price).toFixed(2).replace('.', ',')})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">
                  Porcentagem de Desconto do Upsell (%)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-black text-theme-primary">%</span>
                  <input
                    type="text"
                    value={formData.upsell_discount_percent}
                    onChange={(e) => setFormData({ ...formData, upsell_discount_percent: e.target.value.replace(/[^0-9.,]/g, '') })}
                    placeholder="Ex: 50 (para 50% de desconto)"
                    className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-theme-primary/30 rounded-xl outline-none focus:ring-2 focus:ring-black font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status Ativo / Em Estoque */}
          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 select-none">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 rounded text-black focus:ring-black border-slate-300 accent-black"
              />
              <span>Disponível no Catálogo (Ativo)</span>
            </label>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA 2: CONFIGURAÇÃO DA LANDING PAGE DE ALTA CONVERSÃO         */}
      {/* ============================================================ */}
      {activeTab === 'landing_page' && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          
          {/* Card de Apresentação da Aba */}
          <div className="p-4 bg-gradient-to-r from-theme-light/70 to-slate-50 rounded-2xl border border-theme-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-theme-primary text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-950 flex items-center gap-2">
                  <span>Configuração da Landing Page</span>
                  <span className="text-[10px] bg-theme-primary text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Página de Vendas
                  </span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Personalize a página individual do produto com galeria de fotos, benefícios, copy aprofundada e link de checkout.
                </p>
              </div>
            </div>

            {/* Link de prévia ao vivo */}
            {(formData.slug || formData.name) && (
              <a
                href={`/produto/${formData.slug || slugify(formData.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs hover:shadow-xs transition-all shrink-0 cursor-pointer"
                title="Abrir prévia da Landing Page em nova aba"
              >
                <ExternalLink className="w-3.5 h-3.5 text-theme-primary" />
                <span>Ver Prévia</span>
              </a>
            )}
          </div>

          {/* 1. Galeria de Fotos Extras */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-theme-primary" />
                Galeria de Fotos Extras (Miniaturas da Página)
              </label>
              <span className="text-[10px] bg-slate-200/80 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                {formData.gallery_images.split('\n').filter((s) => s.trim().length > 5).length} foto(s) configurada(s)
              </span>
            </div>
            <textarea
              rows={3}
              value={formData.gallery_images}
              onChange={(e) => setFormData({ ...formData, gallery_images: e.target.value })}
              placeholder="https://exemplo.com/foto2.jpg&#10;https://exemplo.com/foto3.jpg"
              className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black placeholder:text-slate-400 text-slate-800 font-mono text-[11px] resize-none"
            />
            <p className="text-[11px] text-slate-500">
              Cole uma URL por linha. Essas fotos formarão as miniaturas clicáveis na galeria da Landing Page.
            </p>
          </div>

          {/* 3. Benefícios (O que você vai receber) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Benefícios / O que você vai receber (Um por linha)
              </label>
              <span className="text-[10px] bg-slate-200/80 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                {formData.benefits.split('\n').filter((s) => s.trim().length > 2).length} benefício(s)
              </span>
            </div>
            <textarea
              rows={4}
              value={formData.benefits}
              onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
              placeholder="100% editável no Canva gratuito&#10;Arquivos em alta definição 300 DPI&#10;Acesso vitalício e envio imediato no WhatsApp"
              className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black placeholder:text-slate-400 text-slate-800 resize-none"
            />
            <p className="text-[11px] text-slate-500">
              Cada linha digitada será exibida como um card com ícone de verificação verde na seção <strong>"O que você vai receber"</strong>.
            </p>
          </div>

          {/* 4. Descrição Detalhada & Prazo de Garantia */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-theme-primary" />
                Texto Detalhado da Página de Vendas (Copy)
              </label>
              <textarea
                rows={4}
                value={formData.detailed_description}
                onChange={(e) => setFormData({ ...formData, detailed_description: e.target.value })}
                placeholder="Texto persuasivo explicando os diferenciais do produto, detalhes dos arquivos, formatos e recomendações..."
                className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black placeholder:text-slate-400 text-slate-800 resize-none"
              />
              <p className="text-[11px] text-slate-500">
                Apresentado na seção <strong>"Detalhes e Descrição do Produto"</strong> da página de vendas.
              </p>
            </div>

            <div className="sm:col-span-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Garantia (Dias)
                </label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={formData.guarantee_days}
                  onChange={(e) => setFormData({ ...formData, guarantee_days: parseInt(e.target.value) || 7 })}
                  className="w-full text-xs px-3 py-2 mt-2 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-black font-bold text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Garantia incondicional com selo de risco zero exibido na página.
              </p>
            </div>
          </div>

          {/* 5. Depoimentos de Clientes (Prova Social - Sempre 6 Cards) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-theme-primary" />
                <span>Depoimentos de Clientes (Prova Social — Sempre 6 Cards)</span>
              </label>
              <span className="text-[10px] bg-pink-100/80 text-pink-700 font-bold px-2 py-0.5 rounded-md">
                {(formData.testimonials || '').split('\n').filter((s) => s.trim().length > 5).length > 0 
                  ? `${(formData.testimonials || '').split('\n').filter((s) => s.trim().length > 5).length} de 6 cards personalizados`
                  : 'Padrão da loja (6 depoimentos com foto)'}
              </span>
            </div>

            {/* Ações rápidas para carregar ou gerar 6 depoimentos */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  const defaultLines = DEFAULT_TESTIMONIALS.map(
                    (t) => `${t.name} | ${t.text} | ${t.avatar}`
                  ).join('\n');
                  setFormData({ ...formData, testimonials: defaultLines });
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                <span>Carregar 6 Depoimentos Padrão</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const autoTestimonials = getAutomaticTestimonials({
                    name: formData.name || 'Material Exclusivo',
                    category: formData.category || '',
                    description: formData.description || '',
                    detailed_description: formData.detailed_description || '',
                  } as any);
                  const generatedLines = autoTestimonials.map(
                    (t) => `${t.name} | ${t.text} | ${t.avatar}`
                  ).join('\n');
                  setFormData({ ...formData, testimonials: generatedLines });
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>🎯 Gerar 6 para este Produto</span>
              </button>

              {formData.testimonials && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, testimonials: '' })}
                  className="text-[10px] text-slate-500 hover:text-rose-600 underline ml-auto"
                >
                  Limpar (Usar 6 Automáticos)
                </button>
              )}
            </div>

            <textarea
              rows={4}
              value={formData.testimonials}
              onChange={(e) => setFormData({ ...formData, testimonials: e.target.value })}
              placeholder="Nome | Depoimento | URL da Foto (opcional)&#10;Ex: Valentina Rocha | Amei os arquivos, muito práticos e lindos! | https://..."
              className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black placeholder:text-slate-400 text-slate-800 font-mono text-[11px] resize-none"
            />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              💡 <strong>O sistema cria e exibe SEMPRE exatamente 6 cards de prova social</strong> na página de vendas (grid simétrico com fotos de perfil, 5 estrelas douradas e depoimentos de alta conversão). Se você deixar em branco ou preencher menos de 6, o sistema complementará automaticamente até fechar os 6 cards perfeitos.
            </p>
          </div>

          {/* 6. Bônus Exclusivos da Página de Vendas */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-pink-600" />
                <span>Bônus Exclusivos ("Além disso você leva 3 bônus poderosos")</span>
              </label>
              <span className="text-[10px] bg-pink-100/80 text-pink-700 font-bold px-2 py-0.5 rounded-md">
                {(formData.bonuses || '').split('\n').filter((s) => s.trim().length > 3).length > 0 
                  ? `${(formData.bonuses || '').split('\n').filter((s) => s.trim().length > 3).length} bônus configurado(s)`
                  : 'Padrão da loja (3 bônus com fotos)'}
              </span>
            </div>

            {/* Ações rápidas para o administrador */}
            <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
              <button
                type="button"
                onClick={() => {
                  const defaultStr = [
                    'Pack com +100 Fontes Mais Usadas em Festas e Toppers | As tipografias infantis e comemorativas mais procuradas do momento, prontas para usar no Canva ou computador. | 47 | https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?w=600&q=80',
                    'Guia Secreto de Fornecedores de Papéis, Acetato e Shaker | Lista exclusiva com os melhores fornecedores do Brasil para comprar papéis especiais e insumos no atacado. | 37 | https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&q=80',
                    'Planilha Automática de Precificação de Papelaria Personalizada | Descubra exatamente quanto cobrar por cada topo de bolo e lembrancinha para lucrar de verdade. | 49 | https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80'
                  ].join('\n');
                  setFormData({ ...formData, bonuses: defaultStr });
                }}
                className="px-2.5 py-1.5 bg-white hover:bg-pink-50 border border-pink-200 text-pink-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <span>✨ Carregar 3 Bônus Padrão</span>
              </button>

              {/* Selecionar um produto existente para virar bônus */}
              {products.length > 1 && (
                <select
                  onChange={(e) => {
                    const selId = e.target.value;
                    if (!selId) return;
                    const found = products.find((p) => p.id === selId);
                    if (found) {
                      const newBonusLine = `${found.name} | Arquivo digital completo liberado gratuitamente como bônus exclusivo. | ${found.price || 29.9} | ${found.image_url || found.imageUrl || ''}`;
                      const current = (formData.bonuses || '').trim();
                      const updated = current ? `${current}\n${newBonusLine}` : newBonusLine;
                      setFormData({ ...formData, bonuses: updated });
                    }
                    e.target.value = '';
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-[11px] font-bold outline-none focus:ring-1 focus:ring-black cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>+ Adicionar Produto da Loja como Bônus...</option>
                  {products
                    .filter((p) => p.id !== product?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        🎁 {p.name} (R$ {p.price?.toFixed(2)})
                      </option>
                    ))}
                </select>
              )}

              {formData.bonuses && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, bonuses: '' })}
                  className="text-[10px] text-slate-500 hover:text-rose-600 underline ml-auto"
                >
                  Limpar (Restaurar Padrão)
                </button>
              )}
            </div>

            <textarea
              rows={4}
              value={formData.bonuses}
              onChange={(e) => setFormData({ ...formData, bonuses: e.target.value })}
              placeholder="Título do Bônus | Descrição do Bônus | Valor de Mercado (ex: 47) | URL da Imagem (opcional)&#10;Ex: Pack de 100 Fontes | Fontes incríveis para Canva | 47 | https://..."
              className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black placeholder:text-slate-400 text-slate-800 font-mono text-[11px] resize-none"
            />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              💡 <strong>Deixe em branco</strong> para utilizar automaticamente os 3 bônus exclusivos de alta conversão com fotos e valores riscados. Se preferir personalizar, adicione um bônus por linha ou use os botões acima para selecionar produtos da sua loja como bônus.
            </p>
          </div>

          {/* 7. Chamada para o Acesso: Preço do Pacote Completo (Oferta Especial) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <label className="block text-xs font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#f43f5e]" />
                Chamada para o Acesso — Preço do Pacote Completo (R$)
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
              <input
                type="text"
                value={formData.upsell_price}
                onChange={(e) => setFormData({ ...formData, upsell_price: e.target.value })}
                placeholder="Ex: 25.00 (ou deixe em branco para cálculo automático)"
                className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-black font-bold text-slate-900"
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              💡 Exibido em destaque no card <strong>"PLANO COMPLETO (MAIS POPULAR)"</strong> da seção "Garanta seu acesso hoje". Os itens e recursos listados no card são puxados automaticamente dos <strong>Benefícios</strong> e da <strong>Descrição Detalhada</strong> cadastrados acima, seguidos dos bônus e garantias de acesso imediato.
            </p>
          </div>

        </div>
      )}

          {/* Submit Actions */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {submitError ? (
              <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-xs">{submitError}</span>
              </p>
            ) : (
              <div />
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading || isSubmitting}
                className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isUploading || isSubmitting}
                className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting || isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-white" />
                    <span>{product ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

export default ProductFormModal;
