import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Sparkles, Image as ImageIcon, Video as VideoIcon, Loader2, AlertCircle, Link2, Play } from 'lucide-react';
import { Product } from '../../types';
import { useStoreData } from '../../context/StoreDataContext';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';
import { uploadProductImage } from '../../lib/storage';
import { isVideoUrl } from '../../utils/media';
import { slugify, generateUniqueSlug } from '../../utils/slug';

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
  const { categories, addProduct, updateProduct, showNotification } = useStoreData();
  const product = productProp || productToEdit || null;

  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subcategory: '',
    price: '',
    unitSuffix: '/Un',
    description: '',
    delivery_url: '',
    image: '',
    video_url: '',
    active: true,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; price?: string; category?: string }>({});

  useEffect(() => {
    if (product) {
      const existingImg = product.image || product.image_url || product.imageUrl || '';
      const existingVideo = product.videoUrl || product.video_url || '';
      const isVideo = product.mediaType === 'video' || isVideoUrl(existingVideo) || isVideoUrl(existingImg);

      setMediaType(isVideo ? 'video' : 'image');
      setFormData({
        name: product.name || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        price: product.price ? String(product.price) : '',
        unitSuffix: product.unitSuffix || '/Un',
        description: product.description || '',
        delivery_url: product.delivery_url || product.deliveryUrl || '',
        image: existingImg,
        video_url: existingVideo,
        active: (product as any).active ?? product.inStock ?? true,
      });
      setMediaPreview(isVideo ? (existingVideo || existingImg) : existingImg);
    } else {
      setMediaType('image');
      setFormData({
        name: '',
        category: '',
        subcategory: '',
        price: '',
        unitSuffix: '/Un',
        description: '',
        delivery_url: '',
        image: '',
        video_url: '',
        active: true,
      });
      setMediaPreview('');
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
    if (!formData.category) newErrors.category = 'Selecione uma categoria.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitError(null);
    try {
      setIsSubmitting(true);
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

      const cleanName = String(formData.name).trim();
      const generatedSlug = generateUniqueSlug(cleanName);

      const payload: any = {
        name: cleanName,
        slug: generatedSlug,
        category: String(formData.category).trim(),
        subcategory: formData.subcategory ? String(formData.subcategory).trim() : undefined,
        price: numericPrice,
        unitSuffix: formData.unitSuffix ? String(formData.unitSuffix).trim() : '/Un',
        mediaType: isVideo ? 'video' : 'image',
        imageUrl: finalMediaUrl,
        image: finalMediaUrl,
        image_url: finalMediaUrl,
        photo_url: finalMediaUrl,
        videoUrl: isVideo ? finalMediaUrl : undefined,
        video_url: isVideo ? finalMediaUrl : undefined,
        delivery_url: (formData.delivery_url || '').trim() || undefined,
        deliveryUrl: (formData.delivery_url || '').trim() || undefined,
        description: formData.description ? String(formData.description).trim() : undefined,
        inStock: Boolean(formData.active),
        isCustomizable: true,
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
        category: '',
        subcategory: '',
        price: '',
        unitSuffix: '/Un',
        description: '',
        delivery_url: '',
        image: '',
        video_url: '',
        active: true,
      });
      setSelectedFile(null);
      setMediaPreview('');
      setSubmitError(null);
      setIsSubmitting(false);
      onClose();
    } catch (error: any) {
      console.error('[ProductFormModal] ❌ Erro detalhado ao salvar produto no Supabase:', error);
      const msg = error?.message || (typeof error === 'string' ? error : 'Falha ao salvar produto no Supabase.');
      setSubmitError(msg);
      showNotification(`Erro: ${msg}`, 'error');
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
          
          {/* Nome do Produto */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nome do Produto *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Caixa Milk Personalizada com Laço"
              className={`w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black transition-all ${
                errors.name ? 'border-rose-500' : 'border-slate-200'
              }`}
            />
            {errors.name && <span className="text-[11px] text-rose-500 mt-0.5 block">{errors.name}</span>}
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
                  <VideoIcon className="w-4 h-4 text-[#65bc45]" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-[#65bc45]" />
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
                      <Upload className="w-4 h-4 text-[#65bc45]" />
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

          {/* Link de Entrega Digital / Download (Google Drive, Canva, etc.) */}
          <div className="pt-3 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                Link de Entrega Digital / Download (Google Drive, Canva, etc.)
              </span>
              <span className="text-[10px] font-normal text-slate-400">Opcional</span>
            </label>
            <input
              type="url"
              value={formData.delivery_url}
              onChange={(e) => setFormData({ ...formData, delivery_url: e.target.value })}
              placeholder="https://drive.google.com/... ou https://canva.com/..."
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black transition-all placeholder:text-slate-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Este link será liberado na tela de pagamento aprovado e enviado por e-mail ao comprador.
            </p>
          </div>

          {/* Descrição */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Descrição / Detalhes do Produto
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Arquivo 100% editável no Canva, temas prontos para impressão."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black resize-none"
            />
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

        </form>

      </div>
    </div>
  );
};

export default ProductFormModal;
